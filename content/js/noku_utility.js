var nodeSelected,
    networks,
    nokuAddress = "0x1fc52f1abade452dd4674477d4711951700b3d27";

var setUrl = function(base,addr) {
	var url = nodeSelected.url;

	// if(!addr)
	// 	addr = address;
	url += base + "?network="+nodeSelected.network;
	if(addr)
		url += "&address="+addr;
	else
		url += "&address="+nokuAddress;
	if(typeof(user) != "undefined" && user)
		url += "&key="+user.key;
	return url;
}

$(function(){
  initNokuUtility();
});

function initNokuUtility() {
  networks = getNetworks();
  var net = eth4you.getParameterByName("network");
	if(net)
		nodeSelected = networks[network = net];
	else
		nodeSelected = networks[network = 'Net: Noku Primary'];
	// $option = $("#node-select-option").clone(true);
	// $("#node-select").empty();
	// for(var key in networks) {
	// 	var node = networks[key];
	// 	node.key = key;
	// 	$option.val(key).text(key);
	// 	$("#node-select").append($option.clone(true));
	// 	if(node == nodeSelected)
	// 		$("#node-select option[value='"+key+"']").attr('selected',true);
	// }
}
