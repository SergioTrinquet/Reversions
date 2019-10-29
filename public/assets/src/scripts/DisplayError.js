/*function DisplayError(jqXHRresponseText) {
    var Thehtml = $.parseHTML(jqXHRresponseText);
    var html_PgErreur = $(Thehtml).find("#Encart");

    var WrapLoader = $('.WrapLoader');
    if(WrapLoader) { WrapLoader.addClass('Hidden'); }
    
    if($('.ErreurRetourAjax').length > 0) {
        $('.ErreurRetourAjax .Content').html(html_PgErreur);
        $('.ErreurRetourAjax').removeClass('Hidden');
    } else {
        $("<div class='ErreurRetourAjax'><i class='fa fa-times ClosePopin'></i><div class='Content'></div></div>").appendTo("body");
        $(".ErreurRetourAjax .Content").html(html_PgErreur);
    }
}*/


////// Nvelle version au 28/10/2019 //////
$(function () {
    /// Pour fermeture masque et popin
    $('body').on("click", "#CloseEncart", function () {
        $('#Wrapper_Encart').remove();
        $('#MasqueErreur, .WrapLoader').addClass('Hidden');
    });
});

function DisplayError_NEW(ErreurResponseText) {
    var thehtml = $.parseHTML(ErreurResponseText);
    $('body').append(thehtml);
    $('#Wrapper_Encart')
        .find('#Encart')
        .prepend("<i class='fa fa-times' id='CloseEncart' />");
}
////// FIN Nvelle version au 28/10/2019 //////