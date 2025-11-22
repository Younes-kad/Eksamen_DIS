const express = require('express');
const router = express.Router();
const path = require('path');

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
      open_for_collab
    });

    console.log("Ny host oprettet:", newHostId);
    res.redirect('/login-2fa?signup=1');

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
