const express = require('express');
const router = express.Router();
const path = require('path');

router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/login.html'));
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (username === 'saka' && password === '1234') {
    return res.redirect('/dashboard');
  }

  res.status(401).send('Forkert brugernavn eller kode');
});

module.exports = router;
