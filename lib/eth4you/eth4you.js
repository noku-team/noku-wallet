'use strict'

var TIMEOUT = 20000;
var MASTER_SECRET = 'Bitcoin seed';
var HARDENED_OFFSET = 0x80000000;
var jaxxPath = "m/44'/60'/0'/0"; // first address: m/44'/60'/0'/0/0 Jaxx, Metamask, Exodus, Trezor, Digital Bitbox
var ledgerPath =  "m/44'/60'/0'"; // first address: m/44'/60'/0/0	Ledger
var eidooPath =  "m/44'/60'/0";

var bip39 = require('./bip39.js');
var EC = require('./elliptic.min.js').ec;
//var EC = require('./elliptic.js').ec;
var ec = new EC('secp256k1');
var sha3 = require('./sha3').keccak256;
var scrypt = require('./scrypt');
var randomBytes = require('./randomBytes');
var CryptoJS = require('./crypto-js')
var hasher = CryptoJS.algo.SHA256.create();
var toUtf8 = require('./solidity/utils.js').toUtf8;
var utils = require('./solidity/utils.js');
var uuidv4 = require('./uuidv4')
var BigNumber = require('./bignumber')
var rlp = require('./rlp')
//var __tokens = require('./tokens');
var ens = require('./ens.js');

var __blockies = require('./blockies')	// da includere per browserify in noku.js
var __QRCode = require('./qrcode')	// da includere per browserify in noku.js


const wei2ether = '1000000000000000000';

var errorMessage;

//exports.tokens = __tokens.tokens;
exports.randomBytes = randomBytes;
exports.toUtf8 = toUtf8;
exports.sha3 = sha3;
exports.ens = ens;
exports.uuid = uuidv4;

var outputFormat = { decimalSeparator: '.', groupSeparator: ',' , groupSize : 3 };
var inputFormat = { decimalSeparator: '.', groupSeparator: ',' , groupSize : 3 };
//var inputFormat = { decimalSeparator: '.'};

BigNumber.config({ FORMAT: outputFormat } );

exports.formatInputString = function(value) {
    var result = utils.fromUtf8(value).substr(2);
    var length = result.length / 2;
    var l = Math.floor((result.length + 63) / 64);
    result = utils.padRight(result, l * 64);
    result = padLeft((new BigNumber((String(length))).toString(16)), 64) + result;
    return result;
}
exports.formatInputBytes = function (value) {
    var result = utils.toHex(value).substr(2);
    var l = Math.floor((result.length + 63) / 64);
    result = utils.padRight(result, l * 64);
    return result;
};
if(typeof window !== "undefined") {
	exports.blockies = window.blockies;
	exports.QRCode = window.QRCode;
}

const tokenBalanceHex  = "0x70a08231";
const tokenTransferHex = "0xa9059cbb";
const tokenDecimals    = "0x313ce567";
const tokenName        = "0x06fdde03";
const tokenSymbol      = "0x95d89b41";
const tokenNotERC20    = "0x76809ce3";		// decimal e non decimals

var namehash = function(name) {
	return "0x" + sha3(name).substr(0,8);
}
exports.getParameterByName = function(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}
exports.setCookie = function(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}
exports.getCookie = function(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for(var i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}
exports.dateString = function(time) {
	var D = new Date(time*1000);
	//D.setHours(D.getHours() + (D.getTimezoneOffset()/60));
	D.setTime(D.getTime() + D.getTimezoneOffset() * 60 * 1000);
	
	
	var h = D.getHours();
	var m = D.getMinutes();
	var s = D.getSeconds();
	var d = D.getDate();
	var M = D.getMonth() + 1;
	var y = D.getFullYear();
	if(h < 10)
		h = '0' + h;
	if(m < 10)
		m = '0' + m;
	if(s < 10)
		s = '0' + s;
	if(d < 10)
		d = '0' + d;
	if(M < 10)
		M = '0' + M;
	//return h + ":" + m + ":" + s + " " + M + "/" + d + "/" + y;
	return y + "-" + M + "-" + d + " " + h + ":" + m + ":" + s;
}
exports.timeDate = function(date) {
	var y = parseInt(date.substr(0,4));
	var M = parseInt(date.substr(5,2)) -1;
	var d = parseInt(date.substr(8,2));
	var h = parseInt(date.substr(11,2));
	var m = parseInt(date.substr(14,2));

	var D = new Date();
	D.setFullYear(y);
	D.setMonth(M);
	D.setDate(d);
	D.setHours(h);
	D.setMinutes(m);
	D.setSeconds(0);
	D.setTime(D.getTime() - D.getTimezoneOffset() * 60 * 1000);
	return parseInt(D.getTime() / 1000);
}
exports.elapsed = function(diff) {
	//var now = new Date();
	//var diff = Math.floor(now.getTime()/1000) - seconds;
	if(diff < 60) {
		if(diff <= 1)
			return "1 sec";
		return diff + " secs";
	}
	var m = Math.floor(diff/60);
	if(m < 60) {
		var s = diff % 60;
		var ret = m + " min";
		if(m > 1)
			ret += "s";
		if(m == 0)
			ret = "";
		else if(s >= 1)
			ret += ' ';
		if(s > 1)
			return ret + s + " secs";
		if(s == 1)
			return ret + s + " sec";
		return ret;
	}
	diff = Math.floor(diff/60);
	var h = Math.floor(diff/60);
	if(h < 60) {
		var m = diff % 60;
		var ret = h + " hr";
		if(h > 1)
			ret += "s";
		if(h == 0)
			ret = "";
		else if(m >= 1)
			ret += ' ';
		if(m > 1)
			return ret + m + " mins";
		if(m == 1)
			return ret + m + " min";
		return ret;
	}
	diff = Math.floor(diff/60);
	var d = Math.floor(diff/24);
	var h = diff % 24;
	var ret = d + " day";
	if(d > 1)
		ret += "s";
	if(d == 0)
		ret = "";
	else if(d >= 1)
		ret += ' ';
	if(h > 1)
		return ret + h + " hrs";
	if(h == 1)
		return ret + h + " hr";
	return ret;
}
exports.LOGIN = function(url,method,params,callback,headers) {
	exports.AJAX(url,method,params,callback,headers,1);
}
exports.EXCHANGE = function(url,method,params,callback,headers) {
	exports.AJAX(url,method,params,callback,headers,2);
}
var lastSwitch;
var GetTime = function() {
	var now = new Date();
	return now.getTime() / 1000;
}
exports.AJAX = function(url,method,params,callback,headers,login) {
	var timeout = TIMEOUT;
	if(login == 2)
		timeout = 15*60*1000;
	if(!method) {
		if(params) {
			for(var label in params)
				url += "&"+label+"="+params[label];
		}
		$.ajax(url, { timeout: timeout, dataType: 'json', headers : headers,
			success: function(data) { callback(data) },
			error: function(jqXHR,state,errorThrown) {
				if(login) return callback(null,jqXHR,state,errorThrown);
				if(lastSwitch) {
					var now = GetTime();
					if(now - lastSwitch < 60)
						return callback(null);
				}
				lastSwitch = GetTime();
				if(nodeSelected.url == nodeSelected.primary)
					nodeSelected.url = nodeSelected.backup;
				else
					nodeSelected.url = nodeSelected.primary;
				var index = url.indexOf('//'); index = url.indexOf('/',index+2);
				if(index > 0)
					url = nodeSelected.url + url.substr(index);
				else
					url = nodeSelected.url;
				$.ajax(url, { timeout: timeout, dataType: 'json', headers : headers,
					success: function(data) { if(login) data.readonly = 1; callback(data) },
					error: function(jqXHR,state,errorThrown) { return callback(null,jqXHR,state,errorThrown) }
				});
			}
		});
	} else {
		if(!params)
			params = [];
		else if(typeof params.length == 'undefined')
			params = [ params ];
		var data = JSON.stringify({ jsonrpc: '2.0',id: exports.randomId(),method: method, params:  params });
		$.ajax(url, { type: 'POST', contentType: "application/json", accept: "application/json", timeout: timeout, headers : headers,data: data,
			success: function(data) { callback(data) },
			error: function(jqXHR,state,errorThrown) {
				if(lastSwitch) {
					var now = GetTime();
					if(now - lastSwitch < 60)
						return callback(null);
				}
				lastSwitch = GetTime();
				if(nodeSelected.url == nodeSelected.primary)
					nodeSelected.url = nodeSelected.backup;
				else
					nodeSelected.url = nodeSelected.primary;
				var index = url.indexOf('//'); index = url.indexOf('/',index+2);
				if(index > 0)
					url = nodeSelected.url + url.substr(index);
				else
					url = nodeSelected.url;
				$.ajax(url, { type: 'POST', contentType: "application/json", accept: "application/json", timeout: timeout, headers : headers,data: data,
					success: function(data) { callback(data) },
					error: function(jqXHR,state,errorThrown) { return callback(null,jqXHR,state,errorThrown) }
				});
			}
		});
	}
}
exports.generatePrivateKey = function() {
	return randomBytes(32).toString("hex");
}
exports.bigNumber = function(s) {
	try {
		return new BigNumber(s);
	} catch(e) {
		return new BigNumber(0);
	}
}
exports.defineErrorMessage = function(callback) {
	errorMessage = callback;
}
exports.randomId = function() {
	return randomBytes(16).readUInt32LE();
}

exports.validateHexString = function(str) {
	if (str == "" || str == null) return true;
	str = str.substring(0, 2) == '0x' ? str.substring(2).toUpperCase() : str.toUpperCase();
	var re = /^[0-9A-F]+$/g;
	return re.test(str);
}
exports.weiToEther = function(number) {
	try {
		var returnValue = new BigNumber(number).div(wei2ether);
		return returnValue.toString();
	} catch(e) {
		capture(e);
		return null;
	}
};
exports.weiize = function(wei) {
	return new BigNumber(wei);
}
exports.etherize = function(wei) {
	var ether = new BigNumber(wei).div(wei2ether);
	return ether.round(3).toFormat();
}
exports.etherize5 = function(wei) {
	var ether = new BigNumber(wei).div(wei2ether);
	return ether.round(5).toFormat();
}
exports.etherizeN = function(wei) {
	var ether = new BigNumber(wei).div(wei2ether);
	return ether.toFormat();
}
exports.getTokenBalanceData = function(address) {
	try {
		return getDataObj(tokenBalanceHex,[getNakedAddress(address)]);
	} catch(e) {
		capture(e);
		return null;
	}
}
exports.addressFromPrivate = function (privkey) {
	return addressFromPublic(keyPublicFromPrivate(privkey));
}
exports.Now = function() {
	var d = new Date();
	var day = d.getDate();
	var month = d.getMonth() + 1;
	var year = d.getFullYear();
	if (day < 10)
		day = "0" + day;
	if (month < 10)
		month = "0" + month;
	var hour = d.getHours();
	if (hour < 10)
		hour = "0" + hour;
	var min = d.getMinutes() + 1;
	if (min < 10)
		min = "0" + min;
	var sec = d.getSeconds();
	if (sec < 10)
		sec = "0" + sec;
	return day + "/" + month + "/" + year + " " + hour + ':' + min + ':' + sec;
}
exports.filenameV3 = function(privkey) {
    var ts = new Date();
    return ['UTC--', ts.toJSON().replace(/:/g, '-'), '--', exports.addressFromPrivate(privkey)].join('')
}

exports.toV3 = function(privkey,password,name) {
	var address = exports.addressFromPrivate(privkey);

	var salt = randomBytes(32);
	var iv   = randomBytes(16);
	var kdfparams = { dklen: 32, salt: salt.toString('hex'), n: 1024, r: 8, p: 1 }

	var derivedKey = scrypt(password, salt, kdfparams.n, kdfparams.r, kdfparams.p, kdfparams.dklen)
	var ciphertext = aes_128_ctr_encrypt(privkey,derivedKey.slice(0,16),iv);

	var mac = sha3(Buffer.concat([derivedKey.slice(16, 32), new Buffer(ciphertext, 'hex')]))
	var ret = {
		version: 3,
		id: uuidv4({ random: randomBytes(16) }),
		address: address,
		Crypto: {
		    ciphertext: ciphertext.toString('hex'),
		    cipherparams: {
			iv: iv.toString('hex')
		    },
		    cipher: 'aes-128-ctr',
		    kdf: 'scrypt',
		    kdfparams: kdfparams,
		    mac: mac.toString('hex')
		}
	    }
	;
	if(name)
		ret.wallet_name = name;
	return JSON.stringify(ret);
}
exports.generateValue = function(value) {
	return '0x' + decimalToHex(new BigNumber((String(value))).times(wei2ether));
}
exports.speedupTx = function(to,value,gasPrice,gasLimit,data,chainId,privkey,nonce) {
   var h;
   try {
	   gasPrice = new BigNumber(gasPrice).times(1000).times(1000).times(1000).toString();
	   var rawTx = {
		nonce: sanitizeHex(nonce),
		gasPrice: sanitizeHex(decimalToHex(gasPrice)),
		gasLimit: sanitizeHex(gasLimit),
		to: sanitizeHex(to),
		value: sanitizeHex(value),
		data: sanitizeHex(data)
	    }
	    h = signTx(rawTx,chainId,privkey);
     } catch(e) {
	capture(e);
	return null;
     }
     return "0x" + rlp.encode(h.raw).toString('hex');
}
exports.generateApproveCustomToken = function(token,to,value,gasPrice,gasLimit,chainId,privkey,nonce) {
   var h;
   try {
	   var data;

	   if(!isValidAddress(to)) throw new Error('Not a valid address')
	   if (!isNumeric(value) || parseFloat(value) < 0) throw "Not a valid amount";
	   value = padLeft(new BigNumber((String(value))).times(new BigNumber(10).pow(token.dec)).toString(16), 64);
	   to    = padLeft(getNakedAddress(to), 64);
	   data  = namehash("approve(address,uint256)") + to + value;

	   if (!isNumeric(gasLimit) || parseFloat(gasLimit) <= 0) throw 'Please enter a valid gas limit (Must be integer. Try 21000-4000000). ';
	   if(!nonce)
		nonce = "0x00";
	   gasPrice = new BigNumber(gasPrice).times(1000).times(1000).times(1000).toString();
	   var rawTx = {
		nonce: sanitizeHex(nonce),
		gasPrice: sanitizeHex(decimalToHex(gasPrice)),
		gasLimit: sanitizeHex(decimalToHex(gasLimit)),
		to: sanitizeHex(token.addr),
		value: '0x00',
		data: sanitizeHex(data)
	    }
	    h = signTx(rawTx,chainId,privkey);
     } catch(e) {
	capture(e);
	return null;
     }
     return "0x" + rlp.encode(h.raw).toString('hex');
}
exports.generateMintCustomToken = function(token,to,value,gasPrice,gasLimit,chainId,privkey,nonce) {
   var h;
   try {
	   var data;

	   if(!isValidAddress(to)) throw new Error('Not a valid address')
	   if (!isNumeric(value) || parseFloat(value) < 0) throw "Not a valid amount";
	   value = padLeft(new BigNumber((String(value))).times(new BigNumber(10).pow(token.dec)).toString(16), 64);
	   to    = padLeft(getNakedAddress(to), 64);
	   data  = namehash("mint(address,uint256)") + to + value;

	   if (!isNumeric(gasLimit) || parseFloat(gasLimit) <= 0) throw 'Please enter a valid gas limit (Must be integer. Try 21000-4000000). ';
	   if(!nonce)
		nonce = "0x00";
	   gasPrice = new BigNumber(gasPrice).times(1000).times(1000).times(1000).toString();
	   var rawTx = {
		nonce: sanitizeHex(nonce),
		gasPrice: sanitizeHex(decimalToHex(gasPrice)),
		gasLimit: sanitizeHex(decimalToHex(gasLimit)),
		to: sanitizeHex(token.addr),
		value: '0x00',
		data: sanitizeHex(data)
	    }
	    h = signTx(rawTx,chainId,privkey);
     } catch(e) {
	capture(e);
	return null;
     }
     return "0x" + rlp.encode(h.raw).toString('hex');
}
exports.generateBurnCustomToken = function(token,value,gasPrice,gasLimit,chainId,privkey,nonce) {
   var h;
   try {
	   var data;

	   if (!isNumeric(value) || parseFloat(value) < 0) throw "Not a valid amount";
	   value = padLeft(new BigNumber((String(value))).times(new BigNumber(10).pow(token.dec)).toString(16), 64);
	   data  = namehash("burn(uint256)") + value;

	   if (!isNumeric(gasLimit) || parseFloat(gasLimit) <= 0) throw 'Please enter a valid gas limit (Must be integer. Try 21000-4000000). ';
	   if(!nonce)
		nonce = "0x00";
	   gasPrice = new BigNumber(gasPrice).times(1000).times(1000).times(1000).toString();
	   var rawTx = {
		nonce: sanitizeHex(nonce),
		gasPrice: sanitizeHex(decimalToHex(gasPrice)),
		gasLimit: sanitizeHex(decimalToHex(gasLimit)),
		to: sanitizeHex(token.addr),
		value: '0x00',
		data: sanitizeHex(data)
	    }
	    h = signTx(rawTx,chainId,privkey);
     } catch(e) {
	capture(e);
	return null;
     }
     return "0x" + rlp.encode(h.raw).toString('hex');
}
exports.generateCreateCustomToken = function(addr,name,symbol,decimals,gasPrice,gasLimit,chainId,privkey,nonce) {
   var h;
   try {
	   var data;

	   data     = namehash("createCustomToken(string,string,uint8)")
           data    += padLeft("60",64);
           data    += padLeft("a0",64);
	   data    += padLeft(new BigNumber((String(decimals))).toString(16), 64);
	   data    += exports.formatInputString(name);
	   data    += exports.formatInputString(symbol);

	   if (!isNumeric(gasLimit) || parseFloat(gasLimit) <= 0) throw 'Please enter a valid gas limit (Must be integer. Try 21000-4000000). ';
	   if(!nonce)
		nonce = "0x00";
	   gasPrice = new BigNumber(gasPrice).times(1000).times(1000).times(1000).toString();
	   var rawTx = {
		nonce: sanitizeHex(nonce),
		gasPrice: sanitizeHex(decimalToHex(gasPrice)),
		gasLimit: sanitizeHex(decimalToHex(gasLimit)),
		to: sanitizeHex(addr),
		value: '0x00',
		data: sanitizeHex(data)
	    }
	    h = signTx(rawTx,chainId,privkey);
     } catch(e) {
	capture(e);
	return null;
     }
     return "0x" + rlp.encode(h.raw).toString('hex');
}
exports.generateTx = function(token,to,value,gasPrice,gasLimit,data,chainId,privkey,nonce) {
   var h;
   try {
	   if(!isValidAddress(to)) throw new Error('Not a valid address')

	   if (to != "0xCONTRACT" && !exports.validateEtherAddress(to)) throw "Not a valid address";
	   if (to == "0xCONTRACT") to = '';

	   if (!isNumeric(value) || parseFloat(value) < 0) throw "Not a valid amount";
	   if(token != null) {
	     value = padLeft(new BigNumber((String(value))).times(new BigNumber(10).pow(token.dec)).toString(16), 64);
	     to    = padLeft(getNakedAddress(to), 64);
	     data  = tokenTransferHex + to + value;
	     to    = token.addr;
	     value = '0x00';
	   }
	   else
		value = sanitizeHex(decimalToHex(new BigNumber((String(value))).times(wei2ether)));
	   if (!exports.validateHexString(data)) throw  'Please enter a valid data value (Must be hex). ';
	   if (!isNumeric(gasLimit) || parseFloat(gasLimit) <= 0) throw 'Please enter a valid gas limit (Must be integer. Try 21000-4000000). ';

	   if(!nonce)
		nonce = "0x00";
	   gasPrice = new BigNumber(gasPrice).times(1000).times(1000).times(1000).toString();
	   var rawTx = {
		nonce: sanitizeHex(nonce),
		gasPrice: sanitizeHex(decimalToHex(gasPrice)),
		gasLimit: sanitizeHex(decimalToHex(gasLimit)),
		to: sanitizeHex(to),
		//value: sanitizeHex(decimalToHex(new BigNumber((String(value))).times(wei2ether))),
		value: value,
		data: sanitizeHex(data)
	    }
	    h = signTx(rawTx,chainId,privkey);
     } catch(e) {
	capture(e);
	return null;
     }
     return "0x" + rlp.encode(h.raw).toString('hex');
}
exports.snifferTx = function(tr,chainId) {
	var recoveryParam;
	var signature;
	try {
		tr = rlp.decode(tr);
		recoveryParam = parseInt(tr[6].toString('hex'),16) -27 -8 -2*chainId;
		signature = { r: newBN(tr[7].toString('hex')), s: newBN(tr[8].toString('hex')) };
	} catch(e) {
		console.log(tr);
		return null;
	}

        tr[6] = Buffer.from([chainId]);
        tr[7] = stripHexPrefixToBuffer("");
        tr[8] = stripHexPrefixToBuffer("");
	var hash = sha3(rlp.encode(tr));

	var pub;
	try {
		pub = exports.recovery(hash,signature,recoveryParam);
	} catch(e) {
		console.log(tr);
		return null;
	}
	var key = ec.keyFromPublic('04'+pub,'hex');
	if(!ec.verify(hash, signature, key)) 
		return null;
	var from =  '0x'+ addressFromPublic(pub);
	var to    = '0x' + tr[3].toString('hex');
	var value = '0x' + tr[4].toString('hex');
	var data  = '0x' + tr[5].toString('hex');

	var token = to;
	var method = data.substr(0,10);
	if(method == tokenTransferHex) {
		to = '0x'+data.substr(10+24,40);
		method = "token";
		value = '';
	} else if(method != '0x') {
		return null;
	} else
		method = 'ether';
	if(value) {
		try {
			value = new BigNumber(value).div(wei2ether).toString();
		} catch(e) {
			console.log('value:'+value);
			console.log(tr);
			return null;
		}
	}
	if(token != to)
		return { method: method, from: '0x'+ addressFromPublic(pub), to: to, value: value, token: token };
	return { method: method, from: '0x'+ addressFromPublic(pub), to: to, value: value };
}
exports.decodeTx = function(FROM,TO,token,tr,chainId) {
	try {
		tr = rlp.decode(tr);
	} catch(e) {
		return null;
	}
	var recoveryParam = parseInt(tr[6].toString('hex'),16) -27 -8 -2*chainId;
	var signature = { r: newBN(tr[7].toString('hex')), s: newBN(tr[8].toString('hex')) };

        tr[6] = Buffer.from([chainId]);
        tr[7] = stripHexPrefixToBuffer("");
        tr[8] = stripHexPrefixToBuffer("");
	var hash = sha3(rlp.encode(tr));

	var pub = exports.recovery(hash,signature,recoveryParam);
	var key = ec.keyFromPublic('04'+pub,'hex');
	if(!ec.verify(hash, signature, key)) 
		return null;
	var from =  '0x'+ addressFromPublic(pub);
	if(from != FROM.toLowerCase())
		return null;
	var to    = '0x' + tr[3].toString('hex');
	var value = '0x' + tr[4].toString('hex');
	var data  = '0x' + tr[5].toString('hex');

	var method = data.substr(0,10);
	if(method == tokenTransferHex || method == namehash("approve(address,uint256)") || method == namehash("mint(address,uint256)")) {
		if(token == null || token.addr.toLowerCase() != to)
			return null;
		value = new BigNumber('0x'+data.substr(10+64,64)).div(new BigNumber(10).pow(token.dec)).toString();
		to = '0x'+data.substr(10+24,40);
		if(method == tokenTransferHex)
			method = "tokenTransfer";
		else if(method == namehash("approve(address,uint256)"))
			method = "approve";
		else if(method == namehash("mint(address,uint256)"))
			method = "mint";
	} else if(method == namehash("createCustomToken(string,string,uint8)")) {
		method = 'create';
		value = '';
	} else if(method == namehash("burn(uint256)")) {
		if(token == null || token.addr.toLowerCase() != to)
			return null;
		value = new BigNumber('0x'+data.substr(10,64)).div(new BigNumber(10).pow(token.dec)).toString();
		method = 'burn';
	} else if(method != '0x') {
		return null;
	} else {
		value = new BigNumber(value).div(wei2ether).toString();
		method = 'transfer';
	}
	if(method != 'burn' && to != TO.toLowerCase())
		return null;
	return { method: method, from: '0x'+ addressFromPublic(pub), gasPrice : '0x'+tr[1].toString('hex'),  gasLimit: '0x'+tr[2].toString('hex'), to: to, value: value };
}
exports.initEquivalent= function() {
	var eq = {
		usd: new BigNumber(0),
		eth: new BigNumber(0),
		eur: new BigNumber(0),
		chf: new BigNumber(0),
		gbp: new BigNumber(0),
		cad: new BigNumber(0),
		jpy: new BigNumber(0),
		cny: new BigNumber(0),
		rub: new BigNumber(0),
		aud: new BigNumber(0),
		btc: new BigNumber(0)
	};
	return eq;
}
exports.getIndirectQuoted = function(eth,etherPrice) {
	var quoted = {};
	quoted.usd = new BigNumber(((eth * etherPrice.USD) / etherPrice.ETH).toString());
	quoted.eur = new BigNumber(((eth * etherPrice.EUR) / etherPrice.ETH).toString());
	quoted.chf = new BigNumber(((eth * etherPrice.CHF) / etherPrice.ETH).toString());
	quoted.btc = new BigNumber(((eth * etherPrice.BTC) / etherPrice.ETH).toString());
	quoted.gbp = new BigNumber(((eth * etherPrice.GBP) / etherPrice.ETH).toString());
	quoted.cad = new BigNumber(((eth * etherPrice.CAD) / etherPrice.ETH).toString());
	quoted.jpy = new BigNumber(((eth * etherPrice.JPY) / etherPrice.ETH).toString());
	quoted.cny = new BigNumber(((eth * etherPrice.CNY) / etherPrice.ETH).toString());
	quoted.rub = new BigNumber(((eth * etherPrice.RUB) / etherPrice.ETH).toString());
	quoted.aud = new BigNumber(((eth * etherPrice.AUD) / etherPrice.ETH).toString());
	return quoted;
}
exports.getQuoted = function(token,price) {
	var pow = new BigNumber(10).pow(token.dec);
	var balance = new BigNumber(token.balance);
	var eq = { };
	/// TUTTO DA RIVEDERE
	if(price.USD) eq.usd = balance.times(parseFloat(price.USD)).div(pow);
	if(price.ETH) eq.eth = balance.times(parseFloat(price.ETH)).div(pow);
	if(price.EUR) eq.eur = balance.times(parseFloat(price.EUR)).div(pow);
	if(price.CHF) eq.chf = balance.times(parseFloat(price.CHF)).div(pow);
	if(price.BTC) eq.btc = balance.times(parseFloat(price.BTC)).div(pow);
	if(price.GBP) eq.gbp = balance.times(parseFloat(price.GBP)).div(pow);
	if(price.CAD) eq.cad = balance.times(parseFloat(price.CAD)).div(pow);
	if(price.AUD) eq.aud = balance.times(parseFloat(price.AUD)).div(pow);
	if(price.JPY) eq.jpy = balance.times(parseFloat(price.JPY)).div(pow);
	if(price.CNY) eq.cny = balance.times(parseFloat(price.CNY)).div(pow);
	if(price.RUB) eq.rub = balance.times(parseFloat(price.RUB)).div(pow);
	return eq;
}
exports.sumEquivalent = function(total,eth,quoted) {
	total.eth  = total.eth.plus(eth);
	total.usd  = total.usd.plus(quoted.usd);
	total.eur  = total.eur.plus(quoted.eur);
	total.btc  = total.btc.plus(quoted.btc);
	total.gbp  = total.gbp.plus(quoted.gbp);
	total.chf  = total.chf.plus(quoted.chf);
};
exports.addEquivalent = function(eq,token,price) {
	var pow = new BigNumber(10).pow(token.dec);
	var balance = new BigNumber(token.balance);
	/// TUTTO DA RIVEDERE
	if(price.USD) eq.usd = balance.times(parseFloat(price.USD)).div(pow).plus(eq.usd);
	if(price.ETH) eq.eth = balance.times(parseFloat(price.ETH)).div(pow).plus(eq.eth);
	if(price.EUR) eq.eur = balance.times(parseFloat(price.EUR)).div(pow).plus(eq.eur);
	if(price.CHF) eq.chf = balance.times(parseFloat(price.CHF)).div(pow).plus(eq.chf);
	if(price.BTC) eq.btc = balance.times(parseFloat(price.BTC)).div(pow).plus(eq.btc);
	if(price.GBP) eq.gbp = balance.times(parseFloat(price.GBP)).div(pow).plus(eq.gbp);

	if(price.CAD) eq.cad = balance.times(parseFloat(price.CAD)).div(pow).plus(eq.cad);
	if(price.JPY) eq.jpy = balance.times(parseFloat(price.JPY)).div(pow).plus(eq.jpy);
	if(price.CNY) eq.cny = balance.times(parseFloat(price.CNY)).div(pow).plus(eq.cny);
	if(price.RUB) eq.rub = balance.times(parseFloat(price.RUB)).div(pow).plus(eq.rub);
	if(price.AUD) eq.aud = balance.times(parseFloat(price.AUD)).div(pow).plus(eq.aud);
}
exports.equivalent = function(token,price) {
	var eq = exports.initEquivalent();
	exports.addEquivalent(eq,token,price);
	return eq;
}
exports.tokenRounder = function(value,token,n) {
	var dec = token.dec;
	if(!dec)
		dec = 0;
	value = new BigNumber(value).div(new BigNumber(10).pow(dec));
	var s = value.toFormat();
	if(s.length <= n)
		return s;
	var decimals = s.indexOf('.');
	if(decimals > 0) {
		decimals = n - decimals;
		if(decimals < 0)
			decimals = 0;
		return value.round(decimals).toFormat();
	}
	var m = '';
	value = s;
	for(;;) {
		if(value.length <= n)
			break;
		value = value.substr(0,value.length -4)
		if(m == '')
			m = 'k';
		else if(m == 'k')
			m = 'm';
		else if(m == 'm')
			m = 'g';
		else if(m == 'g')
			m = 't';
	}
	return value + m;
}
exports.rounder = function(value,n) {
	var s = value.toFormat();
	if(s.length <= n)
		return s;
	var decimals = s.indexOf('.');
	if(decimals <= 0)
		return s;
	decimals = n - decimals;
	return value.round(decimals).toFormat();
}
exports.tokenRounded = function(value,token) {
	return new BigNumber(value).div(new BigNumber(10).pow(token.dec)).round(2).toFormat();
}
exports.tokenRoundedChecked = function(value,token) {
	var r = exports.tokenRounded(value,token);
	if(r != 0)
		return r;
	return new BigNumber(value).div(new BigNumber(10).pow(token.dec)).round(12).toFormat();
}
exports.tokenTransfert = function(value,token) {
	return new BigNumber(value).div(new BigNumber(10).pow(token.dec)).toFormat();
}
exports.tokenNotRounded = function(value,token,locked) {
	if(!locked)
		locked = 0;
	locked = new BigNumber(locked);
	BigNumber.config({ FORMAT: inputFormat } );
	var value = new BigNumber(value).minus(locked).div(new BigNumber(10).pow(token.dec)).toFormat();
	BigNumber.config({ FORMAT: outputFormat } );
	value = value.replace(/,/g,'');
	return value;
}
exports.etherizeNotRounded = function(wei) {
	BigNumber.config({ FORMAT: inputFormat } );
	var ether = new BigNumber(wei).div(wei2ether).toFormat();
	BigNumber.config({ FORMAT: outputFormat } );
	ether = ether.replace(/,/g,'');
	return ether;
}
exports.tokenRaw = function(value,token) {
	BigNumber.config({ FORMAT: inputFormat } );
	value = new BigNumber(value).times(new BigNumber(10).pow(token.dec));
	BigNumber.config({ FORMAT: outputFormat } );
	return value;
}
exports.tokenToEth = function(value,token,price) {
	return new BigNumber(value).div(new BigNumber(10).pow(token.dec)).times(new BigNumber(price));
}
exports.tokenToWei = function(value,token,price) {
	return new BigNumber(value).times(new BigNumber(10).pow(18 - token.dec)).times(new BigNumber(price));
}
exports.rounded = function(value,n) {
	return value.round(n).toFormat();
}
exports.notRounded = function(value) {
	return value.toFormat().replace(/,/g,'');
}
exports.rounded0 = function(value) {
	return value.round(0).toFormat();
}
exports.rounded1 = function(value) {
	return value.round(1).toFormat();
}
exports.rounded5 = function(value) {
	return value.round(5).toFormat();
}

exports.fromMyEtherWalletKey = function(input, password) {
     try {
    	return decodeEncryptedPrivate(input.slice(0,128),password);
     } catch(e) {
	capture(e);
	return null;
     }
}
exports.fromFile = function(input, password) {
    try {
        var json = JSON.parse(input);

        if (json.encseed != null) return fromEthSale(input, password);
        if (json.Crypto != null || json.crypto != null) return fromV3(input, password, true);
        if (json.hash != null) return fromMyEtherWallet(input, password); // questa decodifica e' da testare
        if (json.publisher == "MyEtherWallet") return fromV2(input); // questa decodifica e' da testare
    } catch(e) {
    }
    return null;
}
exports.requirePassword = function(ethjson) {
    var jsonArr;
    try {
        jsonArr = JSON.parse(ethjson);
    } catch (e) {
	capture("Wrong JSON/UTC file");
	return false;
    }
    if (jsonArr.encseed != null) return true; // questo file e' generato da pyethsaletool e non funziona
    if (jsonArr.Crypto != null || jsonArr.crypto != null) return true
    if (jsonArr.hash != null && jsonArr.locked) return true;
    if (jsonArr.hash != null && !jsonArr.locked) return false;
    if (jsonArr.publisher == "MyEtherWallet" && !jsonArr.encrypted) return false;
    return false;
}
var keyPublicFromPrivate = function (privkey) {
	var key = ec.keyFromPrivate(privkey,'hex');
	return key.getPublic('hex').slice(2); // se la chiave pubblica e' piu' lunga di 64 bisogna fare slice(2) per tagliare lo 04 iniziale usano key.getPublic('hex');
}
var capture = function(e) {
	if(errorMessage)
           errorMessage(e);
       else
       	console.log(e);
}
var addressFromPublic = function (pubkey) {
	return sha3(Buffer.from(pubkey,'hex')).slice(24) ;// Only take the lower 160bits of the hash
}
exports.verify = function(msgHash,signature,pubkey) {
	var r = ec.verify(msgHash,signature,Buffer.from('04'+pubkey,'hex'));
	return ec.verify(msgHash,signature,Buffer.from('04'+pubkey,'hex')); // need 04 header
}
exports.check = function(msgHash,signature,privkey) {
	var key = ec.keyFromPrivate(privkey,'hex');
	return key.verify(msgHash,signature);
}
exports.recovery = function(msgHash,signature,recoveryParam) {
	var msg = new Buffer(msgHash,'hex');
	return ec.recoverPubKey(msg,signature,recoveryParam).encode('hex').slice(2);
}
var sign = function(msgHash,privkey) {
	return ec.sign(msgHash,Buffer.from(privkey,'hex'), { canonical: true });	// canonical e' importante per avere risultati uguali alle altre librerie. funzionerebbe lo stesso perche' userebbe nonce diverso
}
var getDataObj = function(func, arrVals) {
    var val = "";
    for (var i = 0; i < arrVals.length; i++) val += padLeft(arrVals[i], 64);
    return func + val
} 
var isHexPrefixed = function(str) {
  return str.slice(0, 2) === '0x';
}
var stripHexPrefix = function(str) {
  if (typeof str !== 'string') return str
  return isHexPrefixed(str) ? str.slice(2) : str
}
exports.toChecksumAddress = function (address) {
  address = stripHexPrefix(address).toLowerCase()
  var hash = sha3(address);
  var ret = '0x'
  for (var i = 0; i < address.length; i++) {
    if (parseInt(hash[i], 16) >= 8) {
      ret += address[i].toUpperCase()
    } else {
      ret += address[i]
    }
  }
  return ret
}
var isChecksumAddress = function(address) {
    return address == exports.toChecksumAddress(address);
}
exports.validateEtherAddress = function(address) {
    if (address.substring(0, 2) != "0x") return false;
    if (!/^(0x)?[0-9a-f]{40}$/i.test(address)) return false;
    if (/^(0x)?[0-9a-f]{40}$/.test(address) || /^(0x)?[0-9A-F]{40}$/.test(address)) return true;
    return isChecksumAddress(address);
}
var isValidAddress = function(address) {
	if (address && address == "0x0000000000000000000000000000000000000000") return false;
    if (address)
        return exports.validateEtherAddress(address);
    return false;
}
var isNumeric = function(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}
var sanitizeHex = function(hex) {
    hex = hex.substring(0, 2) == '0x' ? hex.substring(2) : hex;
    if (hex == "") return "";
    return '0x' + padLeftEven(hex);
}
var trimHexZero = function(hex) {
    if (hex == "0x00" || hex == "0x0") return "0x0";
    hex = sanitizeHex(hex);
    hex = hex.substring(2).replace(/^0+/, '');
    return '0x' + hex;
}
var padLeftEven = function(hex) {
    hex = hex.length % 2 != 0 ? '0' + hex : hex;
    return hex;
}
var padLeft = function(n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}
var decimalToHex = function(dec) {
    return new BigNumber(dec).toString(16);
}
var stripZeros = function (a) {
  a = stripHexPrefix(a)
  var first = a[0]
  while (a.length > 0 && first.toString() === '0') {
    a = a.slice(1)
    first = a[0]
  }
  return a
};
var stripZerosButAllowZero = function (a) {
    a = Buffer.from(stripHexPrefix(a),'hex');
    a = stripZeros(a);
    if(a.toString('hex') === '00')
       a = Buffer.allocUnsafe(0);
    return a;
};
var stripHexPrefixToBuffer = function(v) {
    return Buffer.from(stripHexPrefix(v),'hex');
}
var hashTx = function(rawTx,chainId) {
    var raw = new Array(9);

    raw[0] = stripZerosButAllowZero(rawTx.nonce);
    if(raw[0].length > 32) throw "Nonce too long";
    raw[1] = stripZerosButAllowZero(rawTx.gasPrice);
    if(raw[1].length > 32) throw "gasPrice too long";
    raw[2] = stripZerosButAllowZero(rawTx.gasLimit);
    if(raw[2].length > 32) throw "gasLimit too long";

    raw[3] = stripHexPrefixToBuffer(rawTx.to);
    if(raw[3].length != 20) throw "to length must be 20";

    raw[4] = stripZerosButAllowZero(rawTx.value);
    if(raw[4].length > 32) throw "value too long";

    raw[5] = stripHexPrefixToBuffer(rawTx.data);

    var items;
    if(chainId > 0) {
        raw[6] = Buffer.from([chainId]);
        raw[7] = stripHexPrefixToBuffer("");
        raw[8] = stripHexPrefixToBuffer("");
        items  = raw.slice(0,9);
    } else {
        items  = raw.slice(0,6);
    }
    return { raw: raw, hash: sha3(rlp.encode(items)) };
}
var ecsign = function (msgHash, privkey) {
  var sig = sign(msgHash, privkey)

  var ret = {}
  ret.r = padLeftEven(sig.r.toString('hex'));
  ret.s = padLeftEven(sig.s.toString('hex'));
  ret.v = sig.recoveryParam + 27;
  return ret;
}
var signTx = function(rawTx,chainId,privkey) {
    const h = hashTx(rawTx,chainId);
    var sig = ecsign(h.hash,privkey);
    if(chainId > 0)
	sig.v += chainId * 2 + 8;
    h.raw[6] = Buffer.from([ sig.v ]);
    h.raw[7] = Buffer.from(sig.r,'hex');
    h.raw[8] = Buffer.from(sig.s,'hex');
    return h;
}
var getNakedAddress = function(address) {
    return address.toLowerCase().replace('0x', '');
}
var aes_128_ctr_encrypt = function(text,key,iv) {
	var wiv  = CryptoJS.enc.Hex.parse(iv.toString('hex'));
	var wdk  = CryptoJS.enc.Hex.parse(key.toString('hex'));
	var wpr  = CryptoJS.enc.Hex.parse(text);
	var cipher = CryptoJS.AES.encrypt(wpr, wdk, { mode: CryptoJS.mode.CTR,  iv: wiv, padding: CryptoJS.pad.NoPadding });
	return cipher.ciphertext.toString();
}
var aes_128_decrypt = function(ciphertext,derivedKey,iv,mode) {
	var wiv  = CryptoJS.enc.Hex.parse(iv);
	var wdk  = CryptoJS.enc.Hex.parse(derivedKey.toString('hex'));
	var cip  = CryptoJS.enc.Hex.parse(ciphertext);
	var cipher = CryptoJS.algo.AES.createDecryptor(wdk, { mode: mode, iv: wiv, padding: CryptoJS.pad.NoPadding });
	return cipher.process(cip).toString() + cipher.finalize().toString();
}
var aes_128_ctr_decrypt = function(text,key,iv) {
	return aes_128_decrypt(text,key,iv,CryptoJS.mode.CTR);
}
var pbkdf2 = function(password,salt,c,dkLen) {
  	salt  = CryptoJS.enc.Hex.parse(salt);
        var derivedKey = CryptoJS.PBKDF2(password, salt, { iterations: c, keySize: dkLen/4, hasher: hasher });
	return Buffer.from(derivedKey.toString(),"hex");
}
var pbkdf2_ethsale = function(password,c,dkLen) {
  	var salt  = CryptoJS.enc.Utf8.parse(password);
        var derivedKey = CryptoJS.PBKDF2(password, salt, { iterations: c, keySize: dkLen/4, hasher: hasher });
	return Buffer.from(derivedKey.toString(),"hex");
}
var fromV3 = function(input,password) {
	var json = JSON.parse(input.toLowerCase());
	if (json.version !== 3)
		throw new Error('Not a V3 wallet')
	var crypto = json.crypto;

	var derivedKey;
	var kdfparams = crypto.kdfparams;
	if (crypto.kdf === 'scrypt')
	        derivedKey = scrypt(password, kdfparams.salt, kdfparams.n, kdfparams.r, kdfparams.p, kdfparams.dklen)
    	else if (crypto.kdf === 'pbkdf2') {
                if (kdfparams.prf !== 'hmac-sha256') throw 'Unsupported parameters to PBKDF2'
	        derivedKey = pbkdf2(password, kdfparams.salt, kdfparams.c, kdfparams.dklen)

         } else 
		throw 'Unsupported key derivation scheme'
	var ciphertext = new Buffer(crypto.ciphertext, 'hex')
	var mac = sha3(Buffer.concat([derivedKey.slice(16, 32), ciphertext]))
	if (mac.toString('hex') !== json.crypto.mac)
		throw new Error('Key derivation failed - possibly wrong passphrase')
        return aes_128_decrypt(crypto.ciphertext,derivedKey.slice(0,16),crypto.cipherparams.iv,CryptoJS.mode.CTR);
}
var decodeEncryptedPrivate = function(cipher,password) {
    var ciphertext = new Buffer(cipher, 'base64')
    if (ciphertext.slice(0, 8).toString() === 'Salted__') {
	var bytes  = CryptoJS.AES.decrypt(cipher, password);
	return bytes.toString(CryptoJS.enc.Utf8);
    }
    cipher = { salt: ciphertext.slice(8, 16), ciphertext: ciphertext.slice(16) }
    var evp = CryptoJS.EvpKDF(password, cipher.salt, { keySize: 32/8, iterations: (32+16)/16 });
    return aes_256_decrypt(cipher.ciphertext,evp.key,evp.iv,CryptoJS.mode.CBC);
}
var aes_256_decrypt = function(ciphertext,derivedKey,iv,mode) {
	var wiv  = CryptoJS.enc.Hex.parse(iv);
	var wdk  = CryptoJS.enc.Hex.parse(derivedKey.toString('hex'));
	var cip  = CryptoJS.enc.Hex.parse(ciphertext);
	var cipher = CryptoJS.algo.AES.createDecryptor(wdk, { mode: mode, iv: wiv });
	return cipher.process(cip).toString() + cipher.finalize().toString();
}
var fromEthSale = function(input, password) {
    var json = JSON.parse(input);
    var encseed = json.encseed;

    var derivedKey = pbkdf2_ethsale(password, 2000, 32);
    var decrypted = aes_128_decrypt(encseed.slice(16),derivedKey.slice(0,16),encseed.slice(0,16),CryptoJS.mode.CBC);	// 32 perche' e' in hex e non buffer

    var privkey = sha3(Buffer.from(decrypted,'hex'));
    var address = exports.addressFromPrivate(privkey);
    if (address !== json.ethaddr) throw 'Decoded key mismatch - possibly wrong passphrase';
    return privkey;
}
var fromMyEtherWallet = function(input, password) {
    var json = JSON.parse(input)
    if (!json.locked) {
        if (json.private.length !== 64) throw 'Invalid private key length';
	return json.private;
    }
    var cipher = json.encrypted ? json.private.slice(0, 128) : json.private
    return  decodeEncryptedPrivate(cipher,password);
}
var fromV2 = function(input) {
    var json = JSON.parse(input);
    if (json.privKey.length !== 64) throw new 'Invalid private key length';
    return json.privkey;
}
var newBN = function(val) {
	var N = ec.n.clone();
	N._init(val.toString('hex'),'hex');
	return N;
}
var privateKeyTweakAdd = function (privateKey, tweak) {
	var bn = newBN(tweak);
	if (bn.cmp(ec.n) >= 0) throw "Private TweakAddFail";
	bn.iadd(newBN(privateKey));
	if (bn.cmp(ec.n) >= 0) bn.isub(ec.n);
	if (bn.isZero()) throw "Private TweakAddFail";
	return bn.toArrayLike(Buffer, 'be', 32);
};
var publicKeyTweakAdd = function (publicKey, tweak, compressed) {
	//var pair = loadPublicKey(publicKey);
	var pair = ec.fromPublic(publickey,'hex');
	if (pair === null) throw "Public TweakAddFail";
	tweak = newBN(tweak);
	if (tweak.cmp(ec.n) >= 0) throw "Public TweakAddFail";
	return Buffer.from(ec.g.mul(tweak).add(pair.pub).encode(true, compressed));
};
var derive = function (hdkey,path) {
	var entries = path.split('/');
	entries.forEach(function (c, i) {
		if(i == 0)
			return;
		var hardened = c.length > 1 && c[c.length - 1] === "'";
		var childIndex = parseInt(c, 10); // & (HARDENED_OFFSET - 1)
		if (hardened) childIndex += HARDENED_OFFSET;
		hdkey = deriveChild(hdkey,childIndex);
	});
	return hdkey;
};
var DoPublicKey = function(hd) {
	var key = ec.keyFromPrivate(hd.privateKey);
	//hd.publicKey = Buffer.from('02' + key.getPublic('hex').slice(2,66),'hex');
	hd.publicKey = Buffer.from(key.getPublic(true,'hex').slice(0,66),'hex');
}
var deriveChild = function (babbo,index) {
	var isHardened = index >= HARDENED_OFFSET;
	var indexBuffer = new Buffer(4);
	indexBuffer.writeUInt32BE(index, 0);
	var data;

	if (isHardened) {
		var pk = babbo.privateKey;
		var zb = new Buffer([0]);
		pk = Buffer.concat([zb, pk]);
		data = Buffer.concat([pk, indexBuffer]);
	} else {
		data = Buffer.concat([babbo.publicKey, indexBuffer]);
	}
	var wordArray = CryptoJS.enc.Hex.parse(data.toString('hex'));
	var codeArray = CryptoJS.enc.Hex.parse(babbo.chainCode.toString('hex'));
	var I = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA512,codeArray).finalize(wordArray).toString();

	var IL = Buffer.from(I.slice(0, 64),'hex');
	var IR = Buffer.from(I.slice(64),'hex');
	var hd = {};
	if (babbo.privateKey) {
		try {
			hd.privateKey = privateKeyTweakAdd(babbo.privateKey, IL);
			DoPublicKey(hd);
		} catch (err) {
			return deriveChild(babbo,index + 1);
		}
	} else {
		try {
			hd.publicKey = publicKeyTweakAdd(babbo.publicKey, IL, true);
		} catch (err) {
			return deriveChild(babbo,index + 1, isHardened);
		}
	}
	hd.chainCode = IR;
	return hd;
}
var masterSeed = function(mnemonic,password) {
	var master = bip39.mnemonicToSeed (mnemonic,password);
	var B = Buffer.from(master.toString(),'hex');
	var wordArray = CryptoJS.enc.Hex.parse(B.toString('hex'));
	var I = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA512, MASTER_SECRET).finalize(wordArray).toString();
	var hd =  { privateKey: Buffer.from(I.substr(0,64),'hex'), chainCode: Buffer.from(I.substr(64),'hex') };
	DoPublicKey(hd);
	return hd;
}
exports.getMnemonicAccounts = function(mnemonic,password,index,count,alt) {
	var hdkey = masterSeed(mnemonic,password);
	var path = jaxxPath;
	if(alt == 1)
		path = ledgerPath;
	else if(alt == 2)
		path = eidooPath;
	var ret = [];
	for(var limit = index+count;index < limit;index++) { 
		var derived = derive(hdkey,path + "/" + index);
		var privkey = derived.privateKey.toString('hex');
		var address = exports.toChecksumAddress(exports.addressFromPrivate(privkey));
		ret.push( { privateKey : privkey, address: address });
	}
	return ret;
}
