var saisiesChampsFiltre = null;

var DatepickerStart = null;
var DatepickerEnd = null;
var HelpDateFilter = null;

var Masque = null;

$(function () {

    /// Récupération des valeurs des champs filtres --> ESSAI
    $('#FiltresHistoGrp input[type]').each(function(){ $(this).val($.trim($(this).val())); });
    saisiesChampsFiltre = $('#FiltresHistoGrp').serialize();

    /// Affectation variables globales
    DatepickerStart = $("#DatepickerStart");
    DatepickerEnd = $("#DatepickerEnd");
    HelpDateFilter = $("#HelpDateFilter");
    Masque = $(".Masque");

    /// Gestion des datePicker
    DatepickerStart.datepicker({
        showAnim: "slideDown",
        dayNamesMin: ["Di", "Lu", "Ma", "Me", "Je", "Ve", "Sa"],
        minDate: "-120m", /// La date minimum selectionnable : 120 mois avant la date d'aujourd'hui, donc ici "-120m". On peut mettre aussi un objet Date ou un String. Si la promotion est obsolète, date min. est = à la date déjà inscrite ds ce champ (sinon bug), sinon date du jour. 
        maxDate: ($.trim(DatepickerEnd.val()) != "" ? DatepickerEnd.val() : "+120m"), /// La date max. selectionnable : ici si 'Date de Fin' rempli, maxDate de 'Date Début' = valeur de 'date de Fin', sinon 120 mois après la date du jour ("+120m"). On peut mettre aussi un objet Date ou un nombre
        changeMonth: true,
        changeYear: true,
        onClose: function (selectedDate) {
            /// Sur l'ev. OnClose de la 'Date de Départ', le minDate du champ 'Date de Fin' est égal au lendemain de la date du jour (+1) si pas de date ds 'Date de Départ', sinon date sélectionnée ds 'Date de Départ'
            DatepickerEnd.datepicker("option", "minDate", ($.trim($(this).val()) == "" ? +1 : DatePlusOneDay(selectedDate)));
            /// Mets la liste déroulante en disabled ou non
            HelpDateFilter.prop('disabled', ($.trim($(this).val()) == "" ? 'disabled' : '' ));
        }
    });

    DatepickerEnd.datepicker({
        showAnim: "slideDown",
        dayNamesMin: ["Di", "Lu", "Ma", "Me", "Je", "Ve", "Sa"],
        minDate: ($.trim(DatepickerStart.val()) != "" ? DatepickerStart.val() : +1), /// La date minimum selectionnable : A number of days from today. Donc ici +1 = demain. On peut mettre aussi un objet Date ou un String
        maxDate: "+120m", /// La date max. selectionnable : ici 120 mois après la date du jour. On peut mettre aussi un objet Date ou un nombre       
        changeMonth: true,
        changeYear: true,
        onClose: function (selectedDate) {
            /// Sur l'ev. OnClose de la 'Date de Fin', le maxDate du champ 'Date de Début' est égal à la date sélectionnée ds 'Date de Fin'
            DatepickerStart.datepicker("option", "maxDate", selectedDate);
        }
    });


    /// Pour vider le champ date ds la partie 'Filtres'
    $("#DeleteDatepickerStart").click(function() {
        $("#DatepickerStart, #DatepickerEnd").val('');
        HelpDateFilter.prop('disabled', 'disabled');
        $("#HelpDateFilter option:eq(0)").prop('selected', true);
        $('#TxtSpanDates, #DatepickerEnd').addClass('Hidden');
    });

    /// Liste déroulante servant à afficher ou non le 2eme datePicker
    HelpDateFilter.change(function() {
        if($("#HelpDateFilter option:selected").val() == 'between') {
            $('#TxtSpanDates, #DatepickerEnd').removeClass('Hidden');
        } else {
            $('#TxtSpanDates, #DatepickerEnd').addClass('Hidden');
            DatepickerEnd.val('');

            DatepickerStart.datepicker("option", "maxDate", "+120m"); // Ajouté le 18/01/18 suite à petit bug
        }
    });


    /// Pour avoir l'entete flottante
    CreateEnteteFlottante();



    /// Pagination
    $('.MskTopListe i.fa').click(function() {
        var icone = $(this);
        var nPg = parseInt($('#NumPg').text());
        if(icone.hasClass('left')) {
            nPg -= 1;
        } else if(icone.hasClass('right')) {
            nPg += 1;
        }
        /// Display ou pas des icones fleches pagination
        $('i.left').toggleClass('Hidden', (nPg == 1));
        $('i.right').toggleClass('Hidden', (nPg == parseInt($('.NumPage').data('maxnbpages'))));


/* ESSAI le 28/02/17 *//*
        /// Suppression des espaces inutiles ds chps de saisie filtres
        $('#FiltresHistoGrp input[type]').each(function(){
            $(this).val($.trim($(this).val()));
        });
        /// Récupération des valeurs des champs de saisie filtres
        var strParams = $('#FiltresHistoGrp').serialize();
*/


        ///--- V1 ---///
        $.ajax({
            method: "GET",
            url: "/HistoGrp",
            //data: strParams + "&page=" + nPg,
            data: saisiesChampsFiltre + "&page=" + nPg,
            //dataType: "json",
            dataType: "html",
            beforeSend: function () {
                Masque.removeClass('Hidden');
            }
        })
        .done(function (data) {
            /* Avec parsing en HTML */
            //var html = $.parseHTML(data); /// On parse le HTML sous forme de texte en HTML

            /* Sans parsing HTML : Fonctionne aussi !! */
            /// On récupère les données que l'on veut mettre à jour (le n° de page et la liste des données)
            
            var data = $(data);
            var NumPage = data.find('#NumPg');
            var HistoGroupes = data.find('.HistoGroupes');
            /// on remplace les données
            $('#NumPg').text(NumPage.text());
            $('.HistoGroupes').html(HistoGroupes.children());

            /// Pour avoir l'entete flottante
            CreateEnteteFlottante();
            /// Pour revenir en haut de liste à chaque chgmnt de page
            $(window).scrollTop(0);

            Highlight(); /// Pour surligner la recherche ds la liste
        })
        .fail(function (jqXHR) {
            /// Affichage erreur
            //$('.Popin').removeClass('Hidden').addClass('Error').html("<b>" +  + " " + jqXHR.statusText + "</b><br /><b>Message</b> : " + jqXHR.responseJSON.Message + "<br /><b>StackTrace</b> : " + jqXHR.responseJSON.StackTrace);
            DisplayError(jqXHR.responseText);
        });
        

        ///--- V2 ---///
        /*// Grab the template
        $.get('/ListeHistoriqueGroupements.ejs', function (template) {
            // Compile the EJS template.
            var func = ejs.compile(template);

            // Grab the data
            $.get('/HistoGrp?page=' + nPg, function (dataGrp) {
            // Generate the html from the given data.
            var html = func(dataGrp);
            $('#divResults').html(html);
            });
        });*/
        
    });


    /// Validation sur filtres
    $('.ValidSearch').click(function() {
        /// Suppression des espaces inutiles
        $('#FiltresHistoGrp input[type]').each(function(){
            $(this).val($.trim($(this).val()));
        });
        /// Récupération des valeurs des champs filtres
        var strParams = $('#FiltresHistoGrp').serialize();

saisiesChampsFiltre = strParams; //ESSAI
console.log('saisiesChampsFiltre : ' + saisiesChampsFiltre); //TEST
        
        $.ajax({
            method: "GET",
            url: "/HistoGrp",
            data: strParams + "&page=1",
            dataType: "html",
            beforeSend: function () {
                Masque.removeClass('Hidden');
            }
        })
        .done(function (data) {
            /// On récupère les données que l'on veut mettre à jour (le n° de page et la liste des données)
            var NumPage = $(data).find('#NumPg');
            var NumMaxPages = $(data).find('.NumPage').data('maxnbpages');
            var HistoGroupes = $(data).find('.HistoGroupes');
            /// on remplace les données
            $('#NumPg').text(NumPage.text());
            $('.NumPage').data('maxnbpages', NumMaxPages);      //$('#TESTAVIRER').text(NumMaxPages);//TEST
            $('.HistoGroupes').html(HistoGroupes.children());

            $('i.right').toggleClass('Hidden', (NumMaxPages == 1));
            $('i.left').toggleClass('Hidden', (NumMaxPages == parseInt($('.NumPage').data('maxnbpages'))));

            /// Pour avoir l'entete flottante
            CreateEnteteFlottante();
            /// Pour revenir en haut de liste à chaque chgmnt de page
            $(window).scrollTop(0);

            Highlight(); /// Pour surligner la recherche ds la liste
        })
        .fail(function (jqXHR) {
            DisplayError(jqXHR.responseText); /// Affichage erreur
        });

        
    });




    /// A FACTORISER (existe aussi ds 'RechercheAccords.js' et 'CreationAccords.js') ==> Pour fermeture encart d'erreur s'il existe
    $('body').on('click', '.ErreurRetourAjax .ClosePopin', function() {
        $('.ErreurRetourAjax').addClass('Hidden');
        $('.ErreurRetourAjax .Content').empty();
        Masque.addClass('Hidden');
    });



});



function DatePlusOneDay(dt) {
    tab_dt = (dt.split(/[- //]/));
    result = new Date(tab_dt[2], parseInt(tab_dt[1]) - 1, tab_dt[0]);
    result.setDate(result.getDate() + 1);
    return result;
}

function CreateEnteteFlottante() {
    $('.Enteteliste').clone(true).addClass('clone').prependTo('.HistoGroupes');
}

function Highlight() {
    var valueChampEtbl = $.trim($("#EtablFilter").val());
    if(valueChampEtbl != "") { $(".NomEtb").highlight(valueChampEtbl); }
    var valueChampGrp = $.trim($("#GrpFilter").val());
    if(valueChampGrp != "") {  $(".NomGrp").highlight(valueChampGrp); }
}



/// A FACTORISER (existe aussi ds RechercheAccords.js') ==> Pour affichage de l'erreur dans un encart suite à requete AJAX
function DisplayError(jqXHRresponseText) {
    var Thehtml = $.parseHTML(jqXHRresponseText);
    var html_PgErreur = $(Thehtml).find("#Encart");
    if($('.ErreurRetourAjax').length > 0) {
        $('.ErreurRetourAjax .Content').html(html_PgErreur);
        $('.ErreurRetourAjax').removeClass('Hidden');
    } else {
        $("<div class='ErreurRetourAjax'><i class='fa fa-times ClosePopin'></i><div class='Content'></div></div>").appendTo("body");
        $(".ErreurRetourAjax .Content").html(html_PgErreur);
    }
}