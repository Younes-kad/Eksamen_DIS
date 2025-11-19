var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
// We serve plain HTML files (not using Pug), so remove view engine to avoid attempts to render Pug templates.


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);

// Login-side
app.get('/login', function(req, res) {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Signup-side
app.get('/signup', function(req, res) {
  res.sendFile(path.join(__dirname, 'views', 'signup.html'));
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // send a simple HTML error response (we're not using Pug)
  var status = err.status || 500;
  res.status(status);
  if (req.app.get('env') === 'development') {
    res.send('<h1>Error ' + status + '</h1><p>' + (err.message || '') + '</p><pre>' + (err.stack || '') + '</pre>');
  } else {
    res.send('<h1>Error ' + status + '</h1><p>Something went wrong.</p>');
  }
});

module.exports = app;

// If this file is run directly, start the server (so `node app.js` works)
if (require.main === module) {
  var port = process.env.PORT || 3001;
  app.set('port', port);
  app.listen(port, function() {
    console.log('Server listening on http://localhost:' + port);
  });
}



