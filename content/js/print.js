var addr = eth4you.toChecksumAddress(eth4you.addressFromPrivate(key));
window.onload = function() {
  var QR = function(id,text) {
    new eth4you.QRCode(
      document.getElementById(id), {
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H,
        text: text
      }
    )
  }
  document.getElementById("paperwalletadd").innerHTML = "' + addr + '";
  document.getElementById("paperwalletpriv").innerHTML = "' + key + '";
  QR("paperwalletaddqr","' + addr + '");
  QR("paperwalletprivqr","' + key + '");
  var blockie = eth4you.blockies.create({ seed: "' + addr.toLowerCase() + '", size: 8, scale: 16 }).toDataURL();
  document.getElementById("identicon").style.backgroundImage = "url("+blockie+")";
  setTimeout(function() { window.print(); }, 1000);
}
$("#print-template").html();
