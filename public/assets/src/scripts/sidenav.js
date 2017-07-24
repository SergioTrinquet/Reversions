$(function () {
    $('#IconOpenMenu').click(function(){ 
        $(".sidenav").addClass('Open');
    });
    $('.closebtn').click(function(){ 
        $(".sidenav").removeClass('Open');
    });
});