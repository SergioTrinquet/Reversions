//var LastSeizure = null;
$.SaisieTxPool = [];
var AccordGroupe = null;

$(function () {

    ///--- Pour formater les nombres ---///
    numeral.defaultFormat('0,0.00'); //--> pour imposer une séparation ts les 3 chiffres et 2 chiffres après la virgule
    // load a locale
    numeral.register('locale', 'fr', { //--> Pour imposer un espace comme séparateur ts les 3 chiffres, et une virgule avant les décimales 
        delimiters: {
            thousands: ' ',
            decimal: ','
        }
    });
    // switch between locales
    numeral.locale('fr');
    ///--- FIN : Pour formater les nombres ---///




    ///--- Bouton affichage du popin 'détails exclusion réversion' ---///
    $('.Bt_AppelPopinDetailsExclusion').on('click', function() {
        $('.Masque').removeClass('Hidden'); /// Apparition masque
        var Id_Lgn = $(this).closest('tr').attr('id');
        
        /// Appel Ajax pour récupérer les infos sur les exclusions
        var IDlgnReversion = $(this).data('idlgnreversionetb'); 
        //console.log('IDlgnReversion : ' + IDlgnReversion); //TEST
        $.ajax({
            url: "/ListeFacturesEtbl",
            method: "POST",
            data: { ID_lgnReversion: IDlgnReversion },
            contentType: "application/x-www-form-urlencoded; charset=UTF-8"
        })
        .done(function (data) {
            if($.trim(data) != "") {
                $('.PopinDetailsExclusionReversion .CentralPart').html(data);

                /// On met des infos de la facture dans l'entete de la popin
                var LienFacture = $('#' + Id_Lgn + ' .LienFacture').text();
                var Datefacture = $('#' + Id_Lgn + ' .DateFacture').text();
                var Periodefacture = $('#' + Id_Lgn + ' .PeriodeFacture').text();
                $('.Popin .PopinNumfacture').text(LienFacture);
                $('.Popin .PopinDatefacture').text(Datefacture);
                $('.Popin .PopinPeriodeFacture').text(Periodefacture);

                $('.Popin').addClass('Display');  
            }
        });
       
    });


    ///--- Boutons Annulation du popin ---///
    /*$('#Annulation_ModifExclusionReversion, .Popin .ClosePopin').click(function() {*/ /* Temporairement en commentaire */
    $('.Popin .ClosePopin').click(function() {
        ClosePopin('.PopinDetailsExclusionReversion');
    });












    AccordGroupe = $('#AccordGroupe').data('accordgroupe'); /// Pour savoir si accord groupe ou étbl.
    
    var TypeTaux = $('.Tx').data('typetaux'); /// Check s'il s'agit d'un taux fixe ou variable
    var IDaccord = $('#IDaccord').text(); /// Récupération n° de l'accord
    var booRadio = null;


    ///--- Gestion des puces 'pris en compte' et 'ignoré' ---///
    $('.ChampsRev input[type="radio"]').on('click', function() {

        /// Pour permettre de déchecker un bouton radio, ce qui n'est pas possible nativement
        if(booRadio == this){
            this.checked = false;
            booRadio = null;
        }else{
            booRadio = this;
        }

        var coche = null;
        var ChangementTaux = null;
        var HorsContrat = $(this).closest('.FdListe').hasClass('HorsContrat');   //console.log(HorsContrat);
        var IdLgnFacture = $(this).closest('tr').attr('id');
        var OrdreReversionFacture = $(this).closest('div').data('encaissement');

        coche = (($(this).prop('checked') && ($(this).data('cln') == 'PrisEnCompte')) ? true : false);
        //console.log(IdLgnFacture + ' / coché: ' + coche); //TEST

        if(TypeTaux == 'Variable') {

            /// Calcul de la somme totale des réversions pour savoir si on passe un palier ou pas.
            /// On passe en paramètre le montant ou bien l'ID qui permet de retrouver le montant de 
            /// réversion coché, ici le name qui contient le n° de facture et le numéro de l'encaissement (1er ou 2eme,...). 
            /// Le 2eme argument est pour savoir si on soustrait le montant (coche=false) ou on l'aditionne (coche=true)
            ChangementTaux = CheckChangementPalierTaux($(this).attr('name') , coche); 
            
            if(ChangementTaux.ChgmtPourcentage) {
                /// Recalcul et rafraichissement données Réversion de chaque lgn facture  + Totaux en bas de page
                /// en passant en paramètre l'IDaccord et le nv tx
                CalculReversionsFactures(IDaccord, ChangementTaux.NvPourcentage);
            } else {
                PriseEnCompteFacture(IdLgnFacture, OrdreReversionFacture, coche);
            }
        } else if((TypeTaux == 'Fixe') && (HorsContrat == false)) { /// Si taux fixe ET click au niveau des encarts Catalogues (pas Hors contrat)
            PriseEnCompteFacture(IdLgnFacture, OrdreReversionFacture, coche);
        }

    });


    ///--- Pour faire disparaitre les lignes de factures validées ---///
    var boolean = false;
    $('#DisplayNonvalidatedLgns').click(function() {
        $('.ChampsRev .Validated').toggle(boolean);

        if(boolean) {
            $(this).html("<i class='fa fa-eye-slash'></i> Masquer les lignes validées");
            boolean = false;    
        } else {
            $(this).html("<i class='fa fa-eye'></i> Afficher les lignes validées");
            boolean = true;      
        }
    });



    ///--- Ligne qui apparait que lorsque réversions sont déjà validées ou lorsque accord de groupement ---///
    if(($('.Validated').length > 0) || (typeof AccordGroupe == 'true')) {

        $('.MoreOptions').removeClass('Hidden');

        /// Apparition bandeau en haut de page
        $(window).scroll(function () {
            if ($(window).scrollTop() > 0) {
                $('.NavEtbl').addClass('Reduced');
                $('.MoreOptions').addClass('Display');
            } else {
                $('.NavEtbl').removeClass('Reduced');
                $('.MoreOptions').removeClass('Display');
            }
        });

    }


    ///--- Toggle sur encarts catalogue ---///
    $('.togglefacturesCat').on('click', function() {
        var IdBloc = $(this).closest('.blocCat').attr('id');
        var BlocsCatFnr = $('#' + IdBloc + ' .blocCatFnr');
        if (BlocsCatFnr.length > 0) {
            BlocsCatFnr.toggleClass('Hidden');
            $(this).toggleClass('fa-minus-square').toggleClass('fa-plus-square', $('#' + IdBloc + ' .blocCatFnr:eq(0).Hidden').length > 0);
        }
    });


    ///--- Bt de validation ---///
    $('#ValidReversion').click(function() {
        var r = confirm("Etes-vous sûr de vouloir valider la réversion ?");
        if(r) {
            /// submit() le form;
        }
    });





    /******* A VIRER - Partie 1 *******/    /*
    ///--- Gestion champ de saisie du Taux total dans le bandeau en haut de page ---///
    var SommeTxInitial = parseInt($('#ValeurTauxRev').text()) + parseInt($('#TauxSupplementaire').text());
    $('#SaisieTauxReversion').val(SommeTxInitial);
    
    $('#SaisieTauxReversion').on('keyup paste cut dragend focus', function() {
        /// Pour n'autoriser que la saisie des chiffres
        var Ceci = $(this);
        Ceci.val(Ceci.val().replace(/\D/g,''));
        /// Pour ne pas saisir + de 100%
        if(Ceci.val() > 100) { Ceci.val(100); }

        $('#ValeurTauxRev, #TauxSupplementaire').toggleClass('raye', parseInt(Ceci.val()) !== SommeTxInitial);
    
        suppress($.SaisieTxPool); // Appel de la fonction 'suppress' pour vider le pool
        $.SaisieTxPool.push(setTimeout("CheckModifChpSaisie(" + Ceci.val() + ")", 1000)); /// Une fois le pool vide, ajout de la fonction qui fait l'appel AJAX et qui se déclenche au bout d'1 sec.
    });

    /// Cas ou le champ est vide, ce qui ne doit pas être possible
    $('#SaisieTauxReversion').on('blur', function() {
        if($(this).val() === '') {
            $(this).val(SommeTxInitial);
            $('#ValeurTauxRev, #TauxSupplementaire').removeClass('raye');
        }
    });
    ///--- FIN Gestion champ de saisie du Taux total dans le bandeau en haut de page ---///
    */





});



/******* A VIRER - Partie 2 *******/  /*
///--- Déclenche la fonction 'CalculReversionsFactures' sous certaines conditions ---///
function CheckModifChpSaisie(ChpSaisieTxVal) { 
    //console.log('ChpSaisieTxVal : ' + ChpSaisieTxVal + ' / LastSeizure : ' + LastSeizure); //TEST
    if((ChpSaisieTxVal !== LastSeizure) && (LastSeizure != null) && (typeof ChpSaisieTxVal != 'undefined')) {
        console.log("Haven't checked in 1000ms!"); //TEST
        CalculReversionsFactures();
    }
    LastSeizure = ChpSaisieTxVal;
}
*/



/// Pour vérifier si à la suite de la prise en compte de la facture, on passe un seuil 
/// et on change de taux de réversion, auquel cas on doit recalculer chaque montant de réversion 
/// ainsi que les totaux en bas de page.
function CheckChangementPalierTaux(nameRadio, coche) {
    /// 1. Prélèvement montant total du VA --> Peut-être le prendre en Jquery en bas de page (Ne pas oublier de prendre en compte % de l'EDI si c'est le cas)
    /// 2. Calcul avec le nouveau montant (à ajouter ou retirer selon valeur de la variable 'coche')
    /// 3. return {'ChgmtPourcentage': true or false, 'NvPourcentage': Nouveau pourcentage qd true ou rien de tout};

    return { 'ChgmtPourcentage': true, 'NvPourcentage': 27 }; /// --> JUSTE POUR LA PHASE DE TEST : A VIRER ULTERIEUREMENT !!!!!!!!!!!!
}


///--- Addition ou soustraction de l'encaissement coché, pour obtenir les nouvelles valeurs de totaux en bas de l'écran ---///
function PriseEnCompteFacture(IdLgnFacture, OrdreReversionFacture, coche) {
    //console.log(OrdreReversionFacture); //TEST

    /*
    $.ajax({
        url: "",
        type: "POST",
        async: false,
        data: JSON.stringify({ ID_LgnFacture: IdLgnFacture, PrisenCompte: coche }),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        beforeSend: function () {
            $('.Masque').removeClass('Hidden'); /// Apparition masque
        })
        .done(function (data) {
            //$('.Masque').addClass('Hidden'); /// retrait masque
            /// récupération des valeurs 'Montant total VA', 'Somme prév. réversion' et 'Somme totale réversion'
            $('#TotalVA').text(data.TotalVA);
            $('#SumPrevReversion').text(data.SumPrevReversion);
            $('#SumTotaleReversion').text(data.SumTotaleReversion);  
        })
        .fail(function (jqXHR) {
        })
        .always(function () {
            $('.Masque').addClass('Hidden'); /// Retrait masque
        })
    });
    */

    /// Valeurs pour test
    var data = {
        TotalVA: 5000000.00,
        SumPrevReversion: 123456.05,
        SumTotaleReversion: 44444.66,
        TotalVA_Etb: 64427.66, // Dans cas d'un accord avec un groupement
        SumPrevReversion_Etb: 6104.00, // Dans cas d'un accord avec un groupement
        SumTotaleReversion_Etb: 5856.65 // Dans cas d'un accord avec un groupement
    };
    /// Code qui sera inclus dans la partie '.done()' de la partie ajax
    //$('#TotalVA').text(data.TotalVA);
    $('#TotalVA').text(numeral(data.TotalVA).format());
    $('#SumPrevReversion').text(numeral(data.SumPrevReversion).format());
    $('#SumTotaleReversion').text(numeral(data.SumTotaleReversion).format());

    /// Seulement dans le cas d'un accord avec Groupe
    if(AccordGroupe == 'true') {
        $('#TotalVA_Etb').text(numeral(data.TotalVA_Etb).format());
        $('#SumPrevReversion_Etb').text(numeral(data.SumPrevReversion_Etb).format());
        $('#SumTotaleReversion_Etb').text(numeral(data.SumTotaleReversion_Etb).format());
    }
}


///--- Calcul réversions sur toutes les lignes de factures ---///
function CalculReversionsFactures(IDaccord, NvPourcentage) {

    /*
    /// On supprime les requetes AJAX en cours
    $.SaisieTxPool.abortAll = function () {
        $(this).each(function (idx, jqXHR) {
            jqXHR.abort();
        });
        $.SaisieTxPool = [];
    };
    $.SaisieTxPool.abortAll();
    */

    /*
    $.ajax({
        url: "",
        type: "POST",
        async: false,
        data: JSON.stringify({ IDaccord: IDaccord, NvPourcentage: NvPourcentage }),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        beforeSend: function (jqXHR) {
            $.SaisieTxPool.push(jqXHR); /// Ajout requete dans le pool
            $('.Masque').removeClass('Hidden'); /// Apparition masque
        })
        .done(function (data) {
            //$('.Masque').addClass('Hidden'); /// retrait masque
            /// Récupération de l'objet JSON avec tous les nouveaux montants de réversion + les 'Montant total VA', 'Somme prév. réversion' et 'Somme totale réversion'

        })
        .fail(function (jqXHR) {
        })
        .always(function () {
            $('.Masque').addClass('Hidden'); /// Retrait masque
        })
    });
    */

    /// Valeurs pour test
    var data = {
        NouveauTaux: 27,
        ListeReversions:[
            { IDfacture: 'FA16002201', SommeReversion: [84.00, 42.00] }, 
            { IDfacture: 'FA16002212', SommeReversion: [96.58] },
            { IDfacture: 'FA16002416', SommeReversion: [42.00] }, 
            { IDfacture: 'FA16002108', SommeReversion: [39.50] }, 
            { IDfacture: 'FA16002204', SommeReversion: [42.00] }, 
            { IDfacture: 'FA16002206', SommeReversion: [420.00] }
        ],
        TotalVA: 5269000.00,
        SumPrevReversion: 111111.06,
        SumTotaleReversion: 1288.55,
        TotalVA_Etb: 157071.00, // Dans cas d'un accord avec un groupement
        SumPrevReversion_Etb: 12144.00, // Dans cas d'un accord avec un groupement
        SumTotaleReversion_Etb: 10103.33 // Dans cas d'un accord avec un groupement
    };

    /// Code qui sera inclus dans la partie '.done()' de la partie ajax
    //$('#ValeurTauxRev').text(data.NouveauTaux);
    $.each(data.ListeReversions, function (key, val) {
        $.each(val.SommeReversion, function (k, v) {
            $('#' + val.IDfacture + ' .MontantReversion.' + (k+1)).text(numeral(v).format());
        });
    });
    $('#TotalVA').text(numeral(data.TotalVA).format());
    $('#SumPrevReversion').text(numeral(data.SumPrevReversion).format());
    $('#SumTotaleReversion').text(numeral(data.SumTotaleReversion).format());

    /// Seulement dans le cas d'un accord avec Groupe
    if(AccordGroupe == 'true') {
        $('#TotalVA_Etb').text(numeral(data.TotalVA_Etb).format());
        $('#SumPrevReversion_Etb').text(numeral(data.SumPrevReversion_Etb).format());
        $('#SumTotaleReversion_Etb').text(numeral(data.SumTotaleReversion_Etb).format());
    }

}



/// Appel AJAX executé que quand la saisie ds le champ s'arrête (1 sec. après) pour éviter requetes AJAX inutiles        
function suppress(PoolSaisieTaux) {
    $(PoolSaisieTaux).each(function (idx, toto) {
        //console.log(toto); //TEST
        clearTimeout(toto);
    });
    PoolSaisieTaux = [];
}



function ClosePopin(popin) {
    $('.Masque').addClass('Hidden');
    $(popin).removeClass('Display');
}