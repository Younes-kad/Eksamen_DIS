const express = require('express');
const router = express.Router();
const path = require('path');

// denne route viser login-siden
router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/login.html'));
});

// denne route håndterer info fra login-formularen, når man trykker på "Log ind"
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Simpel midlertidig validering
  if (username === 'saka' && password === '1234') {
    return res.redirect('/index'); 
  }

  // Hvis forkert login
  res.status(401).send('Forkert brugernavn eller kode');
});

module.exports = router;
