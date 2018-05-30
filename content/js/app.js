var walletVersion = "2.0.1",
etherPrice,
predictGasStationTime,
predictGasStationArray,
predictMaxGasPrice,
predictMaxGasTime,
mapDecimalOfCurrency = { 'eth': 5, 'btc': 6, 'usd': 2, 'eur': 2, 'chf': 2, 'gbp': 2, 'jpy': 1, 'cad': 2, 'rub': 1, 'cny': 1 },
decrypted = false,
startDateTransaction,
endDateTransaction,
lastNonce,
serverApi,
privateKeyGlobal;

toastr.options = {
  "positionClass": "toast-bottom-right"
}

$(function() {
  initCompatibility();
  initJcf();
  initHeader();
  initFormsValidation();
  initHomepage();
  initAccordion();
  initDropzone('#utc-json .dropzone-container');
  initDropzone('.jsonfile-switch .dropzone-container');
  initDropzone('.createwaller-container .dropzone-container');
  initDropzone('#BigModal .dropzone-container');
  initDropzone('#import-workspace-modal .dropzone-container');
  initMnemonic();
  getCurrentServer(function(){
    initConsole();
    initAvatars();
    initForms();
    initWallet();
    initWorkSpace();
    ModalNotModify();
    initSaveKey();
    initSearchAddress($("#explore-text"));
    initSearchAddress($("#explore-homepage"));
    initRubrica();
    setTimeout(function(){
      refreshMessage();
    }, 1000);
  });
  $('[data-toggle="tooltip"]').tooltip({
    trigger: 'hover',
    offset: '0, 5'
  });
  if($("#success_modal").length > 0) {
    $("#success_modal").modal("show");
  }
});

function initCompatibility(){
  var currentVersion = localStorage.getItem("wallet-version");

  switch(currentVersion){
    case null: //firstversion
    var query = "private-key-";
    for (i in localStorage) {
      if (localStorage.hasOwnProperty(i)) {
        if (i.match(query)) {
          localStorage.removeItem(i);
        }
      }
    }
    break;
  }

  localStorage.setItem("wallet-version", walletVersion);
}

function getCurrentServer(callback){
  updateCurrentServer(callback);
  setInterval(function(){
    updateCurrentServer();
  }, 10000);
}

function updateCurrentServer(callback){
  $.get("/getcurrentserver", function(data){
    serverApi = data.server;
    if(callback) {
      callback();
    }
  });
}

function initFormsValidation(){
  $(".enc-unlock").click(function(){
    $(this).parents(".modal-noku").find("form").submit();
  });

  $(".enc-unlock-workspace").click(function(){
    $(this).parents(".modal-noku").find("form.visible").submit();
  });
}

function getAddressFromENS(enskey, callback){
  try {
    var ens = new eth4you.ens();
    ens.getAddress(serverApi + "?address=" + nokuAddress, enskey, function (data) {
      if (data && data.data === '0x' || !data.data) {

      } else {
        var ensAddress = eth4you.toChecksumAddress(data.data);
        if (callback) callback(ensAddress);
      }
    });
  } catch (error) {}
}

function initSearchAddress($selector){  
  var timeoutFocusOut;
  $selector.autocomplete({
    paramName: 'token',
    serviceUrl: serverApi + '/search-token?address=' + nokuAddress,
    ajaxSettings: { dataType: "json", method: "GET" },
    deferRequestBy: 400,
    transformResult: function (response) {
      return {
        suggestions: $.map(response, function (dataItem) {
          return { value: dataItem.symbol + " - " + dataItem.name + " " + dataItem.address, data: dataItem.address };
        })
      };
    },
    onSelect: function (suggestion) {
      //InsertIntoRubrica(suggestion.data);
      clearTimeout(timeoutFocusOut);
      location.href = "/address/" + suggestion.data;
    },
    onSearchComplete: function (query, suggestions) {
      // console.log(query);
      if(!suggestions.length) {
        getAddressFromENS(query, function(ens){
          $selector.val(ens);
          // location.href = "/address/" + ens;
        });
      }
    }
  });

  $selector.on("focusin", function(){
    $(this).addClass("focus");
    $('#explore-text').autocomplete('clear');
    setTimeout(function(){
      $('#explore-text').autocomplete('enable');
    }, 500);
  });

  $selector.on("focusout", function(e){
    var $t = $(this);
    console.log(e);
    timeoutFocusOut = setTimeout(function(){
      $t.removeClass("focus");
      $('#explore-text').autocomplete('hide');
      $('#explore-text').autocomplete('disable');
    }, 500);    
  });


  $(".js-form-gotoaddress").on("submit", function(e){
    e.preventDefault();
    try {
      var address = eth4you.toChecksumAddress($(this).serializeArray()[0].value);
      if(address && address.indexOf("0x") >= 0){
        // InsertIntoRubrica(address);
        location.href = "/address/" + address;
      }
    }
    catch (ex){}
  })
}

function refreshMessage($items){
  ($items || $(".info")).each(function(){
    $(this).find(".message-box").remove();
    var $info = $(this).append('<span class="message-box"></span>');
    MessageBox($info);
  });
}
function initSaveKey(){
  $(document).on("submit", ".js-private-key", function(e){
    if(!validateSubmit($(this), e)) {
      return false;
    }
    addressFromModalPrivateKey($(this), $(this).hasClass("js-not-modal"));
  });

  $(document).on("submit", ".js-private-key-encrypted", function(e){
    if(!validateSubmit($(this), e)) {
      return false;
    }
    addressFromModalPrivateKeyEncrypted($(this), $(this).hasClass("js-not-modal"));
  });

  $(document).on("submit", ".js-address-json", function(e){
    if(!validateSubmit($(this), e)) {
      return false;
    }
    var $t = $(this);
    var $modal = $t.hasClass("js-not-modal") ? $t.parents(".js-container-json") : $t.parents(".modal-content");
    var file = Dropzone.forElement($modal.find(".js-json-utc-wallet")[0]).files[0];
    var password = $modal.find(".js-password-unlock-json").val();
    if (file == undefined) {
      $modal.find(".dropzone-element").addClass("is-invalid");
      toastr.error("UTC/JSON file missed");
      return false;
    }
    getAddressFromJson(file, password, function(address){
      if(address){
        if(gtag) {
          gtag('event', 'Unlock', {
            'event_category': 'UseWallet',
            'event_label': 'Unlock your Wallet',
            'value': 1
          });
        }  
        location.href = "/address/" + address;
      }
      else{
        $modal.find(".js-password-unlock-json").addClass("error");
        toastr.error("wrong password!");
      }
    });
  });

  $(".js-resave-wallet").on("submit", function(e){
    var $t = $(this);
    if(!validateSubmit($t, e)) {
      return false;
    }

    var name = $t.find(".js-wallet-name").val() + ".json",
        password = $t.find(".js-wallet-password").val();
    CreateJSON($t.parents(".modal").find(".js-download-json"), getCurrentPrivateKey(), password, name, "address.json", $t);
    return false;
  });
}

function addressFromModalPrivateKeyEncrypted($t, notModal, returnAddress){
  var $modal = (notModal ? $t.parents(".js-container-prkey") : $t.parents(".modal-content"));
  var privkeyEncr = $modal.find(".js-load-pkey").val();
  var password = $modal.find(".js-password-unlock-json").val();
  var privkey = eth4you.fromMyEtherWalletKey(privkeyEncr, password);

  if(!privkey || !privkey.length) {
    toastr.error("wrong password!");
    return false;
  }
  if(privkey.length == 66) {
    privkey = privkey.substr(2);
  }

  if(!returnAddress) {
    goToAddressFromPrivateKey(privkey);
    if(!notModal){
      $("#privatekey").modal('hide');
    }
  }else {
    var priv = getAddressFromPrivateKey(privkey);
    if(!notModal){
      $t.parents(".modal").modal('hide');
    }
    return priv;
  }
}

function addressFromModalPrivateKey($t, notModal, name, returnAddress, createWallet){
  var privkey = (notModal ? $t.parents(".js-container-prkey") : $t.parents(".modal-content")).find(".js-load-pkey").val();
  if(!privkey || !privkey.length) {
    return false;
  }
  if(privkey.length == 66) {
    privkey = privkey.substr(2);
  }

  // if(name) {
  //   var address = getAddressFromPrivateKey(privkey);
  //   InsertIntoRubrica(address, name, true);
  // }

  if(!returnAddress) {
    if(createWallet && gtag) {      
      gtag('event', 'Create', {
        'event_category': 'UseWallet',
        'event_label': 'Create a new Wallet',
        'value': 1
      });      
    }
     
    goToAddressFromPrivateKey(privkey);
    $("#privatekey").modal('hide');
  }
  else {
    var priv = getAddressFromPrivateKey(privkey);
    $t.parents(".modal").modal('hide');
    return priv;
  }
}

function goToAddressFromPrivateKey(privkey){
  if(gtag) {
    gtag('event', 'Unlock', {
      'event_category': 'UseWallet',
      'event_label': 'Unlock your Wallet',
      'value': 1
    });
  }  
  location.href = "/address/" + getAddressFromPrivateKey(privkey);
}

function getAddressFromPrivateKey(privkey){
  var address = eth4you.toChecksumAddress(eth4you.addressFromPrivate(privkey));
  var etherAddress = eth4you.toChecksumAddress(address);

  savePrivateKey(etherAddress, privkey);
  return address;
}

function savePrivateKey(address, privkey){
  setTimeout(function(){
    $.post("/addressunlocked", { address: address });
  }, 0);
  (sessionStorage || localStorage).setItem("private-key-" + address, privkey);
}

function getPrivateKey(address){
  return (sessionStorage || localStorage).getItem("private-key-" + address);
}

function getCurrentPrivateKey(){
  if(!privateKeyGlobal){
    var address = $(".js-config-data").data("currentaddress");
    privateKeyGlobal = getPrivateKey(address);
    if(!sessionStorage && localStorage){
      localStorage.setItem("private-key-" + address, "");
    }
  }
  return privateKeyGlobal;
}

function MessageBox($info){
  $info
  .mouseover(function(){
    var infoMessage = $(this).data("info");
    var $messageBox = $(this).find(".message-box");
    $(this).find(".message-box").html(infoMessage);
    var top = $(this).offset().top - $(window).scrollTop() - $(this).find(".message-box").height()/2;
    var left = $(this).offset().left + $(this).width() + 10;
    $(this).find(".message-box").css("left",left + 10);
    $(this).find(".message-box").css("top",top);
  });
}

function copyToClipboard(element) {
  var $temp = $("<input>");
  $("body").append($temp);
  $temp.val(element).select();
  document.execCommand("copy");
  $temp.remove();
}

function insertNewWallets() {
  var wallets = loadOthersWallet();
  $(".js-load-wallets").html("");
  $(".js-create-address-wallet").val("");
  wallets.forEach(function($_wallet, index) {

    var $wallet = $(document.createElement("div")).addClass("single-avatar").data("settings", JSON.stringify($_wallet));

    var $img = $(document.createElement("img")).attr("src", $_wallet.blockie);

    // var $input = $(document.createElement("input")).attr("val", $_wallet.address);

    $wallet.append($img);

    $(".js-load-wallets").append($wallet);
  });
}

function loadOthersWallet() {
  var address = [];
  for (i = 0; i < 5; i++) {

    var wallet = {};

    wallet.key = eth4you.generatePrivateKey();
    wallet.addr = eth4you.toChecksumAddress(eth4you.addressFromPrivate(wallet.key));

    // wallet.QrAddress = document.createElement("div");
    // new eth4you.QRCode(wallet.QrAddress, {
    //   width: 115,
    //   height: 115,
    //   colorDark: "#000000",
    //   colorLight: "#ffffff",
    //   correctLevel: QRCode.CorrectLevel.H,
    //   text: wallet.addr
    // });


    // wallet.QrPrivKey = document.createElement("div");
    //
    // new eth4you.QRCode(wallet.QrPrivKey, {
    //   width: 115,
    //   height: 115,
    //   colorDark: "#000000",
    //   colorLight: "#ffffff",
    //   correctLevel: QRCode.CorrectLevel.H,
    //   text: wallet.key
    // });

    wallet.blockie = eth4you.blockies.create({
      seed: wallet.addr.toLowerCase(),
      size: 8,
      scale: 5
    }).toDataURL();

    address.push(wallet);
  }
  return address;
}

function initAvatars() {

  $(document).on("click", ".js-load-more-wallets", function() {
    insertNewWallets();
  });

  insertNewWallets();

  $(document).on("click", ".single-avatar", function() {
    $(".choose-avatar").removeClass("is-invalid");
    $(".avatar-fake").removeClass("is-invalid");
    if (!$(this).hasClass("active")) {
      $(".single-avatar").removeClass("active");
      $(this).addClass("active");
      $(".js-create-address-wallet").val($(this).data("settings"));
    } else {
      $(".single-avatar").not(this).removeClass("active");
    }
  });
}

function initDropzone(selector) {
  Dropzone.autoDiscover = false;
  $Dropzone = $(selector).dropzone({
    url: "#",
    method: 'get', // Error suppress in markup, remove in dev.
    clickable: selector + ' .dropzone-element',
    maxFilesize: 5, // MB
    // acceptedFiles: 'application/javascript,text/plain',
    addRemoveLinks: true,
    dictRemoveFile: '',
    init: function () {
      this.on('thumbnail', function () {
        $(this).parent().find('.hidden-flex').remove().appendTo(selector + ' .images-preview');
        $(selector).parents(".accordion").find(".item-opener").first().trigger("click");
      })
      this.on("addedfile", function (file) {
        $(".dropzone-container .dropzone-element .span").css("opacity", 0);
        if (this.files[1] != null) {
          this.removeFile(this.files[0]);
        }
        if (!file.type.match(/image.*/)) {
          var preview = document.getElementsByClassName('dz-preview');
          preview = preview[preview.length - 1];

          var imageName = document.createElement('span');
          imageName.innerHTML = file.name;

          preview.insertBefore(imageName, preview.firstChild);
          $(selector).parents(".accordion").find(".item-opener").first().trigger("click");
        }
        setTimeout(function(){
          $(selector).parents("form").first().find("input").first().focus();
        }, 100);
        

      })
      this.on("removedfile", function (file) {
        $(".dropzone-container .dropzone-element .span").css("opacity", 1);
      })
      this.on('resetFiles', function () {
        if (this.files.length != 0) {
          for (i = 0; i < this.files.length; i++) {
            this.removeFile(this.files[i]);
          }
          this.files.length = 0;
        }
      });
    }
  });
}

function initJcf() {
  jcf.setOptions('Select', {
    wrapNative: false,
    wrapNativeOnMobile: true,
    maxVisibleItems: 6
  });
  jcf.replaceAll();
}

function initHeader() {
  $(".search-icon").click(function(){
    $(this).parents("form").submit();
  });
  $(".wallet-select .select-label").on("click", function() {
    $(this).parent().toggleClass("active");
  });
  $(".wallet-select .option-modal .option").click(function() {
    $(".option-modal .option").removeClass("active");
    $(this).parents(".wallet-select").removeClass("active");
    $(this).addClass("active");
  });
  $('.not-progress').on('hidden.bs.modal', function() {
    $(".option-modal .option").removeClass("active");
  });
  $(".removeActive").click(function() {
    $(this).parents(".wallet-select").removeClass("active");
    $(".option-modal .option").removeClass("active");
  });
  $(document).click(function(event) {
    if (!$(event.target).closest('.wallet-select').length) {
      $(".wallet-select").removeClass("active");
    }
  });
}

function PrintPaper(key) {
  var closed = "</" + "script>";

  var addr = eth4you.toChecksumAddress(eth4you.addressFromPrivate(key));
  // Inutile scomodare il jquery per fare tre bischerate per una pagina di solo output senza eventi!!!
  // Purtroppo ho dovuto usare print-min.css perche' non sono riuscito a ricostruire il css originale non minimizzato
  var win = window.open("about:blank", "rel='noopener'", "_blank");
  win.document.writeln('<!DOCTYPE html>');
  win.document.writeln("<html>");
  win.document.writeln("<head>");
  win.document.writeln('<meta charset="utf-8">');
  win.document.writeln('<link rel="stylesheet" href="/content/css/print-min.css" />');
  win.document.writeln('<script type="text/javascript" src="/content/js/eth4you.min.js">' + closed);
  win.document.writeln('<script type="text/javascript">');
  win.document.writeln("window.onload = function() {");
  win.document.writeln('var QR = function(id,text) { new eth4you.QRCode(document.getElementById(id), { colorDark: "#000000", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.H, text: text }) }');
  win.document.writeln('document.getElementById("paperwalletadd").innerHTML = "' + addr + '";');
  win.document.writeln('document.getElementById("paperwalletpriv").innerHTML = "' + key + '";');
  win.document.writeln('QR("paperwalletaddqr","' + addr + '");');
  win.document.writeln('QR("paperwalletprivqr","' + key + '");');
  win.document.writeln('var blockie = eth4you.blockies.create({ seed: "' + addr.toLowerCase() + '", size: 8, scale: 16 }).toDataURL();');
  win.document.writeln('document.getElementById("identicon").style.backgroundImage = "url("+blockie+")";');
  win.document.writeln('setTimeout(function() { window.print(); }, 1000);');
  win.document.writeln("}");
  win.document.writeln(closed);
  win.document.writeln('</head>');
  win.document.writeln('<body>');
  win.document.writeln($("#print-template").html());
  win.document.writeln('</body>');
  win.document.writeln('</html>');
  win.document.close();
}

var temp;

function initHomepage() {

  initCreateWallet();
  initSwitchHome();
  ReturnFirtsStep();
  function SbloccaStep() {
    $(".js-next-step").removeClass("disabled");
  }
  $(".js-explore-address").click(function(){
    var address = $(".js-explore-container input");
    if(CheckEtherAddress(address.val()) > 0) {
      location.href="/address/" +address.val();
    }
    else {
      address.addClass("is-invalid");
      toastr.error("insert valid address");
    }
  });
  function initFirstStep() {
    var settings = JSON.parse($(".js-create-address-wallet").val());
    CreateJSON($(".js-download-json"), settings.key, $(".js-password-create-json").val(), "", "address.json");
    $(".js-create-account-privatekey").val(settings.key);
    $("#createwallet .js-download-json").click(function() {
      SbloccaStep();
    });
  }

  function initSecondStep() {
    $("#createwallet .copy-obbl").click(function() {
      CopyPrivateKey($(this).parents("#createwallet"));
      SbloccaStep();
    });

    $(".modal-noku a.print-noku").click(function() {

      PrintPaper($(".modal-noku [data-step='3'] textarea.privatekey").val());

      SbloccaStep();
    });
  }


  function initThirdStep() {
    $(".radiobuttons .accordion-item").click(function() {
      SbloccaStep();
    });
  }

  function nextStep(step) {
    var newstep = +step + 1;
    $("#createwallet fieldset.step[data-step=" + newstep + "]").removeClass("disabled");
    $("#createwallet").addClass("step" + newstep);
    $("#createwallet").removeClass("step" + step);
    $("#createwallet fieldset.step[data-step=" + step + "]").addClass("disabled");
    $(".js-next-step").attr("data-currentstep", newstep);
    $(".js-next-step").addClass("disabled");
    switch (step) {
      case "1":
      $(".js-next-step").html("I have downloaded it");
      initFirstStep();
      break;
      case "2":
      $(".js-next-step").html("I have copied it");
      initSecondStep();
      break;
      case "3":
      $(".js-next-step").html("Unlock");
      initThirdStep();
      break;
      default:

    }
  }

  function ReturnFirtsStep() {
    $(".mr-auto[data-dismiss='modal']").click(function() {
      setTimeout(function() {
        for (var i = 0; i < 6; i++) {
          $(".modal-noku").removeClass("step" + i);
        }
        $("#createwallet").addClass("step1");
        $(".js-next-step").attr("data-currentstep", 1);
        $(".modal-noku fieldset.step").addClass("disabled");
        $(".modal-noku .single-avatar").removeClass("active");
        $(".js-next-step").removeClass("disabled");
        $(".js-next-step").html("Next");
        $(".modal-noku form")[0].reset();
        $("*").removeClass("is-valid");
        $("*").removeClass("is-invalid");
      }, 200);
    });
  }

  function initCreateWallet() {
    $('#createwallet').on('show.bs.modal', function(e) {
      $(".modal-noku fieldset.step[data-step=1]").removeClass("disabled");
    });

    $(".js-next-step").on("click", function () {
      var currentStep = $(this).attr("data-currentstep");
      switch (currentStep) {
        case "1":

          $(".modal-noku form[data-step='1']").submit();

          if (!$(".modal-noku form[data-step='1'] .form-control").hasClass("is-invalid")) {
            nextStep(currentStep);
          }
          break;
        case "2":
          nextStep(currentStep);
          break;
        case "3":
          //controllo se necessario
          nextStep(currentStep);
          break;
        case "4":
          switch ($(".item-opener[name='choose']:checked").val()) {
            case "utc":
              var file = Dropzone.forElement($(".active .js-json-utc-wallet")[0]).files[0];
              getAddressFromJson(file, null, function (address) {
                if (address) {
                  var nameAccountWallet = $("#accountnamecreatew").val();
                  // InsertIntoRubrica(address, nameAccountWallet);
                  if(gtag) {
                    gtag('event', 'Create', {
                      'event_category': 'UseWallet',
                      'event_label': 'Create a new Wallet',
                      'value': 1
                    });
                  }
                  location.href = "/address/" + address;
                }
                else {
                  $(".active .js-password-unlock-json").addClass("error");
                }
              });
              break;
            case "pk":
              var nameAccountWallet = $("#accountnamecreatew").val();             
              addressFromModalPrivateKey($(".js-next-step"), null, name, null, true);
              break;
          }
          break;
        default:
      }
    });

    // $(document).on("click", ".js-download-json", function(e) {
    //   if(!$(this).hasClass("created")) {
    //     e.preventDefault();
    //
    //     $(this).addClass("created");
    //   }
    // });

  }

  var targetHistory = [];

  function initSwitchHome() {
    if (!$(".switch-container".length)) {
      return false;
    }
    var $container = $(".switch-container");

    // $("#createwallet").on("show.bs.modal", function(){
    //   $(".js-change-right").removeClass("active");
    // });

    $(".switch-container").addClass("loaded");

    $(".js-change-right").on("click", function() {
      var target = $(this).data("target");
      if (!target) {
        return false;
      }

      var cleanHistory = $(this).data("force");
      if (cleanHistory) {
        $(".js-change-right[data-force='true']").removeClass("active");
        $(this).addClass("active");
      }
      switchToTarget(target, cleanHistory);
    });

    $(".js-back-switch").on("click", function() {
      var target = targetHistory.pop();
      switchToTarget(target, "", true);
    });
    $(".unlock-switch .js-back-switch").on("click", function() {
      $(".js-change-right[data-force='true']").removeClass("active");
    });
  }

  function switchToTarget(target, cleanHistory, back) {
    if (!back) {
      var previousTarget = $(".switch-container .switch.active").data("id");
      if (cleanHistory) {
        targetHistory = ["account"]; //first target
      } else {
        targetHistory.push(previousTarget);
      }
    }

    $(".switch-container .switch:not([data-id='" + target + "'])").removeClass("active").addClass("disabled");
    $(".switch-container .switch[data-id='" + target + "']").addClass("active").removeClass("disabled");
    moveToTarget(target);
  }

  function moveToTarget(target) {
    var $target = $(".switch-container .switch[data-id='" + target + "']");
    var translateTop = 0; //$target.position().left;
    // console.log($target);
	var loggato = !!$("body").data("auth");
	var transalteSub = loggato ? 350 : 0;
    switch ($target.data("id")) {
      case "unlock":
      translateTop = 350 - transalteSub;
      break;
      case "privatekey":
      translateTop = 700 - transalteSub;
      break
      case "encprivatekey":
      translateTop = 1050 - transalteSub;
      break;
      case "mnemonicphrase":
      translateTop = 1400 - transalteSub;
      break;
      case "jsonfile":
      translateTop = 1750 - transalteSub;
      break;
      case "explore":
      translateTop = 2100 - transalteSub;
      break;
    }
    $(".switch-scroll").css(transformCss("translateX(-" + translateTop + "px)"));
  }

  function transformCss(transformString) {
    return {
      '-webkit-transform': transformString,
      '-moz-transform': transformString,
      '-ms-transform': transformString,
      '-o-transform': transformString,
      'transform': transformString
    }
  }
}

function getStringFromFile(file, callback) {
  var reader = new FileReader();
  reader.onload = function (event) {
    callback(reader.result);
  };
  reader.readAsBinaryString(file);
}

function getAddressFromJson(file, _password, callback){
  getStringFromFile(file, function(json){
    var password = _password || $(".active .js-password-unlock-json").val();
    var privKey = unlockWallet(json, password);
    if (privKey) {
      var address = getAddressFromPrivateKey(privKey);
      callback(address);
    }
    else {
      callback();
    }
  });
}

function initConsole() {
  (function(url) {
    var image = new Image();
    image.onload = function() {
      var style = [
        'font-size: 1px;',
        'line-height: ' + this.height + 'px;',
        'padding: ' + this.height * .5 + 'px ' + this.width * .5 + 'px;',
        'background-size: ' + this.width + 'px ' + this.height + 'px;',
        'background-repeat: no-repeat;',
        'background: url(' + url + ');'
      ].join(' ');
      console.log('%c', style);
    };
    image.src = url;
  })(location.origin + '/content/images/logo_noku_black.png');
}

function initAccordion() {
  $('.item-opener').on('click', function(e) {
    e.stopPropagation();
    var $container = $(this).closest('.accordion-item');
    var section = $container.find('.hidden-section')[0];
    $container.parent().children().not($container).removeClass('active');
    $container.parent().children().not($container).each(function() {
      $($(this).find('.hidden-section')[0]).css({
        'max-height': '0'
      });
    });
    $container.addClass('active');
    if ($container.hasClass('active')) {
      $(section).css({
        'max-height': section.scrollHeight + 'px'
      });
      if ($container.parent().closest('.accordion-item').length) {
        var $target = $($container.parent().closest('.accordion-item').find('.hidden-section')[0]);
        $target.css({
          'max-height': Number($target.css('max-height').replace('px', '')) + section.scrollHeight + 'px'
        });
      }
    } else {
      $(section).css({
        'max-height': '0'
      });
    }
  });
}

var CreateJSON = function($download, key, password, name, file, $form) {
  var json = eth4you.toV3(key, password, name);
  if (!name) {
    name = eth4you.filenameV3(key) + ".json";
    if (!$(file).val())
    $(file).val(name);
  } else {
    name = $(file).val() || name;
  }

  var blob = new Blob([json], {
    type: "text/json;charset=UTF-8"
  });
  var _url = window.URL.createObjectURL(blob);

  if ($form) {
    
    var $modal = $form.parents(".modal");
    var a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
    a.href = _url;
    a.download = name;
    a.click();
    setTimeout(function () {
      a.remove();
      window.URL.revokeObjectURL(_url);
      $modal.modal("hide");
      $form[0].reset();
    }, 100);
  }
  else {
    $download.attr('href', _url).attr('download', name);
  }

}

var setLogin = function(base) {
  var url = nodeSelected.login;

  url += base + "?network="+nodeSelected.network;
  if(address)
  url += "&address="+address;
  else
  url += "&address="+nokuAddress;
  if(user)
  url += "&key="+user.key;
  return url;
}

function initForms() {
  initLoginForm();
  initSignupForm();

  function initLoginForm(){
    $(".js-login-form").on("submit", function (e) {
      e.preventDefault();
      if(validateSubmit($(this), e)) {
        sentForm($(this).serializeArray(), '/login');
      }
    });
  }

  function initSignupForm(){
    $(".js-signup-form").on("submit", function (e) {
      e.preventDefault();
      if(validateSubmit($(this), e)) {
        sentForm($(this).serializeArray(), '/signup');
      }
    });
  }
}

function sentForm(array, url) {
  var password = array.filter(s => s.name == "password")[0].value;
  password = eth4you.sha3(password).substr(0,32);
  array.forEach(function (obj, index) {
    if(obj.name == "password") {
      obj.value = password;
    }
  });

  $.ajax({
    type: "POST",
    url: url,
    data: array,
    complete: function(data) {
      if(data.responseJSON) {
        location.href = data.responseJSON.returnurl;
      }
    }
  });
}

function unlockWallet(_json, password) {
  var json, privkey;
  if(!eth4you.requirePassword(_json)) {
    json = JSON.parse(_json.toLowerCase());
    privkey = eth4you.fromFile(json);
    // if(J.crypto && J.crypto.kdf == 'pbkdf2') {
    //   lumaca = 1;
    // }
    // else {
    //   lumaca = 0;
    // }
  }
  else{
    privkey = eth4you.fromFile(_json,password);
  }

  return privkey;

  // if(privkey){
  //   // var wallet = {};
  //   // wallet.key = privkey;
  //   // wallet.address = eth4you.toChecksumAddress(eth4you.addressFromPrivate(privkey));
  //   return eth4you.toChecksumAddress(eth4you.addressFromPrivate(privkey));
  //   // localStorage.setItem("current_wallet", wallet);
  //   // return wallet.address;
  // }

  // return null;
  // var etherAddress = eth4you.toChecksumAddress(addr); //superfluo?
  // var filter = '';
  // 	if(typeof(filterAddress) != "undefined" && filterAddress)
  // 		filter = "&token="+filterAddress;
  // eth4you.AJAX(setUrl("/balance") + filter, null,  null , function(data) {
  //   console.log("balance: " + JSON.stringify(data));
  // });
}

function CopyAddress(where, lastClass){
  $("."+where+" .card-dates .address" + (lastClass || "")).click(function(){

    var $addressSpan = !lastClass ? $(this).find("span") : $(this).parents(".address").find("span");//$(".card-dates .address span");
    var address = "";
    if($addressSpan.html().indexOf("...") >= 0){
      address = $addressSpan.attr("data-original");
    }
    else
    {
      address = $addressSpan.html();
    }

    copyToClipboard(address);
    toastr.success('Address copied!')
  });
}

function CopyPrivateKey(where){
  var Valore = where.find("[data-step='3'] textarea.privatekey").val();
  copyToClipboard(Valore);
  toastr.success('Private Key copied!')
}

function PrintAddress(){
  $(".functions a.print").click(function(){
    if (!getCurrentPrivateKey() == "" || !getCurrentPrivateKey() == null) {
      var wallet = [];
      wallet.key = getCurrentPrivateKey();
      wallet.addr = eth4you.toChecksumAddress(eth4you.addressFromPrivate(wallet.key));
      wallet.QrPrivKey = document.createElement("div");
      new eth4you.QRCode(wallet.QrPrivKey, {
        width: 115,
        height: 115,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H,
        text: wallet.key
      });
      $(wallet.QrPrivKey).addClass("only-print");
      $(".qr-print-container").html($(wallet.QrPrivKey));
    }
    else {
      $(".qr-print-container").html("");
    }
    window.print();
  });
};

function AdditionalData(){
  $(".additional-data a").click(function(){
    $(this).toggleClass("open");
    $(this).next(".input-added").toggleClass("open");
    if(!$(this).hasClass("open")){
      $(this).next(".input-added").find(".js-additional-data-tx").attr("disabled", true);
    }
    else {
      $(this).next(".input-added").find(".js-additional-data-tx").attr("disabled", false);
    }
  });
}

function DoOperation($btn, socketWallet) {
  $walletCard = $btn.parents(".wallet-simple-card");
  $btn.addClass("disabled");
  var classList = $btn.attr('class').split(/\s+/);

  $.each(classList, function (index, item) {
    var address = $walletCard.find(".js-send-funds-to").val();
    var amount = $walletCard.find("#transaction-amount").val();
    var unit = $walletCard.find(".js-transaction-select :selected").html();
    var fee = $btn.data("fee");
    switch (item) {
      case 'js-action':
        $walletCard.find(".js-quantity").html(amount + " " + unit);
        $walletCard.find(".js-address").html(address);
        $walletCard.find(".js-fee").html("Fee " + fee + "ETH");
        $walletCard.addClass("ask");
        break;
      case 'js-discard':
        $walletCard.find(".js-action").removeClass("disabled");
        $walletCard.removeClass("ask");
        break;
      case 'js-confirm':
        $walletCard.addClass("load");
        var currentAddress = $(".js-config-data").data("currentaddress");
        $.get("/gettransactioncount?address=" + currentAddress, function (data) {
          SendAnnoyTransaction($walletCard, socketWallet, data.result);
        });

        break;
    }
  });
}

var closeWalletCard = function($walletCard, error) {
  setTimeout(function () {
    if (!error) {
      $walletCard.addClass("finish");
      $walletCard.find("input:not(#gas-limit):not(#gas-price)").val("");
    }
    else {
      checkCard($walletCard);
    }
    setTimeout(function () {
      $walletCard.removeClass("ask");
      setTimeout(function () {
        $walletCard.find(".js-action").addClass("disabled");
        $walletCard.removeClass("finish");
        $walletCard.removeClass("load");
      }, 300);
    }, error ? 1000 : 5000);
  }, error ? 0 : 5000);
}

var SendAnnoyTransaction = function($walletCard, socketWallet, nonce) {
  var gasLimit = $("#gas-limit").val();
  var gasPrice = GetGasPrice();
  var to       = $(".js-send-funds-to").val();
  var amount   = $("#transaction-amount").val();
  var token    = $(".js-transaction-select").val();
  var data     = $(".js-additional-data-tx:not(:disabled)").val() || "";


  var taddr = null;
  if (token != 'ETH') {
    var option = $(".js-transaction-select option:selected");
    var _token = JSON.parse(option.attr("data-token"));

    taddr = _token;
  }
  var privkey = getCurrentPrivateKey();
  var nonce = nonce || "0x0";
  lastNonce = nonce;
  var tr = eth4you.generateTx(taddr,to,parseFloat(amount),gasPrice,parseFloat(gasLimit),data,nodeSelected.chainId,privkey,nonce);
  SendTransaction(tr, $walletCard, socketWallet);
}

var sendRetry = 0;
var SendTransaction = function (tr, $walletCard, socketWallet) {
  $.ajax({
    type: "POST",
    url: "/sendtransaction",
    data: {tr: tr},
    complete: function(_data) {
      var data = _data.responseJSON;
      // console.log(data);
      if (data.error) {
        if (data.error.message == 'replacement transaction underpriced')
          toastr.error('You have an already pending transaction!');
        else
          toastr.error(data.error.message);
        closeWalletCard($walletCard, true);
        return;
      }
      sendRetry  = 0;
      var txhash = data.result;
      setTimeout(function(){
        $.ajax({
          type: "GET",
          url: "/getTransactionByHash",
          data: {txhash: txhash},
          complete: function(_data) {
            var data = _data.responseJSON;
            var r = null;
            if (data) {
              r = data.result;
            }
            if(!r) {
              toastr.error('Transaction not found on network. Check on explorer !')
              // $("#dialog-execute-hash").text(txhash);
              closeWalletCard($walletCard, true);
              return;
            }
            // toastr.success('Transaction started successfully hash is')
            // $("#dialog-execute-hash").text(txhash);
            socketWallet.emit('getTransaction');
            closeWalletCard($walletCard);
          }
        });
      }, 5000);
    }
  });

}

function GenerateTransaction(socketWallet){
  $(".js-action").click(function(){
    if($(this).hasClass("js-generate-transaction") && !checkCard($(this).parents(".send-funds-card"), true)) {
      //error
    }
    else {
      DoOperation($(this), socketWallet);
    }    
  });

  $(".js-discard").click(function(){
    DoOperation($(this), socketWallet);
  });

  $(".js-confirm").click(function(){
    DoOperation($(this), socketWallet);
  });
}

function TokenAccordion(){
  var $TokenContainer = $(".js-list-token");
  $TokenContainer.css("max-height", 110);
  $(".token-balance .showAllTokens > a").click(function(){
    var maxHeight = $TokenContainer[0].scrollHeight;
    $(this).toggleClass("opened");
    if (!$(this).hasClass("opened")) {
      //return to left column
      $TokenContainer.css("max-height", 100);
    }
    else {
      //go to right column
      $TokenContainer.css("max-height", maxHeight);
    }
  });
}

function GweiConverter(){
  var $textbox = $(".js-change-gwei");
  var $select = $(".gas-price");
  $select.change(function(){
    switch ($(this).val()) {
      case "custom":
      $textbox.removeClass('disabled');
      break;
      default:
      $textbox.addClass("disabled");
      // $textbox.val($(this).val());
      $("#gas-price").val($(this).val());
      break;
    }
  });
  $textbox.click(function(){
    $select.val("custom");
    $textbox.removeClass('disabled')
    $(".jcf-select-gas-price .jcf-select-text span").html($select.val());
  });

  $("#gas-price, select.js-gas-price").on("change keyup", function(e){
    updateFeeToolTip();
  });

  $(".js-full-balance").on("click", function(e){
    e.preventDefault();
    changeBalanceCryptoToFiat(true);
  });

  $(".js-transaction-equivalent-select, .js-transaction-select, #transaction-amount").on("change keyup", function(){
    $("#transaction-amount")[0].setCustomValidity('');
    changeBalanceCryptoToFiat();
  });

  $("#transaction-equivalent").on("change keyup", function(){
    changeBalanceFiatToCrypto();
  });
}

function checkCard($card, checkAddress) {
  GetEstimateGas();
  var error = false;
  if(checkAddress) {
    if(!(CheckEtherAddress($card.find(".js-send-funds-to").val()) > 0)){
      $card.find(".js-send-funds-to")[0].setCustomValidity("Invalid address");
      $card.find(".js-send-funds-to")[0].reportValidity();
      error = true;
    }
    else {
      $card.find(".js-send-funds-to")[0].setCustomValidity("");
    }
  } 
  if(!error) {
    var gasLimit = $card.find("#gas-limit").val();
    var gasPrice = GetGasPrice();

    if(gasPrice <= 0){
      $card.find("#gas-price")[0].setCustomValidity("Insufficient gas price");
      $card.find("#gas-price")[0].reportValidity();
      error = true;
    }
    else {
      $card.find("#gas-price")[0].setCustomValidity("");
    }
  }

  if(!error) {
    if(parseInt(gasLimit) <= 0) {
      $card.find("#gas-limit")[0].setCustomValidity("Insufficient gas limit");
      $card.find("#gas-limit")[0].reportValidity();
      error = true;
    }
    else {
      $card.find("#gas-limit")[0].setCustomValidity("");
    }
  }

  if(!error) {
    if(!$card.find("#transaction-amount").val() || !$card.find("#transaction-amount")[0].reportValidity() || $card.find("#transaction-amount").val() <= 0) {
      error = true;
    }
    else{
      $card.find("#transaction-amount")[0].setCustomValidity("");
    }
  }

  if(!error) {
    if($(".js-additional-data-tx:not(:disabled)").val() && !$(".js-additional-data-tx:not(:disabled)")[0].checkValidity()) {
      error = true;
    }
  }

  if(error) {
    $card.find(".js-action").addClass("disabled");
    return false;
  }
  else {
    $card.find(".js-action").removeClass("disabled");
    return true;
  }
}

var ajaxGetEstimateGas;
function GetEstimateGas(){
  var value = $("#transaction-amount").val();
  // var addr = $(".js-transaction-select").val(); //damodificare con il token address???

  var option = $(".js-transaction-select option:selected");
  var token = null;

  try {
    token = JSON.parse(option.attr("data-token"));
  } catch (ex) { }

  var to = $(".js-send-funds-to").val();
  var data = $(".js-additional-data-tx").val();

  var currentaddress = $(".js-config-data").data("currentaddress");

  if(!to) {
    to = currentaddress;
  }

  var params = GetGasLimitParams(token, to, value, data, currentaddress);

  var url = "/getestimategas?" + $.param(params)

  if(ajaxGetEstimateGas){
    ajaxGetEstimateGas.abort();
  }

  ajaxGetEstimateGas = $.get(url, function (data) {
    if(data && data.gaslimit) {
      $("#gas-limit").val(data.gaslimit);
    }
  });

}

function changeBalanceCryptoToFiat(isFull) {
  var addr = $(".js-transaction-select").val();

  var weiBalance = eth4you.weiize(etherRawBalance);
  var gasLimit = $("#gas-limit").val();
  var gasPrice = GetGasPrice();

  if (!gasLimit || !gasPrice) {
    return false;
  }
  var amount = weiBalance.minus(eth4you.bigNumber(gasLimit).times(gasPrice).times(1000).times(1000).times(1000));
  if (!amount || isNaN(parseFloat(amount)) || isNaN(parseInt(gasLimit))) {
    return false;
  }

  switch (addr) {
    case "ETH":
    $(".transaction-equivalent input, .transaction-equivalent select").attr("disabled", false);
    jcf.destroyAll();
    jcf.replaceAll();
    if (isFull) {

      if (parseInt(gasLimit) < 0 || amount.isNegative()) {
        $("#transaction-amount,#transaction-equivalent")[0].setCustomValidity("Insufficient funds available");
        $("#transaction-amount,#transaction-equivalent").val('');
        $("#transaction-amount,#transaction-equivalent")[0].reportValidity();
      }
      else {
        $("#transaction-amount,#transaction-equivalent")[0].setCustomValidity("");
        amount = eth4you.etherizeNotRounded(amount);
        $("#transaction-amount").val(amount);
        CopyEtherBalanceToEquivalent();
      }
    }
    else {
      try {
        var val = $("#transaction-amount").val();

        var raw = eth4you.tokenRaw(val.toString(), { dec: 18 });
        var avail = amount.minus(raw);

        if (avail.isNegative()) {
          $("#transaction-amount,#transaction-equivalent")[0].setCustomValidity("Insufficient funds available");
          $("#transaction-equivalent").val('');
          $("#transaction-amount,#transaction-equivalent")[0].reportValidity();
        }
        else {
          $("#transaction-amount,#transaction-equivalent")[0].setCustomValidity("");
          var option = $(".js-transaction-select option:selected");
          var _token = {};
          try {
            _token = JSON.parse(option.attr("data-token"));
          } catch (ex) { }
          CopyEtherBalanceToEquivalent(_token);
        }
      } catch (err) { }
    }
    break;
    default:
    var option = $(".js-transaction-select option:selected");
    var token = JSON.parse(option.attr("data-token"));
    if (isFull) {
      $("#transaction-amount").val(eth4you.tokenNotRounded(token.balance, token, token.locked));
    }
    if (token.price == null) {
      $("#transaction-equivalent").val('');
      $(".transaction-equivalent input, .transaction-equivalent select").attr("disabled", true);
    }else {
      $(".transaction-equivalent input, .transaction-equivalent select").attr("disabled", false);
      CopyTokenBalanceToEquivalent(token);
    }
    jcf.destroyAll();
    jcf.replaceAll();
    break;
  }
  checkCard($(".send-funds-card"));
}

var timeoutChangeBalanceFiatToCrypto;
function changeBalanceFiatToCrypto() {
  if (timeoutChangeBalanceFiatToCrypto) {
    clearTimeout(timeoutChangeBalanceFiatToCrypto);
  }
  var amount = $("#transaction-equivalent").val();
  if (parseFloat(amount) > 0) {
    var p = $("#transaction-balance").offset();
    var addr = $(".js-transaction-select").val();
    var equi = $(".js-transaction-equivalent-select").val();

    var quoted = eth4you.initEquivalent();
    if (addr == 'ETH') {
      var uno = eth4you.tokenRaw(1, { dec: 18 });
      eth4you.addEquivalent(quoted, { dec: 18, balance: uno }, etherPrice);
      quoted.eth = eth4you.bigNumber(1);
    } else {
      var option = $(".js-transaction-select option:selected");
      var token = JSON.parse(option.attr("data-token"));
      eth4you.addEquivalent(quoted, { dec: 0, balance: 1 }, token.price);
    }
    amount = eth4you.bigNumber(amount).div(eval('quoted.' + equi.toLowerCase())).toString();
    $("#transaction-amount").val(parseFloat(amount));

    timeoutChangeBalanceFiatToCrypto = setTimeout(function () {
      $("#transaction-amount").change();
    }, 2000);
    // setTimeout(EstimateGasLimit,200);
    // var title = GetTitle(addr,amount);
    // if(!title) {
    //   ManageTransactionButton();
    //   return;
    // }
    // if(!$info) {
    //   $info = $('<p class="simple-tooltip-2"></p>').html(title).appendTo('body').show().css({ top: p.top, left: p.left });
    //   $info.css({ top: p.top-$info.height(), left:p.left });
    // }
    // else
    //   $info.html(title);
  } else {
    $("#transaction-amount").val('');
    // if ($info) {
    //   $info.remove();
    //   $info = null;
    // }
  }

  checkCard($(".send-funds-card"));
  // ManageTransactionButton();
  // if ($("#transaction-amount-esclamation").css('visibility') != 'hidden') {
  //   if ($info) {
  //     $info.remove();
  //     $info = null;
  //   }
  // }
}

var CopyEtherBalanceToEquivalent = function (token = {}) {
  var amount = $("#transaction-amount").val();
  var tokendec = token.dec || 18;
  if (amount) {
    var equi = $(".js-transaction-equivalent-select").val();
    try {
      var quoted = eth4you.initEquivalent();
      amount = eth4you.tokenRaw(amount.toString(), { dec: tokendec });
      eth4you.addEquivalent(quoted, { dec: tokendec, balance: amount }, etherPrice);

      $("#transaction-equivalent").val(eval('quoted.' + equi.toLowerCase()));

      if ($("#transaction-equivalent").val().indexOf('e-') >= 0) {
        $("#transaction-equivalent").val('');
        $("#transaction-amount,#transaction-equivalent")[0].setCustomValidity("Insufficient funds available")
        $("#transaction-amount,#transaction-equivalent").val('');
        $("#transaction-amount,#transaction-equivalent")[0].reportValidity();
      }
    }
    catch (err) { }
  }
}

var CopyTokenBalanceToEquivalent = function(token) {
  var amount = $("#transaction-amount").val();
  if(amount){
    var equi = $(".js-transaction-equivalent-select").val();
    // if(optionsSecurity.currency && equi != optionsSecurity.currency) {
    // 	optionsSecurity.currency = equi;
    // 	SaveOptions();
    // }
    var quoted = eth4you.initEquivalent();
    var eth = eth4you.tokenToEth(amount.toString(),{ dec: 0 },token.price.ETH);
    eth4you.addEquivalent(quoted,{ dec: 0, balance: amount.toString()},token.price);
    var currency = equi.toLowerCase();
    var dec = mapDecimalOfCurrency[currency];
    $("#transaction-equivalent").val(eth4you.rounded(eval('quoted.'+currency),dec));
    //$("#transaction-equivalent").val(eval('quoted.'+equi.toLowerCase()));
    if($("#transaction-equivalent").val().indexOf('e-') >= 0)
    $("#transaction-equivalent").val('');
  }
}

function FinishRealoadWalletPK($element){
  $element.addClass("endReload");
  setTimeout(function(){
    $element.removeClass("reloading");
    $element.removeClass("endReload");
  },2000);

}

var countReloadWalletPK;

function ReloadWalletPK(socketWallet) {

  $(document).on("click", ".wallet-card .link .reload:not(.reloading)", function () {
    countReloadWalletPK = 3;
    $(this).addClass("reloading");

    startDateTransaction = endDateTransaction = null;

    socketWallet.emit('refreshAll', { refreshAll: true });
  });

  socketWallet.on("refreshAllFinished", function (data) {
    countReloadWalletPK--;
    // console.log(countReloadWalletPK + " ---- event: " + data.event);
    if (countReloadWalletPK <= 0) {
      FinishRealoadWalletPK($(".wallet-card .link .reload"));
    }
  });
}

function ModalNotModify(){
  $('.modal-noku').on('show.bs.modal', function(e) {
    var bookId = $(e.relatedTarget).data('id');
    var type = $(e.relatedTarget).data('target');
    if (!!bookId) {
      if (type == "#privatekey" || type == "#privatekey-onlyview") {
        $(this).addClass(bookId);
        $("."+bookId+" .title-step").html("Your Private Key");
        $("."+bookId+" textarea").val(getCurrentPrivateKey());
        var wallet = {};
        wallet.key = getCurrentPrivateKey();
        wallet.addr = eth4you.toChecksumAddress(eth4you.addressFromPrivate(wallet.key));
        wallet.QrPrivKey = document.createElement("div");
        new eth4you.QRCode(wallet.QrPrivKey, {
          width: 115,
          height: 115,
          colorDark: "#000000",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.H,
          text: wallet.key
        });
        $(wallet.QrPrivKey).addClass("qr-visible");
        $("."+bookId+" textarea").parents("form").append(wallet.QrPrivKey);
      }
    }
  });
  $('.modal-noku').on('hide.bs.modal', function(e) {
    if ($(this).hasClass("only-visible")) {
      $(this).find(".title-step").html("Please enter your 64 hexdecimal Private Key ");
      $(this).find("textarea").val("");
      $(".qr-visible").remove();
      $(this).removeClass("only-visible");
    }
  });
}

function UpdateLayout(skipSave, callback){
  var count = 0;
  var newWorkspace = [];
  $(".workspace-page .ws-list-wallets .wallet-card:not(.create-wallet").each(function(){
    $(this).attr("data-order",count);
    var o = {};
    o.name = $(this).attr("data-name");
    o.address = $(this).attr("data-address");
    o.haveprivetekey = $(this).attr("data-haveprivetekey") == "1";
    o.order = count;
    newWorkspace.push(o);
    count++;
  });
  if(!skipSave) {
    // localStorage.removeItem("workspace", "");
    saveWorkspace(newWorkspace, callback);
  }
}

function InsertIntoWorkspace(address, order, haveprivetekey = false) {

  var workspacePromise = GetWorkspace();

  workspacePromise.then(function(workspace){

    var filtered = workspace.filter(function (obj) {
      return obj.address == address;
    });

    var obj = {};
    obj.address = address;

    if(filtered.length > 0){
      if(order) {
        filtered[0].order = order;
      }
      else {
        return false;
      }
    }
    else {
      obj.order = workspace.length;
      obj.haveprivetekey = haveprivetekey
      workspace.push(obj);
      insertCardWorkspace(obj);
    }

    saveWorkspace(workspace);
  });
}

var saveWorkspace = function(workspace, callback) {
  var isCloud = $("[name='workspacetype']").is(":checked");

  if(isCloud) {
    var jsonStr = typeof workspace === 'object' || workspace instanceof Array ? JSON.stringify(workspace) : workspace;
    $.post("/saveworkspace", {workspace: jsonStr}, function(){
      toastr.success("workspace saved!");
      if(callback) {
        callback();
      }
    });
  }
  else {
    localStorage.setItem("workspace", JSON.stringify(workspace));
    if(callback) {
      callback();
    }
  }
}

var NokuDecrypt = function (hex, password, reimportWorkspace) {
  var json = hexToString(hex);
  var priv = eth4you.fromFile(json, password);
  if (priv) {
    json = hexToString(priv);
    try {
      return JSON.parse(json);
    } catch (e) {
      if (reimportWorkspace) {
        return false;
      }
    }
  }
  else {
    if(reimportWorkspace) {
      return false;
    }
    return [];
  }
}
var NokuCrypt = function (space, password) {
  var key = stringToHex(JSON.stringify(space));
  var json = eth4you.toV3(key, password);
  return stringToHex(json);
}

function d2h(d) {
  return d.toString(16);
}

function stringToHex (tmp) {
  var str = '', i = 0, tmp_len = tmp.length, c;
  for (; i < tmp_len; i += 1) {
      c = tmp.charCodeAt(i);
      str += d2h(c);
  }
  return str;
}

function hexToString(hex) {
  var str = '';
  try {
    var len = hex.length;
    if (len & 1) {
      len--;
    }
    for (var i = 0; i < len; i += 2) {
      str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
  } catch (e) {
    return "";
  }
  return str;
}

function removeFromWorkspace(address) {
  var workspacePromise = GetWorkspace();

  workspacePromise.then(function(json){
    var workspace = json.filter(function (obj) {
      return obj.address !== address && typeof(obj.address) != "undefined";
    });

    saveWorkspace(workspace);

    return workspace;
  });
}

function GetWorkspace(){
  return new Promise(function(resolve, reject) {
    var isCloud = $("[name='workspacetype']").is(":checked");

    if(isCloud) {
      $.get("/getworkspace").done(function(workspace){

        var isDecrypted = typeof workspace === 'object' || workspace instanceof Array;

        if(isDecrypted) {
          resolve(workspace);
        }
        else {
          bootbox.prompt({
            title: "Please enter your NOKU ACCOUNT password to decrypt your workspace:",
            inputType: 'password',
            callback: function (password) {
              if(password) {
                console.log(password);
                var json = NokuDecrypt(workspace, password, true);
                if(json) {
                  saveWorkspace(json);
                  $(".bootbox-input.bootbox-input-password.form-control").removeClass("is-invalid");
                  resolve(json);
                }
                else {
                  $(".bootbox-input.bootbox-input-password.form-control").addClass("is-invalid");
                  toastr.error("wrong password!");
                  return false;
                }
              }else {
                $("[name='workspacetype']").prop("checked", false).change();
              }
            }
          });
        }
      }).fail(function(err){
        reject(Error(err.message));
      });
    }
    else {
      resolve(JSON.parse(localStorage.getItem("workspace") || "[]"));
    }
  });
}

function EditList(){
  var el = document.getElementById('lista-wallet');
  $grid2 = Sortable.create(el,{
    animation: 500,
    ghostClass: "ghost-wallet",
    forceFallback: true,
    handle: ".move"
  });

  console.log($grid2);
}

function RemoveWallet(){
  $(".wallet-card .close").click(function(){
    $(this).parents(".wallet-card").hide(500);
  });
}

function StopEdit(draggies){
  $grid2.destroy();
}

function returnBack(id, $modal){
  $modal.find(".btn.btn-noku.dark-blue").addClass("disabled");
  $modal.find(".btn.btn-noku.dark-blue").html("Import");
  $modal.find(".step-"+id).removeClass("visible");
  $modal.find(".js-back").hide();
  $modal.removeClass("NextStep");
  $modal.find(".modal-body").css("max-height", 10000);
}

function NextModal(id, $modal){
  var $formVisibile = $modal.find(".step-"+id);
  $formVisibile.addClass("visible");
  $modal.find(".btn.btn-noku.dark-blue").removeClass("disabled");
  $modal.find(".js-back").show();
  $modal.addClass("NextStep");
  $modal.find(".modal-body").css("max-height", $formVisibile[0].scrollHeight + 70);
  if (id == "address") {
    $modal.find(".btn.btn-noku.dark-blue").html("Add");
  }
  $modal.find(".js-back").click(function(){
    returnBack(id, $modal);
  });
  $modal.find(".pointer.mr-auto").click(function(){
    returnBack(id, $modal);
  });
  $modal.find("i.far.fa-times").click(function(){
    returnBack(id, $modal);
  });
}

function BigModal(){
  $("#BigModal .choose-type .title-step").click(function(){
    NextModal($(this).data("id"),$(this).parents("#BigModal"));
  });
}

function MoveTable(choose, $tableTransaction){
  if (choose) {
    $tableTransaction.css("margin", "0 30px");
    $(".wallet-page .body-real").after($tableTransaction);
  }
  else {
    $tableTransaction.css("margin", "0");
    $(".wallet-page .body-real .col-right").append($tableTransaction);

  }
}

function FlipWallet(){
  //mettere poi il vero elemento da cliccare
  $(".wallet-card .card-avatar img").click(function(){
    $(this).parents(".wallet-card").addClass("flipped");
  });
  $(".wallet-card .close-bg").click(function(){
    $(this).parents(".wallet-card").removeClass("flipped");
  });
}

function RecentTransaction(){
  var $tableTransaction = $(".wallet-page .js-recent-transaction");
  if ($(window).width() < 1200) {
    MoveTable(true, $tableTransaction);
  }
  else {
    MoveTable(false, $tableTransaction);
  }
}

function resizeWallet(){
  $(".wallet-card.create-wallet").outerHeight($(".workspace-page .wallet-card").outerHeight());
}

function initWallet(){
  if(!$(".wallet-page").length) {
    return false;
  }
  $("#privatekey .copy-obbl, #privatekey-onlyview .copy-obbl").click(function() {
    var Valore = $(this).find("textarea").val();
    copyToClipboard(Valore);
    toastr.success('Private Key copied!')
  });
  // initSearchAddress($(".js-send-funds-to")); //rimosso temporaneamente
  $(".link a.print").click(function() {
    if (getCurrentPrivateKey() == "" || getCurrentPrivateKey() == null) {
      toastr.error("Missing Private Key");
    }
    else {
      PrintPaper(getCurrentPrivateKey());
    }
  });
  FlipWallet();

  new eth4you.QRCode($(".js-qr-code")[0], {
    width: 130,
    height: 130,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H,
    text: $(".js-config-data").data("currentaddress")
  });

  if(!!getCurrentPrivateKey()) {
    $(".js-show-on-private-key").removeClass("hidden");
  }

  var socketWallet = io('/wallet', {
    query: {
      currentaddress: $(".js-config-data").data("currentaddress")
    }
  });

  // window.socketWallet = socketWallet;

  $(".wallet-page .card-dates .address span").html(CutAddress($(".wallet-page .card-dates .address span")));

  CopyAddress("wallet-page");
  socketWallet.on('message', function (message) {
    switch(message.type){
      case "error":
      toastr.error(message.text);
      break;
      case "success":
      toastr.success(message.text);
      break;
      default:
      toastr.info(message.text);
      break;
    }
  });
  PrintAddress();
  AdditionalData();
  GenerateTransaction(socketWallet);
  TokenAccordion();
  GweiConverter();
  ReloadWalletPK(socketWallet);
  ReloadTransaction();
  RecentTransaction();
  $(window).on("resize",function(){
    RecentTransaction();
  });

  $(document).on("click", ".js-single-transaction", function(){
    var $t = $(this);
    var dataHash = $t.data("hash") || "";
    var hash = dataHash.substring(0, dataHash.indexOf("--"));

    var url = "";
    if (hash) {
      url = "/getTransactionByHash?txhash=" + hash;
    }
    else {
      var details = $t.data("details") || {};
      url = "/getTransactionByBlockNumberAndIndex?blockno=" + details.blockno + "&index=" + details.index;
    }

    $.get(url).then(function(data){
      var htmlDetails =
      `<div>
      <div>
      <div class="flex-container justify-start">
      <div class="label">Status:</div>
      <div class="dato{{TransactionLabel}}">{{Status}}</div>
      </div>
      <div class="flex-container justify-start">
      <div class="label">Tx Hash:</div>
      <div class="dato">{{TxHash}}</div>
      </div>
      <div class="flex-container justify-start">
      <div class="label">Tx Index:</div>
      <div class="dato">{{TxIndex}}</div>
      </div>
      <div class="flex-container justify-start">
      <div class="label">Block Hash</div>
      <div class="dato">{{BlockHash}}</div>
      </div>
      <div class="flex-container justify-start">
      <div class="label">Block Number:</div>
      <div class="dato">{{BlockNumber}}</div>
      </div>
      <div class="flex-container justify-start">
      <div class="label">Gas Price:</div>
      <div class="dato">{{GasPrice}}</div>
      </div>
      <div class="flex-container justify-start">
      <div class="label">Gas Used:</div>
      <div class="dato">{{GasUsed}}</div>
      </div>
      <div class="flex-container justify-start">
      <div class="label">Nonce:</div>
      <div class="dato">{{Nonce}}</div>
      </div>
      <div class="flex-container justify-start">
      <div class="label">From:</div>
      <div class="dato">{{From}}</div>
      </div>
      <div class="flex-container justify-start">
      <div class="label">To:</div>
      <div class="dato">{{To}}</div>
      </div>
      <div class="flex-container justify-start">
      <div class="label">Value:</div>
      <div class="dato">{{Value}}</div>
      </div>
      <div class="flex-container justify-start">
      <div class="label">Data:</div>
      <div class="dato">{{Data}}</div>
      </div>
      </div>
      </div>`;

      // var data = $t.data("details");
      htmlDetails = htmlDetails.replace("{{TxHash}}", data.hash)

      // if (!data.hash) {
      //   data.blockNumber = parseInt(data.blockNumber.substr(2), 16);
      //   data.transactionIndex = parseInt(data.transactionIndex.substr(2), 16);
      // }
      // data.gasUsed = parseInt(data.gas.substr(2),16);
      // data.gasPrice = parseInt(data.gasPrice.substr(2),16);
      // data.nonce = parseInt(data.nonce.substr(2),16);
      // data.value = parseInt(data.value.substr(2),16);

      if(data.blockHash == '0x0000000000000000000000000000000000000000000000000000000000000000') {
        htmlDetails = htmlDetails.replace("{{Status}}", "Pending");
        htmlDetails = htmlDetails.replace("{{TxIndex}}", "");
        htmlDetails = htmlDetails.replace("{{BlockHash}}", "");
        htmlDetails = htmlDetails.replace("{{BlockNumber}}", "");
        htmlDetails = htmlDetails.replace("{{TransactionLabel}}", "");
      } else {
        if(data.status && data.status != "0x0") {
          htmlDetails = htmlDetails.replace("{{Status}}", "Success");
          htmlDetails = htmlDetails.replace("{{TransactionLabel}}", "");
        }
        else {
          htmlDetails = htmlDetails.replace("{{Status}}", "Error");
          htmlDetails = htmlDetails.replace("{{TransactionLabel}}", " error-transaction-label");
        }

        htmlDetails = htmlDetails.replace("{{TxIndex}}", data.transactionIndex);
        htmlDetails = htmlDetails.replace("{{BlockHash}}", data.blockHash);
        htmlDetails = htmlDetails.replace("{{BlockNumber}}", data.blockNumber);
      }

      htmlDetails = htmlDetails.replace("{{Nonce}}", data.nonce);
      htmlDetails = htmlDetails.replace("{{GasPrice}}", eth4you.bigNumber(data.gasPrice).div(1000).div(1000).div(1000).toString() + " Gwei");
      htmlDetails = htmlDetails.replace("{{Value}}", data.value);
      htmlDetails = htmlDetails.replace("{{From}}", data.from);

      if(data.to) {
        htmlDetails = htmlDetails.replace("{{To}}", eth4you.toChecksumAddress(data.to));
      }
      else {
        htmlDetails = htmlDetails.replace("{{To}}", "");
      }

      htmlDetails = htmlDetails.replace("{{Data}}", data.input);
      htmlDetails = htmlDetails.replace("{{Confirmations}}", data.confirmations);
      htmlDetails = htmlDetails.replace("{{GasUsed}}", data.gasUsed);

      $("#transactiondetails").find(".js-inside-transaction-details").html(htmlDetails);

      $("#transactiondetails").modal("show");
    });

  });

  $(".js-additional-data-tx").on("change keyup", function(e) {
    var code = (e.keyCode ? e.keyCode : e.which);
    if(code == 13) {
      return;
    }
    if(code == 27) {
      $("#dialog-hex-data").hide();
      return;
    }
    var key = $(this).val();
    var re = /^[0-9A-F]+$/g;
    if(!key || re.test(key.toUpperCase())) {
      $(".js-additional-data-tx")[0].setCustomValidity("");
    } else {
      $(".js-additional-data-tx")[0].setCustomValidity("You have inserted a not hexdecimal data");
      $(".js-additional-data-tx")[0].reportValidity();
    }
    checkCard($(".send-funds-card"));
  })

  $(".js-send-funds-to").on("change keyup paste", function(e){
    var $t = $(this);
    setTimeout(function(){
      var addressKey = $t.val().toLowerCase();

      if(CheckEtherAddress(addressKey) > 0){
        var srcAvatar = eth4you.blockies.create({
          seed: addressKey,
          size: 8,
          scale: 5
        }).toDataURL();
  
        $(".js-avatar-send").attr("src", srcAvatar);
      }
      else {
        getAddressFromENS(addressKey, function(ens){
          $(".js-send-funds-to").val(ens).change();
          // location.href = "/address/" + ens;
        });
  
        $(".js-avatar-send").attr("src", "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAQAAAC0NkA6AAAALUlEQVR42u3NMQEAAAgDoK2/oc3g4QcFaCbvKpFIJBKJRCKRSCQSiUQikUhuFvwRG4t8xwv8AAAAAElFTkSuQmCC");
      }
  
      checkCard($(".send-funds-card"));
    }, 0);
  });

  socketWallet.on('balance', function(data) {

    // console.log(data);

    var previousSelect = $(".js-transaction-select").val();
    var enablePreviousSelect = false;

    $(".js-total-balance").data("info", "<div>" + data.tooltipTitleTotal + "</div>");

    $(".js-list-token, .js-transaction-select").html(""); //da ottimizzare

    $(".js-transaction-select").append("<option value='ETH'>ETH</option>");

    // jcf.replaceAll();

    var tokens = data.tokens || [];
    if(data.etherBalance != "0") {
      var etherToken = {};

      etherToken.urlimage = "/content/images/ethereum.png";
      etherToken.infoTitle = data.tooltipTitleEth;
      etherToken.roundedBalance = data.etherBalance || "0";
      etherToken.sym = "ETH";
      etherToken.onlyAddList = true;
      etherToken.text = etherToken.roundedBalance + " " + etherToken.sym;

      tokens.unshift(etherToken);
    }

    if(tokens.length > 0){
      $(".js-token-balance").removeClass("hidden");
      tokens.forEach(function(token, index){
      
        $(".js-list-token").append("<div class='info' data-info='" + token.infoTitle + "'><img src='" + (token.urlimage || "/content/images/erc20.jpg") + "'><span>" + token.text + "</span></div>");
        if(!token.onlyAddList) {
          $(".js-transaction-select").append("<option value='" + token.addr + "' data-token='" + JSON.stringify(token) + "'>" + token.sym + "</option>");
          if(previousSelect == token.sym || previousSelect == token.addr){
            enablePreviousSelect = true;
          }
        }
      });

      // $(".js-showalltokens")

    }
    else {
      $(".js-token-balance").addClass("hidden");
    }

    refreshMessage($(".js-token-balance .info"));

    if(enablePreviousSelect) {
      $(".js-transaction-select").val(previousSelect);
    }

    jcf.destroyAll();
    jcf.replaceAll();

    $(".js-total-balance").html(data.total.eth+" Ξ");
    $info = $(".js-total-balance").append('<span class="message-box"></span>');
    MessageBox($info);
    $(".js-total-dollari").html(data.total.usd+" &#x00024;");
    $(".js-total-euro").html(data.total.eur+" &#8364;");
    $(".js-total-bitcoin").html(data.total.btc+" ");

    etherPrice = data.etherPrice;
    etherRawBalance = data.etherRawBalance;

    jcf.destroyAll();
    jcf.replaceAll();

    updateFeeToolTip();
    // console.log(data);
  });

  var ajaxCallTransaction = [];
  socketWallet.on('transactions', function(data) {

    $(".js-move-recent-transactions").removeClass("sending");

    var transactions = data.transactions;
    $(".recent-transaction-table").html("");
    $(".js-current-page-recent-transactions").data("currentpage", data.currentpage);
    $(".js-current-page-recent-transactions").html(data.currentpage);
    $(".js-current-page-recent-transactions").data("lastpage", data.maxpage);

    if(data.currentpage == data.maxpage) {
      $(".js-move-recent-transactions[data-target='next'],.js-move-recent-transactions[data-target='last']").addClass("disabled");
    }
    else{
      $(".js-move-recent-transactions[data-target='next'],.js-move-recent-transactions[data-target='last']").removeClass("disabled");
    }

    if(data.currentpage == 1) {
      $(".js-move-recent-transactions[data-target='first'],.js-move-recent-transactions[data-target='prev']").addClass("disabled");
    }
    else{
      $(".js-move-recent-transactions[data-target='first'],.js-move-recent-transactions[data-target='prev']").removeClass("disabled");
    }

    var arrayToGetInfo = [];

    if(transactions) {
      abortAllTransactionAjax();
      for (var i = 0; i < transactions.length; i++) {
        var transaction = transactions[i];
        // console.log(transaction);
        arrayToGetInfo.push(addTransactionToTable(transaction));
      }

      //getTokenInfoTable(hash, transaction.token, transaction.tokeninfo, transaction.value, getInfo);

    }
    FinishRealoadWalletPK($(".js-reload-transactions.reload.reloading"));
  });

  // var strMapToObj = function (strMap) {
  //   let obj = Object.create(null);
  //   for (let [k, v] of strMap) {
  //     // We don’t escape the key '__proto__'
  //     // which can cause problems on older engines
  //     obj[k] = v;
  //   }
  //   return JSON.stringify(obj);
  // }

  function addTransactionToTable(transaction){
    var isCloned = transaction.cloned || false;

    // var myMap = new Map();
    // Object.keys(transaction).forEach(key => {
    //   myMap.set(key, transaction[key]);
    // });
    // var _transaction = new Map([...myMap.entries()].sort());
    var getInfo = (!transaction.contract && !transaction.tokeninfo.unit);
    var transactionValue = transaction.value || "";
    var classColorValue = transactionValue.indexOf("-") >= 0 ? " negative" : " positive";
    var transactionFee = transaction.fee || "";
    var classColorFee = transaction.double && !isCloned ? " grey" : (transactionFee.indexOf("-") >= 0 ? " negative" : "");
    
    var date = "", isPending = false;

    if(!transaction.blockno) {
      // $("#transaction-age",$t).css('color','red');
      // if(transaction.nonce && transaction.nonce == lastNonce) {
      // 	date += "Canceled";
      // } else {

      // }
      var minutes = GetPredictGasStationTime(eth4you.bigNumber(transaction.gasPrice + "").div(1000).div(1000).div(1000).toString());
      // console.log(minutes)
      if(minutes) {
        if (minutes >= 60) {
          date += 'Estimated ' + Math.round(minutes / 60) + ' hours';
        }
        else {
          date += 'Estimated ' + Math.round(minutes+1) + ' mins';
        }
      }
      else {
        date += 'Pending...calculating estimated time';
      }
      isPending = true;
    } else {
      date = eth4you.dateString(transaction.ts);
    }

    var errorItem = !transaction.status && isPending ? '<i class="far fa-clock warning-pending-transaction"></i>' : transaction.status != "0x0" ? '' : '<i class="far fa-exclamation-triangle warning-error-transaction"></i>';

    var isMineClass = transaction.peer.toLowerCase() == $(".js-config-data").data("currentaddress").toLowerCase() ? '<i class="far fa-exchange-alt fa-rotate-90 ismine-trasaction"></i>' : '';

    var hash = transaction.hash + "--" + isCloned;
    var singleTransaction =  // "<div>" + strMapToObj(_transaction) + "</div>" +
    '<div class="single-transaction flex-container space-between js-single-transaction'+ (isCloned ? " double" : "") + (isPending ? " pending" : "") +'" data-hash="' + hash + '">'+
    '<div class="column-table col-Date">'+ date + errorItem +'</div>'+
    // '<div class="column-table col-THXHash">'+ transaction.hash +'</div>'+
    '<div class="column-table col-Action">'+ transaction.action + isMineClass +'</div>'+
    '<div class="column-table col-Address"><a href="/address/'+ transaction.peer +'">' + transaction.peer + '</a></div>'+
    (!getInfo ?
      ('<div class="column-table col-Unit' + classColorValue + '"><img src="'+ transaction.tokeninfo.logo + '">&nbsp;' + transaction.tokeninfo.unit +'</div>') :
      '<div class="column-table col-Unit js-insert-unit"></div>'
    )+
    '<div class="column-table col-Quantity js-insert-qt' + classColorValue + '">'+ transactionValue +'</div>'+
    '<div class="column-table col-Fee' + classColorFee + '">'+ transactionFee +'</div>'+
    '</div>';

    var $singleTransaction = $(singleTransaction);

    $singleTransaction.data("details", transaction);

    $(".recent-transaction-table").append(
      $singleTransaction
    );

    getTokenInfoTable(hash, transaction.token, transaction.tokeninfo, transaction.value, getInfo, ajaxCallTransaction);

    return { hash: hash, token: transaction.token, tokeninfo: transaction.tokeninfo, value: transaction.value, getInfo: getInfo };

  }

  function abortAllTransactionAjax(){
    ajaxCallTransaction.forEach(function(obj, index){
      obj.abort();
      ajaxCallTransaction.splice(ajaxCallTransaction.indexOf(obj),1);
    });
  }

  function getTokenInfoTable(hash, address, tokeninfo, value, getAll, ajaxCall){
    if(address) {
      var _responseCache = localStorage.getItem("logotokenresponse-" + (address || "0x"));
      if(_responseCache){
        getAll = false;
        $(".js-single-transaction[data-hash='" + hash + "'] .js-insert-unit").html(_responseCache);
      }
      if(getAll) {
        getTokenInfo({address: address}, ajaxCall, function(data){
          //if(getAll){
            $.get("/getlogotoken/" + (data.address || "0x") + "?size=16", function(dataUrl){
              var response = dataUrl.url ? (setImg(dataUrl.url) + " " + (data.symbol || "ERC20")) : (setImg(tokeninfo.logo) + " " + (tokeninfo.unit || data.symbol || "ERC20"));
              localStorage.setItem("logotokenresponse-" + (address || "0x"), response);
              $(".js-single-transaction[data-hash='" + hash + "'] .js-insert-unit").html(response);
            });
          //}

          // if(value && value.indexOf("0x") >= 0) {
          //   $.get("/getvaluetoken/" + (data.address || "0x") + "?value=" + value, function(json){
          //     if(json.value) {
          //       $(".js-single-transaction[data-hash='" + hash + "'] .js-insert-qt").html(json.value);
          //     }
          //   });
          // }
        });
      }
    }
  }

  function setImg(url){
    return "<img src='" + url + "'>";
  }
  var firstGas = true;
  socketWallet.on('gasPriceConfiguration', function (data) {

    var actualTextSelected = $("select.js-gas-price option:selected").html();

    $("select.js-gas-price .js-injected-value").remove();

    data.gasPriceList.reverse().forEach(function (price, index) {
      $("select.js-gas-price").prepend("<option class='js-injected-value' value='" + price.value + "'>" + price.name.capitalize() + "</option>");
    });

    if (actualTextSelected && !firstGas) {
      if(actualTextSelected.toLowerCase() != "custom") {
        var newValue = $("select.js-gas-price option:contains('" + actualTextSelected + "')").val();
        $("select.js-gas-price").val(newValue);
      }
      else{
        // $("select.js-gas-price").val("Custom");
        // $("select.js-change-gwei").val(customGwei);
      }
    }
    else {
      firstGas = false;
      $("select.js-gas-price, .js-change-gwei").val(data.normalgasprice);
    }
    jcf.destroyAll();
    jcf.replaceAll();

    predictGasStationTime = data.predictGasStationTime;
    predictGasStationArray = data.predictGasStationArray;
    predictMaxGasPrice = data.predictMaxGasPrice;
    predictMaxGasTime = data.predictMaxGasTime;

    updateFeeToolTip();

  });

  var srcAvatar = eth4you.blockies.create({
    seed: $(".js-config-data").data("currentaddress").toLowerCase(),
    size: 8,
    scale: 5
  }).toDataURL();

  $(".js-avatar").attr("src", srcAvatar);

  $(".card-background").css("background-image","url("+$(".card-avatar img").attr("src")+")");

  $(".js-move-recent-transactions").on("click", function(e){
    e.preventDefault();
    var $t = $(this);
    moveTransaction($t);
  });

  function ReloadTransaction(){
    $(document).on("click", ".js-reload-transactions.reload:not(.reloading)", function(){
      $(this).addClass("reloading");
      moveTransaction($(this));
    });
  }

  function formatDate(date) {
    var d = new Date(date),
    month = '' + (d.getMonth() + 1),
    day = '' + d.getDate(),
    year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
  }

  function initFilterCalendar(){

    if ($(".js-calendar").length > 0) {
      var startCalendar = rome(left, {
        dateValidator: rome.val.beforeEq(right),
        time: false,
        weekStart: 1
      });
      startCalendar.back();
      $("#left .rd-day-body").removeClass("rd-day-selected");

      var finishCalendar = rome(right, {
        dateValidator: rome.val.afterEq(left),
        time: false,
        weekStart: 1
      });
    }
    $("a.js-date-clear").click(function(){
      var date = formatDate(Date(Date.now()));
      startCalendar.setValue(date);
      startCalendar.back();
      $("#left .rd-day-body").removeClass("rd-day-selected");
      finishCalendar.setValue(date);
    });
    $(".functions .calendar").click(function(){
      $(this).toggleClass("active");
      $(this).next(".js-calendar").toggleClass("opened");
    });
    $(".js-date-filter").click(function(){
      startDateTransaction = startCalendar.getMoment().format("YYYY-MM-DD") + " 00:00";
      endDateTransaction = finishCalendar.getMoment().format("YYYY-MM-DD") + " 23:59";
      // console.log(startDateTransaction);
      // console.log(endDateTransaction);
      moveTransaction($(this));
      $(".functions .calendar").removeClass("active");
      $(".js-calendar").removeClass("opened");
    });
    $(".close-calendar").click(function(){
      $(".functions .calendar").removeClass("active");
      $(".js-calendar").removeClass("opened");
    });
    $('body').click(function(evt){
      if ($(evt.target).closest('.functions .calendar').length)
      return;
      if ($(evt.target).closest('.js-calendar').length)
      return;
      if($(evt.target).closest('.js-calendar > *').length)
      return;
      $(".functions .calendar").removeClass("active");
      $(".js-calendar").removeClass("opened");
      //Do processing of click event here for every element except with id menu_content
    });
    $(".close-calendar").click(function(){
      $(".functions .calendar").removeClass("active");
      $(".js-calendar").removeClass("opened");
    });
  }

  initFilterCalendar();

  function moveTransaction($t) {

    if ($t.hasClass("disabled") || $t.hasClass("sending")) {
      abortAllTransactionAjax();
    }

    $(".js-move-recent-transactions").addClass("sending");

    var target = $t.data("target");

    var currentpage = parseInt($(".js-current-page-recent-transactions").data("currentpage") || "1");

    switch (target) {
      case "first":
      currentpage = 1;
      break;
      case "prev":
      currentpage--;
      break;
      case "next":
      currentpage++;
      break;
      case "last":
      currentpage = parseInt($(".js-current-page-recent-transactions").data("lastpage") || "1");
      break;
    }

    $(".pagination-btn span.js-current-page-recent-transactions").attr("data-currentpage", currentpage);
    $(".pagination-btn span.js-current-page-recent-transactions").html(currentpage);

    socketWallet.emit('getTransaction', { currentpage: currentpage, tsl: startDateTransaction, tsh: endDateTransaction });
  }

  setTimeout(function(){
    if(!getCurrentPrivateKey() && gtag) {
      gtag('event', 'Explore', {
        'event_category': 'UseWallet',
        'event_label': 'Explore an Address',
        'value': 1
      });
    }
  }, 100);  
}

function getTokenInfo(query, ajaxCall, callback){
  // console.log("getTokenInfo");
  ajaxCall.push(
    $.get(serverApi + "/gettokeninfo?" + $.param(query), function (data) {
      callback(data);
    })
  );
}

function reloadLayout($list){
  var $wallet = $list.find(".wallet-card");
  $wallet.sort(function(a, b){
    return $(a).data("order")-$(b).data("order")
  });
  $list.html($wallet);
}

var CheckEtherAddress = function(key) {
  if(key.length < 2)
  return -1;
  if(key.substring(0,2).toLowerCase() !== '0x')
  return 0;
  if(key.length < 42)
  return -1;
  return eth4you.validateEtherAddress(key);
}

function initWorkSpace(){
  $(".switch-type input").change(function(){
    if($(this).is(":checked")) {
      $(this).parents(".switch-type").addClass("checked");
      // $(".ws-functions .js-load, .ws-functions .js-save").addClass("hidden");
    }
    else {
      $(this).parents(".switch-type").removeClass("checked");
      // $(".ws-functions .js-load, .ws-functions .js-save").removeClass("hidden");
    }
    ReloadWorkspace();
  });
  $("#BigModal form").submit(function(){
    resizeWallet();
  });
  $("[name='workspacetype']").prop("checked", Cookies.get("workspacetype") == "cloud").change();

  // ReloadWorkspace();

  $(window).on("resize",function(){
    resizeWallet();
  });
  BigModal();
  var $lastWallet = $(".workspace-page .ws-list-wallets .wallet-card.create-wallet");

  // $(document).on("click", ".wallet-card", function(e){
  //   console.log(event.target);
  //   if(!$(event.target).closest('.wallet-card').length) {
  //     location.href = "/address/" + $(this).data("address");
  //   }
  // });

  $(document).on("change paste keyup", ".js-wallet-name-input", function(){
    $(this).parents(".wallet-card").first().attr("data-name", $(this).val());
  });

  $(".js-workspace-pr-key").on("submit", function(){
    var address = addressFromModalPrivateKey($(this), false, null, true);
    InsertIntoWorkspace(address, null, true);
    UpdateLayout(true);
    $(this)[0].reset();
  });

  $(".js-workspace-en-key").on("submit", function(){
    var address = addressFromModalPrivateKeyEncrypted($(this), false, null, true);
    InsertIntoWorkspace(address, null, true);
    UpdateLayout(true);
  });

  $(".js-mnemonic-type").on("change", function(e){
    var n = $(this).find("option:selected").attr("data-n") || "12";
    $(".js-change-number-mnemonic-type").html(n);
  })

  $(".js-workspace-mnemonicphrase").on("submit", function(){
    initMnemonicList($(this), 0, true);
  });

  $(".js-workspace-jsonfile").on("submit", function(){
    var $t = $(this);
    var $DropzoneElement = Dropzone.forElement($t.find(".js-json-utc-wallet")[0]);
    var file = $DropzoneElement.files[0];
    var password = $t.find(".js-password-unlock-json").val();
    if (file == undefined) {
      $t.find(".dropzone-element").addClass("is-invalid");
      toastr.error("UTC/JSON file missed");
      return false;
    }
    getAddressFromJson(file, password, function(address){
      if(address){
        InsertIntoWorkspace(address, null, true);
        UpdateLayout(true);
      }
      else{
        $t.find(".js-password-unlock-json").addClass("error");
      }
      $t.parents(".modal").first().modal("hide");
      $DropzoneElement.emit("resetFiles");
      $t[0].reset();
    });
  });

  $(".js-workspace-address").on("submit", function (e) {
    var $address = $(this).find("[name='address']");
    if(validateSubmit($(this), e)) {
      if (CheckEtherAddress($address.val()) > 0) {
        $address.removeClass("is-invalid");
        InsertIntoWorkspace($address.val());
        UpdateLayout(true);
        $(this).parents(".modal").first().modal("hide");
        $(this)[0].reset();
      }
      else {
        $address.addClass("is-invalid");
        toastr.error("Invalid address!");
      }
    }
  });

  $(document).on("click", "#mnemoniclist.workspace-mnemonic .link-special", function(e){
    e.preventDefault();
    var address = $(this).data("address");
    if(address) {
      InsertIntoWorkspace(address, null, true);
      UpdateLayout(true);
      $("#mnemoniclist, #BigModal").modal("hide");
    }
  });

  $(".ws-title .js-edit").click(function(){
    $(".workspace-page .ws-list-wallets .wallet-card.create-wallet").remove();
    $(this).parents(".workspace-container").addClass("dragging");
    EditList();
    RemoveWallet();
  });

  $(".ws-title .js-discard").click(function(){
    reloadLayout($(".ws-list-wallets"));
    $(".ws-list-wallets .wallet-card").removeAttr("style");
    $(".workspace-page .ws-list-wallets").append($lastWallet);
    $(this).parents(".workspace-container").removeClass("dragging");
    StopEdit();
  });

  $(".ws-title .js-save-drag").click(function(){
    $("#lista-wallet .wallet-card:hidden").remove();
    //$(this).parents(".workspace-container").removeClass("dragging");
    //StopEdit();
    var $t = $(this)
    UpdateLayout(false, function(){  
      ReloadWorkspace(function(){
        $t.parents(".workspace-container").removeClass("dragging");
      });      
    });
    $(".workspace-page .ws-list-wallets").append($lastWallet);
  });

  $("[name='workspacetype']").on("change", function(){
    Cookies.remove("workspacetype"); //più sicuro
    Cookies.set("workspacetype", $(this).is(":checked") ? "cloud" : "local", { expires: 365, path: '/', secure: false, http: true });
  });

  $(document).on("click", ".wallet-card .js-address-to-cut", function(e){
    e.preventDefault();
    location.href = "/address/" + $(this).parents(".wallet-card").first().attr("data-address");
  });

  $(".ws-functions .js-save").on("click", function(e){
    var workspacePromise = GetWorkspace();
    workspacePromise.then(function (workspace) {
      if(workspace.length <= 0) {
        toastr.error("Workspace empty!");
      }
      else {
        $('#saveWorkspace').modal("show");
      }
    });
  });

  // $(".js-download-json").click(function(){
  //   console.log("clicked");
  // })

  $(".js-save-workspace-file").on("submit", function(e){
    e.preventDefault();
    var $t = $(this);
    if(validateSubmit($t, e)) {
      var name = ($t.find(".js-workspace-name").val() || "workspace") + ".noku" ,
        password = $t.find(".js-workspace-password").val();
      var workspacePromise = GetWorkspace();
      workspacePromise.then(function (workspace) {
        if(workspace.length > 0) {
          var json = NokuCrypt(workspace, password);
          var blob = new Blob([json], {
            type: "text/json;charset=UTF-8"
          });
          var _url = window.URL.createObjectURL(blob);
          var $modal = $t.parents(".modal");
          // $modal.find(".js-download-json").attr('href', _url).attr('download', name);


          var a = document.createElement("a");
          document.body.appendChild(a);
          a.style = "display: none";
          a.href = _url;
          a.download = name;
          a.click();
          
          setTimeout(function(){
            a.remove();
            window.URL.revokeObjectURL(_url);
            $modal.modal("hide");
            $t[0].reset();
            // $modal.find(".js-download-json").attr('href', "").attr('download', false);
          }, 100);
        }
        else {
          toastr.error("Workspace empty!");
        }
      });
    }
  });

  $(".js-load-workspace-file").on("submit", function(e){
    e.preventDefault();
    var $t = $(this);
    if(validateSubmit($t, e)) {
      var $modal = $t.parents(".modal");
      var $DropzoneElement = Dropzone.forElement($modal.find(".js-json-workspace")[0]);
      var file = $DropzoneElement.files[0];
      var password = $modal.find(".js-password-unlock-json").val();
      if (file == undefined) {
        $modal.find(".dropzone-element").addClass("is-invalid");
        toastr.error("Workspace file missed");
        return false;
      }

      getStringFromFile(file, function(_json){
        var json = NokuDecrypt(_json, password);
        var isJson = typeof json === 'object' || json instanceof Array;
        if (isJson && json && json.length > 0) {
          saveWorkspace(json, function(){
            ReloadWorkspace();
            $DropzoneElement.emit("resetFiles");
            $modal.modal("hide");
            $t[0].reset();
          });
        }
        else {
          toastr.error("wrong workspace file!");
        }
      });

    }
  });

}

var totalWs;
function ReloadWorkspace(callback){
  totalWs = eth4you.initEquivalent();
  var workspacePromise = GetWorkspace();

  workspacePromise.then(function(workspace){
    $("#lista-wallet .wallet-card:not(.create-wallet)").remove();
    for (i = 0; i < workspace.length; i++) {
      insertCardWorkspace(workspace[i]);
    }

    reloadLayout($(".ws-list-wallets"));

    var layout = [];

    CopyAddress("workspace-page", " .copy");
    FlipWallet();
    resizeWallet();
    if(callback) {
      callback();
    }
  });
}

function insertCardWorkspace(obj) {
  var html = $(".js-origin-wallet-card").clone().html();

  var blockie =  eth4you.blockies.create({
    seed: obj.address.toLowerCase(),
    size: 8,
    scale: 5
  }).toDataURL();;

  html = html.replace(/{{order}}/g, obj.order);

  html = html.replace(/{{address}}/g, obj.address);
  html = html.replace(/{{blockie}}/g, "<img src='" + blockie + "'>");
  html = html.replace(/{{background_blockie}}/g, "style='background-image: url("+ blockie +")'");
  html = html.replace(/{{wallet_name}}/g, obj.name || "");
  // html = html.replace(/{{total_balance}}/g, "");
  // html = html.replace(/{{n_tokens}}/g, "");

  var $html = $(html);


  new eth4you.QRCode($html.find(".js-qr-code")[0], {
    width: 110,
    height: 110,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H,
    text: obj.address
  });

  $html.find(".js-address-to-cut").html(CutAddress($html.find(".js-address-to-cut")));

  $html.insertBefore("#lista-wallet .create-wallet");
  // $("#lista-wallet .js-address-to-cut").each(function(index, obj){
  //   $(obj).html(CutAddress($(obj)));
  // });

  $.get("/balance/" + obj.address, function(data){
    if(!data) {
      return false;
    }
    var value = data.type == "virgin" && !(data.total && data.total.eth) ? "0" : data.total.eth;
    $(".wallet-card[data-address='" + obj.address + "'] .js-total-balance").html(value + "Ξ");

    var partial = eth4you.initEquivalent();

    var etherRawBalance = data.etherRawBalance;
    var etherBalance = data.etherBalance;
    var etherPrice = data.etherPrice;

    if(etherRawBalance && etherPrice){
      eth4you.addEquivalent(totalWs, { dec: 18, balance: etherRawBalance }, etherPrice);
      eth4you.addEquivalent(partial, { dec: 18, balance: etherRawBalance }, etherPrice);
    }

    if(data.tokens) {
      var max = 3;
      var n_tokens = data.tokens.length - max;

      if(n_tokens > 0){
        var txt = $(".wallet-card[data-address='" + obj.address + "'] .token-balance").html();
        txt = txt.replace(/{{n_tokens}}/g, n_tokens);
        $(".wallet-card[data-address='" + obj.address + "'] .token-balance").html(txt);
        $(".wallet-card[data-address='" + obj.address + "'] .token-balance .other-tokens").removeClass("hidden");
      }
      var removeHidden = false;
      for (i = 0; i < Math.max(Math.min(max, n_tokens), Math.min(max, data.tokens.length)); i++) {
        removeHidden = true;
        var token = data.tokens[i];
        var tokenCard = $(".js-token-card-original").html();
        var unit = token.sym;
        if (unit == '') {
          unit = "ERC20";
        }
        tokenCard = tokenCard.replace(/{{balance_token}}/g, token.roundedBalance + " " + unit);
        tokenCard = tokenCard.replace(/{{img_token}}/g, "<img src='" + (token.urlimage || "/content/images/erc20.jpg") + "'>");

        $(".wallet-card[data-address='" + obj.address + "'] .token-balance .list-token").prepend(tokenCard);

        if(token.price && token.qtd && token.price.ETH) {
          var eth = eth4you.tokenToEth(token.result,token,token.price.ETH);
          eth4you.addEquivalent(totalWs,token,token.price);
          eth4you.addEquivalent(partial,token,token.price);
        } else if(token.sym == 'CHFN' || token.sym == 'GBPN') {
          var eth = eth4you.bigNumber(token.result).div(eth4you.bigNumber(10).pow(token.dec));
          if(token.sym == 'CHFN')
            eth = eth.div(etherPrice.CHF);
          else
            eth = eth.div(etherPrice.GBP);
          if(token.qtd) {
            eth4you.sumEquivalent(total,eth,token.quoted);
            eth4you.sumEquivalent(partial,eth,token.quoted);
          }
        }
      }
    }

    $(".ws-balance .js-total-balance").html(eth4you.rounded(totalWs.eth,4) + " &Xi;");
		$(".ws-balance .js-total-dollari").html(eth4you.rounded(totalWs.usd,2) + " &dollar;");
		$(".ws-balance .js-total-euro").html(eth4you.rounded(totalWs.eur,2) + " &euro;");
		$(".ws-balance .js-total-bitcoin").html(eth4you.rounded(totalWs.btc,5) + " <i class='fab fa-btc'></i>");

    if(removeHidden) {
      $(".wallet-card[data-address='" + obj.address + "'] .token-balance .list-token").removeClass("hidden");
    }
  });
}

var updateFeeToolTip = function(){
  var gasLimit = $("#gas-limit").val();
  var gasPrice = GetGasPrice();
  if(gasLimit <= 0 && gasPrice <= 0 || !etherPrice || !gasPrice) {
    return false;
  }

  var predictWaitTime = GetPredictGasStationTime(gasPrice);

  var urlParameters = "gaslimit=" + gasLimit + "&gasprice=" + gasPrice + "&etherprice=" + encodeURIComponent(JSON.stringify(etherPrice)) + "&predictwaittime=" + predictWaitTime;

  var url = "/fee?" + (urlParameters);

  $.get(url, function(data){
    $(".js-info-gas-price").data("info", data.title);
    $(".js-generate-transaction").data("fee", data.need);
  });
}

var GetPredictGasStationTime = function (gasPrice) {
  if (typeof(predictGasStationTime) == "undefined" || (typeof(predictMaxGasTime) != "undefined" && predictMaxGasTime && gasPrice > predictMaxGasPrice)) {
    return predictMaxGasTime;
  }

  var time = predictGasStationTime[gasPrice];
  if (time)
  return time;
  for (var i = 0; i < predictGasStationArray.length; i++) {
    var g = predictGasStationArray[i];

    if (parseFloat(g.gasprice) >= parseFloat(gasPrice))
    return g.expectedTime;
  }
}

var GetGasPrice = function () {
  var price = $("#gas-price").val();
  if (isNaN(parseFloat(price)))
  return "";
  return Math.round($("#gas-price").val() * 10) / 10;
}

String.prototype.capitalize = function() {
  return this.replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase(); });
};

var InsertIntoRubrica = function (addr, name, force) {
  var rubrica = GetRubrica();

  var filtered = rubrica.filter(function (obj) {
    return obj.address == addr;
  });

  if (filtered.length > 0) {
    if(force){
      filtered[0].name = name;
    }
    else{
      return false;
    }
  }
  else {
    if (name) {
      rubrica.unshift({ address: addr, name: name });
    }
    else {
      rubrica.unshift({ address: addr });
    }
  }
  Cookies.remove("addressbook"); //più sicuro
  Cookies.set("addressbook", JSON.stringify(rubrica), { expires: 365, path: '/', secure: false, http: true });
}

function GetRubrica(){
  return JSON.parse(Cookies.get("addressbook") || Cookies.get("account") || "[]"); //mantengo "account" per portabilità dal vecchio wallet
}

function initRubrica() {
  $(".js-add-line").click(function(){

    var $address = $(this).parents(".js-address-item").find(".js-address-address").first();
    var address = $address.val();

    if (address) {

      if (!checkIsInRubrica(address)) {

        var $img = $(this).parents(".js-address-item").find(".js-create-blockie");
        var $name = $(this).parents(".js-address-item").find(".js-address-name").last();

        var img = $img.html();

        var name = $name.val();
        $(this).parents(".js-address-item").before('<tr class="js-address-item" data-address="' + address + '">'
          + '<td class="avatar-book"><div class="js-create-blockie card-avatar">' + img + '</div></td>'
          + '<td><a class="link-special js-insert-into-send" data-address="' + address + '" href="javascript:;">' + address + '</a></td>'
          + '<td><input class="form-control js-address-name" type="text" value="' + name + '"></td>'
          + '<td><div class="btn btn-noku js-save-address">save</div></td>'
          + '<td><div class="btn btn-danger js-delete-address"><i class="fal fa-trash"></i></div></td>'
          + '</tr>');
        $img.html("<img src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAQAAAC0NkA6AAAALUlEQVR42u3NMQEAAAgDoK2/oc3g4QcFaCbvKpFIJBKJRCKRSCQSiUQikUhuFvwRG4t8xwv8AAAAAElFTkSuQmCC'>");
        $address.val("");
        $name.val("");

        InsertIntoRubrica(address, name, true);
        $(".js-address-item .js-add-line").addClass("disabled");

        toastr.success("address<br /><i><b>" + address + "</b></i><br /> saved into address book!");
      }
      else {
        toastr.error("address<br /><i><b>" + address + "</b></i><br /> is already present in your address book!");
      }
    }
    else {
      toastr.error("please enter a valid address!");
    }
  });
  // $(document).on("change keyup", ".js-address-item .js-address-name", function (e) {
  //   var $t = $(this);
  //   var $parentAddress = $t.parents(".js-address-item").first();
  //   var address = $parentAddress.attr("data-address");
  //   InsertIntoRubrica(address, $t.val(), true);
  //   $t.addClass("success");
  //   setTimeout(function(){
  //     $t.removeClass("success");
  //   }, 500);
  // });

  $(".js-address-item .js-create-blockie").each(function(index, obj){
    createBlockie($(obj))
  });

  $(document).on("click", ".js-address-item .js-delete-address", function (e) {
    var $t = $(this);
    var $parentAddress = $t.parents(".js-address-item").first();
    var address = $parentAddress.attr("data-address");
    removeFromRubrica(address);
    $parentAddress.remove();
  });

  $(document).on("click", ".js-insert-into-send", function (e) {
    e.preventDefault();
    var $t = $(this);
    var address = $t.attr("data-address");
    $(".send-funds-card .js-send-funds-to").val(address).change();
    $("#addressbook").modal('hide');
  });

  $(document).on("click", ".js-address-item .js-save-address", function (e) {
    var $t = $(this);
    var $parentAddress = $t.parents(".js-address-item").first();
    var address = $parentAddress.attr("data-address");

    var update = checkIsInRubrica(address);

    // if(checkIsInRubrica(address)) {
      var name = $parentAddress.find(".js-address-name").val();
      InsertIntoRubrica(address,name, true);

    // }
    // else {
    //   toastr.error("address<br /><i><b>" + address + "</b></i><br /> is already present in your address book!");
    // }

    if(update){
      toastr.success("address<br /><i><b>" + address + "</b></i><br /> successfully updated!");
    }
    else {
      toastr.success("address<br /><i><b>" + address + "</b></i><br /> saved in your address book!");
    }


    // $t.addClass("success");
    // setTimeout(function(){
    //   $t.removeClass("success");
    // }, 1000);
  });

  $(document).on("change keyup", ".js-address-address", function () {
    var address = $(this).val();
    if (address != "" && CheckEtherAddress(address) > 0) {
      $(".js-address-item .js-add-line").removeClass("disabled");
    }
    else {
      address = "";
      $(".js-address-item .js-add-line").addClass("disabled");
    }
    createBlockie($(this), address, $(this).parents(".js-address-item").first().find(".js-create-blockie").first());
  });

  function createBlockie($t, address, $img) {
    var $parentAddress = $t.parents(".js-address-item").first();
    var address = address || $parentAddress.attr("data-address");
    var blockie = "";
    if(address != "") {
      blockie = eth4you.blockies.create({
        seed: address.toLowerCase(),
        size: 8,
        scale: 5
      }).toDataURL();
    }
    else {
      blockie = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAQAAAC0NkA6AAAALUlEQVR42u3NMQEAAAgDoK2/oc3g4QcFaCbvKpFIJBKJRCKRSCQSiUQikUhuFvwRG4t8xwv8AAAAAElFTkSuQmCC";
    }

    ($img || $t).html("<img src='" + blockie + "'>");
  }

  function removeFromRubrica(address) {
    var rubrica = GetRubrica();

    rubrica = rubrica.filter(function (obj) {
      return obj.address !== address && typeof(obj.address) != "undefined";
    });

    Cookies.set("addressbook", JSON.stringify(rubrica), { expires: 365, path: '/', secure: false, http: true });

    return rubrica;
  }

  function checkIsInRubrica(address) {
    var rubrica = GetRubrica();

    rubrica = rubrica.filter(function (obj) {
      return obj.address === address && typeof(obj.address) != "undefined";
    });

    return rubrica.length > 0;
  }
}

// window\.onbeforeunload = function (event) {
//   localStorage.clear();
//   return "";
// };

function CutAddress($address){
  var address = $address.html();

  $address.attr("data-original", address);

  return address.substring(0, 8) + "......" + address.substring(address.length - 8, address.length);
}


var GetGasLimitParams = function (token, _to, _value, _data, currentaddress) {
  var value = _value;
  if (!value)
  value = 0;

  var data = _data;
  var address = currentaddress;
  try {
    if (token && token != 'ETH') {
      address = token.addr;

      var to = _to;
      const tokenTransferHex = "0xa9059cbb";

      value = PadLeft(eth4you.bigNumber(parseFloat(value)).times(eth4you.bigNumber(10).pow(token.dec)).toString(16), 64);
      to = PadLeft(_to.toLowerCase().replace('0x', ''), 64);
      data = tokenTransferHex + to + value;
      to = token.addr;
      value = '0x0';
      return { from: currentaddress, to: to, data: data, value: value };
    }
    else {
      value = eth4you.generateValue(value);
      if (data.length % 2)
      data = '0' + data;
    }
  } catch (e) { return null; }

  return { from: address, to: _to, data: data, value: value, sel: "ETH" };
}

var firstMnemonic;
function initMnemonic(){
  $(".js-mnemonic-phrase").on("keydown", function(e){
    var code = (e.keyCode ? e.keyCode : e.which);
    if(code == 13) {
			return false;
		}
    // var key = $(".js-mnemonic-phrase").val();
    // var ca = key.split(' ');
    // if(ca.length != 12) {
    //   return false;
    // }
  });
  $(".js-mnemonicphrase").on("submit", function(e){
    e.preventDefault();
    initMnemonicList($(this), 0);
  });

  $(document).on("click", ".js-save-priv-key", function(e){
    setTimeout(function () {
      if (gtag) {
        gtag('event', 'Unlock', {
          'event_category': 'UseWallet',
          'event_label': 'Unlock your Wallet',
          'value': 1
        });
      }
    }, 0);
    savePrivateKey($(this).data("address"), $(this).data("privkey"));
  });

  $(".js-body-mnemoniclist").scroll(function(e) {
		var reach = $(this).scrollTop() + $(this).prop('clientHeight');
		if(reach >= $(this).prop('scrollHeight')) {
      var isWorkspace = $mnemonicDiv && $mnemonicDiv.hasClass(".js-workspace-mnemonicphrase");
      initMnemonicList($mnemonicDiv || $(".js-mnemonicphrase"), firstMnemonic, isWorkspace);
    }
  });
}

function initMnemonicList($t, first, isWorkspace){
  var mnemonic = $t.find(".js-mnemonic-phrase").val(),
      type = $t.find(".js-mnemonic-type").val(),
      password = $t.find(".js-mnemonic-password").val(),
      // first = 0,
      count = 20;
  if(mnemonic && type) {
    $mnemonicDiv = $t;// $(".js-mnemonicphrase")
    getListAddressFromMnemonic(mnemonic, password, first, count, type, isWorkspace);
  }
}

function getListAddressFromMnemonic(mnemonic, password, first, count, alt, isWorkspace) {
  var mnes = eth4you.getMnemonicAccounts(mnemonic, password, first, count, alt);

  firstMnemonic = first + count;
  if(first == 0) {
    $("#mnemoniclist tbody .js-mnemonic-loaded").remove();
  }
  for (var i = 0; i < mnes.length; i++) {
    var blockie = eth4you.blockies.create({
      seed: mnes[i].address.toLowerCase(),
      size: 8,
      scale: 5
    }).toDataURL();

    var html = $("<div></div>").append($("#mnemoniclist .js-original-item").clone().removeClass("js-original-item hidden").addClass("js-mnemonic-loaded")).html();

    var address = mnes[i].address;

    html = html.replace("{{blockie}}", "<img src='" + blockie + "'>");
    html = html.replace(/{{address}}/g, address);
    html = html.replace("{{privateKey}}", mnes[i].privateKey);

    $("#mnemoniclist tbody").append(html);

    if(isWorkspace){
      $("#mnemoniclist").addClass("workspace-mnemonic");
    }
    else {
      $("#mnemoniclist").removeClass("workspace-mnemonic");
    }

    setBalanceMnemonic(address)

  }

  $("#mnemoniclist").modal("show");
}

function setBalanceMnemonic(address){
  $.get("/balance/" +address, function(data){
    var value = data.type == "virgin" && !data.etherRawBalance ? "0" : eth4you.etherize(data.etherRawBalance);
    $("#mnemoniclist .js-address-balance[data-address='" + address + "'").html(value);
  });
}

function PadLeft(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

//polyfill reportValidity for IE and Safari
if (!HTMLFormElement.prototype.reportValidity) {
  HTMLFormElement.prototype.reportValidity = function() {
    if (this.checkValidity()) return true;
    var btn = document.createElement('button');
    this.appendChild(btn);
    btn.click();
    this.removeChild(btn);
    return false;
  }
}

String.prototype.hexEncode = function () {
  var hex, i;

  var result = "";
  for (i = 0; i < this.length; i++) {
    hex = this.charCodeAt(i).toString(16);
    result += ("000" + hex).slice(-4);
  }

  return result;
}

String.prototype.hexDecode = function () {
  var j;
  var hexes = this.match(/.{1,4}/g) || [];
  var back = "";
  for (j = 0; j < hexes.length; j++) {
    back += String.fromCharCode(parseInt(hexes[j], 16));
  }
  return back;
}