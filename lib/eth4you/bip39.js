var Buffer = require('./safe-buffer').Buffer
var randomBytes = require('./randomBytes')
var CryptoJS = require('./crypto-js')
var hasher = CryptoJS.algo.SHA512.create();

var unorm = require('./unorm')

function salt (password) {
  return 'mnemonic' + (password || '')
}

function mnemonicToSeed (mnemonic, password) {
  var mnemonicBuffer = Buffer.from(unorm.nfkd(mnemonic), 'utf8')
  var saltBuffer = Buffer.from(salt(unorm.nfkd(password)), 'utf8')

  var wordArray = CryptoJS.enc.Hex.parse(saltBuffer.toString('hex'));
  var C = CryptoJS.PBKDF2(mnemonicBuffer.toString(), wordArray, { iterations: 2048, keySize: 64/4, hasher: hasher });
  return C;
}

module.exports = {
  mnemonicToSeed: mnemonicToSeed
}
