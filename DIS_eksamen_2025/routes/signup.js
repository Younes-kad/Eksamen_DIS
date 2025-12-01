const express = require('express');
const router = express.Router();
const path = require('path');
const { generateKeyPairSync } = require('crypto');

router.get('/signup', (req, res) => { 
  res.sendFile(path.join(__dirname, '../views/signup.html'));
});

const bcrypt = require('bcrypt');

router.post('/signup', async (req, res) => {
  const db = req.app.get('db');
  try {
    const {
      firstname,
      lastname,
      email,
      password,
      confirmPassword,
      phone,
      birthdate,
      city,
      bio,
      is_company,
      cvr,
      open_for_collab
    } = req.body;

    if (password !== confirmPassword) {
      return res.status(400).send("Adgangskoderne stemmer ikke overens.");
    }

    const password_hash = await bcrypt.hash(password, 10);
    const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const public_key = publicKey.export({ type: 'pkcs1', format: 'pem' });
    const private_key = privateKey.export({ type: 'pkcs1', format: 'pem' });

    const newHostId = await db.createHost({
      firstname,
      lastname,
      email,
      password_hash,
      phone,
      birthdate,
      city,
      bio,
      is_company,
      cvr,
      open_for_collab,
      public_key,
      private_key
    });

    console.log("Ny host oprettet:", newHostId);

    // Generate 2FA code and store pending session for verification
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    req.session.pending2FA = {
      code,
      expiresAt,
      host: {
        id: newHostId,
        firstname,
        lastname,
        email,
        phone
      }
    };

    // Try to send via Twilio configured on app
    try {
      const twilioClient = req.app.get('twilioClient');
      const twilioNumber = req.app.get('twilioNumber');

      if (!twilioClient || !twilioNumber) {
        console.error('Twilio not configured; cannot send signup SMS');
        if (process.env.DEV_SHOW_CODE === 'true') {
          return res.redirect(`/login-2fa?signup=1&debug_code=${encodeURIComponent(code)}`);
        }
        return res.redirect('/login-2fa?signup=1');
      }

      if (!phone) {
        console.error('No phone provided for new host', newHostId);
        if (process.env.DEV_SHOW_CODE === 'true') {
          return res.redirect(`/login-2fa?signup=1&debug_code=${encodeURIComponent(code)}`);
        }
        return res.redirect('/login-2fa?signup=1');
      }

      console.log('Sending signup 2FA to', phone);
      const result = await twilioClient.messages.create({
        from: twilioNumber,
        to: phone,
        body: `Din registreringskode er: ${code} (gyldig i 5 min)`
      });

      console.log('Signup SMS sent, sid=', result && result.sid);
      return res.redirect('/login-2fa?signup=1');
    } catch (err) {
      console.error('Error sending signup SMS:', err && err.message ? err.message : err);
      if (process.env.DEV_SHOW_CODE === 'true') {
        return res.redirect(`/login-2fa?signup=1&debug_code=${encodeURIComponent(code)}`);
      }
      // fallback: still redirect to the 2FA page so the user continues the flow
      return res.redirect('/login-2fa?signup=1');
    }

  } catch (err) {
    console.error("Signup error:", err);
  
    // Duplicate email check (SQL error 2627 = UNIQUE constraint violation)
    if (err.code === 'EREQUEST' && err.originalError?.number === 2627) {
      return res.status(400).send("Emailen er allerede i brug.");
    }
  
    return res.status(500).send("Der skete en fejl ved oprettelse af bruger.");
  }
});

module.exports = router;
