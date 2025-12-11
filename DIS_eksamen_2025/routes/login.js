const express = require('express');
const router = express.Router();
const path = require('path');
const bcrypt = require('bcrypt');
const passwordPolicy = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/login.html'));
});

router.get('/forgot-password', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/forgot-password.html'));
});

router.get('/forgot-password/code', (req, res) => {
  // Kræv at der er en pending reset i session, ellers tilbage til start
  if (!req.session.pendingReset) {
    return res.redirect('/forgot-password');
  }
  res.sendFile(path.join(__dirname, '../views/forgot-password-code.html'));
});

router.get('/forgot-password/reset', (req, res) => {
  // Kun adgang hvis koden er verificeret
  if (!req.session.pendingResetVerified) {
    return res.redirect('/forgot-password');
  }
  res.sendFile(path.join(__dirname, '../views/forgot-password-reset.html'));
});

router.post('/login', async (req, res) => {
  const db = req.app.get('db');

  try {
    const email = req.body.email || req.body.username;
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).send("Email og adgangskode er påkrævet.");
    }

    const host = await db.findHostByEmail(email);

    if (!host) {
      return res.status(400).send("Forkert email eller adgangskode.");
    }

    const match = await bcrypt.compare(password, host.password_hash);

    if (!match) {
      return res.status(400).send("Forkert email eller adgangskode.");
    }

    const hostId = host.host_id || host.id;

    // Hvis brugeren allerede er 2FA-verificeret, log ind direkte
    if (host.authenticated) {
      req.session.host = {
        id: hostId,
        firstname: host.firstname,
        lastname: host.lastname,
        email: host.email
      };
      return res.redirect('/dashboard');
    }

    const twilioClient = req.app.get('twilioClient');
    const twilioNumber = req.app.get('twilioNumber');
    const toPhone = host.phone;

    if (!twilioClient || !twilioNumber) {
      return res.status(500).send("2FA er ikke konfigureret.");
    }

    if (!toPhone) {
      return res.status(400).send("Ingen telefonnummer tilknyttet. Tilføj venligst et nummer på din profil.");
    }

    const code = generateCode();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 min

    req.session.pending2FA = {
      code,
      expiresAt,
      host: {
        id: hostId,
        firstname: host.firstname,
        lastname: host.lastname,
        email: host.email,
        phone: host.phone
      }
    };

    await twilioClient.messages.create({
      from: twilioNumber,
      to: toPhone,
      body: `Din login-kode er: ${code} (gyldig i 5 min)`
    });

    res.redirect('/login-2fa');
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).send("Der skete en fejl under login.");
  }
});

router.get('/login-2fa', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/login-2fa.html'));
});

router.post('/login-2fa', async (req, res) => {
  const { code } = req.body;
  const pending = req.session.pending2FA;

  if (!pending) {
    return res.status(400).send('Ingen aktiv 2FA session. Log ind igen.');
  }

  if (Date.now() > pending.expiresAt) {
    req.session.pending2FA = null;
    return res.status(400).send('Koden er udløbet. Log ind igen.');
  }

  if (code !== pending.code) {
    return res.status(401).send('Forkert kode');
  }

  try {
    const db = req.app.get('db');
    await db.setHostAuthenticated(pending.host.id, true);

    req.session.host = pending.host;
    req.session.pending2FA = null;

    res.redirect('/dashboard');
  } catch (err) {
    console.error("2FA confirm error:", err);
    res.status(500).send('Kunne ikke bekræfte 2FA. Prøv igen.');
  }
});

// Step 1: brugeren sender email, vi sender en SMS-kode til det registrerede nummer
router.post('/forgot-password', async (req, res) => {
  const db = req.app.get('db');
  const { email } = req.body;

  if (!email) {
    return res.status(400).send('Email er påkrævet.');
  }

  try {
    const host = await db.findHostByEmail(email);
    if (!host || !host.phone) {
      return res.status(404).send('Ingen bruger eller intet telefonnummer fundet til den email.');
    }

    const twilioClient = req.app.get('twilioClient');
    const twilioNumber = req.app.get('twilioNumber');
    if (!twilioClient || !twilioNumber) {
      return res.status(500).send('SMS-opsætning mangler.');
    }

    const code = generateCode();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 min gyldig

    req.session.pendingReset = {
      email: host.email,
      phone: host.phone,
      code,
      expiresAt
    };

    await twilioClient.messages.create({
      from: twilioNumber,
      to: host.phone,
      body: `Din kode til nulstilling er: ${code} (gyldig i 5 min)`
    });

    return res.redirect('/forgot-password/code');
  } catch (err) {
    console.error('Forgot password start error:', err);
    return res.status(500).send('Der skete en fejl. Prøv igen.');
  }
});

// Step 2: verificer SMS-kode
router.post('/forgot-password/code', async (req, res) => {
  const { code } = req.body;
  const pending = req.session.pendingReset;

  if (!pending) {
    return res.status(400).send('Ingen aktiv nulstilling. Start forfra.');
  }

  if (Date.now() > pending.expiresAt) {
    req.session.pendingReset = null;
    return res.status(400).send('Koden er udløbet. Start forfra.');
  }

  if (pending.code !== code) {
    return res.status(401).send('Forkert kode.');
  }

  req.session.pendingResetVerified = true;
  return req.session.save(() => res.redirect('/forgot-password/reset'));
});

// Step 3: modtag nyt password og opdater DB
router.post('/forgot-password/reset', async (req, res) => {
  const db = req.app.get('db');
  const { newPassword, confirmPassword } = req.body;
  const pending = req.session.pendingReset;

  if (!pending || !req.session.pendingResetVerified) {
    return res.status(400).send('Ingen aktiv nulstilling. Start forfra.');
  }

  if (!newPassword || !confirmPassword) {
    return res.status(400).send('Begge kodeord er påkrævet.');
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).send('Adgangskoderne stemmer ikke overens.');
  }

  if (!passwordPolicy.test(newPassword)) {
    return res.status(400).send('Koden skal være mindst 8 tegn, med 1 stort bogstav og 1 tal.');
  }

  try {
    const password_hash = await bcrypt.hash(newPassword, 10);
    const affected = await db.updatePasswordByEmail(pending.email, password_hash);

    req.session.pendingReset = null;
    req.session.pendingResetVerified = null;

    if (!affected) {
      return res.status(500).send('Kunne ikke opdatere adgangskode.');
    }

    return res.redirect('/login');
  } catch (err) {
    console.error('Forgot password reset error:', err);
    return res.status(500).send('Der skete en fejl. Prøv igen.');
  }
});

module.exports = router;
