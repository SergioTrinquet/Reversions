var Modif_LgnAccord_AccordSection = -1;
var Modif_LgnAccord_EtbSection = -1;

var InfosLgnModifiee = Init_InfosLgnModifiee();

var lastSaisie = null;
var ConteneurListe = null;

var fnrsSelected = [];
var etbsSelected = [];

var TEMP_fnrsSelected = [];

var InterdictionEcriture = false;

/* 'let' est de l'ES6 (version récente de JS) qui n'est pas pris en compte par certaines librairies pour GULP (en l'occurence ici problème avec gulp-uglify qui bugge). La solution serait de transformer via babel par exemple, l'ES6 en une version antérieure avnt "d'uglifier" */
/* let Masque = null;
let MasqueEtLoader = null;
let Id_Accord = "";
let SaisieMinLength = 3; */
var Masque = null;
var MasqueEtLoader = null;
var Id_Accord = "";
var SaisieMinLength = 3;

var AC_content = null;

var FlagActivePopin = false;



var Pool_xhr = [];
var Pool_rech = [];
///--- Pour gérer éxecution de la recherche ou pas en fonction de la saisie + l'affichage des textes d'infos ---///
function SearchAccord(SaisieAddAccord) {
    if(SaisieAddAccord.length >= SaisieMinLength) {
        
        //console.log('SaisieAddAccord : ' + SaisieAddAccord + ' | lastSaisie : ' + lastSaisie); //TEST
        if(SaisieAddAccord != lastSaisie) { /// pour éviter appel ajax inutile
            SearchAccordQuery(SaisieAddAccord);
        } else if(SaisieAddAccord == lastSaisie && AC_content.html() != '') {
            $('#Autocomplete.Hidden').removeClass('Hidden');
        }
        lastSaisie = SaisieAddAccord;

        $('#TxtTooShort').addClass('Hidden'); // Nouvelle version au 03/01/18

    } else {
        //$('#Autocomplete').addClass('Hidden'); // Ancienne version au 03/01/18
        $('#Autocomplete, #TextNoResults').addClass('Hidden'); // Nouvelle version au 03/01/18
        $('#TxtTooShort').toggleClass('Hidden', (SaisieAddAccord.length == 0)); // Nouvelle version au 03/01/18
    }
}



$(function () {         

    ///--- Récupération des droits sur cette page ---///
    InterdictionEcriture = ($('#EncartInfoUser #Role').text() == 'ReversionsRechercheAccordLecture' ? true : false);

    ///--- Pour avoir l'entete flottante ---///
    CreateEnteteFlottante();

    ///--- Création de la ligne 'Accord' flottante ---///
    ConteneurListe = $('.ListeEtbl > div:not(.Enteteliste)').offset().top;     

    ///--- Focus sur ligne sélectionnée (uniquement qd recherche sur un établissement) ---///
    FocusLgn();


    ///--- Affectation variables globales ---///
    Masque = $('.Masque');
    MasqueEtLoader = $('.Masque, .WrapLoader');
    Id_Accord = $('.Lgn_Accord').data('numaccord');
    AC_content = $('#AC_content');

    /// 
    $('#TxtTooShort > span').text(SaisieMinLength);

    ///--- Moteur de recherche ---///
    var SaisieAddAccord = null;
    $('#SearchEtabl').on('keyup paste cut dragend focus', function() {
        SaisieAddAccord = $.trim($(this).val());

        ///--- Pour éviter des appels AJAX à chaque frappe donc trop nombreux ---///  
        $(Pool_rech).each(function (idx, el) { /*console.log(el);*/ clearTimeout(el); }); /// On vide le pool
        Pool_rech = []; 
        Pool_rech.push(setTimeout(function(){ SearchAccord(SaisieAddAccord); }, 300)); /// Une fois le pool vide, ajout de la fonction qui fait l'appel AJAX et qui se déclenche au bout de X millisec.
    });

    /// Pour cacher l'autocomplete
    $('body').click(function (event) {
        var $target = $(event.target);
        if (!($target.is($('#Autocomplete, #Autocomplete *, #SearchEtabl')))) {/// Si click sur un element de la pg autre que le menu déroulant et ses éléments descendants ET autre que la zone de click 'Survoler ici pour trouver une info' pour déplier le menu
            //$target.css("background-color", "red");//TEST
            $("#Autocomplete").addClass('Hidden');
        }
    });
    ///--- Fin moteur de recherche ---///



    ///--- Modification de la ligne Accord ou bien d'une ligne établissement de l'accord ---///
    $('.ListeEtbl').on('click', '.Bt_Modif:not(.Disabled)', Mdf);

    ///--- Suppression d'une ligne établissement d'un accord ou bien de l'accord lui-même ---///
    $('.ListeEtbl').on('click', '.Bt_Suppr:not(.Disabled)', Suppr);

    ///--- Quand Validation des modif sur une ligne (ligne Accord ou Etablissement d'un accord) ---///
    $('.ListeEtbl').on('click', '.Bt_Valid:not(.Disabled)', ValidModifs);

    ///--- Quand Annulation des modif sur une ligne ---///
    $('.ListeEtbl').on('click', '.Bt_Undo', Undo);
    
    ///--- Pour ajouter un établissement à l'accord déjà créé ---///
    $('.ListeEtbl').on('click', '.Bt_Add:not(.Disabled)', Add);    



    /// Qd sélection avec liste déroulante du Taux de réversion
    $('.ListeEtbl').on('change', '.LstAdh_saisieTypeTx', function() {
        LstDer = $(this);
        if(LstDer.val() == 1) { /// si sélection Tx fixe...
            LstDer.next('.LstAdh_SaisieTx').removeClass('Hidden');   
            $('.LgnAccordSection .LstAdh_SaisieTxAdd, .LgnEtbSection .LstAdh_TxAdd, .NoEDI').removeClass('Hidden');    
        } else { /// si sélection Tx variable...
            LstDer.next('.LstAdh_SaisieTx').addClass('Hidden');    
            $('.LgnAccordSection .LstAdh_SaisieTxAdd, .LgnEtbSection .LstAdh_TxAdd, .NoEDI').addClass('Hidden');    
        }
    });

    /// Contrôle de saisie sur champs 'Taux'
    $('.ListeEtbl').on('keyup paste cut dragend focus', '.ChpCPDest, .LstAdh_SaisieTx > input[type="text"], .LstAdh_SaisieTxAdd > input[type="text"]', function() {
        /// Pour n'autoriser que la saisie des chiffres
        var Ceci = $(this);
        Ceci.val(Ceci.val().replace(/\D/g,''));
        /// Pour ne pas saisir + de 100%
        if(Ceci.val() > 100 && (Ceci.hasClass('ChpCPDest') == false)) { Ceci.val(100); }
    });


    ///--- Partie Popin 'Définir les marchés' ---///
    /// Gestion bouton pour ouvrir et charger data popin d'exclusion des fournisseurs sur lignes Etablissement
    $('.ListeEtbl').on('click', '.LgnEtbSection.ModifEnCours .Bt_gestionFnrs', function() {

        if(FlagActivePopin == false) { /// Flag pour ne pas avoir à faire un appel AJAX si plusieurs clics de suite sur même ligne Etb
            FlagActivePopin = true;

            /// Copie dans entete popin du nom et groupe de l'établissement
            var html = GetDataEntetePopin(this);
            $('.Popin_ExclusionFnrs .TopPart').html('<div class="TxtIntro">Définir les marchés :</div>' + html);

            var Id_Etb = $(this).closest('.LgnEtbSection.ModifEnCours').data('idetablismt');
            /// Initialisation des données propres à l'établissement dans la popin
            GetDataPopinFnrsAexclure(Id_Accord, Id_Etb);

        } else { 
            MasqueEtLoader.removeClass('Hidden');
            $('.Popin_ExclusionFnrs').addClass('Display'); 
        }
    });

    /// Lorsque click sur une checkbox Catalogue
    $('body').on('click', '.Popin_ExclusionFnrs #LstCats input[type="checkbox"]:not(:disabled)', function() {
        var ThisChbx = $(this);

        /// Identification visuelle du cat. sélectionné
        AddClassSelected(ThisChbx); 

        /// Coche sur fnrs qui appartiennent au cat. sélectionné + alimentation du tableau stockant les fnrs sélectionnés à passer coté serveur
        var goodChbxs = $('.Popin_ExclusionFnrs #LstFnrs input[data-fnridcat="' + ThisChbx.attr('id') + '"]:not(:disabled)');
        SelectionFnrsPopin(goodChbxs, (ThisChbx.is(':checked') ? true : false));
    });

    /// Lorsque click sur une checkbox Fnr
    $('body').on('click', '.Popin_ExclusionFnrs #LstFnrs input[type="checkbox"]:not(:disabled)', function() {
        var ThisChbx = $(this);
        SelectionFnrsPopin(ThisChbx, (ThisChbx.is(':checked') ? true : false));
    });

    /// Boutons Annulation du popin ou fermeture en haut à droite de la popin
    $('#AnnulationSelectionFnrs, .Popin_ExclusionFnrs .ClosePopin').click(function() {
        var r = confirm("En cas de confirmation, toutes vos saisies dans cet encart\ndepuis le début de la phase de modification de la ligne établissement\nseront perdues.");
        if(r) {
            /* VO : Ancienne version au 19/12/17 */
            /*fnrsSelected = [];
            /// On alimente l'objet InfosLgnModifiee
            InfosLgnModifiee.ExclusionFnrs = fnrsSelected;
            InfosLgnModifiee.ModificationExclusionFnrs = false;
            UnselectCheckboxes('.Popin_ExclusionFnrs');
            ClosePopin('.Popin_ExclusionFnrs');
            */

            /* V1 */
            InfosLgnModifiee.ExclusionFnrs = [];
            InfosLgnModifiee.ModificationExclusionFnrs = false;
            
            ///// Si annulation, on remet les checkboxs des fnrs déjà enregistrés avant cette phase de modif (ceux qui sont déjà enregistrés ds la bdd)

            /// Réinitialisation
            fnrsSelected = []; /// on vide le tableau listant les fnrs exclus
            UnselectCheckboxes('.Popin_ExclusionFnrs'); /// On désélectionne ttes les checkboxs
            
            TEMP_fnrsSelected.forEach(function(el){ fnrsSelected.push(el) }); /// Réaffectation du tableau listant des fnrs exclus

            /// On 'marque' les bonnes checkboxs
            fnrsSelected.forEach(function(el) {
                $('.Popin_ExclusionFnrs #LstFnrs input[id="' + el + '"]').attr('data-tempFnrsSelected', 'true'); // Le data-* sert juste pour marquer/identifier les bons checkboxs, on le supprime juste après
            });
            var chbxs = $('.Popin_ExclusionFnrs #LstFnrs input[data-tempFnrsSelected]');
            //console.log(chbxs); //TEST
            SelectionFnrsPopin(chbxs, true); /// On resélectionne les bonnes et on affecte le tableau
            $('.Popin_ExclusionFnrs #LstFnrs input[data-tempFnrsSelected]').removeAttr('data-tempFnrsSelected'); /// On supprime le marqueur qui ne servait qu'à créer la variable 'chbxs' ci-dessus
            
            ClosePopin('.Popin_ExclusionFnrs');
            /* Fin V1 */
        }
    });

    /// Boutons Validation du popin
    $('#ValidationSelectionFnrs').click(function() {
        /// On alimente l'objet InfosLgnModifiee
        InfosLgnModifiee.ExclusionFnrs = fnrsSelected;
        InfosLgnModifiee.ModificationExclusionFnrs = true;
        /// Fermeture popin
        ClosePopin('.Popin_ExclusionFnrs');
    });
    ///--- Fin partie Popin 'Définir les marchés' ---///



    ///--- Partie Popin 'Ajout d'établissement' ---///
    /// lorsque click sur une checkbox Etablissement
    $('body').on('click', '.Popin_AjoutEtablissement input[type="checkbox"]:not(:disabled)', function() {
        var ThisChbx = $(this);
        SelectionEtbsPopin(ThisChbx);
    });

    /// Boutons Annulation du popin ou fermeture en haut à droite de la popin
    $('#AnnulationAjoutEtbs, .Popin_AjoutEtablissement .ClosePopin').click(function() {
        var r = confirm("En cas de confirmation, toutes vos saisies seront perdues.");
        if(r) {
            etbsSelected = []; /// On vide le tableau répertoriant les etbs sélectionnés
            UnselectCheckboxes('.Popin_AjoutEtablissement'); /// Déselection des checkbox
            ClosePopin('.Popin_AjoutEtablissement'); /// Fermeture popin
            ReinitBtFiltresEtbsDispos(); /// Réinitialisation bouton de filtre sur etbs
        }
    });

    /// Boutons Validation de la popin
    $('#ValidationAjoutEtbs').click(function() {
        
        ClosePopin('.Popin_AjoutEtablissement'); /// Fermeture popin impérativement AVANT appel AJAX sinon risque de disparition du masque
        ReinitBtFiltresEtbsDispos(); /// Réinitialisation bouton de filtre sur etbs
        
        /// Appel AJAX pour ajouter etb(s) via proc. stock.
        RecordEtablissements(Id_Accord);
    });

    /// Bouton pour filtrer sur les établissements dispos ou pas
    $('#BtFiltreEtbsDispos > span').click(function() {
        $('#LstAjoutEtbs input[disabled="disabled"]').closest('li').toggleClass('Hidden');
        $('#BtFiltreEtbsDispos span[data-label], #BtFiltreEtbsDispos i.NoFilter').toggleClass('Hidden');
    });
    ///--- Fin partie Popin 'Ajout d'établissement' ---///




    ///--- Partie Popin 'Fournisseurs exclus' (Uniquement accessible en mode lecture) ---///
    /// Gestion bouton pour ouvrir et charger data popin d'exclusion des fournisseurs sur lignes Etablissement
    $('.ListeEtbl').on('click', '.LgnEtbSection .Bt_FnrsExclus:not(.Disabled)', function() {
        $('.LgnEtbSection .Bt_FnrsExclus').addClass('Disabled'); /// Désactivation de tous les boutons '.Bt_FnrsExclus'...
        $(this).removeClass('Disabled'); ///...sauf celui sur lequel l'utilisateur a cliqué

        /// Copie dans entete popin du nom et groupe de l'établissement
        var html = GetDataEntetePopin(this);
        $('.Popin_FnrsExclus .TopPart').html('<div class="TxtIntro">Fournisseurs exclus pour :</div>' + html);
        
        //var Id_Accord = $('.Lgn_Accord').data('numaccord');
        var Id_Etb = $(this).closest('.LgnEtbSection').data('idetablismt');
        /// Initialisation des données propres à l'établissement dans la popin
        GetDataPopinFnrsExclus(Id_Accord, Id_Etb);
    });

    /// Boutons Annulation du popin
    $('.Popin_FnrsExclus .ClosePopin').click(function() {
        ClosePopin('.Popin_FnrsExclus'); /// Fermeture popin
        $('.LgnEtbSection .Bt_FnrsExclus').removeClass('Disabled'); /// Réactivation de tous les boutons '.Bt_FnrsExclus'
    });
    ///--- Partie Popin 'Fournisseurs exclus' ---///



    /// Pour fermeture encart d'erreur s'il existe
    $('body').on('click', '.ErreurRetourAjax .ClosePopin', function() {
        $('.ErreurRetourAjax').addClass('Hidden');
        $('.ErreurRetourAjax .Content').empty();
        Masque.addClass('Hidden');
    });


    /// Pour loader qd clic sur liens de l'autocomplete
    $('#Autocomplete').click('.Lgn.AC a[href]', function() {
        MasqueEtLoader.removeClass('Hidden');
    });

});


///--- Gestion de la sélection des Fnrs dans la popin ---///
function SelectionFnrsPopin(Chbxs, bool) {
    /// Sélection du/des checkbox(s) Fnr en fonction de la coche ou non d'un Cat.
    Chbxs.prop('checked', bool);
    /// Ajout class pour mieux identifier ligne(s) cochée(s)
    AddClassSelected(Chbxs);
    /// Affectation du tableau listant les fournisseurs cochés
    fnrsSelected = RecordSelectionCheckboxes(Chbxs, fnrsSelected);
    /// Affichage nb de fnr(s) sélectionné(s)
    $('#NbFnrSelected').text(fnrsSelected.length);
    console.log(fnrsSelected); //TEST
}


///--- Gestion de la sélection des Etablissements à intégrer dans l'accord (popin Ajouter un/des établissement(s) à l'accord) ---///
function SelectionEtbsPopin(Chbxs) {
    /// Ajout class pour mieux identifier ligne(s) cochée(s)
    AddClassSelected(Chbxs);
    /// Affectation du tableau listant les établissents cochés
    etbsSelected = RecordSelectionCheckboxes(Chbxs, etbsSelected);
    console.log(etbsSelected); //TEST
}

 
/// Ajout/suppression ds tableau stockant les fnrs/établissements sélectionnés à passer coté serveur
function RecordSelectionCheckboxes(Chbxs, ArrayTypeInfoSelected) {
    if(Chbxs.length > 0) {  //console.log(Chbxs.length); //TEST
        $.each(Chbxs, function(i, chbx) {
            //console.log(chbx);
            var chbx = $(chbx);
            /// Stockage des idfnr ds un tableau
            if(chbx.is(':checked')) {
                ArrayTypeInfoSelected.push(chbx.attr('id'));
            } else {
                ArrayTypeInfoSelected.splice( ArrayTypeInfoSelected.indexOf(chbx.attr('id')), 1);
            }
        });
        ArrayTypeInfoSelected = _.uniq(ArrayTypeInfoSelected); /// Pour supprimer les doublons
    }
    return ArrayTypeInfoSelected;
}




///--- Ajout/suppression d'une class pour faciliter visuellement l'identification des cases cochées dans popin  ---///
function AddClassSelected(Chbx) {
    Chbx.closest('span').toggleClass('Selected', Chbx.is(':checked'));
}

///--- Pour désélectionner ttes les checkboxs et retirer les marqueurs visuels ---///
function UnselectCheckboxes(DOMelemPopin) {
    $(DOMelemPopin + ' li input[type="checkbox"]').removeAttr('checked');
    $(DOMelemPopin + ' li span').removeClass('Selected');
}

///--- Réinitialisation bouton de filtre qui sert à n'afficher que les etbs dispos ---///
function ReinitBtFiltresEtbsDispos() {
    $('#BtFiltreEtbsDispos span[data-label="TxtBt_Filtered"]').removeClass('Hidden');
    $('#BtFiltreEtbsDispos span[data-label="TxtBt_NoFilter"], #BtFiltreEtbsDispos i.NoFilter').addClass('Hidden');
}



///--- Qd ouverture popin exclusion fnrs : Récupération des datas propres à l'établissement (cats et fnrs auxquels il n'a pas le droit + fnrs déjà exclus) ---///
function GetDataPopinFnrsAexclure(IdAccord, IdEtb) {
    /// Récupération des catalogues auxquels l'etbl. n'a pas droit pour les mettre en disabled dans la popin
    $.ajax({
        method: "GET",
        url: "/RechercheAccords/Marches/" + IdAccord + "/" + IdEtb,        
        contentType: "application/x-www-form-urlencoded; charset=UTF-8",
        dataType: "json",
        beforeSend: function () {
            MasqueEtLoader.removeClass('Hidden');
        }
    })
    .done(function (data) {
        //console.warn(data.FnrsExclus); //TEST

        /// Ici, on met en disabled les cats et les fournisseurs auxquels l'étbl. n'a pas droit...
        data.CatsInterdits.forEach(function(el) {       //console.log(el.CatalogueId + ' | ' + el.CatalogueDispo); //TEST
            if(el.CatalogueDispo == true) {
                $('.Popin_ExclusionFnrs #LstCats input[id="' + el.CatalogueId + '"], .Popin_ExclusionFnrs #LstFnrs input[data-fnridcat="' + el.CatalogueId + '"]').prop('disabled', false);
            }
        });
        /// ... + Coche des fnrs déjà exclus
        data.FnrsExclus.forEach(function(el) {
            $('.Popin_ExclusionFnrs #LstFnrs input[id="' + el.CFR + '"]').prop('checked', el.ExclureFrs);
            if (el.ExclureFrs == true) { TEMP_fnrsSelected.push(el.CFR); } // tableau pour bt 'Annulation' et bt Close 
        });
        /// et on Rempli le tableau des idfnr sélectionnés pour inscription dans l'objet global à passer coté serveur au moment de la validation de la ligne
        var chbxsFnrsCoches = $('.Popin_ExclusionFnrs #LstFnrs input[type="checkbox"]:checked');
        SelectionFnrsPopin(chbxsFnrsCoches);

        /// Apparition encart exclusion des fnrs
        $('.WrapLoader').addClass('Hidden');
        $('.Popin_ExclusionFnrs').addClass('Display');
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        DisplayError(jqXHR.responseText);
    });
}


///--- Qd ouverture popin 'fnrs exclus' (est affiché sur l'interface seulement qd utilisateur a un role n'autorisant que la lecture, pas la modification) : Récupération des datas propres à l'établissement (fnrs auxquels il n'a pas le droit + fnrs déjà exclus) ---///
function GetDataPopinFnrsExclus(IdAccord, IdEtb) {
    /// Récupération des catalogues auxquels l'etbl. n'a pas droit pour les mettre n disabled dans la popin
    $.ajax({
        method: "GET",
        url: "/RechercheAccords/FnrsExclus/" + IdAccord + "/" + IdEtb,        
        contentType: "application/x-www-form-urlencoded; charset=UTF-8",
        dataType: "json",
        beforeSend: function () {
            MasqueEtLoader.removeClass('Hidden');
        }
    })
    .done(function (data) {
        /// Affichage des fnrs exclus
        var DataLocation = $('.Popin_FnrsExclus .CentralPart');
        var i = 0;
        DataLocation.empty();
        data.FnrsExclus.forEach(function(el) {
            if(el.ExclureFrs == 1) {
                DataLocation.append('<div>' + el.CFR + '</div>');                
                i++;
            }
        });
        if(i == 0) {
            DataLocation.html('<div>Pas de fournisseur(s) exclu(s) pour cet établissement</div>');
        }

        /// Apparition encart exclusion des fnrs
        $('.WrapLoader').addClass('Hidden');
        $('.Popin_FnrsExclus').addClass('Display');
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        DisplayError(jqXHR.responseText);
    });
}



///--- Quand ouverture popin 'Ajout d'un établissement ---///
function GetDataPopinAddEtablissement(IdAccord) {
    $.ajax({
        method: "GET",
        url: "/RechercheAccords/GetListeEtbs/" + IdAccord,        
        contentType: "application/x-www-form-urlencoded; charset=UTF-8",
        dataType: "json",
        beforeSend: function () {
            MasqueEtLoader.removeClass('Hidden');
        }
    })
    .done(function (data) {
        /// Contruction de la liste des checkbox d'établissements
        var DataLocation = $('.Popin_AjoutEtablissement #LstAjoutEtbs ul');

        var i = 0;
        DataLocation.empty();
        var htmlListeEtbs = "";
        data.ListeAjoutEtablissements.forEach(function(el) {
            htmlListeEtbs += '<li><span><input type="checkbox" id="' + el.EtablissementId + '" value="' + el.EtablissementId + '" ' + (el.EstDansUnAccord ? 'disabled="disabled"' : '') + '  autocomplete="off" ><label for="' + el.EtablissementId + '">' + el.NomEtablissement + ' (' + el.cc + ')<br />' + el.Ville + '</label></span></li>';
        });
        DataLocation.append(htmlListeEtbs);

        /// Apparition encart exclusion des fnrs
        $('.WrapLoader').addClass('Hidden');
        $('.Popin_AjoutEtablissement').addClass('Display');

    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        DisplayError(jqXHR.responseText);
    });
}





///--- A appeler qd click sur 'Undo' ou bien sur Enregistrement Modif ---///
function ReinitialisationPopin() {
    FlagActivePopin = false;    TEMP_fnrsSelected = [];//
    fnrsSelected = []; /// On vide le tableau 'fnrsSelected'
    $('.Popin_ExclusionFnrs input[type="checkbox"]').prop('checked', false).prop('disabled', true);/// On remet à enable toutes les checkboxes + on décoche toutes les checkboxes
    $('.Popin_ExclusionFnrs li span').removeClass('Selected'); /// Retrait indicateur visuelle de sélection
    $('#NbFnrSelected').text('0'); /// on remet le nb d'exclu à 0 ds le champ '#NbFnrSelected'
}



///--- Fonction quand click sur icone 'Modif' (crayon) pour faire apparaitre les champs de saisie pré-remplis avec les bonnes infos ---///
function Mdf() {
    var Id_Lgn = GetLgnID(this);
    var ThisLgn = $(this);

    /// Si pas d'autre(s) ligne(s) en cours de modif.
    if($('.ModifEnCours').length == 0) {
        /// Gestion de l'affichage ou non des boutons
        ThisLgn.addClass('Hidden');

        $('.bandeauHaut input[type="text"]').prop('disabled', true); /// Désactivation des chps dans BandeauHaut       
        $('.Bt_Modif, .Bt_Suppr, .Bt_Add').addClass('Disabled'); /// Désactivation des boutons
        $('.Bt_Modif').off('click', Mdf);
        
        $('#' + Id_Lgn).addClass('ModifEnCours'); /// Ajout d'un marqueur identifiant la ligne en cours de modif
        $('.Lgn:not(.ModifEnCours):not(.Enteteliste)').addClass('Disabled'); /// Ajout de marqueurs sur les autres lignes que celle en cours de modif.        


        /// On détermine sur quelle type de ligne l'utilisateur a cliqué
        Modif_LgnAccord_AccordSection = ThisLgn.parents('.LgnAccordSection').length;
        Modif_LgnAccord_EtbSection = ThisLgn.parents('.LgnEtbSection').length;      //console.log('Modif_LgnAccord_EtbSection : ' + Modif_LgnAccord_EtbSection);
        
        /// On détermine quelle type de taux a été choisi
        var TypeTx = $('.LgnAccordSection .LstAdh_TypeTx').attr('data-TypeTx'); 
        
        var SelectorPart = '#' + Id_Lgn;

        /// Apparition boutons
        $(SelectorPart + ' .Bt_Valid, ' + SelectorPart + ' .Bt_Undo, ' + SelectorPart + ' .Bt_gestionFnrs').removeClass('Hidden');

            
        if(Modif_LgnAccord_AccordSection) {

            /// Affectation data champs de saisie
            $(SelectorPart + ' .ChpNomDest').val($(SelectorPart + ' .NomDest').text());
            $(SelectorPart + ' .ChpAdresseDest1').val($.trim($(SelectorPart + ' .AdresseDest > div:eq(0)').text()));
            $(SelectorPart + ' .ChpAdresseDest2').val($.trim($(SelectorPart + ' .AdresseDest > div:eq(1)').text()));
            $(SelectorPart + ' .ChpAdresseDest3').val($.trim($(SelectorPart + ' .AdresseDest > div:eq(2)').text()));            
            $(SelectorPart + ' .ChpCPDest').val($(SelectorPart + ' .CPDest').text());
            $(SelectorPart + ' .ChpVilleDest').val($(SelectorPart + ' .VilleDest').text());
            $(SelectorPart + ' .ChpSaisieDateDebut').val($(SelectorPart + ' .LstAdh_Periode .DateDebut').text());
            $(SelectorPart + ' .ChpSaisieDateFin').val($(SelectorPart + ' .LstAdh_Periode .DateFin').text()); 
                    
            /// Pour liste déroulante sur Chp 'Taux de réversion' : Sélection de la bonne 'option'
            //var TypeTx = $(SelectorPart + ' .LstAdh_TypeTx').attr('data-TypeTx'); 
            var IdxOption = $(SelectorPart + ' .LstAdh_saisieTypeTx option[value="' + TypeTx + '"]').index();
            //console.log('TypeTx : ' + TypeTx + ' / IdxOption : ' + IdxOption); //TEST
            $(SelectorPart + ' .LstAdh_saisieTypeTx option:eq(' + IdxOption + ')').prop('selected', 'selected');
            if( TypeTx == 1 ) { /// Si taux fixe... 
                /// Récupération de la valeur des chps 'Taux' pour affectation ds chps de saisie correspondants
                $(SelectorPart + ' .LstAdh_SaisieTx > input[type="text"]').val($(SelectorPart + ' .LstAdh_Tx > span').text()); 
                $(SelectorPart + ' .LstAdh_SaisieTxAdd > input[type="text"]').val($(SelectorPart + ' .LstAdh_TxAdd > span').text());
                /// On fait apparaitre le chp de saisie 'Taux'
                $(SelectorPart + ' .LstAdh_SaisieTx, ' + SelectorPart + ' .LstAdh_SaisieTxAdd').removeClass('Hidden');
            }

            /// Apparition champs de saisie
            $(SelectorPart + ' .DataDest .Chps, ' + SelectorPart + ' .LstAdh_Periode, ' + SelectorPart + ' .LstAdh_Tx, ' + SelectorPart + ' .LstAdh_TxAdd, ' + SelectorPart + ' .LstAdh_TypeTx').addClass('Hidden');
            $(SelectorPart + ' .DataDest .ChpsSaisie, ' + SelectorPart + ' .LstAdh_SaisiePeriode, ' + SelectorPart + ' .LstAdh_saisieTypeTx').removeClass('Hidden');
       
            /// Gestion des datePicker
            var DatePickerDebut = $(SelectorPart + " .ChpSaisieDateDebut");
            var DatePickerFin = $(SelectorPart + " .ChpSaisieDateFin");
            ParamsDatePickers(DatePickerDebut, DatePickerFin, "-24m", "+24m");


        } else if(Modif_LgnAccord_EtbSection) {

            /// Affectation data tous les champs de saisie sauf 'Taux de rév. avec EDI'
            $(SelectorPart + ' .ChpNomDest').val($(SelectorPart + ' .NomDest').text());
            $(SelectorPart + ' .ChpAdresseDest1').val($.trim($(SelectorPart + ' .AdresseDest > div:eq(0)').text()));
            $(SelectorPart + ' .ChpAdresseDest2').val($.trim($(SelectorPart + ' .AdresseDest > div:eq(1)').text()));
            $(SelectorPart + ' .ChpAdresseDest3').val($.trim($(SelectorPart + ' .AdresseDest > div:eq(2)').text()));            
            $(SelectorPart + ' .ChpCPDest').val($(SelectorPart + ' .CPDest').text());
            $(SelectorPart + ' .ChpVilleDest').val($(SelectorPart + ' .VilleDest').text());
            /// Apparition champs de saisie sauf 'Taux de rév. avec EDI'
            $(SelectorPart + ' .DataDest .Chps,' + SelectorPart + ' .LstAdh_TxAdd').addClass('Hidden');
            $(SelectorPart + ' .DataDest .ChpsSaisie').removeClass('Hidden');

            /// Cas spécifique chp de saisie 'Taux de rév. avec EDI'
            if( TypeTx == 1 ) { /// Si taux fixe
                /// Affectation data champ de saisie
                var ChpRappelTxEDI = $(SelectorPart + ' .LstAdh_TxAdd > .RappelTxEDIAccord').text();
                var ChpSurchargeTxEDI = $(SelectorPart + ' .LstAdh_TxAdd > .SurchargeTxEDI').text();
                //console.log('ChpRappelTxEDI : ' + ChpRappelTxEDI + ' | ChpSurchargeTxEDI : ' + ChpSurchargeTxEDI);  //TEST
                var GoodVal = ( (ChpSurchargeTxEDI == "") ? ChpRappelTxEDI : ChpSurchargeTxEDI );
                $(SelectorPart + ' .LstAdh_SaisieTxAdd > input[type="text"]').val(GoodVal);
                
                /// Apparition champ de saisie
                $(SelectorPart + ' .LstAdh_SaisieTxAdd').removeClass('Hidden');
            }

            
            if(InterdictionEcriture == true) { 
                $(SelectorPart + ' .Bt_Valid').addClass('Disabled');
                $(SelectorPart + ' .DataDest input[type="text"], ' + SelectorPart + ' .LstAdh_SaisieTxAdd  > input[type="text"]').prop('disabled', true); /// Désactivation des chps qd juste droits en lecture  
            }

        }

    }

}


///--- Fonction pour supprimer l'accord entier ou bien simplement la ligne établissement dans l'accord, selon la ligne qui a été cliquée ---///
function Suppr() {
    var Id_Lgn = GetLgnID(this);
    var ThisLgn = $(this);

    /// Si pas d'autre(s) ligne(s) en cours de modif.
    if($('.ModifEnCours').length == 0) {

        /// On détermine sur quelle type de ligne l'utilisateur a cliqué
        Modif_LgnAccord_AccordSection = ThisLgn.parents('.LgnAccordSection').length;
        Modif_LgnAccord_EtbSection = ThisLgn.parents('.LgnEtbSection').length;

        var ElemToDelete = (Modif_LgnAccord_AccordSection > 0 ? "accord" : (Modif_LgnAccord_EtbSection > 0 ? "etablissement" : ""));

        var r = confirm("Confirmez la suppression de cet " + ElemToDelete + " svp !");
        if(r) {
                
            /// Récupération des id qui seront passés coté serveur pour la(les) suppression(s) ds la bdd
            var IdAccord_aSuppr = $('#' + Id_Lgn).closest('.Lgn_Accord').data('numaccord'); 
            
            var IdEtb_aSuppr = '';
            if (Modif_LgnAccord_EtbSection) {
                IdEtb_aSuppr = $('#' + Id_Lgn).data('idetablismt'); 
            }

            /// Partie Ajax pour supprimer dans la bdd
            $.ajax({
                method: "DELETE",
                url: "/RechercheAccords",
                data: { IdAccordASuppr: IdAccord_aSuppr, IdEtbAccordASuppr: IdEtb_aSuppr, ElementASuppr: ElemToDelete },
                contentType: "application/x-www-form-urlencoded; charset=UTF-8",
                beforeSend: function () {
                    MasqueEtLoader.removeClass('Hidden'); /// Ajout masque et loader
                }
            })
            .done(function (data) {

                var html = $.parseHTML(data);
                if($(html).hasClass('AccesRefuse')) { /// Si pas les droits pour modifier, alors affichage contenu page 'AccesRefuse'
                    DisplayScreenAccesRefuse(html);
                } else { // Si pas de redirection vers page 'AccesRefuse'...
                
                    //console.log('data : ' + data + ' | Etab/Accord supprimé'); //TEST
                    
                    if (ElemToDelete == 'accord') {
                        /// Suppression ligne dans le DOM
                        $('.Lgn_Accord').addClass('EnCoursDeSuppression').fadeOut(400, function() {
                            $(this).remove();
                        });

                    } else if (ElemToDelete == 'etablissement') {           
                        
                        ///////--- ATTENTION : A CHECKER => Pas sûr que l'on ait besoin dans 'RechercheAccordController.js' d'appeler Proc. stock. ---/////////
                        ///////--- pour savoir si on peut activer le bouton ou pas puisque dans notre cas précis ici, il doit toujours être activé ---/////////
                        ///////--- car si on a pu cliquer sur bt Suppression d'établissement, cela signifie que 
                        ///////--- 1. c'est un accord de groupe, 
                        ///////--- 2. qu'on est pas limité en droits d'accès, 
                        ///////--- 3. que la réversion n'est pas encore validée et 
                        ///////--- 4. que l'accord n'a forcément pas tous les établissments de son/ses groupe(s)
                        /// Pour activer ou non le bouton d'ajout
                        //console.log('data.ActivationBtAddEtb : ' + data.ActivationBtAddEtb); //TEST
                        if(data.ActivationBtAddEtb == 0) { 
                            $('.Bt_Add').removeClass('Disabled').attr('data-btinactif', 'no');
                        };
                        ///////--- FIN ---/////////
                    
                        /// Pour changer le nb total d'étbl.
                        $('#NbTotalEtbs > span').text(parseInt($('#NbTotalEtbs > span').text()) - 1);

                        var NumeroLgnToDelete = $('#LgnEtbSection_' + IdAccord_aSuppr + '_' + IdEtb_aSuppr).find('.IndexEtbl').text();
                        
                        /// Suppression ligne dans le DOM
                        $('#LgnEtbSection_' + IdAccord_aSuppr + '_' + IdEtb_aSuppr).addClass('EnCoursDeSuppression').fadeOut(400, function() {
                            $(this).remove();

                            /// Si 1 seul etb qui reste dans l'accord, on interdit la possibilité de le supprimer en désactivant le bt 'Suppr.'
                            if($('.LgnEtbSection').length == 1) { $('.LgnEtbSection .Bt_Suppr').addClass('Disabled'); }
                            
                            /// Pour changer les numéro des établ. après celui supprimé
                            var NextLgnsEtbSection = $('.LgnEtbSection').slice(NumeroLgnToDelete - 1, $('.LgnEtbSection').length);
                            var Num = parseInt(NumeroLgnToDelete);
                            $(NextLgnsEtbSection).each(function(i) {
                                $(this).find('.IndexEtbl > span').text(Num);
                                Num++;
                            });

                        });

                    }

                }//

            })
            .always(function () {
                MasqueEtLoader.addClass('Hidden'); /// Retrait masque et loader
            });

        }

        /// Réinitialisation
        Modif_LgnAccord_AccordSection = -1;
        Modif_LgnAccord_EtbSection = -1;
    }
}


///--- Quand click sur bouton de validation (bt vert avec coche) après modif : Validation des champs de saisie ---///
function ValidModifs() {
    var Id_Lgn = GetLgnID(this);

    var ValSelectTypeTx = (Modif_LgnAccord_AccordSection > 0 ? $('.LgnAccordSection .LstAdh_saisieTypeTx option:selected').val() : (Modif_LgnAccord_EtbSection > 0 ? $('.LgnAccordSection .LstAdh_TypeTx').attr('data-TypeTx') : -1) ); /// Pour déterminer le type de taux sélectionné (Fixe ou variable)
    var ChpSaisieTxRev = $('.LgnAccordSection .LstAdh_SaisieTx > input[type="text"]');    
    var ChpSaisieTxEDI = $('#' + Id_Lgn + ' .LstAdh_SaisieTxAdd > input[type="text"]'); /// Si n'existe pas (cas lgn Etb sans Taux EDI), ne bug pas
    
    /// Validation de saisie : On checke si certains champs ne sont pas vides.
    var txtErreur = '';
    /// Champs 'Destinataire réversion' sauf .ChpAdresseDest2 et .ChpAdresseDest3
    $('#' + Id_Lgn + ' .DataDest input[type="text"]:not(".ChpAdresseDest2"):not(".ChpAdresseDest3")').each(function(i, el) {
        $(el).toggleClass('Error', ($.trim($(el).val()) == ''));  
    });
    if($('#' + Id_Lgn + ' .DataDest input[type="text"]').hasClass('Error')) {
        txtErreur = "Un/des champs sur le destinataire de la réversion non remplis";
    }
    /// Champs 'Taux de réversion' et 'Taux de rév. avec EDI' qd tx fixe
    if(ValSelectTypeTx == '1') {

        if(ChpSaisieTxEDI.val() == '') {
            ChpSaisieTxEDI.addClass('Error');
            txtErreur += "\nVeuillez remplir le champ de saisie du 'taux de réversion avec EDI'.";
        }  else {
            ChpSaisieTxEDI.removeClass('Error');
        }

        
        /// Demande de confirmation quand Taux EDI < Taux Rev.
        if(Modif_LgnAccord_AccordSection) { /// Si ligne Accord
            //console.log('Valeur taux de rev : ' + parseInt(ChpSaisieTxRev.val()) + ' | Valeur Taux de rev + EDI : ' + parseInt(ChpSaisieTxEDI.val()) ); //TEST
            if( parseInt(ChpSaisieTxRev.val()) > parseInt(ChpSaisieTxEDI.val()) ) {
                var r = confirm("Le taux EDI est inférieur au taux de réversion !\nConfirmez-vous ces données ?");
                if(!r) { 
                    return false; /// On interdit le traitement qui suit 
                }
            }

            if(ChpSaisieTxRev.val() == '') {
                ChpSaisieTxRev.addClass('Error');
                txtErreur += "\nVeuillez remplir le champ de saisie du 'taux de réversion'.";
            }  else {
                ChpSaisieTxRev.removeClass('Error');
            }

        } else if(Modif_LgnAccord_EtbSection) { ///...Sinon si ligne etb...
            console.log('Valeur taux de rev : ' + parseInt($('.LgnAccordSection #TauxReversionFixe').text()) + ' | Valeur Taux de rev + EDI : ' + parseInt(ChpSaisieTxEDI.val()) ); //TEST
            if( parseInt($('.LgnAccordSection #TauxReversionFixe').text()) > parseInt(ChpSaisieTxEDI.val()) ) {
                var r = confirm("Le taux EDI est inférieur au taux de réversion de l'accord !\nConfirmez-vous ces données ?");
                if(!r) { 
                    return false; /// On interdit le traitement qui suit 
                }
            }
        }

    }


    if($('#' + Id_Lgn + ' input[type="text"]').hasClass('Error')) {
        alert(txtErreur + "\nMerci."); 
        return false; /// On interdit le traitement qui suit
    }


    //console.log(Modif_LgnAccord_AccordSection + " / " + Modif_LgnAccord_EtbSection); //TEST

    /// Affectation des données des champs de saisie ds l'objet 'InfosLgnModifiee' + ds champs d'affichage
    InfosLgnModifiee.NumeroAccord = $('#' + Id_Lgn).closest('.Lgn_Accord').data('numaccord');
    InfosLgnModifiee.IsAccord = ((Modif_LgnAccord_AccordSection == 1) ? true : false);
    InfosLgnModifiee.IDetablissement = ((Modif_LgnAccord_EtbSection == 1) ? $('#' + Id_Lgn).data('idetablismt') : null);
    InfosLgnModifiee.DestinataireReversion.NomPrenom = $('#' + Id_Lgn + ' .ChpNomDest').val();
    InfosLgnModifiee.DestinataireReversion.Adresse1 = $('#' + Id_Lgn + ' .ChpAdresseDest1').val().toUpperCase();
    InfosLgnModifiee.DestinataireReversion.Adresse2 = $('#' + Id_Lgn + ' .ChpAdresseDest2').val().toUpperCase();
    InfosLgnModifiee.DestinataireReversion.Adresse3 = $('#' + Id_Lgn + ' .ChpAdresseDest3').val().toUpperCase();
    InfosLgnModifiee.DestinataireReversion.CP = $('#' + Id_Lgn + ' .ChpCPDest').val();
    InfosLgnModifiee.DestinataireReversion.Ville = $('#' + Id_Lgn + ' .ChpVilleDest').val().toUpperCase();
    InfosLgnModifiee.PeriodeDebut = $('#' + Id_Lgn + ' .LstAdh_SaisiePeriode .ChpSaisieDateDebut').val();
    InfosLgnModifiee.PeriodeFin = $('#' + Id_Lgn + ' .LstAdh_SaisiePeriode .ChpSaisieDateFin').val();
    InfosLgnModifiee.TypeTauxReversion = ValSelectTypeTx;
    InfosLgnModifiee.LibelleTypeTauxReversion = $('.LgnAccordSection .LstAdh_saisieTypeTx option:selected').text();

    if(InfosLgnModifiee.TypeTauxReversion != 1) { /// valeur des chps de saisie à 'null' si selection d'un tx variable lors de la validation
         InfosLgnModifiee.TauxReversion = null;
         InfosLgnModifiee.TauxReversionAdd = null;
    } else {
        InfosLgnModifiee.TauxReversion = ((Modif_LgnAccord_AccordSection == 1) ? ChpSaisieTxRev.val() : null); /// Valeur NULL si c'est un établissement     
        InfosLgnModifiee.TauxReversionAdd = (ChpSaisieTxEDI.length > 0 ? ChpSaisieTxEDI.val() : null);  /// Valeur NULL s'il n'y a pas de champ de saisie 'Taux de rev. avec EDI' (=> Cas ou ligne Etb sans EDI)  
    }

    /////===== Requête Ajax pour enregistrement données de l'objet ds bdd =====////
    $.ajax({
        method: "POST",
        //method: "PUT",
        url: "/RechercheAccords",
        /// Envoie la data sous forme de JSON --> Le content-type doit être en 'application/json' ET le data impérativement en JSON.stringify() + coté node le Middleware dans app.js avec 'app.use(bodyParser.json())' pour interpréter le JSON
        //dataType: "json",
        dataType: "html", // Juste pour l'enregistrement d'un accord : Permettrait p-ê de mettre à jour ttes les lignes d'un coup
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify(InfosLgnModifiee),
        beforeSend: function () {
            MasqueEtLoader.removeClass('Hidden'); /// Ajout masque et loader pdt traitement
        } 
    })
    .done(function (data) {

        // IMPERATIF : A faire avec 'datatype: html' au dessus !
        var html = $.parseHTML(data);

        if($(html).hasClass('AccesRefuse')) { /// Si pas les droits pour modifier, alors affichage contenu page 'AccesRefuse'

            DisplayScreenAccesRefuse(html);
        
        } else { /// Si pas de redirection vers page 'AccesRefuse'...
        
            //console.log("Enregistrement réussi !!" + JSON.stringify(data)); //TEST
            // P-ê détecter si pas modifé pour ne pas faire de traitement inutile
        
            if(InfosLgnModifiee.IsAccord == true) { /// Si accord...
                
                var LgnAccord_EnCoursDeModif = ".Lgn_Accord";
                var html_lgnAccord = $(html).find(LgnAccord_EnCoursDeModif);
                //console.log($(html_lgnAccord).prop('outerHTML')); //TEST
                $(LgnAccord_EnCoursDeModif).replaceWith(html_lgnAccord);
                
            } else { /// ...Sinon si établissement ds un accord...

                /// On remplace la ligne par le html après modif. de la même ligne
                var LgnEtbSection_EnCoursDeModif = "#LgnEtbSection_" + InfosLgnModifiee.NumeroAccord + "_" + InfosLgnModifiee.IDetablissement;
                var html_lgnEtablissementAccord = $(html).find(LgnEtbSection_EnCoursDeModif);
                $(LgnEtbSection_EnCoursDeModif).replaceWith(html_lgnEtablissementAccord);

                /// Réactivation ou pas des boutons
                // Etape 1 : Réactivation Boutons sur toutes les lignes + Retrait des marqueurs sur les autres lignes que celle en cours de modif.
                $('.Bt_Modif, .Bt_Suppr, .Bt_Add, .Lgn').removeClass('Disabled');
                // Etape 2 : Surcharge. On désactive au cas par cas...
                if($('.LgnEtbSection').length == 1) { $('.LgnEtbSection .Bt_Suppr').addClass('Disabled');  } // ...Si 1 seul etb dans l'accord, on interdit la possibilité de le supprimer
                if( 
                    ($('.Lgn_Accord').attr('data-accordgroupe') == 'false') || // Si pas accord de groupe, donc qu'1 seul etb. possible donc bouton d'ajout d'etb. en disabled 
                    ($('.Lgn_Accord').attr('data-accordgroupe') == 'true' && $('.Lgn_Accord .Bt_Add').attr('data-btinactif') == 'yes') // Si accord de groupe mais tous les étab. du groupe sont présents ds l'accord, bouton d'ajout d'etb. en disabled 
                ) { $('.LgnAccordSection .Bt_Add').addClass('Disabled'); } 
            }

            $('.bandeauHaut input[type="text"]').prop('disabled', false); /// Réactivation moteur de recherche
            
            /// Réinitialisation...
            InfosLgnModifiee = Init_InfosLgnModifiee(); ///...de l'objet...
            ReinitialisationPopin(); /// ... et de la popin

            Modif_LgnAccord_AccordSection = -1;
            Modif_LgnAccord_EtbSection = -1;

            MasqueEtLoader.addClass('Hidden'); /// Retrait masque et loader

        }///
    
    })
    .fail(function (jqXHR, textStatus, errorThrown) {   
        DisplayError(jqXHR.responseText);
    });
    /////===== Fin requete =====////

}



///--- Quand click sur bouton 'Annuler les modifications' quand on a voulu modifier un accord ou un étb. dans un accord ---///
function Undo() {
    var Id_Lgn = GetLgnID(this);
    /// gestion des boutons à cacher et à afficher
    $('#' + Id_Lgn + ' .Bt_Valid, #' + Id_Lgn + ' .Bt_Undo, #' + Id_Lgn + ' .Bt_gestionFnrs').addClass('Hidden');
    $('#' + Id_Lgn + ' .Bt_Modif').removeClass('Hidden');

    $('.bandeauHaut input[type="text"]').prop('disabled', false); /// Réactivation moteur de recherche
    $(InterdictionEcriture == true ? '.LgnEtbSection .Bt_Modif, .Lgn' : '.Bt_Modif, .Bt_Suppr ' + ($('.Lgn_Accord').attr('data-accordgroupe') == 'true' ? ', .Bt_Add:not([data-btinactif="yes"])' : '') + ', .Lgn').removeClass('Disabled'); /// Réactivation boutons sur toutes les lignes + Retrait des marqueurs sur les autres lignes que celle en cours de modif.
    if($('.LgnEtbSection').length == 1) { $('.LgnEtbSection .Bt_Suppr').addClass('Disabled');  } /// Surcharge : Si 1 seul etb dans l'accord, on interdit la possibilité de le supprimer
    $('#' + Id_Lgn).removeClass('ModifEnCours'); /// Retrait du marqueur identifiant la ligne en cours de modif

    var ValSelectTypeTx = $('.LgnAccordSection .LstAdh_saisieTypeTx option:selected').val(); /// Pour déterminer le type de taux sélectionné (Fixe ou variable)
    
    /// Affectation data champs de saisie sauf cas spécifique champ 'Taux de réversion'
    $('#' + Id_Lgn + ' .ChpNomDest').val('');
    $('#' + Id_Lgn + ' .ChpAdresseDest1, #' + Id_Lgn + ' .ChpAdresseDest2, #' + Id_Lgn + ' .ChpAdresseDest3').val('');
    $('#' + Id_Lgn + ' .ChpCPDest').val('');
    $('#' + Id_Lgn + ' .ChpVilleDest').val('');
    $('#' + Id_Lgn + ' .LstAdh_SaisiePeriode .ChpSaisieDateDebut').val('');
    $('#' + Id_Lgn + ' .LstAdh_SaisiePeriode .ChpSaisieDateFin').val('');
    $('#' + Id_Lgn + ' .LstAdh_SaisieTx > input[type="text"]').val('');
    $('#' + Id_Lgn + ' .LstAdh_SaisieTxAdd > input[type="text"]').val('');

    /// Retrait signalement d'erreur sur champs de saisie
    $('#' + Id_Lgn + ' input[type="text"]').removeClass('Error'); 
    
    /// Disparition champs de saisie
    $('#' + Id_Lgn + ' .DataDest .Chps, #' + Id_Lgn + ' .LstAdh_Periode, #' + Id_Lgn + ' .LstAdh_TxAdd').removeClass('Hidden');
    $('#' + Id_Lgn + ' .DataDest .ChpsSaisie, #' + Id_Lgn + ' .LstAdh_SaisiePeriode,  #' + Id_Lgn + ' .LstAdh_SaisieTxAdd').addClass('Hidden');

    /// Cas du champ 'Taux de réversion'
    if(Modif_LgnAccord_AccordSection) {
        $('.LgnAccordSection .LstAdh_saisieTypeTx option:eq(0)').prop('selected', 'selected');
        /// Disparition champs de saisie
        $('.LgnAccordSection .LstAdh_TypeTx').removeClass('Hidden');
        $('.LgnAccordSection .LstAdh_SaisieTx, .LgnAccordSection .LstAdh_saisieTypeTx').addClass('Hidden');
        if(ValSelectTypeTx == 1) { /// Si tx fixe, on laisse le champ 'Taux de rév.' visible
            $('.LgnAccordSection .LstAdh_Tx').removeClass('Hidden');
        }
    }

    /// Réinitialisation...
    InfosLgnModifiee = Init_InfosLgnModifiee(); ///...de l'objet...
    ReinitialisationPopin(); /// ... et de la popin

    Modif_LgnAccord_AccordSection = -1;
    Modif_LgnAccord_EtbSection = -1;
}



///--- Quand click sur bouton Ajout d'établissement  ---///
function Add() {
    var NomAccord = $('.LgnAccordSection .NomEtblGrp').text();
    $('.Popin_AjoutEtablissement .TopPart').html('<div class="TxtIntro">Ajouter un/des établissement(s) à l\'accord :</div><div class="NomAccord">' + NomAccord + '</div>'); /// Insertion nom du groupe ds entete Popin
    GetDataPopinAddEtablissement(Id_Accord); /// Appel fonction pour aller chercher les infos et remplir la Popin avant de l'afficher
}


function RecordEtablissements(IdAccord) {
    $.ajax({
        method: "POST",
        url: "/RechercheAccords/AddEtbs/" + IdAccord,
        
        dataType: "html", // Retourne du html
        
        /*data: {ListeEtablissements: etbsSelected},
        contentType: "application/x-www-form-urlencoded; charset=UTF-8",*/
        data: JSON.stringify(etbsSelected),
        contentType: "application/json; charset=utf-8",

        beforeSend: function (jqXHR) {
            MasqueEtLoader.removeClass('Hidden');
        }
    })
    .done(function (data) {
        // IMPERATIF : A faire avec 'datatype: html' au dessus !
        var html = $.parseHTML(data);

        var $html = $(html);

        if($html.hasClass('AccesRefuse')) { /// Si pas les droits pour modifier, alors affichage contenu page 'AccesRefuse'          
            DisplayScreenAccesRefuse(html);
        } else { /// Si pas de redirection vers page 'AccesRefuse'...
            var ContenuAccord = $html.find('.Lgn_Accord');
            $('.Lgn_Accord').replaceWith(ContenuAccord);
        }        

        MasqueEtLoader.addClass('Hidden'); /// Retrait masque et loader
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
        if(jqXHR.responseText != null) { /// Comme les jqXHR avortés passent dans 'fail' alors qu'il ne s'agit pas d'erreur, je mets cette condition pour les filtrer
            DisplayError(jqXHR.responseText);
        }
    });
}


function GetLgnID(Bt) {
   return $(Bt).closest('.Lgn').attr('id');
}


function CreateEnteteFlottante() {
    $('.Enteteliste').clone(true).addClass('clone').prependTo('.ListeEtbl');  
}


function SearchAccordQuery(Saisie) {

    /// On supprime les requetes AJAX en cours
    $(Pool_xhr).each(function (idx, jqXHR) { jqXHR.abort(); });
    Pool_xhr = [];

    $.ajax({
        method: "POST",
        url: "/RechercheAccords",
        data: {SaisieRecherche: Saisie},
        contentType: "application/x-www-form-urlencoded; charset=UTF-8",
        ifModified: true,
        beforeSend: function (jqXHR) {
            Pool_xhr.push(jqXHR);
            MasqueEtLoader.removeClass('Hidden');
        }
    })
    .done(function (data) {
        
        MasqueEtLoader.addClass('Hidden'); /// Retrait masque et loader

        //console.log("La data est : " + data); //TEST
        if($.trim(data) != "") {
            $('#Autocomplete.Hidden').removeClass('Hidden');
            AC_content.html(data);
            $('#AC_content *[data-tohighlight]').highlight(Saisie);

            /// Ajout avec nouvelle version au 03/01/18
            $('#TextNoResults > span').text('');
            $('#TextNoResults').addClass('Hidden');
            /// FIN
        } else {
            $('#Autocomplete').addClass('Hidden');
            AC_content.html("");

            /// Ajout avec nouvelle version au 03/01/18
            $('#TextNoResults > span').text(Saisie);
            $('#TextNoResults').removeClass('Hidden');
            /// FIN
        }

    })
    .fail(function (jqXHR, textStatus, errorThrown) {
        if(jqXHR.responseText != null) { /// Comme les jqXHR avortés passent dans 'fail' alors qu'il ne s'agit pas d'erreur, je mets cette condition pour les filtrer
            DisplayError(jqXHR.responseText);
        }
    });
}



function FocusLgn() {
    var LgnSelected = $('.LgnEtbSection.Selected');
    if(LgnSelected.length > 0) {
        var pos = ($('#' + LgnSelected.attr('id')).offset().top) - ConteneurListe - ($('.LgnAccordSection').outerHeight(true));       
        $(window).scrollTop(pos);
    }
}



function ClosePopin(popin) {
    Masque.addClass('Hidden');
    $(popin).removeClass('Display');
}


function GetDataEntetePopin(Bt) {
    var Id_Lgn = GetLgnID(Bt);
    /// Copie dans entete popin du nom et groupe de l'établissement
    return $('#' + Id_Lgn + ' .DataEtbl').html();
}

function Init_InfosLgnModifiee() {
    return {
        NumeroAccord: null,
        IsAccord: null,
        IDetablissement: null,
        //IDgroupe: null,
        DestinataireReversion: {NomPrenom: "", Adresse1: "", Adresse2: "", Adresse3: "", CP: "", Ville: ""},
        PeriodeDebut: "",
        PeriodeFin: "",
        TypeTauxReversion: null,
        LibelleTypeTauxReversion: "",
        TauxReversion: null, //Optionnel (pour établ. de grp)
        TauxReversionAdd: null, //Optionnel
        ModificationExclusionFnrs: false, // Signale s'il y a eu modification des fnrs exclus et donc si on doit executer la proc. stock. dédiée  pour  enregistrer la liste de ces fnrs exclus coté serveur
        ExclusionFnrs: [] //Optionnel. Stocke liste des fnrs exclus.  
    }
}




function DisplayScreenAccesRefuse(html) {
    /// Le code '$(html).find('#Wrapper_Encart')' ne focntionne pas, donc boucle sur le DOM
    var ContenuPgAccesRefuse = null;
    $.each( html, function( i, el ) {  //console.warn(el.nodeName + " | " + el.id + " | " + el.className); //TEST
        if(el.id == 'Wrapper_Encart') { ContenuPgAccesRefuse = el; }
    });
    if(ContenuPgAccesRefuse != null) {
        $('body').empty().append(ContenuPgAccesRefuse); /// Remplacement du contenu de la page actuelle par celui reçu en Ajax, à savoir celui de la pg 'AccesRefuse'
    }
}


/// Pour affichage de l'erreur dans un encart suite à requete AJAX
function DisplayError(jqXHRresponseText) {
    $('.WrapLoader').addClass('Hidden'); /// Disparition loader

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