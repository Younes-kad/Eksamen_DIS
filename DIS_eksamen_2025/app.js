var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var loginRouter = require('./routes/login');
var signupRouter = require('./routes/signup');
var profileRouter = require('./routes/profile');

var app = express();
const Db = require('./database/db.js');
const dbConfig = require('./database/config.js');
const db = new Db(dbConfig);
app.set('db', db);

const session = require('express-session');

app.use(session({
  secret: "superSecretKode2025",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 2 // 2 timer
  }
}));

// Views-mappe
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


// Routes
app.use('/', indexRouter);
app.use('/', loginRouter);
app.use('/', signupRouter);
app.use('/', profileRouter);

// 404 handler
app.use(function (req, res, next) {
  next(createError(404));
});

// Error handler
app.use(function (err, req, res, next) {
  var status = err.status || 500;
  res.status(status);

  if (req.app.get('env') === 'development') {
    res.send(`<h1>Error ${status}</h1><p>${err.message || ''}</p><pre>${err.stack || ''}</pre>`);
  } else {
    res.send(`<h1>Error ${status}</h1><p>Something went wrong.</p>`);
  }
});

// START SERVER
const PORT = process.env.PORT || 3001;
const HOST = "0.0.0.0"; // vigtigt for at den virker udefra

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log("http://207.154.203.120");
  console.log("http://localhost:3001");
});



module.exports = app;
