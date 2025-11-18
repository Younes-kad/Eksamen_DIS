var express = require('express');
var path = require('path');
var router = express.Router();

/* GET home page. Serve the static HTML instead of rendering with Pug */
router.get('/', function(req, res, next) {
  res.sendFile(path.join(__dirname, '..', 'views', 'index.html'));
});

router.get('/dashboard', function(req, res, next) {
  res.sendFile(path.join(__dirname, '..', 'views', 'dashboard.html'));
});

module.exports = router;
