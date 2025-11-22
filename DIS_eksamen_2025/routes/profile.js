const express = require('express');
const path = require('path');
const requireLogin = require('../middleware/requireLogin');

const router = express.Router();

router.get('/profile', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'profile.html'));
});

router.post('/profile', requireLogin, async (req, res) => {
  const db = req.app.get('db');

  try {
    const hostId = req.session.host.id;
    const {
      firstname,
      lastname,
      email,
      phone,
      city,
      bio
    } = req.body;

    if (!firstname || !lastname || !email) {
      return res.status(400).send("Fornavn, efternavn og email er påkrævet.");
    }

    const updated = await db.updateHostById(hostId, {
      firstname,
      lastname,
      email,
      phone,
      city,
      bio
    });

    if (!updated) {
      return res.status(404).send("Bruger ikke fundet.");
    }

    req.session.host = {
      id: updated.host_id,
      firstname: updated.firstname,
      lastname: updated.lastname,
      email: updated.email
    };

    res.json(updated);
  } catch (err) {
    console.error("Profil-opdatering fejl:", err);

    if (err.code === 'EREQUEST' && err.originalError?.number === 2627) {
      return res.status(400).send("Emailen er allerede i brug.");
    }

    res.status(500).send("Kunne ikke opdatere profil.");
  }
});

module.exports = router;
