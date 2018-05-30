$(function(){
    $.get("/getuserinfo", function(data){
        var imgAvatar = $("<img>").attr("src", data.avatar);
        $(".js-modal-account-info .js-avatar").html(imgAvatar);
        $(".js-modal-account-info .js-username").html(data.nickname);
        $(".js-modal-account-info .js-email").html(data.email);
        var imgKyc = $("<img>").attr("src", data.kycimg);
        $(".js-modal-account-info .js-kyc-level-img").html(imgKyc);
        $(".js-modal-account-info .js-kyc-level").html(data.kyclevel);
        if(data.kycerror) {
            $(".js-modal-account-info .option.level").addClass("error");
        } else if (data.kycpending) {
            $(".js-modal-account-info .option.level").addClass("pending");
        }
    });

    $(".js-logout").on("click", function(e){
        e.preventDefault();
        var href = e.target.href;
        localStorage.removeItem("workspace");
        location.href = href;
    });
});
