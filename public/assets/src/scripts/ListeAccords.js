var listeDeroulanteTypeAccord = null,
    champRechercheAccord = null;
var TxtTooShort = null,
    TextNoResults = null,
    NbAccords = null;
var ClnsEnteteliste = null,
    enteteListe = null,
    contenuListe = null,
    lgns = null;
var listeVariables = [];
var Saisie = null;
var ChpsCiblesRecherche = [];
var SaisieMinLength = 3;
var DataLgns = []; // Pas nécessairement en variable globale : Juste pour phase de dev.
var temp_NomColonne = null;
var toggleOrderDirection = false;
var suffixe_asc = null, 
    suffixe_desc = null;
var MasqueEtLoader = null;
var rgx = null;

$(function () {  

    /// Affectation variables globales
    listeDeroulanteTypeAccord = $('#SelectTypeAccord');
    champRechercheAccord = $('#SearchNomAccord');
    enteteListe = $('.listeDesAccords .Enteteliste');
    contenuListe = $('.listeDesAccords .ContenuListe');
    CreateEnteteFlottante(); // Pour avoir l'entete flottante
    ClnsEnteteliste = $('.listeDesAccords .Enteteliste > div');
    lgns = contenuListe.find('.Lgn');
    TxtTooShort = $('#TxtTooShort');
    TextNoResults = $('#TextNoResults');
    NbAccords = $('#NbAccords');
    MasqueEtLoader = $('.Masque, .WrapLoader');
    rgx = /(^\d+[.,]?\d+$)|(^\d+$)/;

    var lgnsRevNonValidee = lgns.find('.RevValidee.non').closest('.Lgn'); 
    var lgnsRevValidee = lgns.find('.RevValidee.oui').closest('.Lgn');

    var lgnsRevValideeNonReglee = lgnsRevValidee.find('.RevReglee.non').closest('.Lgn');
    var lgnsRevValideeNonRegleeContraire = lgns.not(lgnsRevValideeNonReglee);

    var lgnsRevNonReglee = lgns.find('.RevReglee.non').closest('.Lgn');
    var lgnsRevReglee = lgns.find('.RevReglee.oui').closest('.Lgn');

    listeVariables = [
        {value: "All", variable: lgns},
        {value: "PasValid", variable: lgnsRevNonValidee},
        {value: "PasReglee", variable: lgnsRevValideeNonReglee},
        {value: "Reglee", variable: lgnsRevReglee}
    ];

    ChpsCiblesRecherche = ['.LienAccord', '.Nom_Grp']; // liste des champs sur lesquels se fait la recherche dans le DOM à partir du champ de saisie

    // Pour les icones
    suffixe_asc = "-asc";
    suffixe_desc = "-desc";

    CountAccordsVisibles(); // Compte des accords
    GetCountTypeAccords(); // Pour intégrer le nbr d'accords dans la liste déroulante qui sert à filtrer
    TxtTooShort.find('span').text(SaisieMinLength); // pour signaler nb de caractères min. ds msg sous moteur de recherche


    /// Evenement sur liste déroulante filtre
    var ValOptionSelected = null;
    listeDeroulanteTypeAccord.change(function() {
        ValOptionSelected = $(this).find('option:selected').val();

        switch(ValOptionSelected){
            case "All" : 
                lgns.removeClass('Hidden');
                break;
            case "PasValid" :
                ToggleLgns(lgnsRevValidee, lgnsRevNonValidee);
                break;
            case "PasReglee" : 
                ToggleLgns(lgnsRevValideeNonRegleeContraire, lgnsRevValideeNonReglee);
                break;
            case "Reglee" : 
                ToggleLgns(lgnsRevNonReglee, lgnsRevReglee);
                break;
            default:
                console.warn("Erreur JS : Pas de value pour le type d'accord sélectionné dans la liste déroulante !");
        }

        ClassLastLgn(lgns); // Pour retirer les pointillés qui délimitent chaques lignes sur la dernière ligne

        // Compte des accords après filtrage
        CountAccordsVisibles();
    });



    //champRechercheAccord.on('keyup paste cut dragend focus', function() {
    champRechercheAccord.on('input', function() {
        Saisie = $.trim($(this).val());

        /// faire en sorte qu'il y ait une latence avant de lancer la recherche
        if(Saisie.length >= SaisieMinLength) {
            console.warn("Length : " + Saisie.length + " | Saisie : " + Saisie); //TEST
            RemoveFilterOnInput();
            AddFilterOnInput(Saisie);
        } else {
            RemoveFilterOnInput();
        }
        ClassLastLgn(lgns); //

        GestionMsgsInfo(Saisie); // Gestion messages d'info en haut de la liste des accords
        CountAccordsVisibles(); // Compte des accords après filtrage
    });


    $('#DeleteValueSearchNomAccord').on('click', function() {
        champRechercheAccord.val('');
        Saisie = "";
        RemoveFilterOnInput();
        ClassLastLgn(lgns); //
        GestionMsgsInfo(Saisie); // Gestion messages d'info en haut de la liste des accords
        CountAccordsVisibles(); // Compte des accords après filtrage
    });


    // Click sur icone de classement dans l'entete des champs
    $('.IconeClassmt').click(function () {
        // Identification de l'entete sur laquelle on a cliqué pour ordonner ses datas
        TriColonne($(this).closest('.Enteteliste > div').attr('id'));
    });



    // Pour entrer une date de validation de réversion, 
    // et de réglement de réversion
    $(".listeDesAccords .ContenuListe").on("click", ".Bt_Change.Date:not(.Disabled)", function() {
        if(!$('.CellRev input[type="text"]').length >= 1) { // Une seule saisie possible à la fois...
            try {
                var el = $(this);

                var typeInfoRev = el.siblings().attr("data-cln");
                var champRevReglee = null;
                if(typeInfoRev === "ClnRevValidee") {  champRevReglee = false;  } 
                else if(typeInfoRev === "ClnRevReglee") { champRevReglee = true; } 
                else { throw "Erreur!"; }

                el
                .parent()
                .addClass('Hidden')
                .after("\
                    <span>\
                        <input type='text' placeholder='Date de " + (champRevReglee === false ? "validation" : "règlement")  + "' readonly='readonly' />\
                        <i class='fa fa-times Close'></i>\
                    </span>\
                ");

                // Appel fct° de génération de calendrier
                var newInput = el.closest('.CellRev').find('input[type="text"]');
                var dateAutreChamp = el.closest('.CellRev').siblings('.CellRev').find("[data-datetoorder]").attr("data-datetoorder");
                ParamsDatePickerSolo(newInput, champRevReglee, dateAutreChamp, "-24m", "+24m");
                
                $(".Bt_Change").addClass('Disabled'); // Désactivation des icones

            } catch (error) {
                alert(error); //TEST
            }   
        } 
    });
    // Pour fermer le champ de saisie de date de validation de réversion
    $(".listeDesAccords .ContenuListe").on("click", ".CellRev input[type='text'] ~ i.Close", function() {
        $(this).closest('.CellRev').find('.DefaultDisplay').removeClass('Hidden').siblings().remove();
        $(".Bt_Change").removeClass('Disabled'); // Activation des icones
    });
    // Pour modifier la somme versée
    $(".listeDesAccords .ContenuListe").on("click", ".Bt_Change.MontantRevCA:not(.Disabled)", function() {
        var el = $(this);
        var somme = el.siblings().text();
        el
        .parent()
        .addClass('Hidden')
        .after("\
            <span class='sumField'>\
                <input type='text' data-inputsum='true' placeholder='" + somme + "' /><span class='BtValidSomme' data-active='false'><i class='fa fa-check'></i></span>\
                <i class='fa fa-times Close'></i>\
            </span>\
        ");

        $(".Bt_Change").addClass('Disabled'); // Désactivation des icones
    });

    // Controle de saisie sur saisie somme versée
    //$(".listeDesAccords .ContenuListe").on("keyup paste cut dragend focus", "input[data-inputsum]", function() {
    $(".listeDesAccords .ContenuListe").on("input", "input[data-inputsum]", function() {
        MskInputOnlyDigits($(this));
    });

    // Validation de la somme versée
    $(".listeDesAccords .ContenuListe").on("click", ".BtValidSomme[data-active='true']", function() {
        var r = confirm("Confirmez le nouveau montant saisi svp.");
        if(r) {
            var el = $(this);
            var idAccordReversion = el.closest("[data-accordreversionid]").attr("data-accordreversionid"); ;
            var somme = $('input[data-inputsum]').val().replace(',', '.').trim();

            if(rgx.test(somme)) {
                $.ajax({
                    method: "POST",
                    url: "/ListeAccords/changeAmount/" + idAccordReversion,
                    dataType: "html", // Retourne du html
                    data: {"somme": somme},
                    beforeSend: function() { MasqueEtLoader.removeClass('Hidden'); }
                }).done(function(data) {
                    //console.log(data); //TEST
                    el.closest('[data-accordreversionid="' + idAccordReversion + '"]').replaceWith(data);
                    $(".Bt_Change").removeClass('Disabled'); // Activation des icones
                    
                }).fail(function(err) {
                    console.error(err);
                    DisplayError_NEW(err.responseText);
                }).always(function() {
                    MasqueEtLoader.addClass('Hidden');
                });
            } else {
                console.error("La valeur entrée dans le champ 'somme versée' n'est pas un numérique (entier ou décimal) !!");
            }
        }
    });


});


// Check si valeur saisie ds l'input est correcte : Seulement des chiffres (décimales acceptées)
function MskInputOnlyDigits(tagInput) {
    var BtValidSomme = $('.BtValidSomme');
    if(rgx.test(tagInput.val())) { // Seulement chiffres avec un point ou une virgule mais pas en début ni en fin    
        tagInput.removeClass('erreur').addClass('valid');
        BtValidSomme.attr('data-active', 'true');
    } else {
        tagInput.removeClass('valid').addClass('erreur');
        BtValidSomme.attr('data-active', 'false');
    }
}


// Qd saisie date ds calendrier : Ecriture dans bdd et rafraichissement de l'affichage sur ligne accord concernée
function closeDatePicker(el, isReglement, selectedDate) {
    var idAccordReversion = el.closest("[data-accordreversionid]").attr("data-accordreversionid");
    $.ajax({
        method: "POST",
        url: "/ListeAccords/setDate/" + (isReglement === false ? "validation" : "reglement") + "/" + idAccordReversion,
        dataType: "html", // Retourne du html
        data: {"date": selectedDate},
        beforeSend: function () { MasqueEtLoader.removeClass('Hidden'); }
    }).done(function(data) {
        el.closest('[data-accordreversionid="' + idAccordReversion + '"]').replaceWith(data);
        $(".Bt_Change").removeClass('Disabled'); // Activation des icones
    }).fail(function(err) {
        console.error(err);
        DisplayError_NEW(err.responseText);
    }).always(function() {
        MasqueEtLoader.addClass('Hidden');
    });
}



function RemoveFilterOnInput() {
    // Retrait attribut marquant les lignes visibles + retrait class qui cache les lignes + retrait highlight
    lgns
        .removeAttr('data-visible')
        .removeClass('Hidden2')
        .find(ChpsCiblesRecherche.join(', '))
        //.removeHighlight(); // Version originale mise en commentaire car bug juste avec IE
        .removeHighlight_V2(); // Version locale
}

function AddFilterOnInput(Saisie) {
    // On surligne la partie recherchée + on marque les lignes qui on du texte surligné...
    lgns
        .find(ChpsCiblesRecherche.join(', '))
        .highlight(Saisie)
        .find('.highlight')
        .closest('.Lgn')
        .attr('data-visible', 'true');
    // ...pour faire disparaitre celles qui n'en ont pas
    lgns
        .not('[data-visible]')
        .addClass('Hidden2');
}


function TriColonne(NomColonne) {
    var NomCln = $('#' + NomColonne);
    
    // Mise en évidence de la colonne qui va être triée
    ClnsEnteteliste.removeClass('ColonneOrdonnee');
    NomCln.addClass('ColonneOrdonnee');

    // Création d'un tableau d'objets avec comme une des propriétés les valeurs de la colonne à trier
    DataLgns = [];
    var DataClnToOrder = "";
    
    // ..On classe dans tous les cas par nom d'accord que l'on ait cliqué sur l'icone de la colonne 'Nom d'accord' ou pas, car quand ordonnancement d'un champ de type 'date', comme plusieurs dates sont similaires, on classe par la Date en question puis par ordre alphabétique sur le champ 'Nom de l'accord'...
    $.each(lgns, function () {
        var ThisLgn = $(this);
        DataClnToOrder = $.trim(ThisLgn.find('[data-cln="ClnNomAccord"]').text()).toUpperCase();
        DataLgns.push({ Data_ClnToOrder: DataClnToOrder, DOM_Lgn: ThisLgn });
        DataClnToOrder = "";
    });

    // ..On classe d'abord par nom d'accord...
    DataLgns.sort(function (a, b) { return (a.Data_ClnToOrder > b.Data_ClnToOrder) ? 1 : ((b.Data_ClnToOrder > a.Data_ClnToOrder) ? -1 : 0); }); /// Classement du premier au dernier

    // Si classement par date...
    if(NomColonne !== 'ClnNomAccord') {

        var data = ($('#' + NomColonne).is("[data-isdate]") ? "date" : "num");

        // ...Puis par la date en question
        var DataLgns_TEMPO = [];
        $.each(DataLgns, function (i, el) {
            if(data === "num") { 
                DataClnToOrder = parseFloat($.trim($(el.DOM_Lgn).find('[data-cln="' + NomColonne + '"]').text())); }
            else if(data === "date") {
                DataClnToOrder = $(el.DOM_Lgn).find('[data-cln="' + NomColonne + '"]').attr('data-datetoorder');
            }
            DataLgns_TEMPO.push({ Data_ClnToOrder: DataClnToOrder, DOM_Lgn: el.DOM_Lgn });
            DataClnToOrder = "";
            //console.log(ThisLgn.find('[data-cln="ClnNomAccord"]').text() + " | " + ThisLgn.find('[data-cln="' + NomColonne + '"]').attr('data-datetoorder'));
        });

        DataLgns = DataLgns_TEMPO;
    }

    // Pour déterminer si on ordonne de façon ascendante ou descendante
    toggleOrderDirection = ((temp_NomColonne === NomColonne) && (toggleOrderDirection == false)) ? true : false;
    temp_NomColonne = NomColonne;
    
    if(toggleOrderDirection) { // Classement descendant
        DataLgns.sort(function (a, b) { return (a.Data_ClnToOrder > b.Data_ClnToOrder) ? -1 : ((b.Data_ClnToOrder > a.Data_ClnToOrder) ? 1 : 0); }); /// Classement du dernier au premier
    } else { // Classement ascendant
        DataLgns.sort(function (a, b) { return (a.Data_ClnToOrder > b.Data_ClnToOrder) ? 1 : ((b.Data_ClnToOrder > a.Data_ClnToOrder) ? -1 : 0); }); /// Classement du premier au dernier
    }

    IconesOrder(NomCln); // Gestion des icones

    // On réinitialise et on alimente l'élément DOM qui contient la liste des accords 
    contenuListe.empty();
    $.each(DataLgns, function (key, val) {
        contenuListe.append(val.DOM_Lgn);
    });

    ClassLastLgn(contenuListe.find('.Lgn'));
}


function IconesOrder(NomCln) {
    /// Partie 1 : On met ttes les icones des entetes -sauf celle sur laquelle on clique- en ascendant
    $(ClnsEnteteliste.not('#' + NomCln.attr('id')).find('i.fa[class$="-desc"]')).each(function(i, el) { 
       var newstringClass = $(el).attr('class').replace(suffixe_desc, suffixe_asc); 
       //console.log($(el).closest('div').attr('id') + " | newstringClass : " + newstringClass); //TEST
       $(el).attr('class', newstringClass);
    });

    /// partie 2 : On toggle l'icone de la colonne en question en changeant la class
    var I_NomCln = NomCln.find('i.fa');
    var stringClass = I_NomCln.attr('class');
    if(toggleOrderDirection) {
        stringClass = stringClass.replace(suffixe_asc, suffixe_desc);
    } else {
        stringClass = stringClass.replace(suffixe_desc, suffixe_asc);
    }
    I_NomCln.attr('class', stringClass);
}

function ToggleLgns(lgnsToHide, lgnsToDisplay) {
    lgnsToHide.addClass('Hidden');
    lgnsToDisplay.removeClass('Hidden');
}

function ClassLastLgn(lignes) {
    lignes
        .removeClass('lastLgn')
        .not('.Hidden, .Hidden2')
        .last()
        .addClass('lastLgn');
}

function GetCountTypeAccords() {
    listeDeroulanteTypeAccord.find('option').each(function(i, el) {
        el = $(el);
        var valOption = el.val();
        listeVariables.forEach(function(obj) {
            if(obj.value === valOption) {
                el.text(el.text() + " (" + obj.variable.length + " acc.)");
            }
        });
    });
}

function CreateEnteteFlottante() {
    enteteListe.clone(true).addClass('clone').prependTo('.ListeEtbl');  
}

function CountAccordsVisibles() {
    NbAccords.find('span').text(lgns.not('.Hidden, .Hidden2').length);
}


function GestionMsgsInfo(Saisie) {
    TxtTooShort.addClass('Hidden'); // Par défaut, retrait du msg
    if(Saisie.length >= SaisieMinLength) {
        // Gestion de l'affichage du msg 'Pas de résultats' : Si recherche > 3 caractères ne correspond à rien, affichage msg
        if(lgns.is('[data-visible]') == false) { 
            TextNoResults.removeClass('Hidden').find('span').text(Saisie);
        } else {
            TextNoResults.addClass('Hidden').find('span').text('');
        }    
    } else {
        // Gestion de l'affichage du msg 'Pas de résultats' : On le fait disparaitre
        TextNoResults.addClass('Hidden'); 
        // Gestion de l'affichage du msg 'texte trop court' : On le fait apparaitre si saisi > 0 et < à 3 caractères
        if(Saisie.length > 0) { TxtTooShort.removeClass('Hidden'); }
    }
}



// Fonction créée pour palier à fct° 'removeHighlight' de 'highlight.js' qui ne fonctionne qu'au 1er appel avec IE.
// De nouveaux noeuds sont créés à l'appel de cette fct° sous IE contrairement aux autres navigateurs, donc ne fonctionne plus aux appels suivants.
jQuery.fn.removeHighlight_V2 = function() {
    return this.find("span.highlight").each(function() {
        var PN = $(this).parent();
        $(PN).text(PN.text());
    }).end();
};