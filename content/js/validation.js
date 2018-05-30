var stile = "top=10, left=10, width=860, height=550, status=no, menubar=no, toolbar=no, scrollbars=yes";

function validateEmail(email) {
  var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
}

function Popup(apri) {
  window.open(apri, "", stile);
}

function AlertCampiObbligatori() {
  //ErrorAlert($("#tipo3").data("content"));
  toastr.error("All fields are mandatory!");
}

function AlertValidazioneEmail() {
  //ErrorAlert($("#tipo4").data("content"));
  toastr.error("Email format is not correct!");
}

function AlertPrivacy() {
  //ErrorAlert($("#tipo5").data("content"));
  toastr.error("Privacy check is mandatory!");
}

function AlertConsenso() {
  //ErrorAlert($("#tipo14").data("content"));
  toastr.error("Consenso Obbligatorio");
}
function AlertPasswordErrate(){
  toastr.error("Passwords do not match");
}

function GetLabelForElement($el) {
  var label = $('label[for="' + $el.attr('id') +'"]');

  if(label.length <= 0) {
    var parentElem = $el.parent(),
    parentTagName = parentElem.get(0).tagName.toLowerCase();

    if(parentTagName == "label") {
      label = parentElem;
    }
  }
  return label;
}

function ApplicaError($el) {
  if($el.next().hasClass('jcf-select')) {
    $el.next().addClass("is-invalid");
  } else if ($el.hasClass("avatar-fake")) {
    $el.addClass("is-invalid");
    $el.parents(".choose-avatar").addClass("is-invalid")
  }
  else {
    $el.addClass("is-invalid");
  }

	if($el.hasClass("jcf-hidden")) {
		$el.next(".jcf-select").addClass("is-invalid");
	}
}

function PulisciError($el) {
  $el.removeClass("is-invalid");
  if($el.hasClass("jcf-hidden")) {
    $el.next(".jcf-select").removeClass("is-invalid");
  }
  var $label = GetLabelForElement($el);
  $label.removeClass("is-invalid");
}

function ShowErrorBox(msg, animateTop, nomeForm) {
  $form = nomeForm == null ? $("#formContatto") : $(nomeForm);
  console.log($form);
  //var errorBlock = $form.find(".message-box.error").not(".success");
  //$form.find(".message-box.error .textError").html(msg);
  toastr.error(msg);
  /*errorBlock.removeClass("hidden");
  if (animateTop) {
    $('html,body').animate({
      scrollTop: $form.offset().top
    }, 1000);
  }*/
}

function ShowSuccessBox(msg, animateTop, nomeForm) {
  $form = nomeForm == null ? $("#formContatto") : $(nomeForm);
  //
  var errorBlock = $form.find(".message-box.success");
  //$form.find(".message-box.success .textError").html(msg);
  toastr.success(msg);
  /*if (animateTop) {
    $('html,body').animate({
      scrollTop: $form.offset().top
    }, 1000);
  }*/
}

function HideErrorBox(nomeForm) {
  $form = nomeForm == null ? $("#formContatto") : $(nomeForm);
  var errorBlock = $form.find(".error-block").not(".success");
  errorBlock.addClass("hidden");
}

function HideSuccessBox(nomeForm) {
  $form = nomeForm == null ? $("#formContatto") : $(nomeForm);
  var errorBlock = $form.find(".error-block.success");
  errorBlock.addClass("hidden");
}

var ErrorAlert = function(error) {
  $('.error-overlay .error-message').text(error);
}

var ConfirmAlert = function(confirm, title) {
  title = title === typeof(undefined) || title == true ? "success" : title;
  var alertObj = $.fn.jAlert({
    'title': title,
    'message': confirm,
    'theme': 'success'
  });
  alertObj.find(".closeAlert").focus();
}

function validateSubmit($form, e) {
  var error = 0;
  var alerted = false;
  var $fields = $form.find("input, select, textarea").filter(".obbl");

  $fields.each(function(index, obj) {
    if($(obj).val() == "") {
      error = 1;
      ApplicaError($(obj));
      if(!alerted) {
        AlertCampiObbligatori();
        alerted = true;
      }
    }
    if($(obj).hasClass("validateEmail") &&  !validateEmail($(obj).val())) {
      error = 1;
      ApplicaError($(obj));
      if(!alerted) {
        AlertValidazioneEmail();
        alerted = true;
      }
    }
    if($(obj).hasClass("validatePrivacy") &&  !$(obj).is(":checked")) {
      error = 1;
      ApplicaError($(objthis).parent());
      if(!alerted) {
        AlertPrivacy();
        alerted = true;
      }
    }
    if($(obj).hasClass("validateConsenso") &&  !$(obj).is(":checked")) {
      error = 1;
      ApplicaError($(obj).parent());
      if(!alerted) {
        AlertConsenso();
        alerted = true;
      }
    }
    if($(obj).hasClass("control-password")) {
      if ($(obj).val() != $form.find(".control-repassword").val()) {
        error = 1;
        ApplicaError($(obj));
        ApplicaError($form.find(".control-repassword"));
        if(!alerted) {
          AlertPasswordErrate();
          alerted = true;
        }
      }
    }
  });

  if(error == 1) {
    e.preventDefault();
    return false;
  }

  if($form.hasClass("ajaxSubmit")) {
    e.preventDefault();
    var data = $form.serialize();
    $.post($form.attr("action"), data).success(function(result){
      if(result == "OK") {
        var lang = $("[name=lang]").val();
        window.open("/" + lang + "/thankyou.html", "_self");
      } else {
        alert("Error");
      }
    });
  }
  return true;
}

$(function(){
  $(".message-box .btn-close").click(function() {
    $(this).parents(".message-box").addClass("hidden");
  });

  /**** VALIDAZIONE FORM ***/
  $(document).on("submit", ".validateSubmit", function(e) {
    $formValidate = $(this);
    validateSubmit($formValidate, e);
  });

  $(document).on("focus change", ".is-invalid", function() {
    PulisciError($(this));
  });
  /**** FINE VALIDAZIONE FORM ***/

  $(".move-in-page").click(function(e) {
    e.preventDefault();
    var target = $(this).attr("href");
    $('html,body').animate({
      scrollTop: $('a'+ target).offset().top
    }, 1000);

    $('.navbar-collapse.nav-header.collapse.in').removeClass('in');
  });

});
