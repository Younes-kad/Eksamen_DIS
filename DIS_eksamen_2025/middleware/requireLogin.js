function requireLogin(req, res, next) {
  // Debug-log for at se hvad der ligger i sessionen
  if (process.env.DEBUG_AUTH === 'true') {
    console.log('requireLogin session.host =', req.session && req.session.host);
    console.log('req.path =', req.path);
  }

  if (req.session && req.session.host) {
    return next();
  }

  return res.redirect('/login');
}

module.exports = requireLogin;
