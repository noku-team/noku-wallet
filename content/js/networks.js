var __mapaddr__;
var __mapsym__;
var __TOKENS__;

var initNokuTokens = function(tokens) {
	__mapaddr__ = [];
	__mapsym__ = [];
	if(tokens) {
		for(var i = 0;i < tokens.length;i++) {
			var t = tokens[i];
			t.addr = eth4you.toChecksumAddress(t.addr);
			if(__mapaddr__[t.addr.toLowerCase()])
				console.log("Dup Token Address " + t.addr);
			__mapaddr__[t.addr.toLowerCase()] = t;
			if(t.sym)
				__mapsym__[t.sym.toUpperCase()] = t;
		}
	}
	__TOKENS__ = tokens || [];
}
var addToken = function(t) {
	__TOKENS__.push(t);

	if(t.sym == 'NOKU') {
		if(t.addr.toLowerCase() == '0x1867598ADaf424C1FE7207E548eb09a1e6540534'.toLowerCase())
			return;
	}
	__mapaddr__[t.addr.toLowerCase()] = t;
	if(__mapsym__[t.sym.toUpperCase()]) {
		__mapsym__[t.sym.toUpperCase()].dup = 1;
		t.dup = 1;
	}
	else
		__mapsym__[t.sym.toUpperCase()] = t;
}
var getTokenByAddress = function(address) {
	if(!address) return null;
	return __mapaddr__[address.toLowerCase()];
}
var getTokenBySymbol = function(symbol) {
	return __mapsym__[symbol.toUpperCase()];
}
var getTokens = function() {
	return __TOKENS__;
}
var __networks__ = {
	"Net: Noku Primary": {
		url: "https://scan.noku.io",
		primary: "https://scan.noku.io",
		backup: "https://bees.noku.io",
		login: "https://scan.noku.io",
		network: "mainnet",
		chainId: 1
	},
	"Net: Noku Secondary": {
		url: "https://bees.noku.io",
		primary: "https://bees.noku.io",
		backup: "https://scan.noku.io",
		login: "https://scan.noku.io",
		network: "mainnet",
		chainId: 1
	}
/*
	"Net: Noku Rinkeby": {
		url: "https://scan.noku.io",
		primary: "https://scan.noku.io",
		network: "rinkeby",
		chainId: 4
	},
	"Net: Noku Kovan": {
		url: "https://scan.noku.io",
		primary: "https://scan.noku.io",
		network: "kovan",
		chainId: 42
	},
	"Net: Noku Ropsten": {
		url: "https://scan.noku.io",
		primary: "https://scan.noku.io",
		network: "ropsten",
		chainId: 3
	}
*/
};
var getNetworks = function() {
	return __networks__;
}
