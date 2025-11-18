var express = require('express');
var path = require('path');
var router = express.Router();

/* GET home page. Serve the static HTML instead of rendering with Pug */
router.get('/', function(req, res, ) {
  res.sendFile(path.join(__dirname, '..', 'views', 'index.html'));
});

router.get('/dashboard', function(req, res, ) {
  res.sendFile(path.join(__dirname, '..', 'views', 'dashboard.html'));
});

router.get('/chat', function(req, res) {
  res.sendFile(path.join(__dirname, '..', 'views', 'Chat.html'));
});

router.get('/Chat', function(req, res) {
  res.redirect(301, '/chat');
});

module.exports = router;
