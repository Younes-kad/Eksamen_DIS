var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var loginRouter = require('./routes/login');
var signupRouter = require('./routes/signup');

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
app.use('/', loginRouter);
app.use('/', signupRouter);

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
  // bind host can be overridden by env var HOST (e.g. HOST=0.0.0.0)
  var host = process.env.HOST || '0.0.0.0';
  app.set('port', port);
  app.listen(port, host, function() {
    console.log('Server listening on port ' + port + ' (bound to ' + host + ')');
    if (process.env.PUBLIC_HOST) {
      console.log('Public URL: http://' + process.env.PUBLIC_HOST + ':' + port);
    } else {
      console.log('If you are on a remote host, open http://<HOST_IP>:' + port);
    }
  });
}


