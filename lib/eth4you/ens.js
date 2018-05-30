var uts46 = require('./uts46');
var sha3 = require('./sha3').keccak256;
var registryInterface = require('./ensConfigs/registryABI.json');
var resolverInterface = require('./ensConfigs/resolverABI.json');
var ETH = require('./ensConfigs/ETHConfig.json');
var Rinkeby = require('./ensConfigs/RinkebyConfig.json');
var ROPSTEN = require('./ensConfigs/ROPConfig.json');
var solidity = require('./solidity/coder.js');
var solidityUtils = require('./solidity/utils.js');
var eth4you = require('./eth4you.js');

var registry = ETH;

var ens = function() {
    var _this = this;
    this.registryABI = {};
    for (var i in registryInterface) this.registryABI[registryInterface[i].name] = registryInterface[i];
    this.resolverABI = {};
    for (var i in resolverInterface) this.resolverABI[resolverInterface[i].name] = resolverInterface[i];
/*
    switch (node.network) {
        default:
	    registry = ETH;
            break;
        case 'rinkbey':
	    registry = Rinkeby;
            break;
        case 'ropsten':
	    registry = ROPSTEN;
            break;
    }
*/
};
ens.normalise = function(name) {
    try {
        return uts46.toUnicode(name, { useStd3ASCII: true, transitional: false });
    } catch (e) {
        throw e;
    }
};

function namehash(name) {
    name = ens.normalise(name);
    //var node = Buffer.alloc(32);
    var node = "0000000000000000000000000000000000000000000000000000000000000000";
    if (name && name != '') {
        var labels = name.split(".");
        for (var i = labels.length - 1; i >= 0; i--) {
	    node += sha3(labels[i]);
            node = sha3(Buffer.from(node,'hex'));
        }
    }
//console.log(node);
    return '0x' + node;
}
ens.prototype.getOwnerResolverAddress = function(url,funcABI, to, name, callback) {
    var _this = this;
    var data = _this.getDataString(funcABI, [namehash(name)]);

    var method = "eth_call";
    var params = { to :to, data: data };
    eth4you.AJAX(url, method,  [ params, 'pending' ] , function(data) {
	    if(!data || data.error) return callback(data);
            var outTypes = funcABI.outputs.map(function(i) {
                return i.type;
            });
            data.data = solidity.decodeParams(outTypes, data.result.replace('0x', ''))[0];
            callback(data);
    });
};
ens.prototype.getOwner = function(url,name, callback) {
    this.getOwnerResolverAddress(url,this.registryABI.owner, registry.registry, name, callback);
};
ens.prototype.getResolver = function(url,name, callback) {
    this.getOwnerResolverAddress(url,this.registryABI.resolver, registry.registry, name, callback);
};
ens.prototype.getAddress = function(url,name, callback) {
    var _this = this;
    _this.getResolver(url,name, function(data) {
        if (data.error) callback(data);
        else {
            _this.getOwnerResolverAddress(url,_this.resolverABI.addr, data.data, name, callback);
        }
    });
};
/*
ens.prototype.getName = function(name, callback) {
    var _this = this;
    name = ens.normalise(name);
    _this.getResolver(name, function(data) {
        if (data.error || data.data == '0x') return callback(data);

	var url = nodeSelected.url;
	var method = "eth_call";
        var d = _this.getDataString(_this.resolverABI.name, [namehash(name)]);

	var params = { to :data.data, data: d };
	if(nodeSelected.proxy) {
		url = nodeSelected.proxy + "&action=eth_call&module=proxy";
		method = null;
        } else {
		params = [ params, 'pending' ]
        }
        eth4you.AJAX(url, method,  params , function(data) {
	    if(data.eth4youError || data.error) return callback(data);
	    var outTypes = _this.resolverABI.name.outputs.map(function(i) {
		return i.type;
	    });
    	    data.data = solidity.decodeParams(outTypes, data.result.replace('0x', ''))[0];
	    callback(data);
	});
    });
};
*/
ens.prototype.getDataString = function(func, inputs) {
    var fullFuncName = solidityUtils.transformToFullName(func);
    var funcSig = sha3(fullFuncName).substring(0,8);
    var typeName = solidityUtils.extractTypeName(fullFuncName);
    var types = typeName.split(',');
    types = types[0] == "" ? [] : types;
    return '0x' + funcSig + solidity.encodeParams(types, inputs);
};
module.exports = ens;
