var bip39 = require('./bip39.js');
var EC = require('./elliptic.min.js').ec;
var ec = new EC('secp256k1');
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
	if(alt)
		path = ledgerPath;
	var ret = [];
	for(var limit = index+count;index < limit;index++) { 
		var derived = derive(hdkey,path + "/" + index);
		var privkey = derived.privateKey.toString('hex');
		var address = exports.toChecksumAddress(exports.addressFromPrivate(privkey));
		ret.push( { privateKey : privkey, address: address });
	}
	return ret;
}

