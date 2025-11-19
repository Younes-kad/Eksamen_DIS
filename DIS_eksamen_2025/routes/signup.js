const exxpress = require('express');
const router = exxpress.Router();
const path = require('path');

router.get('/signup', (req, res) => { 
  res.sendFile(path.join(__dirname, '../views/signup.html'));
});