var listeDeroulanteTypeAccord,
    champRechercheAccord = null;
var TxtTooShort,
    TextNoResults,
    NbAccords = null;
var lgns = null;
var listeVariables = [];
var Saisie = null;
var ChpsCiblesRecherche = [];
var SaisieMinLength = 3;

$(function () {  

    /// Affectation variables globales
    listeDeroulanteTypeAccord = $('#SelectTypeAccord');
    champRechercheAccord = $('#SearchNomAccord');
    lgns = $('.listeDesAccords .ContenuListe .Lgn');
    TxtTooShort = $('#TxtTooShort');
    TextNoResults = $('#TextNoResults');
    NbAccords = $('#NbAccords');

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

    
    CountAccordsVisibles(); // Compte des accords
    GetCountTypeAccords(); // Pour intégrer le nbr d'accords dans la liste déroulante qui sert à filtrer
    $('#TxtTooShort > span').text(SaisieMinLength); // pour signaler nb de caractères min. ds msg sous moteur de recherche
    
    CreateEnteteFlottante(); // Pour avoir l'entete flottante

    /// Evenement sur liste déroulante filtre
    var ValOptionSelected = null;
    listeDeroulanteTypeAccord.change(function() {
        ValOptionSelected = $(this).find('option:selected').val();

        switch(ValOptionSelected){
            case "All" : 
                lgns.removeClass('Hidden lastLgn');
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

        // Compte des accords après filtrage
        CountAccordsVisibles();
    });


    champRechercheAccord.on('keyup paste cut dragend focus', function() {
        Saisie = $.trim($(this).val());

        /// faire en sorte qu'il y ait une latence avant de lancer la recherche
        if(Saisie.length >= SaisieMinLength) {
            console.warn("Length : " + Saisie.length + " | Saisie : " + Saisie); //TEST
            
            lgns.find(ChpsCiblesRecherche.join(', ')).removeHighlight().highlight(Saisie); // Pour surligner la partie recherchée

            // Retrait du marqueur 'data-visible' sur ttes les lignes (réinitialisation) +
            // Marquage des lignes qui ont la class 'highlight' avec l'attribut 'data-visible' + retrait class qui masque les lignes où il y a les class'highlight'
            lgns
                .removeAttr('data-visible')
                .find('.highlight').closest('.Lgn').attr('data-visible', 'true').removeClass('Hidden2'); // On marque les lignes qui on du texte surligné...
            
            //lgns.find(ChpsCiblesRecherche.join(', ')).removeHighlight().highlight(Saisie).closest('.Lgn').attr('data-visible', 'true');

            lgns.not('[data-visible]').addClass('Hidden2'); // ...Et on fait disparaitre celles qui n'en ont pas

        } else {

            lgns.find(ChpsCiblesRecherche.join(', ')).removeHighlight();
            lgns.removeClass('Hidden2').removeAttr('data-visible');

        }

        GestionMsgsInfo(Saisie); // Gestion messages d'info en haut de la liste des accords
        CountAccordsVisibles(); // Compte des accords après filtrage
    });


    $('#DeleteValueSearchNomAccord').on('click', function() {
        champRechercheAccord.val('');
        Saisie = "";
        
        lgns.removeAttr('data-visible').removeClass('Hidden2').find(ChpsCiblesRecherche.join(', ')).removeHighlight();

        GestionMsgsInfo(Saisie); // Gestion messages d'info en haut de la liste des accords
        CountAccordsVisibles(); // Compte des accords après filtrage
    });




    /// => EN COURS au 09/17/18 
    ///=== Lorsque click sur icone de classement dans l'entete des champs ===///
    $('.IconeClassmt').click(function () {
        /// Identification de l'entete sur laquelle on a cliqué pour ordonner ses datas
        TriColonne($(this).closest('.Enteteliste > div').attr('id'));
    });



});


/// => EN COURS au 09/17/18
function TriColonne(NomColonne) {
    /// Mise en évidence du libellé de la colonne qui va être triée
    $('.Enteteliste *').removeClass('ColonneOrdonnee');
    $('#' + NomColonne).addClass('ColonneOrdonnee');

    /// Création d'un tableau d'objets avec comme une des propriétés les valeurs de la colonne à trier
    participantsClasses = [];
}





function ToggleLgns(lgnsToHide, lgnsToDisplay) {
    lgnsToHide.addClass('Hidden').removeClass('lastLgn');
    lgnsToDisplay.removeClass('Hidden').last().addClass('lastLgn');
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
    $('.Enteteliste').clone(true).addClass('clone').prependTo('.ListeEtbl');  
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