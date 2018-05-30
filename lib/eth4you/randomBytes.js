'use strict'
function oldBrowser (size) {
  if(typeof window === 'undefined') {
        var rawBytes = new global.Uint8Array(size)
	for(var i = 0;i < size;i++)
		rawBytes[i] = Math.floor((Math.random() * 256) + 1);
	//return new Buffer('beea10f77c8680d5daea4cb38f0c257c3c8c6c0d0ad4c0da3a9eb56644b01c1f','hex');
        return Buffer.from(rawBytes.buffer)
  }
  throw new Error('secure random number generation not supported by this browser\nuse chrome, FireFox or Internet Explorer 11')
}
var Buffer = require('./safe-buffer').Buffer
var crypto = global.crypto || global.msCrypto
if (crypto && crypto.getRandomValues) {
  module.exports = randomBytes
} else {
  module.exports = oldBrowser
}
function randomBytes (size) {
  var rawBytes = new global.Uint8Array(size)
  crypto.getRandomValues(rawBytes)
  return Buffer.from(rawBytes.buffer)
}
