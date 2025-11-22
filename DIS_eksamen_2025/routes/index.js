var express = require('express');
var path = require('path');
var router = express.Router();
const requireLogin = require('../middleware/requireLogin');

/* GET home page. Serve the static HTML instead of rendering with Pug */
router.get('/', function(req, res, ) {
  res.sendFile(path.join(__dirname, '..', 'views', 'index.html'));
});

router.get('/dashboard', requireLogin, function(req, res) {
  res.sendFile(path.join(__dirname, '..', 'views', 'dashboard.html'));
});

router.get('/kalender', requireLogin, function(req, res) {
  res.sendFile(path.join(__dirname, '..', 'views', 'kalender.html'));
});

router.get('/api/me', requireLogin, async function(req, res) {
  try {
    const db = req.app.get('db');
    const host = await db.findHostByEmail(req.session.host.email);

    if (!host) {
      req.session.destroy(() => {});
      return res.status(401).send("Bruger ikke fundet.");
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
    console.error("Fejl ved hentning af brugerdata:", err);
    res.status(500).send("Kunne ikke hente brugerdata.");
  }
});

router.get('/chat', function(req, res) {
  res.sendFile(path.join(__dirname, '..', 'views', 'Chat.html'));
});

router.get('/Chat', function(req, res) {
  res.redirect(301, '/chat');
});

module.exports = router;
