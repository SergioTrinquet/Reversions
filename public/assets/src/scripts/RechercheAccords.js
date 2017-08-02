var Modif_LgnAccord_AccordSection = -1;
var Modif_LgnAccord_EtbSection = -1;

var InfosLgnModifiee = Init_InfosLgnModifiee();

var lastSaisie = null;
var ConteneurListe = null;

var fnrsSelected = [];

var InterdictionEcriture = false;

//var FlagOpenPopin = false; /* TEST au 09/06/17 */


 /// TEST : Ajouté le 31/07/17
var Pool_xhr = [];
var Pool_rech = [];
function SearchAccord(SaisieAddAccord) {
    if(SaisieAddAccord.length > 2) {
        //console.log('SaisieAddAccord : ' + SaisieAddAccord + ' | lastSaisie : ' + lastSaisie); //TEST
        if(SaisieAddAccord != lastSaisie) { /// pour éviter appel ajax inutile
            SearchAccordQuery(SaisieAddAccord); /* Version Originale au 31/07/17 */
        } else if(SaisieAddAccord == lastSaisie && $('#AC_content').html() != '') {
            $('#Autocomplete.Hidden').removeClass('Hidden');
        }
        lastSaisie = SaisieAddAccord;

    } else {
        $('#Autocomplete').addClass('Hidden');
    }
}
/// FIN TEST : Ajouté le 31/07/17


$(function () {

    ///--- Récupération des droits sur cette page ---///
    InterdictionEcriture = ($('#EncartInfoUser #Role').text() == 'ReversionsRechercheAccordLecture' ? true : false);

    ///--- Pour avoir l'entete flottante ---///
    CreateEnteteFlottante();

    ///--- Création de la ligne 'Accord' flottante ---///
    ConteneurListe = $('.ListeEtbl > div:not(.Enteteliste)').offset().top;     

    ///--- Focus sur ligne sélectionnée (uniquement qd recherche sur un établissement) ---///
    FocusLgn();


    ///--- Moteur de recherche ---///
    var SaisieAddAccord = null;
    $('#SearchEtabl').on('keyup paste cut dragend focus', function() {
        SaisieAddAccord = $.trim($(this).val());

        /* Nouvelle version au 31/07/17 : Pour éviter des appels AJAX à chaque frappe donc trop nombreux */  
        $(Pool_rech).each(function (idx, el) { /*console.log(el);*/ clearTimeout(el); }); /// On vide le pool
        Pool_rech = []; 
        Pool_rech.push(setTimeout(function(){ SearchAccord(SaisieAddAccord); }, 300)); /// Une fois le pool vide, ajout de la fonction qui fait l'appel AJAX et qui se déclenche au bout de X millisec.       
        /* Fin Nouvelle version au 31/07/17 */

        /// Version actuelle au 31/07/17
        /*if(SaisieAddAccord.length > 2) {

            //console.log('SaisieAddAccord : ' + SaisieAddAccord + ' | lastSaisie : ' + lastSaisie); //TEST
            if(SaisieAddAccord != lastSaisie) { /// pour éviter appel ajax inutile
                SearchAccordQuery(SaisieAddAccord);
            } else if(SaisieAddAccord == lastSaisie && $('#AC_content').html() != '') {
                $('#Autocomplete.Hidden').removeClass('Hidden');
            }
            lastSaisie = SaisieAddAccord;

        } else {
            $('#Autocomplete').addClass('Hidden');
        }
        */
    });
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
    
    ///--- Fonction pour pointer sur pg 'Liste des factures' : A faire dans un 2eme temps ---///
    //$('.ListeEtbl').on('click', '.Bt_Details:not(.Disabled)', Dtls);

    ///--- Quand Validation des modif sur une ligne (ligne Accord ou Etablissement d'un accord) ---///
    $('.ListeEtbl').on('click', '.Bt_Valid:not(.Disabled)', ValidModifs);

    ///--- Quand Annulation des modif sur une ligne ---///
    $('.ListeEtbl').on('click', '.Bt_Undo', Undo);




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

        //if(FlagOpenPopin == false) { /* TEST au 09/06/17 */ // Flag pour ne pas à faire un appel AJAX si plusieurs clics de suite sur même ligne Etb
            //FlagOpenPopin = true; /* TEST au 09/06/17 */

            var Id_Lgn = GetLgnID(this);
            /// Copie dans entete popin du nom et groupe de l'établissement
            var html = $('#' + Id_Lgn + ' .DataEtbl').html();
            $('.Popin_ExclusionFnrs .TopPart').html(html);

            var Id_Accord = $('.Lgn_Accord').data('numaccord');
            var Id_Etb = $(this).closest('.LgnEtbSection.ModifEnCours').data('idetablismt');
            /// Initialisation des données propres à l'établissement dans la popin
            GetDataPopin(Id_Accord, Id_Etb);

        /* */// } else { $('.Popin_ExclusionFnrs').addClass('Display'); }/* TEST au 09/06/17 */
    });

    /// Lorsque click sur un Catalogue
    $('body').on('click', '.Popin_ExclusionFnrs #LstCats input[type="checkbox"]:not(:disabled)', function() {
        var ThisChbx = $(this);

        /// Identification visuelle du cat. sélectionné
        AddClassSelected(ThisChbx); 

        /// Coche sur fnrs qui appartiennent au cat. sélectionné + alimentation du tableau stockant les fnrs sélectionnés à passer coté serveur
        var goodChbxs = $('.Popin_ExclusionFnrs #LstFnrs input[data-fnridcat="' + ThisChbx.attr('id') + '"]:not(:disabled)');
        SelectionFnrsPopin(goodChbxs, (ThisChbx.is(':checked') ? true : false));
    });

    /// Lorsque click sur un Fnr
    $('body').on('click', '.Popin_ExclusionFnrs #LstFnrs input[type="checkbox"]:not(:disabled)', function() {
        var ThisChbx = $(this);
        SelectionFnrsPopin(ThisChbx, (ThisChbx.is(':checked') ? true : false));
    });

    /// Boutons Annulation du popin
    $('#AnnulationSelectionFnrs, .Popin_ExclusionFnrs .ClosePopin').click(function() {
        var r = confirm("Vous allez perdre la saisie de vos données.\nConfirmez votre choix svp!");
        if(r) {
            $('.Popin_ExclusionFnrs li input[type="checkbox"]').removeAttr('checked');
            $('.Popin_ExclusionFnrs li span').removeClass('Selected');
            fnrsSelected = [];
            /// On alimente l'objet InfosLgnModifiee
            InfosLgnModifiee.ExclusionFnrs = fnrsSelected;
            InfosLgnModifiee.ModificationExclusionFnrs = false; //12/06/17
            ClosePopin('.Popin_ExclusionFnrs');
        }
    });

    /// Boutons Validation du popin
    $('#ValidationSelectionFnrs').click(function() {
        /// On alimente l'objet InfosLgnModifiee
        InfosLgnModifiee.ExclusionFnrs = fnrsSelected;
        InfosLgnModifiee.ModificationExclusionFnrs = true; //12/06/17
        /// Fermeture popin
        ClosePopin('.Popin_ExclusionFnrs');
    });
    ///--- Fin partie Popin 'Définir les marchés' ---///


    /// Pour fermeture encart d'erreur s'il existe
    $('body').on('click', '.ErreurRetourAjax .ClosePopin', function() {
        $('.ErreurRetourAjax').addClass('Hidden');
        $('.ErreurRetourAjax .Content').empty();
        $('.Masque').addClass('Hidden');
    });



});


///--- Gestion de la sélection des Fnrs dans la popin ---///
function SelectionFnrsPopin(Chbxs, bool) {
    /// Sélection du/des checkbox(s) Fnr en fonction de la coche ou non d'un Cat.
    Chbxs.prop('checked', bool);
    /// Ajout class pour mieux identifier ligne(s) cochée(s)
    AddClassSelected(Chbxs);

    /// Ajout/suppression ds tableau stockant les fnrs sélectionnés à passer coté serveur
    if(Chbxs.length > 0) {  //console.log(Chbxs.length); //TEST
        $.each(Chbxs, function(i, chbx) {
            //console.log(chbx);
            var chbx = $(chbx);
            /// Stockage des idfnr ds un tableau
            if(chbx.is(':checked')) {
                fnrsSelected.push(chbx.attr('id'));
            } else {
                fnrsSelected.splice( fnrsSelected.indexOf(chbx.attr('id')), 1);
            }
        });
        fnrsSelected = _.uniq(fnrsSelected); /// Pour supprimer les doublons
    }
    /// Affichage nb de fnr(s) sélectionné(s)
    $('#NbFnrSelected').text(fnrsSelected.length);
    
    console.log(fnrsSelected); //TEST
}


///--- Ajout/suppression d'une class pour faciliter visuellement l'identification des cases cochées dans popin  ---///
function AddClassSelected(Chbx) {
    Chbx.closest('span').toggleClass('Selected', Chbx.is(':checked'));
}



///--- Qd ouverture popin exclusion fnrs : Récupération des datas propres à l'établissement (cats et fnrs auxquels il n'a pas le droit + fnrs déjà exclus) ---///
function GetDataPopin(IdAccord, IdEtb) {
    /// Récupération des catalogues auxquels l'etbl. n'a pas droit pour les mettre n disabled dans la popin
    $.ajax({
        method: "GET",
        url: "/RechercheAccords/Marches/" + IdAccord + "/" + IdEtb,        
        contentType: "application/x-www-form-urlencoded; charset=UTF-8",
        dataType: "json",
        beforeSend: function () {
            $('.Masque').removeClass('Hidden');
        }
    })
    .done(function (data) {
        console.warn(data.FnrsExclus); //TEST

        /// Ici, on met en disabled les cats et les fournisseurs auxquels l'étbl. n'a pas droit...
        data.CatsInterdits.forEach(function(el) {       //console.log(el.CatalogueId + ' | ' + el.CatalogueDispo); //TEST
            if(el.CatalogueDispo == true) {
                $('.Popin_ExclusionFnrs #LstCats input[id="' + el.CatalogueId + '"], .Popin_ExclusionFnrs #LstFnrs input[data-fnridcat="' + el.CatalogueId + '"]').prop('disabled', false);
            }
        });
        /// ... + Coche des fnrs déjà exclus
        data.FnrsExclus.forEach(function(el) {
            $('.Popin_ExclusionFnrs #LstFnrs input[id="' + el.CFR + '"]').prop('checked', el.ExclureFrs);
        });
        /// et on Rempli le tableau des idfnr sélectionnés pour inscription dans l'objet global à passer coté serveur au moment de la validation de la ligne
        var chbxsFnrsCoches = $('.Popin_ExclusionFnrs #LstFnrs input[type="checkbox"]:checked');
        SelectionFnrsPopin(chbxsFnrsCoches);

        /// Apparition encart exclusion des fnrs
        $('.Popin_ExclusionFnrs').addClass('Display');
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        DisplayError(jqXHR.responseText);
    });
}



///--- A appeler qd click sur 'Undo' ou bien sur Enregistrement Modif ---///
function ReinitialisationPopin() {
    //FlagOpenPopin = false; /* */
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
        $('.Bt_Modif, .Bt_Suppr, .Bt_Details').addClass('Disabled'); /// Désactivation des boutons
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
                    $('.Masque').removeClass('Hidden'); /// Ajout masque
                }
            })
            .done(function (data) {

                var html = $.parseHTML(data);
                if($(html).hasClass('AccesRefuse')) { /// Si pas les droits pour modifier, alors affichage contenu page 'AccesRefuse'
                    DisplayScreenAccesRefuse(html);
                } else { // Si pas de redirection vers page 'AccesRefuse'...
                

                    console.log('data : ' + data + ' | Etab/Accord supprimé'); //TEST
                    
                    if (ElemToDelete == 'accord') {
                        /// Suppression ligne dans le DOM
                        $('.Lgn_Accord').addClass('EnCoursDeSuppression').fadeOut(400, function() {
                            $(this).remove();
                        });

                    } else if (ElemToDelete == 'etablissement') {
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
                $('.Masque').addClass('Hidden'); /// Retrait masque
            });

        }

        /// Réinitialisation
        Modif_LgnAccord_AccordSection = -1;
        Modif_LgnAccord_EtbSection = -1;
    }
}


///--- Fctions à faire ds un 2eme temps ---///
//function Dtls() {}
///--- FIN ---///


///--- Quand click sur bouton de validation (bt vert avec coche) après modif : Validation des champs de saisie ---///
function ValidModifs() {
    var Id_Lgn = GetLgnID(this);

    //var ValSelectTypeTx = $('.LgnAccordSection .LstAdh_saisieTypeTx option:selected').val(); /// Pour déterminer le type de taux sélectionné (Fixe ou variable)
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
            $('.Masque').removeClass('Hidden'); /// Ajout masque pdt traitement
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

                //$('.Bt_Modif, .Bt_Suppr, .Bt_Details, .Lgn').removeClass('Disabled'); /// Réactivation Boutons sur toutes les lignes + Retrait des marqueurs sur les autres lignes que celle en cours de modif.
                $('.Bt_Modif, .Bt_Suppr, .Lgn').removeClass('Disabled'); /// Réactivation Boutons sur toutes les lignes + Retrait des marqueurs sur les autres lignes que celle en cours de modif.
                if($('.LgnEtbSection').length == 1) { $('.LgnEtbSection .Bt_Suppr').addClass('Disabled');  } /// Surcharge : Si 1 seul etb dans l'accord, on interdit la possibilité de le supprimer
            }

            $('.bandeauHaut input[type="text"]').prop('disabled', false); /// Réactivation moteur de recherche
            
            /// Réinitialisation...
            InfosLgnModifiee = Init_InfosLgnModifiee(); ///...de l'objet...
            ReinitialisationPopin(); /// ... et de la popin

            Modif_LgnAccord_AccordSection = -1;
            Modif_LgnAccord_EtbSection = -1;

            $('.Masque').addClass('Hidden'); /// Retrait masque

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
    /* Ajouté le 13/07/17 */$(InterdictionEcriture == true ? '.LgnEtbSection .Bt_Modif, .Lgn' : '.Bt_Modif, .Bt_Suppr, .Lgn').removeClass('Disabled'); /// Réactivation boutons sur toutes les lignes + Retrait des marqueurs sur les autres lignes que celle en cours de modif.
    /* Mis en comm. le 13/07/17 *///$('.Bt_Modif, .Bt_Suppr, .Lgn').removeClass('Disabled'); /// Réactivation boutons sur toutes les lignes + Retrait des marqueurs sur les autres lignes que celle en cours de modif.
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



function GetLgnID(Bt) {
   return $(Bt).closest('.Lgn').attr('id');
}


function CreateEnteteFlottante() {
    $('.Enteteliste').clone(true).addClass('clone').prependTo('.ListeEtbl');  
}


function SearchAccordQuery(Saisie) {

    /// TEST : Ajouté le 31/07/17
    /// On supprime les requetes AJAX en cours
    $(Pool_xhr).each(function (idx, jqXHR) { jqXHR.abort(); });
    Pool_xhr = [];
    /// FIN TEST : Ajouté le 31/07/17


    $.ajax({
        method: "POST",
        url: "/RechercheAccords",
        data: {SaisieRecherche: Saisie},
        contentType: "application/x-www-form-urlencoded; charset=UTF-8",
        ifModified: true,
        /* Version actuelle au 31/07/17 *//*beforeSend: function () {
            $('.masque').removeClass('Hidden');
        }*/
        /* Nouvelle Version au 31/07/17 */beforeSend: function (jqXHR) {
            Pool_xhr.push(jqXHR);
            $('.masque').removeClass('Hidden');
        }
    })
    .done(function (data) {
        
        $('.masque').addClass('Hidden'); /// Retrait masque

        //console.log("La data est : " + data); //TEST
        if($.trim(data) != "") {
            $('#Autocomplete.Hidden').removeClass('Hidden');
            $('#AC_content').html(data);
            $('#AC_content *[data-tohighlight]').highlight(Saisie);
        } else {
            $('#Autocomplete').addClass('Hidden');
            $('#AC_content').html("");
        }
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
        DisplayError(jqXHR.responseText);
    });
}



function FocusLgn() {
    var LgnSelected = $('.LgnEtbSection.Selected');
    if(LgnSelected.length > 0) {
        //var pos = ($('#' + LgnSelected.attr('id')).offset().top) - ConteneurListe - ($('.LgnAccordSection.clone').outerHeight(true));       
        var pos = ($('#' + LgnSelected.attr('id')).offset().top) - ConteneurListe - ($('.LgnAccordSection').outerHeight(true));       
        $(window).scrollTop(pos);
    }
}



function ClosePopin(popin) {
    $('.Masque').addClass('Hidden');
    $(popin).removeClass('Display');
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



/// 12/07/2017
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
    $('.Masque').removeClass('Hidden'); /// Apparition masque

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