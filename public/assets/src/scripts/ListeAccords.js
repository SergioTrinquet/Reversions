var listeDeroulanteTypeAccord,
    champRechercheAccord = null;
var TxtTooShort,
    TextNoResults,
    NbAccords = null;
var ClnsEnteteliste,
    enteteListe,
    contenuListe,
    lgns = null;
var listeVariables = [];
var Saisie = null;
var ChpsCiblesRecherche = [];
var SaisieMinLength = 3;
var DataLgns = []; // Pas nécessairement en variable globale : Juste pour phase de dev.
var temp_NomColonne = null;
var toggleOrderDirection = false;
var suffixe_asc, 
    suffixe_desc = null;

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



    champRechercheAccord.on('keyup paste cut dragend focus', function() {
        Saisie = $.trim($(this).val());

        /// faire en sorte qu'il y ait une latence avant de lancer la recherche
        if(Saisie.length >= SaisieMinLength) {
            //console.warn("Length : " + Saisie.length + " | Saisie : " + Saisie); //TEST
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

});



function RemoveFilterOnInput() {
    // Retrait attribut marquant les lignes visibles + retrait class qui cache les lignes + retrait highlight
    lgns
        .removeAttr('data-visible')
        .removeClass('Hidden2')
        .find(ChpsCiblesRecherche.join(', '))
        .removeHighlight();
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
    
    // ..On classe dans tous les cas par nom d'accord que l'on ait cliqué sur l'icone de la colonne 'Nom d'accord' ou pas, car quand ordonnancement d'un champ de type 'date', comme plusieurs dates sont en similaires, on classe par la Date en question puis par ordre alphabétique sur le champ 'Nom de l'accord'...
    $.each(lgns, function () {
        var ThisLgn = $(this);
        DataClnToOrder = $.trim(ThisLgn.find('[data-cln="ClnNomAccord"]').text()).toUpperCase();
        DataLgns.push({ Data_ClnToOrder: DataClnToOrder, DOM_Lgn: ThisLgn });
        DataClnToOrder = "";
    });

    // Si classement par date...
    if(NomColonne !== 'ClnNomAccord') {
        // ..On classe d'abord par nom d'accord...
        DataLgns.sort(function (a, b) { return (a.Data_ClnToOrder > b.Data_ClnToOrder) ? 1 : ((b.Data_ClnToOrder > a.Data_ClnToOrder) ? -1 : 0); }); /// Classement du premier au dernier

        // ...Puis par la date en question
        var DataLgns_TEMPO = [];
        $.each(DataLgns, function (i, el) {
            DataClnToOrder = $(el.DOM_Lgn).find('[data-cln="' + NomColonne + '"]').attr('data-datetoorder');
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

    ClassLastLgn(contenuListe.find('.Lgn'));//
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
    lignes.removeClass('lastLgn').not('.Hidden, .Hidden2').last().addClass('lastLgn');
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