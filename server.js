process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
var express = require('express');
var ejs = require('ejs-locals');

var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');

var expressSanitized = require('express-sanitize-escape');
var helmet = require('helmet');

var path = require('path');
var session = require('express-session');
// var cookieSession = require('cookie-session');
var passport = require('passport');

var app = express();
var flash = require('connect-flash');

var http = require('http')
var server = http.createServer(app);

nokuAddress = "0x1fc52f1abade452dd4674477d4711951700b3d27";

var checkServer = require("./config/checkserver/checkserver.js");

checkServer.startCheckMaster();

apiServer = checkServer.servers;

var mainnet = {};

var User = require('./models/user');

app.set('trust proxy', 1);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(expressSanitized.middleware());
app.use(cookieParser());
app.use(helmet());

app.use('/content', express.static(path.join(__dirname, 'content')));
app.use(express.static(path.join(__dirname, 'favicon')));

app.engine('ejs', ejs);
app.set('view engine', 'ejs');

require('./config/passport')(passport);

app.use(session({
  secret: 'RDKxt wZ6ypZA4LnE^57 %$znlm7 nbE70rR NEL',
  saveUninitialized: false,
  resave: false,
  name: "nokuwallet.sid",
  cookie: {
    path: '/',
    httpOnly: true,
    //secure: false,
    domain: !process.env.IS_PRODUCTION ? 'localhost' : '.noku.io',
    maxAge: 24 * 60 * 60 * 1000 //1 day - con il rolling: true viene ad ogni richiesta viene riazzerato
  },
  //rolling: true//,
  // store: sessionStore
}));

// var secretKey = '7wS8peF M3#FS_rMGf11^WKm!7T Uxka#1';

// app.use(cookieParser({
//   secret: secretKey
// }));

// app.use(cookieSession({
//   name: 'NSID',
//   keys: [secretKey],
 
//   maxAge: 24 * 60 * 60 * 1000
// }));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use(function(req, res, next) {
  res.locals.login_message = req.flash('login_message');
  res.locals.signup_message = req.flash('signup_message');
  res.locals.success_message_popup = req.flash('success_message_popup');
  res.locals.success_title_popup = req.flash('success_title_popup');
  res.locals.error_messages = req.flash('error_messages');
  res.locals.isAuthenticated = req.isAuthenticated();
  res.locals.currentUser = req.user;

  var addresslist = JSON.parse(req.cookies.addressbook || req.cookies.account || "[]");

  res.locals.addresslist = addresslist;

  res.locals.currentaddressobj = {};

  if(addresslist.length > 0){

    var lastIndexOf = req.path.lastIndexOf("/address/");
    if(lastIndexOf >= 0) {
      var currentaddress = req.path.substring(lastIndexOf + 9);

      res.locals.currentaddressobj = addresslist.filter(function(obj){
        return obj.address == currentaddress;
      })[0] || {};
    }
  }
  next();
});

require('./routes/routes.js')(app, passport, server);

var port = process.env.PORT || 8080;

server.listen(port, function() {
  console.log('Node.js listening on port ' + port)
});

process.stdin.resume(); //so the program will not close instantly

function exitHandler(options, err) {
  if (options.cleanup) console.log('clean');
  if (err) console.log(err.stack || err);
  if (options.exit) {
    // db.close();
    process.exit();
  }
}

//do something when app is closing
process.on('exit', exitHandler.bind(null, {
  cleanup: true
}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {
  exit: true
}));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, {
  exit: true
}));
process.on('SIGUSR2', exitHandler.bind(null, {
  exit: true
}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {
  exit: true
}));
