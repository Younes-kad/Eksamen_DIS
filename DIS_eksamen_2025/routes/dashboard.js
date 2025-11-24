const express = require('express');
const path = require('path');
const router = express.Router();
const requireLogin = require('../middleware/requireLogin');

// GET /dashboard (protected)
router.get('/dashboard', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'dashboard.html'));
});

// GET /kalender (protected)
router.get('/kalender', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'Dashboard', 'nav', 'kalender.html'));
});

// GET /chat (public)
router.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'Chat.html'));
});

// GET /salg (protected)
router.get('/salg', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'salg.html'));
});

// GET /storefront (protected)
router.get('/storefront', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'Storefront.html'));
});

// redirect legacy /Chat -> /chat
router.get('/Chat', (req, res) => {
  res.redirect(301, '/chat');
});

// GET /api/me (protected) - returns basic host profile from DB
router.get('/api/me', requireLogin, async (req, res) => {
  try {
    const db = req.app.get('db');
    const host = await db.findHostByEmail(req.session.host.email);

    if (!host) {
      req.session.destroy(() => {});
      return res.status(401).send('Bruger ikke fundet.');
    }

    const hostId = host.host_id || host.id;

    res.json({
      id: hostId,
      firstname: host.firstname,
      lastname: host.lastname,
      email: host.email,
      phone: host.phone,
      city: host.city,
      bio: host.bio
    });
  } catch (err) {
    console.error('Fejl ved hentning af brugerdata:', err);
    res.status(500).send('Kunne ikke hente brugerdata.');
  }
});

// GET /logout - destroy session and redirect to root
router.get('/logout', (req, res) => {
  req.session.destroy(() => {});
  res.clearCookie('connect.sid');
  res.redirect('/');
});

module.exports = router;
