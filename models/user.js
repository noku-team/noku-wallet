var mongoose = require('mongoose');
var sha3 = require('js-sha3').keccak256;

var userSchema = mongoose.Schema({
  username: String,
  email: String,
  password: String,
  name: String,
  address: String
});

// var UserSchema = new mongoose.Schema({
//   email: {
//     type: String,
//     unique: true,
//     required: true,
//     trim: true
//   },
//   // username: {
//   //   type: String,
//   //   unique: true,
//   //   required: true,
//   //   trim: true
//   // },
//   password: {
//     type: String,
//     required: true,
//   }
// });

userSchema.methods.generateHash = function(password) {
  // console.log('password ' + password);
  return "";
  // return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

userSchema.methods.verifyPassword = function(password) {
  // console.log("verifyPassword ------> password: " + password + " this.user.password: " + this);
  return password == this.password; //bcrypt.compareSync(password, this.user.password);
};

userSchema.methods.updateUser = function(request, response) {
  // console.log("updateUser");
  this.user.name = request.body.name;
  this.user.address = request.body.address;
  this.user.save();
  //response.redirect('/user');
};

module.exports = mongoose.model('user', userSchema, 'user');
