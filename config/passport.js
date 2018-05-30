// var LocalStrategy = require('passport-local').Strategy;
var OAuth2Strategy = require('passport-oauth2');

var configOAuth2 = require("../config/configOAuth2");

module.exports = function(passport) {
  passport.serializeUser(function(user, done) {
    done(null, user);
  });

  passport.deserializeUser(function(user, done) {
    done(null, user);
  });

  var authorizationHeader = 'Basic '+ new Buffer(configOAuth2.clientID + ':' + configOAuth2.clientSecret).toString('base64');

  var NokuOAuth2Strategy = new OAuth2Strategy(
    {
      authorizationURL: configOAuth2.apiHost + '/api/oauth2/authorize',
      tokenURL: configOAuth2.apiHost + '/api/oauth2/token',
      clientID: configOAuth2.clientID,
      clientSecret: configOAuth2.clientSecret,
      callbackURL: configOAuth2.currentHost + "/auth/callback",
      customHeaders: { Authorization: authorizationHeader },
      passReqToCallback: true
    },
    function (req, accessToken, refreshToken, profile, cb) {
      process.nextTick(function () {
        if (profile._id) {
          req.session.accessToken = accessToken;
          return cb(null, profile);
        }
      });
    }
  );

  NokuOAuth2Strategy._oauth2.useAuthorizationHeaderforGET(true);

  NokuOAuth2Strategy.userProfile = function(accessToken, done) {
    this._oauth2.get(configOAuth2.apiHost + "/api/user/info", accessToken, function(err, data, response){
      if (err) { return done(err); }
      try {
          data = JSON.parse( data );
      }
      catch(e) {
        return done(e);
      }
      return done(null, data);
    });
  }

  passport.use('nokuoauth2', NokuOAuth2Strategy);
}
