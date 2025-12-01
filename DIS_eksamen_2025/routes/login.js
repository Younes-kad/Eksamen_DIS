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

router.post('/forgot-password', async (req, res) => {
  const db = req.app.get('db');
  const { email, newPassword, confirmPassword } = req.body;

  if (!email || !newPassword || !confirmPassword) {
    return res.status(400).send('Email og begge kodeord er påkrævet.');
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).send('Adgangskoderne stemmer ikke overens.');
  }

  if (!passwordPolicy.test(newPassword)) {
    return res.status(400).send('Koden skal være mindst 8 tegn, med 1 stort bogstav og 1 tal.');
  }

  try {
    const host = await db.findHostByEmail(email);
    if (!host) {
      return res.status(404).send('Ingen bruger med den email.');
    }

    const password_hash = await bcrypt.hash(newPassword, 10);
    const affected = await db.updatePasswordByEmail(email, password_hash);

    if (!affected) {
      return res.status(500).send('Kunne ikke opdatere adgangskode.');
    }

    return res.redirect('/login');
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).send('Der skete en fejl. Prøv igen.');
  }
});

module.exports = router;
