const express = require('express');
const router = express.Router();
const path = require('path');
const bcrypt = require('bcrypt');

router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/login.html'));
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

    req.session.host = {
      id: hostId,
      firstname: host.firstname,
      lastname: host.lastname,
      email: host.email
    };

    res.redirect('/dashboard');
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).send("Der skete en fejl under login.");
  }
});

module.exports = router;
