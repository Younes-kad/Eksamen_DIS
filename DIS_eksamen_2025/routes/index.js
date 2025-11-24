var express = require('express');
var path = require('path');
var router = express.Router();

/* GET home page. Serve the static HTML instead of rendering with Pug */
router.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, '..', 'views', 'index.html'));
});

module.exports = router;
