const express = require('express');
const path = require('path');
const router = express.Router();
const requireLogin = require('../middleware/requireLogin');

// GET /kalender -> serve dashboard kalender view
router.get('/kalender', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'Dashboard', 'nav', 'kalender.html'));
});

module.exports = router;
