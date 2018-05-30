var eth4you = require('../lib/eth4you/eth4you.js');
var axios = require('axios');
const Entities = require('html-entities').AllHtmlEntities;
const entities = new Entities();
var http = require("http");
var https = require("https");
var configOAuth2 = require("../config/configOAuth2");

var localStorageMemory = require("localstorage-memory");

var ua = require('universal-analytics');

var ROUNDER = 13;
var jsdom = require('jsdom');

const {
  JSDOM
} = jsdom;
const {
  window
} = new JSDOM('<html></html>');
var $ = require('jquery')(window);

module.exports = function (app, passport, server) {

  function auth(req, res, next) {
    if (req.isAuthenticated() && req.session.accessToken) { //&& req.user._id == req.session.accessToken.userId
      return next();
    }
    req.session.returnTo = req.url;
    passport.authenticate('nokuoauth2')(req, res, next);
  }

  function sendRequestWithToken(req, method, url){
    return new Promise(function(resolve, reject) {
      axios({
        method: method,
        url: url,
        timeout: 20000,
        headers: { 'Authorization': 'Bearer ' + req.session.accessToken }
      }).then(function (response) {
        return resolve(response.data);
      }).catch(function (error) {
        if(error.response.data.error && error.response.data.error.name == "TokenExpiredError") {
          // req.session.accessToken = "asd";
        }
        reject(Error(error));
      });
    });
  }

  app.get('/auth/callback',
    passport.authenticate('nokuoauth2', { failureRedirect: '/?fail-oauth=1' }),
    function (req, res) {
      // Successful authentication
      var redirect = req.session.returnTo || "/workspace";
      req.session.returnTo = null;
      res.redirect(redirect);
    }
  );

  app.get('/', function (req, res, next) {
    if(req.isAuthenticated()) {
      return res.redirect('/workspace');
    }
    return res.render('index');
  });

  app.get('/robots.txt', function (req, res) {
    res.type('text/plain');
    res.render("robots.txt.ejs");
  });

  app.get('/workspace', auth, function (req, res, next) {
    return res.render('workspace');
  });

  app.get("/account/details", auth, function(req,res){
    var redirect_uri = configOAuth2.apiHost + "/#account-detail";
    return res.redirect(redirect_uri);
  });

  app.get("/account/settings", auth, function(req,res){
    var redirect_uri = configOAuth2.apiHost + "/#settings";
    return res.redirect(redirect_uri);
  });

  app.get("/account/upgradelevel", auth, function(req,res){
    var redirect_uri = configOAuth2.apiHost + "/#kyc-verification/tab3";
    return res.redirect(redirect_uri);
  });

  app.get('/logout', function (req, res) {
    if(req.isAuthenticated()){
      var redir = encodeURIComponent(configOAuth2.currentHost);//req.headers.referrer || req.headers.referer || configOAuth2.currentHost);
      return res.redirect(configOAuth2.apiHost + "/logout?redirect_uri=" + redir);
    }
    else {
      return res.redirect("/");
    }
  });

  app.get("/login", auth, function(req,res){
    var redirect_uri = req.query.redirect_uri || (configOAuth2.currentHost + "/");
    return res.redirect(redirect_uri);
  });

  app.get('/signup', function (req, res) {
    req.session.returnTo = req.url;
    var redir = encodeURIComponent(req.headers.referrer || req.headers.referer || configOAuth2.currentHost);

    var redirect_uri = encodeURIComponent(configOAuth2.currentHost + "/login?redirect_uri=" + redir);

    return res.redirect(configOAuth2.apiHost + "/signup?redirect_uri=" + redirect_uri);
  });

  app.get("/getcurrentserver", function (req, res, next) {
    return res.send({ server: apiServer.current });
  });

  app.get('/address/:address(0x*)', function (req, res, next) { //(0x.*) -> l'address deve inziare con 0x, così è possibile splittare il routing per varie blockchain(con ulteriori parametri nel caso)?
    return res.render("address", {
      address: req.params.address
    });
  });

  app.get("/fee", function (req, res, next) {
    var gasLimit = req.query.gaslimit;
    var gasPrice = req.query.gasprice;
    var etherPrice = JSON.parse(entities.decode(req.query.etherprice));
    var predictWaitTime = req.query.predictwaittime;

    var need = eth4you.bigNumber(gasLimit).times(gasPrice).times(1000).times(1000).times(1000);
    var all = eth4you.equivalent({ dec: 18, balance: need.toString() }, etherPrice);
    need = eth4you.etherizeN(need);

    var title = "Estimated Time <span class='title-tooltip'>" + predictWaitTime + " minutes</span></br>";

    title += "ETH " + need + "<br/>";
    title = BuildTitle(title, all);

    var response = {};

    response.title = title;
    response.need = need;

    return res.send(response);
  });

  var io = require('socket.io')(server, {
    transports: 'polling',
    pingTimeout: 5000,
    pingInterval: 10000
  });

  var usernames = {};
  var maxDelay = 0;

  io.of('/wallet')
  .on('connection',
    function (socket) {
      //console.log(socket.handshake);

      // var id = eth4you.randomId();
      // console.log("socket.io connection: " + id);

      var currentSettingsSocket = {
        currentpage: 1,
        tsl: null,
        tsh: null
      };

      // var lockSocket = {
      //   sendBalance: false,
      //   sendInfoSendFounds: false,
      //   sendTransaction: false
      // };

      var intervalCount = 0;

      var allinterval = setInterval(function (socket) {
        sendBalance(socket);
        sendInfoSendFounds(socket);
        sendTransaction(socket, { currentpage: currentSettingsSocket.currentpage, tsl: currentSettingsSocket.tsl, tsh: currentSettingsSocket.tsh });
        intervalCount++;
        if(intervalCount > 5) {
          //resetto i settings correnti dopo N invii
          intervalCount = 0;
          currentSettingsSocket = {
            currentpage: 1,
            tsl: null,
            tsh: null
          }
        }
      }, 10 * 1000, socket); //sec

      sendBalance(socket);

      sendTransaction(socket);

      sendInfoSendFounds(socket);

      socket.on('getTransaction', function (_data) {
        var data = _data || {};

        currentSettingsSocket.currentpage = data.currentpage || socket.handshake.query.currentpage || 1;
        currentSettingsSocket.tsl = data.tsl || socket.handshake.query.tsl || null;
        currentSettingsSocket.tsh = data.tsh || socket.handshake.query.tsh || null;

        intervalCount = 0; //resetto interval count (capisco che l'utente sta ancora navigando e quindi non resetto le impostazioni)
        sendTransaction(socket, data);
      });

      socket.on('refreshAll', function (data) {

        sendTransaction(socket, { refreshall: true });
        sendBalance(socket, { refreshall: true });
        sendInfoSendFounds(socket, { refreshall: true });

      });

      socket.on('disconnect', function (data) {
        clearInterval(allinterval);
      });

    }
  );

  app.get("/getestimategas", function(req, res, next){
    var obj = {
      data: req.query.data,
      from: req.query.from,
      to: req.query.to,
      value: req.query.value
    }

    var sel = req.query.sel;

    var dataPost = {
      jsonrpc: "2.0",
      id: eth4you.randomId(),
      method: "eth_estimateGas",
      params: [obj]
    };

    var urlEthGetEstimateGas = setUrl('/', null);

    axios({
      method: 'POST',
      url: urlEthGetEstimateGas,
      data: dataPost,
      timeout: 20000,
      contentType: "application/json",
      accept: "application/json",
      httpAgent: new http.Agent({ keepAlive: true }),
      httpsAgent: new https.Agent({ keepAlive: true })
    }).then(function (response) {
      var data = response.data;
      var gaslimit = null;

      var responseGas = {
        gaslimit : null
      };

      if (!data.result) {
        return res.send(responseGas);
      }

      responseGas.gaslimit = parseInt(data.result,16) + 1;

      if(responseGas.gaslimit > 4000000) {
        responseGas.gaslimit = 60000;
      }

      if(sel != 'ETH' && responseGas.gaslimit < 60000) {
        responseGas.gaslimit = 60000;
      }

      return res.send(responseGas);
    }).catch(function (error) {
      console.log(error);
    });

  })

  app.get("/gettransactioncount", function(req, res, next){
    var address = req.query.address;

    var dataPost = {
      jsonrpc: "2.0",
      id: eth4you.randomId(),
      method: "eth_getTransactionCount",
      params: [address, 'latest']
    };

    var urlEthGetTransactionCount = setUrl('/', null);

    axios({
      method: 'POST',
      url: urlEthGetTransactionCount,
      data: dataPost,
      timeout: 20000,
      contentType: "application/json",
      accept: "application/json",
    }).then(function (response) {
      return res.send(response.data);
    }).catch(function (error) {
      console.log(error);
    });

  });

  app.post("/sendtransaction", function(req, res, next) {
    var tr = req.body.tr;

    var dataPost = {
      jsonrpc: "2.0",
      id: eth4you.randomId(),
      method: "eth_sendRawTransaction",
      params: [tr]
    };

    var urlEthSendRawTransaction = setUrl('/', null);

    axios({
      method: 'POST',
      url: urlEthSendRawTransaction,
      data: dataPost,
      timeout: 20000,
      contentType: "application/json",
      accept: "application/json",
    }).then(function (response) {
      return res.send(response.data);
    }).catch(function (error) {
      console.log(error);
    });
  });

  app.get("/getTransactionByHash", async function(req, res, next) {
    var txhash = req.query.txhash;

    var dataPost = {
      jsonrpc: "2.0",
      id: eth4you.randomId(),
      method: "eth_getTransactionByHash",
      params: [txhash]
    };

    var urlEthGetTransactionByHash = setUrl('/', null);

    axios({
      method: 'POST',
      url: urlEthGetTransactionByHash,
      data: dataPost,
      contentType: "application/json",
      accept: "application/json",
      timeout: 20000
    }).then(async function (response) {

      var data = response.data.result;

      var v = await getTransactionReceipt(data);

      return res.send(v);

    }).catch(function (error) { console.log(error); });
  });

  app.get("/getTransactionByBlockNumberAndIndex", async function(req, res, next) {
    var blockno = req.query.blockno,
    index = req.query.index;

    var dataPost = {
      jsonrpc: "2.0",
      id: eth4you.randomId(),
      method: "eth_getTransactionByBlockNumberAndIndex",
      params: [ '0x' + blockno.toString(16), '0x' + index.toString(16) ]
    };

    var urlEthGetTransactionByBlockNumberAndIndex = setUrl('/', null);

    axios({
      method: 'POST',
      url: urlEthGetTransactionByBlockNumberAndIndex,
      data: dataPost,
      contentType: "application/json",
      accept: "application/json",
      timeout: 20000
    }).then(async function (response) {

      var data = response.data.result;

      var v = await getTransactionReceipt(data);

      return res.send(v);

    }).catch(function (error) { console.log(error); });
  });

  function getTransactionReceipt(data) {    
    return new Promise(function(resolve, reject) {
      var dataPost2 = {
        jsonrpc: "2.0",
        id: eth4you.randomId(),
        method: "eth_getTransactionReceipt",
        params: [ data.hash ]
      };
      
      var v = data;
  
      axios({
        method: 'POST',
        url: setUrl('/', null),
        data: dataPost2,
        contentType: "application/json",
        accept: "application/json",
        timeout: 20000
      }).then(function (response) {
        var rcpt = response.data;
        if(rcpt && rcpt.result)
          v.status = rcpt.result.status;
        if(!!data.hash && v.blockNumber && v.transactionIndex) {
          v.blockNumber = parseInt(v.blockNumber.substr(2),16);
          v.transactionIndex = parseInt(v.transactionIndex.substr(2),16);
        }
        v.gasUsed = parseInt(v.gas.substr(2),16);
        v.gasPrice = parseInt(v.gasPrice.substr(2),16);
        v.nonce = parseInt(v.nonce.substr(2),16);
        v.value = parseInt(v.value.substr(2),16);
  
        return resolve(v);
      }).catch(function (error) {
        reject(Error(error));
      });
      
    });
  }

  function sendInfoSendFounds(socket, dataSocket = {}) {
    var currentAddress = socket.handshake.query.currentaddress;
    var urlGasPrice = setUrl("/gasPrice", null);

    axios({
      method: 'GET',
      url: urlGasPrice,
      timeout: 20000,
      httpAgent: new http.Agent({ keepAlive: true }),
      httpsAgent: new https.Agent({ keepAlive: true })
    }).then(function (response) {
      checkIsValid(response, true, response.data.average, socket);

      var dataPost = {
        jsonrpc: "2.0",
        id: eth4you.randomId(),
        method: "eth_gasPrice",
        params: []
      };

      var urlEthGasPrice = setUrl('/', currentAddress);

      var data = response.data;

      axios({
        method: 'POST',
        url: urlEthGasPrice,
        data: dataPost,
        contentType: "application/json",
        accept: "application/json",
        timeout: 20000
      }).then(function (min) {
        checkIsValid(min, null, null, socket);
        var normal = null;
        if (min.data.result)
          normal = parseInt(eth4you.bigNumber(min.data.result).div(1000).div(1000).div(1000).toString());
        var configuration = ConfigureGasPredict(data, normal);
        if (configuration) {
          socket.emit('gasPriceConfiguration', configuration);
        }
        if (dataSocket.refreshall) {
          socket.emit('refreshAllFinished', { event: "sendInfoSendFounds" });
        }
      }).catch(function (error) { console.log(error); });
    }).catch(function (error) { console.log(error); });

  }

  var ConfigureGasPredict = function (g, normal) {
    var normalGasPrice = Math.round((g.average / 7) * 10) / 10;
    if (normal && normalGasPrice < normal) {
      normalGasPrice = normal;
    }     

    var configuration = {};

    if(!g || isNaN(normalGasPrice)) {
      return null;
    }

    //var normalGasPrice = g.fast || (g.average * 2 );

    g = g.predict;
    var fastestGasPrice;
    if(g) {
      configuration.predictGasStationTime = [];
      configuration.predictGasStationArray = g;

      for (var i = 0; i < g.length; i++) {
        configuration.predictGasStationTime[g[i].gasprice] = g[i].expectedTime;
      }

      configuration.predictMaxGasPrice = g[g.length - 1].gasprice;
      configuration.predictMaxGasTime = g[g.length - 1].expectedTime;

      var fastestTime = g.reduce((min, p) => p.expectedTime < min ? p.expectedTime : min, g[0].expectedTime);

      var fastestGasPriceArray = g.filter(function(data){
        return data.expectedTime == fastestTime
      });

      fastestGasPrice = fastestGasPriceArray.length > 0 ? fastestGasPriceArray[0] : null;

    }

    if(fastestGasPrice) {
      normalGasPrice = Math.round(fastestGasPrice.gasprice / 1.5);
      configuration.gasPriceList =  [{
        name: "low",
        value: Math.round(fastestGasPrice.gasprice / 3) //g.average//
      },{
        name: "normal",
        value: Math.round(fastestGasPrice.gasprice / 1.5)//normalGasPrice
      },{
        name: "high",
        value: Math.round(fastestGasPrice.gasprice)
      }];
    }
    else {
      configuration.gasPriceList =  [{
        name: "low",
        value: normalGasPrice / 2 //g.average//
      },{
        name: "normal",
        value: normalGasPrice//normalGasPrice
      },{
        name: "high",
        value: normalGasPrice * 2
      }];
    }

    configuration.normalgasprice = normalGasPrice;

    return configuration;
  }

  // var ConfigureGasPredict = function (g, normal) {
  //   // var normalGasPrice = Math.round((g.average / 7) * 10) / 10;
  //   // if (normal && normalGasPrice < normal)
  //   //   normalGasPrice = normal;

  //   var configuration = {};

  //   if(!g) {// || isNaN(normalGasPrice)) {
  //     return null;
  //   }

  //   var normalGasPrice = g.fast || (g.average * 2 );

  //   configuration.gasPriceList =  [{
  //     name: "low",
  //     value: g.average//normalGasPrice / 2
  //   },{
  //     name: "normal",
  //     value: normalGasPrice//normalGasPrice
  //   },{
  //     name: "high",
  //     value: Math.max(g.fastest, normalGasPrice + 20)//normalGasPrice * 2
  //   }];

  //   g = g.predict;

  //   if(g) {
  //     configuration.predictGasStationTime = [];
  //     configuration.predictGasStationArray = g;

  //     for (var i = 0; i < g.length; i++) {
  //       configuration.predictGasStationTime[g[i].gasprice] = g[i].expectedTime;
  //     }

  //     configuration.predictMaxGasPrice = g[g.length - 1].gasprice;
  //     configuration.predictMaxGasTime = g[g.length - 1].expectedTime;

  //   }
  //   configuration.normalgasprice = normalGasPrice;

  //   return configuration;
  // }

  async function sendTransaction(socket, data = {}) {
    var currentAddress = data.currentaddress || socket.handshake.query.currentaddress,
      currentpage = data.currentpage || socket.handshake.query.currentpage,
      tsl = data.tsl || socket.handshake.query.tsl,
      tsh = data.tsh || socket.handshake.query.tsh,
      count = 12;//data.count || 1;//socket.handshake.query.count;

    var urlTransactions = setUrl("/transactions2", currentAddress);

    if (tsl) {
      urlTransactions += "&tsl=" + eth4you.timeDate(tsl); //yyyy-MM-dd HH:mm
    }
    if (tsh) {
      urlTransactions += "&tsh=" + eth4you.timeDate(tsh);
    }
    if (currentpage && !!parseInt(currentpage)) {
      urlTransactions += "&currentpage=" + currentpage;
    }

    if (count && !!parseInt(count)) {
      urlTransactions += "&count=" + count;
    }

    axios({
      method: 'GET',
      url: urlTransactions,
      timeout: 20000,
      httpAgent: new http.Agent({ keepAlive: true }),
      httpsAgent: new https.Agent({ keepAlive: true })
    }).then(async function (response) {

      checkIsValid(response, null, null, socket);

      // if(listed == 'holders')
      // 	v = response.data.holders;
      // else
      // 	v = response.data.transactions;

      // if (listed == 'transactions') {
      //   if (data == null)
      //     data = [];
      //   else
      //     data = data.transactions;
      //   ShowNokuTransactionsStep2(data, 0);
      //   return;
      // }

      // var responseTransactions = response.data.transactions;
      transactionsToAppend = [];

      if(response.data){
        for (let iTransaction = 0, len = response.data.transactions.length; iTransaction < len; iTransaction++) {
          var transaction = response.data.transactions[iTransaction];

          var value = transaction.double || transaction.value || '';
          var unit = "", logo = "";
          var originalValue = transaction.value;

          // var tokenAddress = urlApiServer;

          if(!transaction.contract && !transaction.token) {
            if(value) {
              value = eth4you.weiToEther(value);
              unit = "ETH";
              logo = "/content/images/ethereum.png";
            }
          } else  {
            unit = "";
            logo = "/content/images/contract.png";
            if(transaction.token) {
              // token = getTokenByAddress(transaction.token);
              if(transaction.token) {
                unit = "";
                logo = "/content/images/erc20.png";
              
                if(transaction.peers && transaction.peers[0] && transaction.peers[1] && transaction.action == 'transferFrom') {
                  value = transaction.peers[1];
                }
                //value = transaction.double;//GetValueToken(transaction.token,value);
                
                value = await GetValueToken(transaction.token,value);

                // try {
                //   value = eth4you.weiToEther(value);
                // } catch (exx) {}
              }
            } else {
              if(value) {
                value = eth4you.weiToEther(value);
                unit = "ETH";
              }
            }
          }
          var contract = null;
          if( unit != "ETH" && (transaction.token || transaction.contract)) {

            if(transaction.token)
              contract = transaction.token;
            else
              contract = transaction.contract;            
          }

          var tokeninfo = {};
          tokeninfo.unit = unit;
          tokeninfo.logo = logo;
          tokeninfo.contract = contract;

          transaction.tokeninfo = tokeninfo;

          var fee = eth4you.weiToEther(transaction.fee);

          transaction.fee = transaction.fee || "";

          var donatore = false;
          if (transaction.double && transaction.fee.substr(0, 1) == '-') {
            donatore = true;
          }
          if (transaction.double && !donatore) {
            value = '-' + value;
          }
          else if (transaction.peer && transaction.peer.toLowerCase() == currentAddress.toLowerCase() && transaction.fee.substr(0, 1) != '-') {
            transaction.fee = '-' + transaction.fee;
            value = '+' + value;
          }
          else if (donatore || (transaction.fee.substr(0, 1) != '-')) {
            fee = '&nbsp;' + fee;
            if (value == "0" || value == '')
              value = '';
            else
              value = '+' + value;
          } else {
            if (value == "0" || value == '')
              value = '';
            else {
              value = '-' + value;
            }
          }

          var peer = transaction.peer;
          if (peer == transaction.token) {
            peer = currentAddress;
          }
          if (!peer) {
            if (transaction.fee.substr(0, 1) == '-') {
              fee = '&nbsp;' + eth4you.weiToEther(transaction.fee.substr(1));
            }
            peer = transaction.address;
          }

          // tokeninfo.value = value;
          transaction.fee = fee;
          transaction.value = value;
          // if(value.indexOf("0x") < 0) {
          //   transaction.value = value;
          // }

          response.data.transactions[iTransaction] = transaction;

          if(transaction.double) {
            var transactionOriginal = JSON.parse(JSON.stringify(transaction)); //deep copy
            transactionOriginal.cloned = true;

            transactionOriginal.tokeninfo.unit = "ETH";
            transactionOriginal.tokeninfo.logo = "/content/images/ethereum.png";

            var nuovoValue;
            if(donatore) {
              nuovoValue = "-" + eth4you.weiToEther(originalValue);
            }
            else {
              nuovoValue = eth4you.weiToEther(originalValue);
            }

            transactionOriginal.value = nuovoValue;
            if(nuovoValue == '-0') {
              nuovoValue = "";
            } else {
              transactionsToAppend.push({ transaction: transactionOriginal, index: iTransaction + 1 });
            }
          }

        }


        for (let i = transactionsToAppend.length - 1; i >= 0; i--) {
          var item = transactionsToAppend[i].transaction;
          var indexToAppend = transactionsToAppend[i].index;
          response.data.transactions.splice( indexToAppend, 0, item );
        }

        response.data.totalitems = response.data.transactions.length
      }
      else {
        response.data.transactions = [];
        response.data.totalitems = 0;
      }

      // response.data.currentpage = currentpage;

      // console.log("totalitems: " + response.data.totalitems);

      socket.emit('transactions', response.data);

      if(data.refreshall){
        socket.emit('refreshAllFinished', { event: "sendTransaction" });
      }

    }).catch(function (error) {console.log(error)});
  }

  app.get("/getvaluetoken/:address(0x*)", async (req, res, next) => {//function(req,res,next){
    var value = req.query.value;
    if(!value) {
      return res.send("");
    }

    var sign = "";

    if(value.indexOf("-") == 0 || value.indexOf("+") == 0) {
      sign = value.substr(0,1);
      value = value.substr(1);
    }

    var response = await GetValueToken(req.params.address, value);

    res.setHeader('Cache-Control', 'public, max-age=' + 10 * 24 * 60 * 60); //10gg
    return res.json({value: sign + response});
  });

  app.get("/getlogotoken/:address(0x*)", function(req,res,next){

    // checkIsValid(req, true, req.query.address);

    var size = req.query.size ? parseInt(req.query.size) : null;

    axios({
      method: 'GET',
      url: setUrl("/gettokeninfo", req.params.address),
      timeout: 20000,
      httpAgent: new http.Agent({ keepAlive: true }),
      httpsAgent: new https.Agent({ keepAlive: true })
    })
    .then(function (token) {
      return res.send({ url: GetLogo(token.data, size) });
    }).catch(function (error) {console.log(error)});

  });

  app.get("/balance/:address(0x*)", function(req,res,next){
    var address = req.params.address;
    axios({
      method: 'GET',
      url: setUrl("/balance", address),
      timeout: 20000,
      httpAgent: new http.Agent({ keepAlive: true }),
      httpsAgent: new https.Agent({ keepAlive: true })
    }).then(function (response) {
      // checkIsValid(response);

      var responseBalance = CreateResponseBalance(response);

      return res.json(responseBalance);
    }).catch(function (error) {console.log(error)});
  });

  app.post("/saveworkspace", auth, function (req, res, next) {
    var workspace = req.body.workspace;

    axios({
      method: 'POST',
      url: configOAuth2.apiHost + "/api/user/workspace",
      timeout: 20000,
      data: { workspace: workspace },
      headers: { 'Authorization': 'Bearer ' + req.session.accessToken }
    }).then(function (response) {
      return res.json(response.data);
    }).catch(function (error) {
      console.log(error);
      return res.json(error.message);
    });
  });

  app.get("/getworkspace", auth, async function (req, res, next) {

    let value = await sendRequestWithToken(req, "GET", configOAuth2.apiHost + "/api/user/workspace");

    res.json(value);
      // .then((response) => {
      //   return res.json(response);
      // })
      // .catch((error) => {
      //   return res.json(error.message);
      // });
  });

  app.post("/addressunlocked", function(req, res, next){
    var address = req.body.address;
    axios({
      method: 'POST',
      url: configOAuth2.apiHost + "/api/addressunlocked",
      timeout: 20000,
      data: { address: address}
    }).then(function (response) {

      if(response.data.success && response.data.new) {
        var visitor = ua('UA-118580931-1');
        visitor.event("UseWallet", "Unlock", "First Unlock personal Wallet", 1).send();
      }
      return res.json({ success: true });
    }).catch(function (error) {
      return res.json(error);
    });
  });

  app.get("/getuserinfo", auth, function(req, res){
    axios({
      method: 'GET',
      url: configOAuth2.apiHost + "/api/user/info",
      timeout: 20000,
      headers: { 'Authorization': 'Bearer ' + req.session.accessToken }
    }).then(function (response) {
      var user = response.data;
      axios({
        method: 'GET',
        url: configOAuth2.apiHost + "/api/user/avatar",
        timeout: 20000,
        headers: { 'Authorization': 'Bearer ' + req.session.accessToken }
      }).then(function (responseAvatar) {
        user.avatar = responseAvatar.data.imgbase64;
        return res.json(user);
      }).catch(function (error) {
        // console.log(error);
        return res.json(error.message);
      });      
    }).catch(function (error) {
      // console.log(error);
      return res.json(error.message);
    });
  });

  async function GetValueToken(addr, value) {
    try {
      let nameCache = addr+value;
      var valueCached = localStorageMemory.getItem(nameCache);
      if(!valueCached) {        
        let valueToken = await GetValueTokenPromise(addr, value);
        localStorageMemory.setItem(nameCache, valueToken.value);
        return valueToken.value;
      }
      else {
        return valueCached;
      }
      
    } catch (err) {
      return null;
    }
  }  

  function GetValueTokenPromise(addr, value) {
    return new Promise(function(resolve, reject) {
      axios({
        method: 'GET',
        url: setUrl("/gettokeninfo", addr),
        timeout: 20000,
        httpAgent: new http.Agent({ keepAlive: true }),
        httpsAgent: new https.Agent({ keepAlive: true })
      })
      .then(function (data) {

        var token = data.data;

        if (!token) {
          return reject(Error("no token data"));
        }
        var dec = token.dec || token.decimals;
        if (addr && (dec) != null) {
          return resolve({value: eth4you.tokenTransfert(value, {dec: dec})});
        }
        return resolve({value: eth4you.tokenTransfert(value, { dec: 18 })});

      }).catch(function (error) {
        reject(Error(error));
      });
    });
  }

  function checkIsValid(response, checkAnotherValue, anotherValue, socket) {
    // console.log(response);
    if (response.data.error || (checkAnotherValue && !anotherValue)) {
      sendError(socket);
      return false;
    }
  }

  function sendError(socket) {
    socket.send({ type: "error", text: "Internet or ethereum network is overloaded. Info on your account could be incomplete!" });
  }

  function sendBalance(socket, dataSocket = {}) {
    var currentAddress = socket.handshake.query.currentaddress;
    // console.log(setUrl("/balance", currentAddress));
    axios({
      method: 'GET',
      url: setUrl("/balance", currentAddress),
      timeout: 20000,
      httpAgent: new http.Agent({ keepAlive: true }),
      httpsAgent: new https.Agent({ keepAlive: true })
    })
      .then(function (response) {
        checkIsValid(response, null, null, socket);

        
        var responseBalance = CreateResponseBalance(response, maxDelay);
        
        if(!responseBalance){
          sendError(socket);
        }
        else {
          socket.emit('balance', responseBalance);
        }

        if(dataSocket.refreshall){
          socket.emit('refreshAllFinished', { event: "sendBalance" });
        }

      }).catch(function (error) {console.log(error)});
  }
};

var CreateResponseBalance = function(response, _maxDelay){
  var responseBalance = {},
      maxDelay = _maxDelay || "";

  var tokens = initNokuTokens(response.data.tokens);

  if (response.data.type == 'token') {
    var info = response.data.token;

    responseBalance.token = {};

    var name = '';
    if (info.name) {
      name = info.name;
    } else if (info.symbol) {
      name = info.symbol;
    }

    responseBalance.token.name = name;
    var tokenSupply = "";

    if (info.supply != null) {
      if (!info.decimals)
        info.decimals = 0;
      if (info.multi && info.multi.ETH) {
        var quoted = eth4you.initEquivalent();
        var eth = eth4you.tokenToEth(info.supply, {
          dec: info.decimals
        }, info.multi.ETH);
        eth4you.addEquivalent(quoted, {
          dec: info.decimals,
          balance: info.supply
        }, info.multi);
        if (!maxDelay || info.multi.delayed > maxDelay)
          maxDelay = info.multi.delayed;

        responseBalance.token.tooltipTitleSupply = BuildTitle("", quoted, true);

        if(info.multi.delayed){
          responseBalance.token.tooltipTitleSupply += '<center><span class="title-tooltip">Delayed ' + eth4you.elapsed(info.multi.delayed) + '</span></center>';
        }
      }
      var supply = eth4you.bigNumber(info.supply).div(eth4you.bigNumber(10).pow(info.decimals)).round(4).toFormat();
      tokenSupply = supply;
    }

    responseBalance.isToken = true;
    responseBalance.token.tokenSupply = tokenSupply;

    if (info.circulating) {
      var circulating = eth4you.bigNumber(info.circulating).round(4).toFormat();
      responseBalance.token.circulating = circulating;
    }
    if (info.creator) {
      responseBalance.token.creator = eth4you.toChecksumAddress(info.creator);
      // var blockie = eth4you.blockies.create({ seed: info.creator.toLowerCase(), size: 8, scale: 16 }).toDataURL();

    }
    if (info.owner) {
      responseBalance.token.owner = eth4you.toChecksumAddress(info.owner);
      // var blockie = eth4you.blockies.create({ seed: info.owner.toLowerCase(), size: 8, scale: 16 }).toDataURL();
    }
    // if(false && info.minter) {
    //   responseBalance.token.minter =  eth4you.toChecksumAddress(info.minter);
    // 	// var blockie = eth4you.blockies.create({ seed: info.minter.toLowerCase(), size: 8, scale: 16 }).toDataURL();
    // }

  } else if (response.data.type == 'contract') {
    responseBalance.isContract = true;
  }

  responseBalance.type = response.data.type;

  if (response.data.result) {
    var etherRawBalance = response.data.result;
    var etherBalance = eth4you.etherize(response.data.result);
    var weiBalance = eth4you.weiize(response.data.result);

    var tokens = OrderTokens(tokens);

    // if(filterAddress) {
    //   filterToken = getTokenByAddress(filterAddress);
    //   ShowAccountFiltered(filterToken);
    // }

    var arrayToRemove = [];

    for (var i = 0; i < tokens.length; i++) {
      if(!SuccessTokenBalance(tokens[i])) {
        arrayToRemove.push(i); //arrayToRemove deve essere ordinato: asc
      }
    }

    for (var i = arrayToRemove.length -1; i >= 0; i--){
      tokens.splice(arrayToRemove[i],1);
    }
    
    //PriceEther = // PriceEther(data.multi);
    var multi = response.data.multi;
    if (multi && multi['ETH'])
      etherPrice = multi['ETH'];
    else
      etherPrice = 0;
    var total = eth4you.initEquivalent();
    eth4you.addEquivalent(total, {
      dec: 18,
      balance: etherRawBalance
    }, etherPrice);

    var etherQuoted = eth4you.initEquivalent();
    eth4you.addEquivalent(etherQuoted, {
      dec: 18,
      balance: etherRawBalance
    }, etherPrice);
    etherQuoted.eth = eth4you.bigNumber(eth4you.etherizeNotRounded(weiBalance));

    var tooltipTitleEth = BuildTitle("", total, false);

    if (etherPrice.delayed) {
      if (!maxDelay || etherPrice.delayed > maxDelay)
        maxDelay = etherPrice.delayed;
      tooltipTitleEth += '<center><span class="title-tooltip">Delayed ' + eth4you.elapsed(etherPrice.delayed) + '</span></center>';
    }

    // PriceMulti = //PriceMulti(data.multi);
    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];
      token.price = null;
      if (!token.balance)
        continue;
      var sym = token.sym;
      if (sym == 'EURN')
        sym = 'EURN';
      token.price = multi[sym];

      var title = "";
      var img = null;
      if (token.price && token.qtd) {
        var eth = eth4you.tokenToEth(token.result, token, token.price.ETH);
        eth4you.addEquivalent(total, token, token.price);
        token.quoted = eth4you.getQuoted(token, token.price);
      } else if (token.sym != 'CHFN' && token.sym != 'GBPN') {
        title = "Token";
        if (token.name)
          title = "<strong class='title-tooltip'>" + token.name + "</strong>";
        if (!token.noku) {
          img = '&nbsp;<img src="images/esclamation.png"/>';
          title += ' informations not available';
        }
        token.quoted = null;
      } else {
        var eth = eth4you.bigNumber(token.result).div(eth4you.bigNumber(10).pow(token.dec));
        if (token.sym == 'CHFN')
          eth = eth.div(etherPrice.CHF);
        else
          eth = eth.div(etherPrice.GBP);
        token.quoted = eth4you.getIndirectQuoted(eth, etherPrice);
        eth4you.sumEquivalent(total, eth, token.quoted);
      }

      var tooltipTitleInfoToken = "";

      if (token.quoted) {
        if (!maxDelay || token.delayed > maxDelay)
          maxDelay = token.delayed;
        tooltipTitleInfoToken = BuildTitle("<strong class=\"title-tooltip\">" + token.name + "</strong><br />", token.quoted, true);
        if(token.delayed){
          tooltipTitleInfoToken += '<center><span class="title-tooltip">Delayed ' + eth4you.elapsed(token.delayed) + '</span></center>';
        }
      }
      else{
        if(token.price) {
          tooltipTitleInfoToken = BuildOnlyTitle("<strong class=\"title-tooltip\">" + token.name + "</strong><br />", token.price, true);
        }
        else{
          tooltipTitleInfoToken = "<strong class=\"title-tooltip\">" + token.name + "</strong> informations not available";
        }
      }

      token.infoTitle = (token.infoTitle || "" ) + tooltipTitleInfoToken;
    }


    var tooltipTitleTotal = BuildTitle("", total, false);

    if(maxDelay){
      tooltipTitleTotal += '<center><span class="title-tooltip">Delayed ' + eth4you.elapsed(maxDelay) + '</span></center>';
    }

    $.extend(responseBalance, {
      address: response.data.address,
      etherRawBalance: etherRawBalance,
      etherBalance: etherBalance,
      weiBalance: weiBalance,
      tooltipTitleEth: tooltipTitleEth,
      total: RoundTotal(total),
      tooltipTitleTotal: tooltipTitleTotal,
      maxDelay: maxDelay,
      tokens: tokens,
      etherPrice: etherPrice
    });
    return responseBalance;    
  }
  else {
    if(!response.data && response.data.type != "virgin"){
      return false;      
    }
  }
  return response.data;
}

var SuccessTokenBalance = function (token) {
  var data = token;
  // if(data.error) return ErrorNode();
  token.balance = null;
  token.result = data.result;
  token.urlimage = GetLogo(token);
  if (data.result == '0x')
    data.result = "0";
  var roundedLocked = null;
  var big = eth4you.bigNumber(data.result);
  var roundedBalance = eth4you.tokenRounder(big, token, ROUNDER);
  token.roundedBalance = roundedBalance;
  if (!big.isZero() && roundedBalance != 0) {
    token.balance = data.result;
    if (data.locked && data.locked != '0x') {
      big = eth4you.bigNumber(data.locked);
      var r = eth4you.tokenRounder(big, token, ROUNDER);
      if (!big.isZero() && r != 0) {
        token.locked = data.locked;
        roundedLocked = eth4you.tokenRounder(big, token, ROUNDER);
      } else
        token.locked = null;

    } else {
      token.locked = null;
    }

    var unit = token.sym;
    if (unit == '') {
      unit = "ERC20";
    }

    var text = roundedBalance + " " + unit;
    if (roundedLocked) {
      text += '<i class="fas fa-lock locked-icon"></i>';
      token.infoTitle = '<div class="locked"><div class="title-tooltip">Token locked:</div> ' + roundedLocked + '</div>';
    }
    token.text = text;
    return true;
  } else if (data.handle) {
    // da rimuovere anche select
    token.select.remove();
    token.handle.remove();
    token.handle = null;
    token.select = null;
  }
  return false;
}

var GetLogo = function (token, size) {

  var _sym = token.sym || token.symbol;
  var _addr = eth4you.toChecksumAddress(token.addr || token.address);

  if (_sym == 'NOKU')
    return "/content/images/NOKU.svg";
  if (_sym == 'GOLDN')
    return "/content/images/GLDN.svg";
  if (_sym == 'GBPn')
    return "/content/images/GBPN.svg";
  if (_sym == 'EURN')
    return "/content/images/EURN.svg";
  if (_sym == 'CHFN')
    return "/content/images/CHFN.svg";
  var name;
  if (_sym)
    name = _sym;
  else
    name = _addr;
  name = apiServer.current + "/logos/" + name;
  //name  = "logos/" + name;
  switch(size){
    case "16":
      return name + "-16x16.png";
      break;
    case "32":
      return name + "-32x32.png";
      break;
    default:
      if (token.l32)
        return name + "-32x32.png";
      if (token.l16)
        return name + "-16x16.png";
      if (token.l28)
        return name + "-28x31.png";
      if (token.le)
        return apiServer.current + "/logose/" + _addr.toLowerCase() + ".png";
      return "";
  }
  // if (token.l32)
  //   return name + "-32x32.png";
  // if (token.l16)
  //   return name + "-16x16.png";
  // if (token.l28)
  //   return name + "-28x31.png";
  // if (token.le)
  //   return urlApiServer + "/logose/" + token.addr.toLowerCase() + ".png";
  // return "";
}

var initNokuTokens = function (tokens) {
  // __mapaddr__ = [];
  // __mapsym__ = [];
  if (tokens) {
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      t.addr = eth4you.toChecksumAddress(t.addr);
      // if(__mapaddr__[t.addr.toLowerCase()])
      // 	console.log("Dup Token Address " + t.addr);
      // __mapaddr__[t.addr.toLowerCase()] = t;
      // if(t.sym)
      // 	__mapsym__[t.sym.toUpperCase()] = t;
    }
  }
  return tokens || [];
}

var OrderTokens = function (tokens) {
  if (!tokens) return [];
  for (var i = 0; i < tokens.length; i++) {
    for (var j = i + 1; j < tokens.length; j++) {
      if (tokens[i].noku) {
        if (!tokens[j].noku)
          continue;
      } else if (tokens[j].noku) {
        var tmp = tokens[i];
        tokens[i] = tokens[j];
        tokens[j] = tmp;
        continue;
      }
      if (tokens[i].quoted) {
        if (!tokens[j].quoted)
          continue;
      } else if (tokens[j].noku) {
        var tmp = tokens[i];
        tokens[i] = tokens[j];
        tokens[j] = tmp;
        continue;
      }
      if (eth4you.bigNumber(tokens[i].quoted).lessThan(eth4you.bigNumber(tokens[j].quoted))) {
        var tmp = tokens[i];
        tokens[i] = tokens[j];
        tokens[j] = tmp;
      }
    }
  }
  return tokens || [];
}

var RoundTotal = function(total){
  if(!total){
    return total;
  }
  if (total.eth) total.eth = eth4you.rounded(total.eth, 5);
  if (total.btc) total.btc = eth4you.rounded(total.btc, 6);
  if (total.usd) total.usd = eth4you.rounded(total.usd, 2);
  if (total.eur) total.eur = eth4you.rounded(total.eur, 2);
  if (total.chf) total.chf = eth4you.rounded(total.chf, 2);
  if (total.gbp) total.gbp = eth4you.rounded(total.gbp, 2);
  if (total.jpy) total.jpy = eth4you.rounded(total.jpy, 1);
  if (total.cad) total.cad = eth4you.rounded(total.cad, 2);
  if (total.aud) total.aud = eth4you.rounded(total.aud, 2);
  if (total.rub) total.rub = eth4you.rounded(total.rub, 1);
  if (total.cny) total.cny = eth4you.rounded(total.cny, 1);
  return total;
}

var BuildTitle = function (title, all, eth) {
  if (all.eth && eth) title += "ETH " + eth4you.rounded(all.eth, 5) + "<br/>";
  if (all.btc) title += "BTC " + eth4you.rounded(all.btc, 6) + "<br/>"; //mettiamo 6 decimali per arrotondare
  if (all.usd) title += "USD " + eth4you.rounded(all.usd, 2) + "<br/>";
  if (all.eur) title += "EUR " + eth4you.rounded(all.eur, 2) + "<br/>";
  if (all.chf) title += "CHF " + eth4you.rounded(all.chf, 2) + "<br/>";
  if (all.gbp) title += "GBP " + eth4you.rounded(all.gbp, 2) + "<br/>";
  if (all.jpy) title += "JPY " + eth4you.rounded(all.jpy, 1) + "<br/>";
  if (all.cad) title += "CAD " + eth4you.rounded(all.cad, 2) + "<br/>";
  if (all.aud) title += "AUD " + eth4you.rounded(all.aud, 2) + "<br/>";
  if (all.rub) title += "RUB " + eth4you.rounded(all.rub, 1) + "<br/>";
  if (all.cny) title += "CNY " + eth4you.rounded(all.cny, 1) + "<br/>";
  return title;
}

var BuildOnlyTitle = function (title, all, eth) {
  if (all.ETH && eth) title += "ETH " + all.ETH + "<br/>";
  if (all.BTC) title += "BTC " + all.BTC + "<br/>";
  if (all.USD) title += "USD " + all.USD + "<br/>";
  if (all.EUR) title += "EUR " + all.EUR + "<br/>";
  if (all.CHF) title += "CHF " + all.CHF + "<br/>";
  if (all.GBP) title += "GBP " + all.GBP + "<br/>";
  if (all.JPY) title += "JPY " + all.JPY + "<br/>";
  if (all.CAD) title += "CAD " + all.CAD + "<br/>";
  if (all.AUD) title += "AUD " + all.AUD + "<br/>";
  if (all.RUB) title += "RUB " + all.RUB + "<br/>";
  if (all.CNY) title += "CNY " + all.CNY + "<br/>";
  return title;
}

var setUrl = function (base, addr) {
  var url = apiServer.current;

  url += base + "?network=" + "mainnet";
  if (addr)
    url += "&address=" + addr;
  else
    url += "&address=" + nokuAddress;
  if (typeof (user) != "undefined" && user)
    url += "&key=" + user.key;
  return url;
}