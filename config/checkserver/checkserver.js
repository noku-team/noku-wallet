var axios = require('axios');

var apiServer = {
    servers: {
        master:  "https://scan.noku.io",
        backup:  "https://bees.noku.io",
        current: "https://scan.noku.io"
    },
    startCheckMaster: function(){
        var _self = this;
        _self.current = _self.master;
        checkMaster(_self);
        this.intervalCheckMaster = setInterval(function () {
            checkMaster(_self);
        }, _self.intervalTime);
    },
    intervalCheckMaster: "",
    intervalTime: 10000,
    isSwitched: false
}

function checkMaster(_self) {
    axios({
        url: _self.servers.master + "/gettokeninfo?checkserver=1&address=" + nokuAddress
    }).then(function (data) {
        if (data) {
            _self.servers.current = _self.servers.master;
            if(_self.isSwitched) {
                _self.isSwitched = false;
                console.log("apiServer: switched to: " + _self.servers.current);
            }            
        }
    }).catch(function (err) {
        _self.servers.current = _self.servers.backup;
        _self.isSwitched = true;
        console.log("apiServer: switched to: " + _self.servers.current);
    });
}

module.exports = apiServer;