const colors = require('colors'); // juste pour le développement
const fs = require('fs'); // juste pour le développement

const _ = require('underscore');
const sql = require('mssql');
const dateFormat = require('dateformat');
var config = JSON.parse(JSON.stringify(require('config').get('dbConfig'))); // Nvelle version avec module 'config'
var logger = require('../log/logConfig.js').logger; // Pour les logs
var userRightsAccess = require('../app_modules/userRights.js'); /// Middleware pour gérer les accès en fonction des droits de l'utilisateur

var recordset_Tx = [];
var ListeCats = [];

var btAddEtbActivation = null;


/// Essai avec 'async' pour supprimer les callbacks <= Fonctionne !!!
const async = require('async');



module.exports = function(app) {
    //console.log('Mode : ' + process.env.NODE_ENV)

    /// Page 'RechercheAccords' est la page par défaut
    app.get('/', function(req, res, next) {
        res.redirect('/RechercheAccords');
    });

    /// Lorsque clic sur bouton 'Définir les marchés', affichage des catalogues et fournisseurs auquel l'établissement a droit + les fournisseurs exclus
    app.get('/RechercheAccords/Marches/:idAccord/:EtbId', userRightsAccess, function(req, res, next) {
        //console.log(colors.bgWhite.black(JSON.stringify(req.params))); //TEST
        if(req.xhr == true) { 
            /* V1 */ /* 
            /// Pour connaitre les catalogues auxquels a droit l'établissement dans l'encart 'Définir les marchés'
            GetListeCataloguesEtablissement(function(recordset) {
                var CatsInterdits = recordset[0];
                /// pour récupérer les fnrs exclus pour cet établissement
                GetFnrsExclusEtablissement(function(recordset) { 
                    var FnrsExclus = recordset[0];
                    res.send({CatsInterdits: CatsInterdits, FnrsExclus: FnrsExclus});
                }, req.params, next);
            }, req.params, next);
            */

            /* V2 */ /// Utiliser un Array au lieu d'un Objet ci-dessous garantie l'ordre d'éxecution des fonctions (autrement pas garanti !!)
            async.series({
                CataloguesInterdits : function (callback) {
                    GetListeCataloguesEtablissement(function(recordset) {
                        var CatsInterdits = recordset[0];
                        //callback();
                        callback(null, CatsInterdits);
                    }, req.params, next);
                },
                FournisseursExclus : function (callback){
                    GetFnrsExclusEtablissement(function(recordset) {
                        var FnrsExclus = recordset[0];
                        //callback();
                        callback(null, FnrsExclus);
                    }, req.params, next);
                }
            },
            // optional callback
            function(err, results){
                //if(err) { logger.log('error', err); };
                res.send({CatsInterdits: results.CataloguesInterdits, FnrsExclus: results.FournisseursExclus});
            });
            /**/

         }
    });


    /// Lorsque clic sur bouton 'Afficher les fnrs exclus' (existe seulement en mode lecture sur la page de recherche des accords) : Affichage des fournisseurs exclus
    app.get('/RechercheAccords/FnrsExclus/:idAccord/:EtbId', userRightsAccess, function(req, res, next) {
        GetFnrsExclusEtablissement(function(recordset) {
            res.send({FnrsExclus: recordset[0]});
        }, req.params, next);
    });



    /// Lorsque clic sur ajout d'un établissement dans ligne Accord
    app.get('/RechercheAccords/GetListeEtbs/:idAccord', userRightsAccess, function(req, res, next) {
        GetListeEtablissements(function(recordset) {
            res.send({ListeAjoutEtablissements: recordset[0]});
        }, req.params.idAccord, next);
    });



    /// Lorsque clic sur un lien dans l'autocomplete qui apparait suite à une recherche dans le moteur en haut de page : Obtention de ttes les infos pour afficher l'accord et ses établissements
    app.get('/RechercheAccords/:idAccord?/:EtbId?', userRightsAccess, function(req, res, next) {
        //console.log(req.params); //TEST

        console.log('req.app.locals.limitationAcces => ' + req.app.locals.limitationAcces); //TEST
        const limitationAcces = req.app.locals.limitationAcces;
        
        /// Affichage Accord
        if(typeof req.params.idAccord !== 'undefined') {



            /// Récupération de l'accord...
            getAccords(function(recordset) {
                var newRecordset = [];
                newRecordset = FormatData(recordset); /// Fonction pour formater les données comme on veut pour affichage ds vue
                //console.log(colors.bgWhite.blue(JSON.stringify(newRecordset))); //TEST

                if(limitationAcces) {

                    res.render('RechercheAccords', { 
                        dataAccords: newRecordset,
                        etbId: req.params.EtbId
                    });

                } else {

                    /// Récupération des data pour alimenter liste déroulante des taux...
                    getTypeTaux(function(recordset) {
                        recordset_Tx = recordset;

                        /// ...Et récupération de la liste des cats pour la popin 'Définir les marchés' + Récup liste de tous les fournisseurs
                        getListeCatalogues(function(recordset) {
                            ListeCats = recordset[0];
                            
                            getListeFournisseurs(function(recordset) { 
                                var ListeFnrs = recordset[0];

                                /// ...Et requete pour savoir si on active ou pas le bouton d'ajout d'établissement sur la ligne Accord dans la vue
                                activateButtonAddEtablissements(function(recordset){ ///
                                    btAddEtbActivation = recordset[0][0].AccordGroupementEstComplet; ///  
                                    
                                    res.render('RechercheAccords', { 
                                        dataAccords: newRecordset, 
                                        listeTypeTaux: recordset_Tx, 
                                        etbId: req.params.EtbId, 
                                        listeCatalogues: ListeCats, 
                                        listeFournisseurs: ListeFnrs,
                                        isBtAddEtbActive: btAddEtbActivation ///
                                    });       
                                    
                                }, req.params.idAccord, next); ///
                    
                            }, next);

                        }, next);

                    }, next);

                }
                
            }, req.params.idAccord, next);



        } else { /// Chargement de la page sans recherche préalable
            res.render('RechercheAccords');
        }


    });




    
    app.post('/RechercheAccords', userRightsAccess, function(req, res, next) {
        if (!req.body) return res.sendStatus(400);
        
        /// Pour visualiser la recherche ou l'objet passé ds la console
        console.log(req.body); //TEST
        
        /// Partie recherche dans moteur de rech. des accords en haut de la page web
        if(typeof req.body.SaisieRecherche !== 'undefined') {
        
            /// Doublement des apostrophes (--> caractère d'échappement) : Permet d'interpréter les apostrophes ds requete et évite plantage
            var reg = new RegExp("'", "g");
            var SaisieRecherche = req.body.SaisieRecherche.replace(reg, "''");

            getDataPropositionsRecherche(function(recordsets) {
                //console.log(colors.bgWhite.magenta(JSON.stringify(recordsets))); //TEST
                /// On va remplir le template avec les données (recordsets), puis on renvoie le html final du template rempli
                res.render('templates/autocompleteRecherche', { layout: false, propositionsRech_Accord: recordsets[0], propositionsRech_Grp: recordsets[1], propositionsRech_Etb: recordsets[2] }, function(err, html) {                
                    if(err) { return next(err); } 
                    res.send(html);                
                });
                
            }, SaisieRecherche, next);

        }

        /// Partie enregistrement après modification sur une ligne Accord ou Etablissement
        if(typeof req.body.NumeroAccord !== 'undefined') {

            if(req.body.IsAccord == true) {
                console.log('Enregistrement de l objet InfosLgnModifiee => Modification de la ligne Accord !!'); // TEST
                
                var dataReqBody = req.body;

                /// Formatage des dates
                var DateDebutDecompose = req.body.PeriodeDebut.split(/[- //]/);
                dataReqBody.PeriodeDebut = DateDebutDecompose[2] + '-' + DateDebutDecompose[1] + '-' + DateDebutDecompose[0]; 
                var DateFinDecompose = req.body.PeriodeFin.split(/[- //]/);
                dataReqBody.PeriodeFin = DateFinDecompose[2] + '-' + DateFinDecompose[1] + '-' + DateFinDecompose[0];
                
                ModifAccord(function() {
                    logger.log('info',  'Modification de la ligne Accord', {Login: app.get('userName'), data: req.body}); 
                    //res.render(req.get('referer'), function(err, html) { res.send(html); });
                    res.redirect(req.get('referer')); // ou 'res.redirect('back');'   /// Pour rediriger vers le app.get avec l'URL du referer
                }, dataReqBody, next); 

            } else {
                console.log('Enregistrement de l objet InfosLgnModifiee => Modification de la ligne Etablissement !!'); // TEST
                
                ModifEtablissementAccord(function() {
                  
                    /// Enregistrement des fnrs exclus pour un établissement (popin 'Définir les marchés')
                    if(req.body.ModificationExclusionFnrs == true) {    /// Si la popin 'Définir les marchés' a été validée...
                        logger.log('info', "Modification de la ligne Etablissement, avec validation de la popin 'Définir les marchés' (pour sélection fournisseurs à exclure)", {Login: app.get('userName'), data: req.body}); 

                        ModificationEtablissementMarche(function() {
                            res.redirect(req.get('referer')); // ou 'res.redirect('back');'   /// Pour rediriger vers le app.get avec l'URL du referer
                        }, req.body, next);
                        
                    } else {
                        logger.log('info', 'Modification de la ligne Etablissement', {Login: app.get('userName'), data: req.body}); 
                        
                        res.redirect(req.get('referer')); // ou 'res.redirect('back');'   /// Pour rediriger vers le app.get avec l'URL du referer
                    }
                    
                }, req.body, next);  
            }
        }


    });



    /// Ajout d'établissement(s) dans l'accord
    app.post('/RechercheAccords/AddEtbs/:idAccord', userRightsAccess, function(req, res, next) {
        //console.log("PRESENT ds fct° 'Ajout d'etablissement' : req.body => " + JSON.stringify(req.body)); //TEST
        //console.log("req.body.ListeEtablissements => " + JSON.stringify(req.body.ListeEtablissements)); //TEST
        console.log("PRESENT ds fct° 'Ajout d'etablissement' : req.body => " + req.body); //TEST

        if (!req.body) return res.sendStatus(400);

        var IdAccord = req.params.idAccord;

        AddEtablissementsAccord(function() {
            logger.log('info', "Ajout d'établissement(s) dans l'accord (idAccord :" + IdAccord + ")", {Login: app.get('userName'), data: req.body}); 
            res.redirect(req.get('referer')); // ou 'res.redirect('back');'   /// Pour rediriger vers le app.get avec l'URL du referer              
        }, IdAccord, req.body, next);
    });   
    


    /// Partie suppression sur une ligne Accord ou Etablissement avec methode 'DELETE' (existait déjà avec méthode 'POST') => FONCTIONNE !!!
    app.delete('/RechercheAccords', userRightsAccess, function(req, res, next){
        if (!req.body) return res.sendStatus(400);

        /// Partie suppression sur une ligne Accord ou Etablissement
        if(typeof req.body.IdAccordASuppr !== 'undefined') {
            
            console.log(colors.bgWhite.blue('Element à suppr. : ' + req.body.ElementASuppr + ' | req.body.IdAccordASuppr : ' + req.body.IdAccordASuppr + ' | req.body.IdEtb_aSuppr : ' + req.body.IdEtbAccordASuppr)); //TEST
            
            var ElementASuppr = req.body.ElementASuppr;
            var IdAccordASuppr = req.body.IdAccordASuppr;
            var IdEtbAccordASuppr = req.body.IdEtbAccordASuppr;
            /// Aiguillage entre suppression d'un accord et suppression d'un établissement dans un accord
            if(ElementASuppr == "accord") {
                DeleteAccord(function(recordset) {
                    res.sendStatus(200); /// Pour confirmation coté client afin de donner le signal qu'il faut rafraichir les données
                }, IdAccordASuppr, next);
            } else if(ElementASuppr == "etablissement") {
                DeleteEtablissementAccord(function(recordset) {
                    //res.sendStatus(200); /// Pour confirmation coté client afin de donner le signal qu'il faut rafraichir les données
                

                //////-------------------------///////
                /// ...Et requete pour savoir si on active ou pas le bouton d'ajout d'établissement sur la ligne Accord dans la vue
                activateButtonAddEtablissements(function(recordset) {
                    btAddEtbActivation = recordset[0][0].AccordGroupementEstComplet; ///  
                    console.log("btAddEtbActivation : " + btAddEtbActivation);
                    res.send({ ActivationBtAddEtb: btAddEtbActivation }); /// Pour confirmation coté client afin de donner le signal qu'il faut rafraichir les données
                }, IdAccordASuppr, next); 
                //////-------------------------///////


                }, IdAccordASuppr, IdEtbAccordASuppr, next);
            }

            logger.log('info',  "Suppression d'une ligne " + ElementASuppr, { 
                Login: app.get('userName'), 
                IdAccord_ASuppr: IdAccordASuppr, 
                IdEtabl_ASuppr: IdEtbAccordASuppr
            }); 

        }      
    });



    /// TEST --> Partie modification avec méthode 'PUT' (existe déjà avec méthode 'POST')
    /*
    app.put('/RechercheAccords', function(req, res, next) {
        console.log(colors.bgCyan.yellow('Verbe PUT : ' + JSON.stringify(req.body))); //TEST

        if (!req.body) return res.sendStatus(400);
        
        /// Partie enregistrement après modification sur une ligne Accord ou Etablissement
        console.log(req.body); //TEST
        if(typeof req.body.NumeroAccord !== 'undefined') {

            if(req.body.IsAccord == true) {
                console.log('Enregistrement de l objet InfosLgnModifiee => Modification de la ligne Accord !!'); // TEST

                var dataReqBody = req.body;

                /// Formatage des dates
                var DateDebutDecompose = req.body.PeriodeDebut.split(/[- //]/);
                dataReqBody.PeriodeDebut = DateDebutDecompose[2] + '-' + DateDebutDecompose[1] + '-' + DateDebutDecompose[0]; 
                var DateFinDecompose = req.body.PeriodeFin.split(/[- //]/);
                dataReqBody.PeriodeFin = DateFinDecompose[2] + '-' + DateFinDecompose[1] + '-' + DateFinDecompose[0];
                
                ModifAccord(function() {
                    //res.render(req.get('referer'), function(err, html) { res.send(html); });
                    res.redirect(req.get('referer')); // ou 'res.redirect('back');'   /// Pour rediriger vers le app.get avec l'URL du referer
                }, dataReqBody, next); 

            } else {
                console.log('Enregistrement de l objet InfosLgnModifiee => Modification de la ligne Etablissement !!'); // TEST
                ModifEtablissementAccord(function() {
                    /***** IMPORTANT !!! : Prévoir proc. stock. pour enregistrer les fnrs exclus s'il y en a !!! *****/
                    /***** Fonction d'enregistrement à appeler que si propriété 'InfosLgnModifiee.ModificationExclusionFnrs' est = à true *****/ /*
                    
                    res.redirect(req.get('referer')); // ou 'res.redirect('back');'   /// Pour rediriger vers le app.get avec l'URL du referer

                }, req.body, next);  
            }
        }

    });
    */


};




function FormatData(recordset) {

    try {
        /* Pour TEST */
        //fs.writeFile('TEST_A_VIRER/TEST2.json', JSON.stringify(recordset), function (err) { if (err) return console.log(err); }); //TEST

        var tabData = [];
        var flagIsAccord = null;
        var tab_EtblInAccord = [];

        recordset.forEach(function(item){
            
            if (flagIsAccord != item.AccordReversionId) { /// Pour stocker les infos propres à l'accord
                flagIsAccord = item.AccordReversionId;
                var newdata = {};
            
                newdata.IsAccord = true;
                newdata.NomAccordReversion = item.NomAccordReversion;
                newdata.AccordReversionId = item.AccordReversionId;
                newdata.AnneeReversion = item.AnneeReversion;
                newdata.DestinataireReversementEtablissementId = item.DestinataireReversementEtablissementId;
                newdata.PeriodeDebut = item.PeriodeDebut;
                newdata.PeriodeFin = item.PeriodeFin;
                newdata.TypeTauxReversionId = item.TypeTauxReversionId;
                newdata.Taux = item.Taux;
                //newdata.TauxAvecEDI = ((parseInt(item.TauxAvecEDI) - parseInt(item.Taux) == 0) ? "" : parseInt(item.TauxAvecEDI) - parseInt(item.Taux)); /// Version avec taux EDI en tant que Taux complémentaire
                newdata.TauxAvecEDI = ((item.TauxAvecEDI == null) ? "" : parseInt(item.TauxAvecEDI)); /// Version avec Taux EDI en tant que Taux de rev. + Taux EDI
                newdata.Libelle = item.Libelle;
                newdata.DestinataireRaisonSociale = item.DestinataireRaisonSociale;
                newdata.DestinataireContact = item.DestinataireContact;
                newdata.DestinataireAd1 = (item.DestinataireAd1 != null ? item.DestinataireAd1 : "");
                newdata.DestinataireAd2 = (item.DestinataireAd2 != null ? item.DestinataireAd2 : "");
                newdata.DestinataireAd3 = (item.DestinataireAd3 != null ? item.DestinataireAd3 : "");
                newdata.DestinataireCP = item.DestinataireCP;
                newdata.DestinataireVille = item.DestinataireVille;
                newdata.Desactive = item.Desactive
                newdata.AccordGroupe = item.AccordGroupe; // Doit-on l'ajouter ?
                newdata.ListeEtbInAccord = [];
                newdata.ValidationReversionDate = (item.ValidationReversionDate != null ? dateFormat(item.ValidationReversionDate, 'dd/mm/yyyy') : 'Non');
                newdata.ReversionValidee = (item.ValidationReversionDate != null ? true : false);

                tabData.push(newdata);
            } 

            if (flagIsAccord == item.AccordReversionId) { /// Pour stocker les infos propres à l'établissement (etb. de l'accord)

                var newEtbInAccord = {};
                //newEtbInAccord.IsAccord = false;
                newEtbInAccord.AccordReversionId = item.AccordReversionId;
                newEtbInAccord.EtablissementId = item.EtablissementId;
                newEtbInAccord.LibelleGroupement = item.LibelleGroupement;
                newEtbInAccord.RaisonSociale = item.RaisonSociale;
                newEtbInAccord.CC = item.CC;
                newEtbInAccord.Ad1 = (item.Ad1 != null ? item.Ad1 : "");
                newEtbInAccord.Ad2 = (item.Ad2 != null ? item.Ad2 : "");
                newEtbInAccord.Ad3 = (item.Ad3 != null ? item.Ad3 : "");
                newEtbInAccord.CP = item.CP;
                newEtbInAccord.Ville = item.Ville;
                newEtbInAccord.Contact = item.Contact;
                newEtbInAccord.AvecEDI = item.AvecEDI;
                newEtbInAccord.TauxAvecEDI = ((item.AutreTauxAvecEDI == null) ? "" : item.AutreTauxAvecEDI);

                tab_EtblInAccord.push(newEtbInAccord);
            } 

        });


        //console.log(colors.bgMagenta.black(JSON.stringify(tab_EtblInAccord))); //TEST
        /// 1. On regroupe par 'AccordReversionId' les données correspondant aux établissements au sein d'un groupement 
        var GroupBy_Accord = _.groupBy(tab_EtblInAccord, 'AccordReversionId'); // Fonctionne
        //console.log(colors.bgYellow.black(JSON.stringify(GroupBy_Accord))); //TEST
        
        /// 2. On boucle dessus...
        for(var i in GroupBy_Accord) {
            //console.log(i + " | " + GroupBy_Accord[i]); //TEST
            /// 3. On rapproche les données entre lignes Groupes et celles correspondant aux etablissements ds un groupe via "AccordReversionId" 
            var ACCORD = _.findWhere(tabData, {"AccordReversionId": parseInt(i)});
            ACCORD.ListeEtbInAccord = GroupBy_Accord[i];
            //console.log(colors.bgRed.black(JSON.stringify(ACCORD))); //TEST
        }

        /* Pour TEST */
        //console.log(colors.bgYellow.black(JSON.stringify(tabData)));
        /*fs.writeFile('TEST_A_VIRER/TEST.json', JSON.stringify(tabData), function (err) { 
            if (err) return console.log(err);
        });*/
        /* Fin TEST */
        
        return tabData;

    
    } catch (error) {
        throw error;
    }
}



///--- pour récupérer les données sur les différents types de taux (pour liste déroulante ds .ejs) ---///
function getTypeTaux(callback, next) {
    requete = "SELECT TypeTauxReversionId, Libelle FROM Reversion.TypeTauxReversion";

    var conn = new sql.Connection(config); 
    conn.connect().then(function() {
        
        var request = new sql.Request(conn);
        
        request
        .query(requete)
        .then(function(recordset) {
            callback(recordset);
            conn.close();
        })
        .catch(function(err) {
            next(new Error("Récupération des différents types de taux => " + err));
        });

    }).catch(function(err) {
        next(new Error("Récupération des différents types de taux => " + err));
    });
}

/// 03/07/17 --> Voir si utile
/// Fonction pour prendre en compte les accents (mais il faut gérer le highlight aussi, ce qui est compliqué !)
/*function GestionAccents(motRecherche) {
    //var listeCaracteresSpeciaux = [{a: "aàâ"}, {e: "eéèêë"}, {i: "iîï"}, {o: "oôö"}, {u: "uùûü"}, {c: "cç"}];
    //listeCaracteresSpeciaux.forEach(function(item) {
    //    //console.log(Object.keys(item) + " | " + Object.values(item)); //TEST
    //    var theKey = Object.keys(item);
    //    var reg = new RegExp(theKey, "g"); //
    //    motRecherche = motRecherche.replace(reg, '[' + item[theKey] + ']');
    //});
    return motRecherche;

    var result = ""
    var listeCaracteres  = ""
    var listeCaracteresSpeciaux = ["aàâ", "eéèêë", "iîï", "oôö", "uùûü", "cç"];
    var flagLettreSpeciale = false;

    for(i=0; i < motRecherche.length; i++) {
        listeCaracteresSpeciaux.forEach(function(elem) {
            if(elem.indexOf(motRecherche[i]) !== -1) {
                listeCaracteres = '[';
                for(j=0; j < elem.length; j++) {
                    listeCaracteres += elem[j];
                }
                listeCaracteres += ']';

                flagLettreSpeciale = true;
            }
        });

        if(flagLettreSpeciale == false) {
            result += motRecherche[i];
        } else {
            result += listeCaracteres;
        }
        flagLettreSpeciale = false;
    }
    
    return result;
}*/
/// FIN : 03/07/17


///--- Fonction appelée quand saisie dans le moteur de recherche : Sert à alimenter l'encart de propositions sous le moteur ---///
function getDataPropositionsRecherche(callback, saisieRecherche, next) {
    config.parseJSON = true; // Pour que le recordset soit au format JSON

    //saisieRecherche = GestionAccents(saisieRecherche); //03/07/17
    
    /// 1ere requete pour rechercher sur nom d'accord
    var requete = "" +
    "SELECT " +
        "AccordReversionId ,PeriodeDebut ,PeriodeFin ,NomAccordReversion ,DestinataireRaisonSociale ,DestinataireContact ,DestinataireAd1 ,DestinataireAd2 ,DestinataireAd3 ,DestinataireCP ,DestinataireVille " +
    "FROM Reversion.AccordReversion " +
    "WHERE " +
        "NomAccordReversion like '%" + saisieRecherche + "%' and " + 
        "(Desactive IS NULL or Desactive = 0) " +
    "ORDER BY " +
        "NomAccordReversion, PeriodeDebut;" 
    /// 2eme requete pour rechercher sur nom de groupement
    requete += "" +
    "SELECT " +
        "AcRv.AccordReversionId, AcRv.DestinataireReversementEtablissementId, AcRv.NomAccordReversion, AcRv.DestinataireRaisonSociale, Gr.[LIBELLE GROUPEMENT] As LibelleGroupement, AcRv.PeriodeDebut, AcRv.PeriodeFin, AcRv.DestinataireContact " +
    "FROM " +
        "Reversion.AccordReversion AS AcRv INNER JOIN " +
        "Reversion.AccordReversionGroupe As ARvG ON AcRv.AccordReversionId = ARvG.AccordReversionId INNER JOIN " +
        "Etablissement.dbo.GROUPEMENT AS Gr ON ARvG.GroupementId = Gr.IDGroupement " +
    "WHERE " +
        "Gr.[LIBELLE GROUPEMENT] like '%" + saisieRecherche + "%' " +
        "and (AcRv.Desactive is NULL or AcRv.Desactive = 0) " +
    "ORDER BY " +
        "LibelleGroupement, AcRv.PeriodeDebut;";
    /// 3eme requete pour rechercher sur les champs relatifs aux établissements
    requete += "" +
    "SELECT " +
        "AcRv.AccordReversionId, AcRv.DestinataireReversementEtablissementId, AcRv.GroupementId, Gr.[LIBELLE GROUPEMENT] As LibelleGroupement, AcRv.PeriodeDebut, AcRv.PeriodeFin, AcRv.DestinataireContact, ARvE.EtablissementId, ARvE.RaisonSociale, ARvE.CC, ARvE.Ad1, ARvE.Ad2, ARvE.Ad3, ARvE.CP, ARvE.Ville, AcRv.NomAccordReversion, AcRv.DestinataireRaisonSociale " +
    "FROM " +           
        "Reversion.AccordReversion As AcRv RIGHT OUTER JOIN " +
        "Reversion.AccordReversionEtablissement AS ARvE ON AcRv.AccordReversionId = ARvE.AccordReversionId LEFT OUTER JOIN " +
        "Etablissement.dbo.GROUPEMENT AS Gr ON ARvE.GroupementId = Gr.IDGroupement " +
    "WHERE " +
        "(" +
        "RaisonSociale like '%" + saisieRecherche + "%' or " +
        "CC  like '%" + saisieRecherche + "%' or " +
        "Ad1 like '%" + saisieRecherche + "%' or " +
        "Ad2 like '%" + saisieRecherche + "%' or " +
        "Ad3 like '%" + saisieRecherche + "%' or " +
        "CP like '%" + saisieRecherche + "%' or " +
        "Ville like '%" + saisieRecherche + "%' " +
        ") " +
        "and (AcRv.Desactive is NULL or AcRv.Desactive = 0) " + 
    "ORDER BY RaisonSociale, AcRv.PeriodeDebut;";



    var connection2 = new sql.Connection(config); 
    connection2.connect().then(function() {
    
        var request = new sql.Request(connection2);  
        request.multiple = true; // On autorise les requetes multiples

        request
        .query(requete)
        .then(function(recordsets) {
            callback(recordsets);
            connection2.close();
        })
        .catch(function(err) {
            next(new Error("Récupération des données pour alimenter l'autocomplete après saisie dans le champ de recherche => " + err));
        });

    }).catch(function(err) {
        next(new Error("Récupération des données pour alimenter l'autocomplete après saisie dans le champ de recherche => " + err));
    });

}



///--- Récupération de la data pour afficher l'accord sélectionné ---///
function getAccords(callback, AccRevID, next) {
    config.parseJSON = true; // Pour que le recordset soit au format JSON

    var requete = "" +
    "SELECT " +        
        "AcRv.AccordReversionId, Rv.ReversionId, AcRv.AnneeReversion, AcRv.DestinataireReversementEtablissementId, AcRv.AccordGroupe, AcRv.PeriodeDebut, AcRv.PeriodeFin, AcRv.Taux, AcRv.TauxAvecEDI, AcRv.DestinataireRaisonSociale, " +
        "AcRv.DestinataireContact, AcRv.DestinataireAd1, AcRv.DestinataireAd2, AcRv.DestinataireAd3, AcRv.DestinataireCP, AcRv.DestinataireVille, AcRv.Desactive, TxRv.TypeTauxReversionId, TxRv.Libelle, ARvE.EtablissementId, " +
        "ARvE.RaisonSociale, ARvE.CC, ARvE.Ad1, ARvE.Ad2, ARvE.Ad3, ARvE.CP, ARvE.Ville, ARvE.Contact, ARvE.AvecEDI, Gr.[LIBELLE GROUPEMENT] As LibelleGroupement, AcRv.NomAccordReversion, ARvE.AutreTaux, ARvE.AutreTauxAvecEDI, Rv.ValidationReversionDate  " +
    "FROM " +
        "Etablissement.dbo.GROUPEMENT AS Gr RIGHT OUTER JOIN " +
        "Reversion.AccordReversion AS AcRv INNER JOIN " +
        "Reversion.AccordReversionEtablissement AS ARvE ON AcRv.AccordReversionId = ARvE.AccordReversionId LEFT OUTER JOIN " +
        "Reversion.Reversion AS Rv ON AcRv.AccordReversionId = Rv.AccordReversionId ON Gr.IDGroupement = ARvE.GroupementId LEFT OUTER JOIN " +
        "Reversion.TypeTauxReversion AS TxRv ON AcRv.TypeTauxReversionId = TxRv.TypeTauxReversionId " +      
    "WHERE " +       
        "AcRv.AccordReversionId = " + AccRevID + " " +
        "and (AcRv.Desactive is NULL or AcRv.Desactive = 0) " +
        /*"--and Rv.ValidationReversionDate IS NULL " + */
    "ORDER BY ARvE.RaisonSociale;"


    var conn = new sql.Connection(config);   
    conn.connect().then(function() {
       
        var request = new sql.Request(conn);

        request
        .query(requete)
        .then(function(recordset) {
            callback(recordset);
            conn.close();
        })
        .catch(function(err) {
            next(new Error("Récupération des données pour affichage de l'accord sélectionné => " + err));
        });

    }).catch(function(err) {
        next(new Error("Récupération des données pour affichage de l'accord sélectionné => " + err));
    });

}



///--- Récupération liste des catalogues pour alimenter au chargement de la page colonne gauche de la popin 'Définir les marchés' ---///
function getListeCatalogues(callback, next) {
    var conn = new sql.Connection(config); 
    conn.connect().then(function() {
        
        var request = new sql.Request(conn);
        
        request
        .execute('ReversionApp.ps_GetListeCatalogues')
        .then(function(recordset) {
            //console.log(colors.bgGreen.white(JSON.stringify(recordset))); //TEST
            callback(recordset);
            conn.close();
        })
        .catch(function(err) {
            next(new Error("Récupération de la liste des catalogues au chargement de la page 'RechercheAccords' => " + err));
        });

    }).catch(function(err) {
        next(new Error("Récupération de la liste des catalogues au chargement de la page 'RechercheAccords' => " + err));
    });
}


///--- Récupération liste des fournisseurs pour alimenter au chargement de la page colonne droite de la popin 'Définir les marchés' ---///
function getListeFournisseurs(callback, next) {
    var conn = new sql.Connection(config); 
    conn.connect().then(function() {
        var request = new sql.Request(conn);
        
        request
        .execute('ReversionApp.ps_GetListeFournisseurs')
        .then(function(recordset) {
            //console.log(colors.bgGreen.white(JSON.stringify(recordset))); //TEST
            callback(recordset);
            conn.close();
        })
        .catch(function(err) {
            next(new Error("Récupération de la liste des fournisseurs au chargement de la page 'RechercheAccords' => " + err));
        });

    }).catch(function(err) {
        next(new Error("Récupération de la liste des fournisseurs au chargement de la page 'RechercheAccords' => " + err));
    });
}



///--- Récupération liste des catalogues auxquels a droit l'établissement (appelé qd click sur bt 'Définir les marchés') ---///
function GetListeCataloguesEtablissement(callback, data, next) {
    var conn = new sql.Connection(config); 
    conn.connect().then(function() {
        var request = new sql.Request(conn);

        request
        .input('EtablissementId', sql.Int, parseInt(data.EtbId))
        .input('AccordReversionId', sql.Int, parseInt(data.idAccord))
        .execute('ReversionApp.ps_GetListeCatalogueEtablissement')
        .then(function(recordset) {
            console.log(colors.bgGreen.white(JSON.stringify(recordset))); //TEST
            callback(recordset);
            conn.close();
        })
        .catch(function(err) {
            next(new Error("Récupération des catalogues auxquels l'établissement n'a pas droit => " + err));
        });

    }).catch(function(err) {
        next(new Error("Récupération des catalogues auxquels l'établissement n'a pas droit => " + err));
    });
}


///--- Récupération des fournisseurs déjà exclus pour un l'établissement (appelé qd click sur bt 'Définir les marchés') ---///
function GetFnrsExclusEtablissement(callback, data, next) {
    var conn = new sql.Connection(config); 
    conn.connect().then(function() {
        var request = new sql.Request(conn);

        request
        .input('EtablissementId', sql.Int, parseInt(data.EtbId))
        .input('AccordReversionId', sql.Int, parseInt(data.idAccord))
        .execute('ReversionApp.ps_getListeFournisseurEtablissement')
        .then(function(recordset) {
            console.log(colors.bgBlue.white(JSON.stringify(recordset))); //TEST
            callback(recordset);
            conn.close();
        })
        .catch(function(err) {
            next(new Error("Récupération des fournisseurs exclus pour un l'établissement lors de l'ouvertutre de la popin 'Définir les marchés'  => " + err));
        });

    }).catch(function(err) {
        next(new Error("Récupération des fournisseurs exclus pour un l'établissement lors de l'ouvertutre de la popin 'Définir les marchés'  => " + err));
    });
}


///--- Suppression d'un accord ---///
function DeleteAccord(callback, data, next) {
    var conn = new sql.Connection(config); 
    conn.connect().then(function() {
        var request = new sql.Request(conn);
        
        request
        .input('AccordReversionId', sql.Int, data)
        .execute('ReversionApp.ps_SuppressionAccord')
        .then(function(recordset) {
            //console.log(colors.bgGreen.white(JSON.stringify(recordset))); //TEST
            callback(recordset);
            conn.close();
        })
        .catch(function(err) {
            next(new Error("Suppression d'un accord => " + err));
        });

    }).catch(function(err) {
        next(new Error("Suppression d'un accord => " + err));
    });
}


///--- Suppression d'un Etablissement dans un accord ---///
function DeleteEtablissementAccord(callback, IdAccordToDelete, IdEtbAccordToDelete, next) {
    var conn = new sql.Connection(config); 
    conn.connect().then(function() {
        var request = new sql.Request(conn);
        
        request
        .input('AccordReversionId', sql.Int, IdAccordToDelete)
        .input('EtablissementId', sql.Int, IdEtbAccordToDelete)
        .execute('ReversionApp.ps_SuppressionEtablissementAccord')
        .then(function(recordset) {
            //console.log(colors.bgGreen.white(JSON.stringify(recordset))); //TEST
            callback(recordset);
            conn.close();
        })
        .catch(function(err) {
            next(new Error("Suppression d'un établissement dans un accord => " + err));
        });

    }).catch(function(err) {
        next(new Error("Suppression d'un établissement dans un accord => " + err));
    });
}



///--- Modification d'un accord ---///
function ModifAccord(callback, data, next) {
    var conn = new sql.Connection(config); 
    conn.connect().then(function() {
        var request = new sql.Request(conn);

        request
        .input('AccordReversionId', sql.Int, parseInt(data.NumeroAccord))
        .input('DestinataireContact', sql.VarChar(35), data.DestinataireReversion.NomPrenom)
        .input('DestinataireAd1', sql.VarChar(36), data.DestinataireReversion.Adresse1)
        .input('DestinataireAd2', sql.VarChar(36), data.DestinataireReversion.Adresse2)
        .input('DestinataireAd3', sql.VarChar(36), data.DestinataireReversion.Adresse3)
        .input('DestinataireCP', sql.VarChar(8), data.DestinataireReversion.CP)
        .input('DestinataireVille', sql.VarChar(31), data.DestinataireReversion.Ville)
        .input('PeriodeDebut', sql.Date, data.PeriodeDebut)
        .input('PeriodeFin', sql.Date, data.PeriodeFin)
        .input('TypeTauxReversionId', sql.Int, parseInt(data.TypeTauxReversion))
        .input('Taux', sql.Float, parseFloat(data.TauxReversion))
        .input('TauxAvecEDI', sql.Float, parseFloat(data.TauxReversionAdd))
        .execute('ReversionApp.ps_ModificationAccord')
        .then(function(recordset) {
            //console.log(colors.bgGreen.white(JSON.stringify(recordset))); //TEST
            callback();
            conn.close();
        })
        .catch(function(err) {
            next(new Error("Modification d'un accord => " + err));
        });

    }).catch(function(err) {
        next(new Error("Modification d'un accord => " + err));
    });
}



///--- Modification d'un Etablissement dans un accord ---///
function ModifEtablissementAccord(callback, data, next) {
    var conn = new sql.Connection(config); 
    conn.connect().then(function() {
        var request = new sql.Request(conn);

        console.log('data.TauxReversionAdd : ' + data.TauxReversionAdd + ' | parseFloat(data.TauxReversionAdd) : ' + parseFloat(data.TauxReversionAdd)); //TEST
        
        request
        .input('AccordReversionId', sql.Int, parseInt(data.NumeroAccord))
        .input('EtablissementId', sql.Int, parseInt(data.IDetablissement))
        .input('Contact', sql.VarChar(35), data.DestinataireReversion.NomPrenom)
        .input('Ad1', sql.VarChar(36), data.DestinataireReversion.Adresse1)
        .input('Ad2', sql.VarChar(36), data.DestinataireReversion.Adresse2)
        .input('Ad3', sql.VarChar(36), data.DestinataireReversion.Adresse3)
        .input('CP', sql.VarChar(8), data.DestinataireReversion.CP)
        .input('Ville', sql.VarChar(31), data.DestinataireReversion.Ville)
        //.input('AutreTaux', sql.Float, parseFloat(data.TauxReversionAdd)) // <--Pas besoin !
        .input('AutreTauxAvecEDI', sql.Float, parseFloat(data.TauxReversionAdd))
        .execute('ReversionApp.ps_ModificationEtablissementAccord')
        .then(function(recordset) {
            //console.log(colors.bgGreen.white(JSON.stringify(recordset))); //TEST
            callback();
            conn.close();
        })
        .catch(function(err) {
            next(new Error("Modification d'un établissement dans un accord => " + err));
        });

    }).catch(function(err) {
        next(new Error("Modification d'un établissement dans un accord => " + err));
    });
}


///--- Modification des marchés d'un établissement ---///
function ModificationEtablissementMarche(callback, data, next) {
    var conn = new sql.Connection(config); 
    conn.connect().then(function() {
        var request = new sql.Request(conn);

        request
        .input('AccordReversionId', sql.Int, parseInt(data.NumeroAccord))
        .input('EtablissementId', sql.Int, parseInt(data.IDetablissement))
        .input('ListesCfrExclus', sql.VarChar(sql.MAX), data.ExclusionFnrs)
        .execute('ReversionApp.ps_ModificationEtablissementMarche')
        .then(function(recordset) {
            //console.log(colors.bgGreen.white(JSON.stringify(recordset))); //TEST
            callback();
            conn.close();
        })
        .catch(function(err) {
            next(new Error("Modification des marchés d'un établissement => " + err));
        });

    }).catch(function(err) {
        next(new Error("Modification des marchés d'un établissement => " + err));
    });
}




///--- Récupération de liste de tous les établissments ---///
function GetListeEtablissements(callback, idAccord, next) {
    var conn = new sql.Connection(config);   
    conn.connect().then(function() {
        
        var request = new sql.Request(conn);

        request
        .input('AccordReversionId', sql.Int, idAccord)
        .execute('ReversionApp.ps_getEtablissementGroupementReversion')
        .then(function(recordset) {
            //console.log(colors.bgCyan.white(JSON.stringify(recordset))); //TEST
            callback(recordset);
            conn.close();
        })
        .catch(function(err) {
            next(new Error("Récupération de la liste des établissements lors d'un ajout d'établissement dans une réversion => " + err));
        });

    }).catch(function(err) {
        next(new Error("Récupération de la liste des établissements lors d'un ajout d'établissement dans une réversion => " + err));
    });
}


///--- Pour savoir si le bouton 'Ajout d'établissement(s) doit être en disabled ou pas ---///
///--- (Seulement pour un accord de Groupe(s) : Bouton doit être actif si un ou des établissements du groupe de l'accord ne sont pas compris dans l'accord, ---///
///--- sinon si tous les établissements du groupe sont déjà dans l'accord de groupe, alors bouton doit être inactif) ---///
///--- Renvoie -1 si pas un accord de groupe, renvoie 0 si accord de groupe avec Etbs pas dans l'accord, renvoie 1 si accord de groupe avec tous les Etbs dans l'accord ---///
function activateButtonAddEtablissements(callback, idAccord, next) {    
    var conn = new sql.Connection(config);   
    conn.connect().then(function() {
        
        var request = new sql.Request(conn);

        request
        .input('AccordReversionId', sql.Int, idAccord)
        .execute('ReversionApp.ps_AccordGroupementEstComplet')
        .then(function(recordset) {
            //console.log(colors.bgCyan.white(JSON.stringify(recordset))); //TEST
            callback(recordset);
            conn.close();
        })
        .catch(function(err) {
            next(new Error("Requete permettant de savoir si le bouton 'Ajout d'établissement(s)' doit être actif ou pas => " + err));
        });

    }).catch(function(err) {
        next(new Error("Requete permettant de savoir si le bouton 'Ajout d'établissement(s)' doit être actif ou pas => " + err));
    });    
}


///--- Pour enregistrer le ou les nouveaux établissement(s) ajouté(s) via la popin d'ajout d'établissement ---///
function AddEtablissementsAccord(callback, idAccord, listeEtbs, next) {
    var conn = new sql.Connection(config);   
    conn.connect().then(function() {
        
        var request = new sql.Request(conn);

        request
        .input('AccordReversionId', sql.Int, idAccord)
        .input('Liste_EtablissementId', sql.VarChar(sql.MAX), listeEtbs.join(','))
        .execute('ReversionApp.ps_AjoutEtablissementAccord')
        .then(function(recordset) {
            //callback(recordset);
            callback();
            conn.close();
        })
        .catch(function(err) {
            next(new Error("Requete permettant d'enregistrer un ou plusieurs établissements ajoutés dans un accord => " + err));
        });

    }).catch(function(err) {
        next(new Error("Requete permettant d'enregistrer un ou plusieurs établissements ajoutés dans un accord => " + err));
    });
}

