var express = require('express');
var path = require('path');
var router = express.Router();

// Forsiden: vi sender bare det statiske index.html afsted
router.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, '..', 'views', 'index.html'));
});

module.exports = router;
