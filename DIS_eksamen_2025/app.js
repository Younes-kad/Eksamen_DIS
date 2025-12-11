var createError = require('http-errors');
var requireLogin = require('./middleware/requireLogin'); // importere middleware
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
require('dotenv').config();
var session = require('express-session');
var twilio = require('twilio');
var app = express();
const Db = require('./database/db.js');
const dbConfig = require('./database/config.js');
const db = new Db(dbConfig);

// Importer routere
var indexRouter = require('./routes/index');
var loginRouter = require('./routes/login');
var signupRouter = require('./routes/signup');
var profileRouter = require('./routes/profile');
var dashboardRouter = require('./routes/dashboard');
var messagesRouter = require('./routes/messages');


// Twillo opsætning 2fa
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// view engine setup
app.set('db', db);
app.set('twilioClient', twilioClient);
app.set('twilioNumber', process.env.TWILIO_PHONE_NUMBER);
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// middleware session bruges til at gmme 2fa og login state
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'en-meget-hemmelig-nøgle',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 30 // 30 min session
    }
  })
);


// de her er alle offentlige endpoints, som ikke kræver login dvs, ikke beskyttes af requireLogin middleware
const publicPaths = [
  '/',
  '/login',
  '/login-2fa',
  '/signup',
  '/forgot-password'
];

app.use((req, res, next) => {
  // Hjælp til fejlfinding af login-loop
  if (process.env.DEBUG_AUTH === 'true') {
    console.log('[AUTH] path:', req.path, 'sid:', req.sessionID, 'host:', req.session && req.session.host);
  }

  if (publicPaths.includes(req.path)) {
    return next(); // Offentlige sider, gives adgang uden login
  }

  return requireLogin(req, res, next); // alt andet kræver login
});


// register alle routere (indeholder /dashboard, /kalender, /chat, /api/me, /logout)
app.use('/', dashboardRouter);
app.use('/', indexRouter);
app.use('/', loginRouter);
app.use('/', signupRouter);
app.use('/', profileRouter);
app.use('/', messagesRouter);


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
