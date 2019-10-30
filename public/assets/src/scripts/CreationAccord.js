var numEtapeActuel = null;
//var AnneeEnCours = null; // Mis en commentaire car sert à une option qui a été validée à l'origine du dev. de cette appli. mais n'est plus d'actualité
var ValidateForm_part1 = null;

var DataEtape1 = {};
var DataEtape2 = Init_DataEtape2();
var DataEtape3 = "";

var DataGlobal = {
    Etape1: DataEtape1,
    Etape2: DataEtape2,
    Etape3: ""
};

var NbGrpChecked = 0;
var NbEtbChecked = 0;

var Masque = null;

var PrecedenteAnneeAccordSaisie = null;

var PopinCreationAccord_Etp1, 
    PopinCreationAccord_Etp2, 
    PopinCreationAccord_Etp3 = null;

var DatePickerDebut,
    DatePickerFin = null;

$(function () {

    /// Affectation variable globale
    Masque = $('.Masque');
    PopinCreationAccord_Etp1 = $('#PopinCreationAccord_Etp1');
    PopinCreationAccord_Etp2 = $('#PopinCreationAccord_Etp2');
    PopinCreationAccord_Etp3 = $('#PopinCreationAccord_Etp3');
    DatePickerDebut = $("#SaisieDateDebutAccord");
    DatePickerFin = $("#SaisieDateFinAccord");

    /// Fermeture popin
    $('.Popin .ClosePopin').click(function() {
        ClosePopinCreationAccord($(this));
    });

    /// Apparition 1ere popin de saisie
    $('#BtCreationAccord').on('click', function() {
        Masque.removeClass('Hidden'); /// Apparition masque
        PopinCreationAccord_Etp1.addClass('Display');
    });


    Initialisation_Etape1();

    Initialisation_Etape2();


    /// gestion des boutons 'Annuler' et 'Suivant' du popin
    /// Bt 'Annuler'
    $('.Annulation_EtapeCreateAccord').click(function() {
        numEtapeActuel = GetEtapePopin(this); /// On détermine ds quel n° d'encart on est
        switchPopins(this, false);
    });

    /// Bt 'Suivant'
     $('.Validation_EtapeCreateAccord').click(function(event) {
        numEtapeActuel = GetEtapePopin(this); /// On détermine ds quel n° d'encart on est
        switch (numEtapeActuel) {
            case 1:
                Validation_Etape1(this);
                event.preventDefault(); /// Evite de recharger la page!!
                break;
            case 2:
                Validation_Etape2(this);
                event.preventDefault(); /// Evite de recharger la page!!
                break;
            case 3:
                Validation_Etape3(this);
                event.preventDefault(); /// Evite de recharger la page!!
                break;
            default:
                console.log('Erreur !!');
        }

    });

});

/// pour déterminer à quelle étape de création d'un accord on est
function GetEtapePopin(Bt) {
    return parseInt($('#' + $(Bt).closest('.Popin').attr('id')).data('numetape'));
}


/// Gestion des boutons 'Annuler' et 'Suivant' du popin
function switchPopins(Bt, Suivant) {
    // Retrait de la popin en cours
    var IdPopin = $(Bt).closest('.Popin').attr('id');
    var Popin = $('#' + IdPopin);
    Popin.removeClass('Display');

    // Identification de l'étape à faire apparaitre
    var numEtape = (Suivant == true ? numEtapeActuel + 1 : numEtapeActuel - 1);     
    // Apparition de la popin précédente/suivante
    if((Suivant == false && numEtape > 0) || (Suivant == true && numEtape <= 3)) {
        var IdPrevOrNextPopin = "";
        $('.Popin').each(function() {
            if($(this).data('numetape') == numEtape) {
                IdPrevOrNextPopin = $(this).attr('id');
            }
        });
        $('#' + IdPrevOrNextPopin).addClass('Display');
    }
}



function ClosePopinCreationAccord(Bt) {
    var r = confirm("En fermant cet encart, vous perdrez l'ensemble des données saisies pour la création de cet accord.\nConfirmez votre choix.");
    if(r) {

        /// Disparition du masque et de la popin
        Masque.addClass('Hidden');
        var IdPopin = $(Bt).closest('.Popin').attr('id');
        $('#' + IdPopin).removeClass('Display');

        /// Réinitialisation de l'étape 1 ///
        DataEtape1 = {}; /// On vide l'objet qui stocke les infos saisies
        
        /// On vide les champs et on supprime les indicateurs d'erreur
        PopinCreationAccord_Etp1.find('input[type="text"]').val('').removeClass('Error');
        $('#SaisieTauxRev').prop('disabled', 'disabled').removeAttr('data-requis');
        $('#SaisieTauxEDI').prop('disabled', 'disabled');
        PopinCreationAccord_Etp1.find('select').removeClass('Error');
        PopinCreationAccord_Etp1.find('select option:eq(0)').prop('selected', 'selected');
        
        $('#LgnError > div').html(""); /// Suppression dernier msg d'erreur s'il y en avait un
        $('#LgnError').addClass('Hidden');

        /// Réinitialisation des datepicker, sinon garde les dates saisies avant
        DatePickerDebut.datepicker( "option", "maxDate", "+24m" );
        DatePickerFin.datepicker( "option", "minDate", +1 );


        /// Réinitialisation de l'étape 2 ///
        DataEtape2 = {
            Groupe: [],
            Etablissement: "",
            MultiAccord: null,
            MultiAccordListeEtablissements: []
        };

        /// On rend tous les etbs visibles (car sont cachés qd sélect° d'un Grp)
        PopinCreationAccord_Etp2.find('.Cln[data-type="Etbs"] span').removeClass('Hidden');
        
        /// On décoche ttes les checkboxs cochées + retraits attributs
        $('#PopinCreationAccord_Etp2 input[type="checkbox"]:checked').each(function() {
            var elem = $(this);
            elem.prop('checked', false).removeAttr('data-fromgrp').removeAttr('title').closest('span').removeClass('Selected');
        });
        // On réinitialise les variables globales et l'affichage des nbs de grpmts/etbs
        NbGrpChecked = 0;
        $('#NbGrpselected').text(NbGrpChecked);
        $('.NbEtbselected').text('0');
    
        /// réinitialisation sur Etape 3 (facultatif car cette partie est réinitialisé à chaque appel de cette étape) ///
        PopinCreationAccord_Etp3.find('#ListeEtbsChoixDestinataires ul').empty();

        numEtapeActuel = null; // Réinitialisation
    }
}



function OnlyNumeric(Chp) { 
    Chp.val(Chp.val().replace(/\D/g,'')); /// Pour n'autoriser que la saisie des chiffres
}


/// Pour identifier facilement la ligne sélectionnée
function SelectionInput(ThisInput) {
    ThisInput.closest('span').toggleClass('Selected', ThisInput.is(':checked'));
}

/// Pour activer ou non le bouton 'Suivant'
function VerifSelection(Nb_EtbsChecked) {
    var BtValid = PopinCreationAccord_Etp2.find('.Validation_EtapeCreateAccord');
    Nb_EtbsChecked > 0 ? BtValid.removeAttr('disabled') : BtValid.prop('disabled', 'disabled');
}


function GetDataAccordForHeaders() {
    var SaisieNomAccord = PopinCreationAccord_Etp1.find('#SaisieNomAccord').val(); 
    var SaisieAnneeAccord = PopinCreationAccord_Etp1.find('#SaisieAnneeAccord').val();
    var SaisieDateDebutAccord = PopinCreationAccord_Etp1.find('#SaisieDateDebutAccord').val();
    var SaisieDateFinAccord = PopinCreationAccord_Etp1.find('#SaisieDateFinAccord').val();
    var SaisieTauxEDI = PopinCreationAccord_Etp1.find('#SaisieTauxEDI').val();
    var SaisieTypeTauxRev = PopinCreationAccord_Etp1.find('#SaisieTypeTauxRev').val();
    var LibelleTypeTauxRev = $('#SaisieTypeTauxRev option:selected').text();
    var PopinCreaTauxRev = (SaisieTypeTauxRev == "1" ? " (" + $("#SaisieTauxRev").val() + "%)" : "");
    var PopinCreaTauxEDI = (SaisieTypeTauxRev == "1" ? (SaisieTauxEDI == "" ? "-" : SaisieTauxEDI) : "-");

    PopinCreationAccord_Etp2.find('.PopinCreaNomAccord').text(SaisieNomAccord);
    PopinCreationAccord_Etp2.find('.PopinCreaAnneeAccord').text(SaisieAnneeAccord);
    PopinCreationAccord_Etp2.find('.PopinCreaDateDebut').text(SaisieDateDebutAccord);
    PopinCreationAccord_Etp2.find('.PopinCreaDateFin').text(SaisieDateFinAccord);
    PopinCreationAccord_Etp2.find('.PopinCreaTypeTauxRev').text(LibelleTypeTauxRev);    
    PopinCreationAccord_Etp2.find('.PopinCreaTauxRev').text(PopinCreaTauxRev);
    PopinCreationAccord_Etp2.find('.PopinCreaTauxEDI').text(PopinCreaTauxEDI);

    /// Clonage de l'entete de la 2eme popin dans la 3eme
    $('#PopinCreationAccord_Etp3 .DataSaisiesEtp1').remove();
    $('.DataSaisiesEtp1').clone().appendTo('#PopinCreationAccord_Etp3 .TopPart');
}


function Initialisation_Etape1() {
    /// Contrôle de saisie Année de réversion
    AnneeEnCours = $('#AnneeEnCours').text();
    $('#SaisieAnneeAccord').on('keyup paste cut dragend focus', function() {
        OnlyNumeric($(this));    
    });
    
    /// Gestion des datePicker
    ParamsDatePickers(DatePickerDebut, DatePickerFin, "-24m", "+24m");

    /// Qd sélection avec liste déroulante du Taux de réversion
    $('#SaisieTypeTauxRev').on('change', function() {
        var LstDer = $(this);
        var ChpTxRev = LstDer.next('#SaisieTauxRev');
        var ChpTxEDI = $('#SaisieTauxEDI');
        if(LstDer.val() == 1) { /// si sélection Tx fixe...
            ChpTxRev.removeAttr('disabled').attr('data-requis', 'true');   
            ChpTxEDI.removeAttr('disabled');
        } else { /// si sélection Tx variable...
            ChpTxRev.prop('disabled', 'disabled').removeAttr('data-requis');   
            ChpTxEDI.prop('disabled', 'disabled');
        }
    });

    /// Controle de saisie sur champs Taux
    $('#SaisieTauxRev, #SaisieTauxEDI').on('keyup paste cut dragend focus', function() {
        var Chp = $(this);
        OnlyNumeric(Chp);
        if(Chp.val() > 100) { Chp.val(100); } /// Pour ne pas saisir + de 100%
    });
}


/// Contrôles de saisie dans 1ere popin (event passé juste pour FireFox car sinon erreur)
function Validation_Etape1(Bt) { 
    var msgErrorEmptyFields = "";
    var msgErrorYear = "";

    /// Controle sur les champs texte
    $('#PopinCreationAccord_Etp1 input').each(function(i, el) {
        var el = $(el);
        if(typeof el.attr('data-requis') !== 'undefined' && $.trim(el.val()) == '') {
            ValidateForm_part1 = false;
            el.addClass('Error');
            msgErrorEmptyFields = "<p>Un ou des champs doivent être rempli(s).</p>";
        
        // Saisie d'une année antérieure de 1an max. autorisée
        //} else if(el.attr('id') == 'SaisieAnneeAccord' && parseInt(el.val()) < parseInt(AnneeEnCours)) { 
        } else if(el.attr('id') == 'SaisieAnneeAccord' && parseInt(el.val()) + 1 < parseInt(AnneeEnCours)) { 
            ValidateForm_part1 = false; 
            el.addClass('Error'); 
            //msgErrorYear = "<p>Le champ 'Année' doit avoir une valeur égale ou postérieure à l'année en cours.</p>";
            msgErrorYear = "<p>Le champ 'Année' doit avoir une valeur postérieure ou égale à l'année précédent celle en cours ( => " + (parseInt(AnneeEnCours) - 1) + " ou après).</p>";
        } else {
            el.removeClass('Error');
        }
    });

    /// Controle sur la liste déroulante
    var Select = PopinCreationAccord_Etp1.find('select');
    if($.trim($('#PopinCreationAccord_Etp1 select > option:selected').val()) == '') {
        ValidateForm_part1 = false;
        Select.addClass('Error');
        msgErrorEmptyFields = "<p>Un ou des champs doivent être rempli(s).</p>";
    } else {
        Select.removeClass('Error');
    }

    var LgnErr = $('#LgnError');
    var LgnErrDiv = $('#LgnError > div');
    /// Si pas d'erreurs...
    if(ValidateForm_part1 != false) { 
        LgnErrDiv.html(""); /// Suppression dernier msg d'erreur s'il y en avait un
        LgnErr.addClass('Hidden');

        /// Stockage des infos de l'étape 1 dans un objet
        DataEtape1 = $('#PopinCreationAccord_FormEtp1').serializeArray();
        /// Pour ajouter le champ 'SaisieTauxRev' ds DataEtape1 si en disabled pour cause de tx variable à l'étape précédente
        var reg_TxRv = new RegExp("(SaisieTauxRev)", "g");
        if(!JSON.stringify(DataEtape1).match(reg_TxRv)) {
            DataEtape1.push({name:'SaisieTauxRev', value:''});
        }
        /// Pour ajouter le champ 'SaisieTauxEDI' ds DataEtape1 si en disabled pour cause de tx variable à l'étape précédente
        var reg_EDI = new RegExp("(SaisieTauxEDI)", "g");
        if(!JSON.stringify(DataEtape1).match(reg_EDI)) {
            DataEtape1.push({name:'SaisieTauxEDI', value:''});
        }
        

        /// Intégrer le fait que la date d'accord a pu être changé : Si oui => Appel AJAX,
        /// Si non : pas appel AJAX
        var SaisieAnneeAccord = $('#SaisieAnneeAccord').val();

        /// Si année de l'accord rentrée lors du dernier passage à l'étape 1 
        /// est différente de la date saisie antérieurement (cas ou au moins un aller-retour entre Etape 1 et Etape 2) 
        /// ou bien si 1er passage à l'étape 1, on recharge les listes des Grps et Etbs et du même coup on supprime les sélections faites par l'utilisateur antérieurement dans l'étape 2
        if(PrecedenteAnneeAccordSaisie !== SaisieAnneeAccord) {
            DataEtape2 = Init_DataEtape2(); /// Réinitialisation de l'étape 2     


            /// Appel AJAX pour charger la liste des groupes et etablissements en fonction de l'année saisie dans l'étape 1
            $.ajax({
                method: "GET",
                url: "/CreationAccord/" + SaisieAnneeAccord,
                contentType: "application/x-www-form-urlencoded; charset=UTF-8",
                ifModified: true, // Important car permet de ne pas déselectionner les checkboxs déjà cochées dans le cas de figure ou l'utilisateur est passé par l'étape 2 (et a coché) et revient sur l'étape 1 sans changer l'année puis revient sur l'étape 2
                beforeSend: function () {
                    $('.creationAccordReversion .MaskPopin').removeClass('Hidden');
                }
            })
            .done(function (data) {
                $('#PopinCreationAccord_FormEtp2').html(data);

                /// Passage au prochain popin
                switchPopins(Bt, true);

                GetDataAccordForHeaders();
            })
            .fail(function (err) {
                DisplayError_NEW(err.responseText);
            })
            .always(function () {
                /// Retrait masque
                $('.creationAccordReversion .MaskPopin').addClass('Hidden');
            });


        } else {
            switchPopins(Bt, true); /// Passage au prochain popin
            GetDataAccordForHeaders(); 
        }
        PrecedenteAnneeAccordSaisie = SaisieAnneeAccord;
        

    /// ...Sinon si erreurs...
    } else {    
        /// Affichage msg d'erreur
        LgnErrDiv.html(msgErrorEmptyFields + msgErrorYear);
        LgnErr.removeClass('Hidden');
        /// Réinitialisation
        ValidateForm_part1 = true;
        msgErrorEmptyFields = "";
        msgErrorYear = "";
        DataEtape1 = {};
    }

}



function Initialisation_Etape2() {
    /// Quand sélection d'un groupement, sélection automatique de tous les établissements de ce groupement
    PopinCreationAccord_Etp2.on('click', '.Cln[data-type="Grps"] input[type="checkbox"]', function() {
        var chkbx = $(this);
        var GroupId = chkbx.attr('id').replace('Grp_', '');
        var NomGrp = chkbx.next('label').text(); 

        /// On détermine si on coche ou on décoche
        var selectionne = null;
        selectionne = IsChecked(chkbx);

        /// Controles de saisie sur les checkboxs Groupement pour interdire des cas de figure invraisemblables (1 grp + 1 etb avec accord individuel)
        var NbEtbsNotFromGrpChecked = PopinCreationAccord_Etp2.find('.Cln[data-type="Etbs"] input[type="checkbox"]:checked:not([data-fromgrp])').length;
        if(NbEtbsNotFromGrpChecked > 0) {
            alert("Vous ne pouvez pas ajouter un groupement à un accord individuel (accord comprenant un établissement à titre individuel et non pas comme faisant partie d'un groupement) !");
            return false;
        }

        SelectionInput(chkbx); /// Mise en évidence visuelle de la checkbox cochée

        /// Appel pour avoir la liste des id Etablissements pour le groupe sélectionné
        $.ajax({
            method: "POST",
            url: "/CreationAccord/GetLstEtbs",
            data: {IdGrp: GroupId},
            contentType: "application/x-www-form-urlencoded; charset=UTF-8",
            ifModified: true,
            beforeSend: function () {
                $('.creationAccordReversion .MaskPopin').removeClass('Hidden');
            }
        })
        .done(function (data) {
            if(data.length != 0) {
                var Etbs_checkboxes = PopinCreationAccord_Etp2.find('.Cln[data-type="Etbs"] input[type="checkbox"]');
            
                data.forEach(function(el) {
                    var GoodCheckbox = Etbs_checkboxes.filter("[value='" + el.EtablissementId + "']");
                    
                    if(selectionne) {   /// Si sélection...
                        /// On sélectionne la checkbox + ajout de l'attribut qui le relie au grp + ajout attr. title sur checkbox et intitulé établissement
                        GoodCheckbox.prop('checked', true).attr('data-fromgrp', GroupId).attr('title', "Sétectionné comme faisant partie du groupement '" + NomGrp + "'").closest('span').addClass('Selected');
                        GoodCheckbox.next('label').attr('title', "Sétectionné comme faisant partie du groupement '" + NomGrp + "'");
                    } else { ///... sinon si désélection
                        GoodCheckbox.prop('checked', false).removeAttr('title').closest('span').removeClass('Selected');
                        GoodCheckbox.next('label').removeAttr('title');
                    }
                });
                

                
                /// Affectation du nb de groupemements et établissements cochés dans entetes des colonnes de checkbox
                NbGrpChecked = PopinCreationAccord_Etp2.find('.Cln[data-type="Grps"] input[type="checkbox"]:checked').length;
                NbEtbChecked = PopinCreationAccord_Etp2.find('.Cln[data-type="Etbs"] input[type="checkbox"]:checked').length;
                $('#NbGrpselected').text(NbGrpChecked);
                $('.NbEtbselected').text(NbEtbChecked);
                
                
                /// Pour n'afficher que les établissements des groupes sélectionnés 
                var AllEtbsNotSelected = PopinCreationAccord_Etp2.find('.Cln[data-type="Etbs"] li > span:not(.Selected)');
                var AllEtbsSelected = PopinCreationAccord_Etp2.find('.Cln[data-type="Etbs"] li > span.Selected');
                var EtbsFromThisGrp = PopinCreationAccord_Etp2.find('.Cln[data-type="Etbs"] input[data-fromgrp="' + GroupId + '"]');
                //console.warn('/////////////////// NbGrpChecked : ' + NbGrpChecked + ' | selectionne : ' + selectionne + ' | GroupId : ' + GroupId + ' //////////////////////');//TEST
                if(selectionne) {   // Si sélection...
                    AllEtbsNotSelected.addClass('Hidden'); 
                    AllEtbsSelected.removeClass('Hidden');
                } else { // ...sinon...
                    EtbsFromThisGrp.removeAttr('data-fromgrp');
                    if(NbGrpChecked == 0) {
                        AllEtbsNotSelected.removeClass('Hidden'); 
                    } else {
                        EtbsFromThisGrp.closest('span').addClass('Hidden')
                    }
                }

                /// Enregistrement data
                RecordData(data, selectionne, 'Grp');

                
                /// Enable ou pas bt 'Suivant' en vérifiant si au moins 1 Etb de coché
                VerifSelection(NbEtbChecked); 

            } else {
                alert("Il n'existe aucun établissement pour ce groupement!");
            }

        })
        .fail(function (err) {
            DisplayError_NEW(err.responseText);
        })
        .always(function () {
            /// Retrait masque
            $('.creationAccordReversion .MaskPopin').addClass('Hidden');
        });
    });


    /// Quand sélection d'un établissement
    PopinCreationAccord_Etp2.on('click', '.Cln[data-type="Etbs"] input[type="checkbox"]', function() {
        var chkbx = $(this);
        var selectionne = null;
        selectionne = IsChecked(chkbx);
        
        /// Controles de saisie sur les checkboxs Etablissements pour interdire des cas de figure invraisemblables (1 grp + 1 etb, plusieurs etbs n'appartenant pas à un grp,...)
        NbEtbChecked = PopinCreationAccord_Etp2.find('.Cln[data-type="Etbs"] input[type="checkbox"]:checked').length;
        console.log('click sur chbx Etb : NbGrpChecked --> ' + NbGrpChecked + ' | NbEtbChecked : ' + NbEtbChecked); //TEST
        
        if(selectionne) { /// Si etb checké...

            if(chkbx.is('[data-fromgrp]') == false) { ///...mais n'est pas checké parce que faisant partie d'un groupement
                if(NbGrpChecked > 0) {
                    alert("Vous ne pouvez pas ajouter un établissement à un accord avec un groupement !");
                    return false;
                }
                else if(NbEtbChecked > 1) {
                    alert("Vous ne pouvez pas sélectionner plusieurs établissements en dehors du cas d'un accord de groupement !");
                    return false;
                }
            }

        }

        /// Enregistrement data
        RecordData(chkbx.val(), selectionne, 'Etb');

        SelectionInput(chkbx); /// Mise en évidence visuelle de la checkbox cochée

        /// Compte du nb de groupememnts et établissements cochés dans entetes des colonnes de checkbox
        $('.NbEtbselected').text(NbEtbChecked);

        VerifSelection(NbEtbChecked); /// Enable ou pas bt 'Suivant' en vérifiant si au moins 1 Etb de coché
    });



    /// Apparition encart info pour signalement Groupement pas dispo
    var MsgGrpPasDispo = $('.MsgGrpPasDispo');
    var MsgEtbPasDispo = $('.MsgEtbPasDispo');
    
    $('#PopinCreationAccord_FormEtp2').on('mouseenter', '.Cln[data-type="Grps"] input[type="checkbox"]:disabled + label', function() { MsgGrpPasDispo.removeClass('Hidden'); });
    $('#PopinCreationAccord_FormEtp2').on('mouseleave', '.Cln[data-type="Grps"] input[type="checkbox"]:disabled + label', function() { MsgGrpPasDispo.addClass('Hidden'); });
    
    $('#PopinCreationAccord_FormEtp2').on('mouseenter', '.Cln[data-type="Etbs"] input[type="checkbox"]:disabled + label', function() { MsgEtbPasDispo.removeClass('Hidden'); });
    $('#PopinCreationAccord_FormEtp2').on('mouseleave', '.Cln[data-type="Etbs"] input[type="checkbox"]:disabled + label', function() { MsgEtbPasDispo.addClass('Hidden'); });
}


function RecordData(data, checked, TypeSelection) {     console.log('TypeSelection : ' + TypeSelection); //TEST
    if(TypeSelection == 'Grp') {

        if(checked == true) { /// Si sélection d'un groupe...       /// A FAIRE : Checker aussi si le 'data[0].GroupementId' n'est pas déjà dans le tableau
            /// Constitution de la liste des idEtablissements
            var tabEtbId = [];
            data.forEach(function(el) {
                tabEtbId.push(el.EtablissementId);
            });
            /// Intégration des valeurs dans la propriété 'Groupe' de l'objet
            DataEtape2.Groupe.push({ IdGroupe: data[0].GroupementId, ListeEtbsGroupe: tabEtbId });
        } else { /// ...Sinon si désélection d'un groupe
            /// On détermine la position de l'objet à supprimer dans le tableau de la propriété 'Groupe'
            var j = null;
            $.each(DataEtape2.Groupe, function(i, el) {
                if(el.IdGroupe == data[0].GroupementId) { j = i; return false; }
            });
            
            /// Retrait du groupe et de ses établissements
            DataEtape2.Groupe.splice(j, 1);
        }

    } else if(TypeSelection == 'Etb') {

        var chbx = $('#Etb_' + data);

        if(checked == true) {   /// Si sélection d'un établissement... 
            
            if(chbx.is('[data-fromgrp]')) { /// Si cet etb est sélectionné parce que click sur checkbox Groupement /// CHECKER AUSSI SI EXISTE DEJA
                // Ajouter l'idEtabl. de DataEtape2.Groupe[x].ListeEtbsGroupe[y] : Peut-être utiliser Underscore
                $.each(DataEtape2.Groupe, function(i, el) {
                    if(el.IdGroupe == chbx.data('fromgrp')) {
                        el.ListeEtbsGroupe.push(parseInt(data));
                    }
                });
            } else {
                DataEtape2.Etablissement = data;
            }

        } else { /// ...Sinon si désélection d'un établissement

            if(chbx.is('[data-fromgrp]')) { /// Si cet etb est sélectionné parce que click sur checkbox Groupement
                // retrait de l'idEtabl. de DataEtape2.Groupe[x].ListeEtbsGroupe[y] : Peut-être utiliser Underscore
                $.each(DataEtape2.Groupe, function(i, el) {
                    if(el.IdGroupe == chbx.data('fromgrp')) {
                        $.each(el.ListeEtbsGroupe, function(j, elmt) {
                            if(elmt == parseInt(data)) {
                                el.ListeEtbsGroupe.splice(j, 1);
                            }
                        });
                    }
                });
            } else {
                DataEtape2.Etablissement = "";
            }
        }
    
    }

    console.log('JSON.stringify(DataEtape2) : ' + JSON.stringify(DataEtape2)); //TEST
}

/// pour déterminer si une checkbox est sélectionnée ou pas
function IsChecked(chbx) {
    return ( chbx.prop('checked') ? true : false );
}


function Validation_Etape2(Bt) {
    DataEtape2.MultiAccord = false; /// Valeur par défaut

    /// Choix entre un accord de groupement, ou autant d'accords que d'établissements et donc pas un accord de groupement
    if(NbGrpChecked > 0) {

        Masque.addClass('Hover');
        $('#EncartEtape2TypeAccord').removeClass('Hidden');

        $('#EncartEtape2TypeAccord .Bt').click(function() {
            
            if($(this).attr('id') == 'Bt_CreaAccEtbs') { /// Click sur bt 'Accords établissements'
                //console.log('On a cliqué sur Accord Etbs !'); //TEST

                DataEtape2.MultiAccord = true;
                /// Transfert des idEtablissements de la propriété 'Groupe' vers la propriété 'MultiAccordListeEtablissements' 
                $.each(DataEtape2.Groupe, function(i, el) { /// pour chacun des groupes...
                    $.each(el.ListeEtbsGroupe, function(j, elmt) { ///...on parcourt chacun des établissements...
                        DataEtape2.MultiAccordListeEtablissements.push(elmt);
                    });
                });
                /// On vide la propriété 'Groupe'
                DataEtape2.Groupe = [];

                /// On désélectionne le(s) groupement(s) et tout ce qui va avec
                PopinCreationAccord_Etp2.find('.Cln[data-type="Grps"] input[type="checkbox"]:checked').prop('checked', false).closest('span').removeClass('Selected'); /// Désélection du/des groupemement(s)
                NbGrpChecked = 0;/// Variable 'NbGrpChecked' réinitialisée
                $('#NbGrpselected').text(NbGrpChecked);
                PopinCreationAccord_Etp2.find('.Cln[data-type="Etbs"] input[type="checkbox"]:checked').removeAttr('data-fromgrp').removeAttr('title'); /// Retrait propriété [data-fromgrp] sur ttes des checkboxs Etb
            
                /// Enregistrement ds la bdd
                RecordDataBDD();
                
            } else if ($(this).attr('id') == 'Bt_CreaAccGrp') { /// Click sur bt 'Accord groupement'

                /// Passage au prochain popin
                switchPopins(Bt, true);
                Initialisation_Etape3();

            }

            /// Retrait masque et disparition encart
            Masque.removeClass('Hover');
            $('#EncartEtape2TypeAccord').addClass('Hidden');
        });
    
    } else { /// Si pas de groupe(s) sélectionné(s), donc pas accord de groupement mais accord individuel --> pas besoin de l'étape 3
        /// Enregistrement ds la bdd
        RecordDataBDD();
    }

} 



function Initialisation_Etape3() {
    /// On récupère la liste des établissements
    var ListeGroupement = DataEtape2.Groupe;
    var ListeEtbsAccordIndividuel = DataEtape2.MultiAccordListeEtablissements;

    /// Si groupement sélectionné à l'étape précédente...
    if(ListeGroupement.length > 0 && ListeEtbsAccordIndividuel.length == 0) {
        /// On initialise la liste (sinon accumulation d'établ. ds la liste avec allers-retours)
        $('#ListeEtbsChoixDestinataires ul').empty();

        ListeGroupement.forEach(function(el) {
            el.ListeEtbsGroupe.forEach(function(elmt) {
                /// On créé les boutons radio dans la 3eme popin
                var NomEtb = PopinCreationAccord_Etp2.find('.Cln[data-type="Etbs"] input[type="checkbox"][value="' + elmt + '"]:checked').next('label').html();
                $("<span><input id='ChxDest_" + elmt + "' name='ChoixDestinataire' value='" + elmt + "' type='radio'><label for='ChxDest_" + elmt + "'>" + NomEtb + "</label></span>").appendTo('#ListeEtbsChoixDestinataires ul').wrap("<li></li>");
            });
        });

        /// Partie classement par ordre alphabétique
        /// Création d'un tableau d'objets avec comme une des propriétés les valeurs à trier
        var ListeEtbsAordonner = [];
        $.each($('#ListeEtbsChoixDestinataires ul li'), function () {
            ListeEtbsAordonner.push({ Data_ClnToOrder: ($(this).find('label').text()).toUpperCase(), DOM_Lgn: $(this) });
        });
        /// Classement du tableau
        ListeEtbsAordonner.sort(function (a, b) { return (a.Data_ClnToOrder > b.Data_ClnToOrder) ? 1 : ((b.Data_ClnToOrder > a.Data_ClnToOrder) ? -1 : 0); });
        /// On réinitialise et on alimente l'élément DOM qui contient la liste des participants 
        $('#ListeEtbsChoixDestinataires ul').empty();
        $.each(ListeEtbsAordonner, function (key, val) {
            $('#ListeEtbsChoixDestinataires ul').append(val.DOM_Lgn);
        });


        /// Quand sélection d'un établissement
        var BtsRadio = $('#PopinCreationAccord_Etp3 input[type="radio"]');
        BtsRadio.on('click', function() {
            /// Mise en évidence visuelle du bouton radio coché
            $('#ListeEtbsChoixDestinataires li span').removeClass('Selected');
            SelectionInput($(this)); 

            /// Enable bt 'Valider'
            $('#PopinCreationAccord_Etp3 .Validation_EtapeCreateAccord').removeAttr('disabled');
        });


    } else if(ListeGroupement.length > 0 && ListeEtbsAccordIndividuel.length > 0) {
        throw new Error("Une erreur s'est produite dans la construction le l'objet stockant les données saisies à l'étape précédente !");
    }
}




function Validation_Etape3() {
    /// Enregistrement de la data pour l'établissement destinataire
    //DataEtape3 = $('#PopinCreationAccord_FormEtp3').serializeArray();
    DataEtape3 = $('#ListeEtbsChoixDestinataires input[type="radio"]:checked').val();
    /// Enregistrement dans bdd de ttes les infos saisies
    RecordDataBDD();
}


function RecordDataBDD() {
    DataGlobal.Etape1 = DataEtape1;
    DataGlobal.Etape2 = DataEtape2;
    DataGlobal.Etape3 = DataEtape3;

    console.log(DataGlobal); //TEST

    /// Enregistrement dans bdd de ttes les infos saisies
    $.ajax({
        method: "POST",
        url: "/CreationAccord",
        /* Envoie la data sous forme de JSON --> Le content-type doit être en 'application/json' ET le data impérativement en JSON.stringify() + coté node le Middleware dans app.js avec 'app.use(bodyParser.json())' pour interpréter le JSON */
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify(DataGlobal),
        dataType: "json",
        beforeSend: function () {
            $('.creationAccordReversion .MaskPopin').removeClass('Hidden');
        }
    })
    .done(function (data) {
        /// Si succès au niveau de l'enregistrement des données, redirection vers la pg de modif d'un accord 
        if (typeof data.redirect == 'string') {     //console.warn('data.redirect' + data.redirect); //TEST
            window.location = data.redirect;
        } else {
            console.warn('Problème lors de la redirection !');
        }
    })
    .fail(function (err) {
        DisplayError_NEW(err.responseText);
    })
    .always(function () {
        /// Retrait masque
        $('.creationAccordReversion .MaskPopin').addClass('Hidden');
    });
}


function Init_DataEtape2() {
    return {
        Groupe: [],
        Etablissement: "",
        MultiAccord: null,
        MultiAccordListeEtablissements: []
    }
}