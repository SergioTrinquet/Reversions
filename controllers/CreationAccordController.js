const colors = require('colors'); // juste pour le développement

const sql = require('mssql');
const _ = require('underscore');
var config = JSON.parse(JSON.stringify(require('config').get('dbConfig'))); // Nvelle version avec module 'config'
var logger = require('../log/logConfig.js').logger; // Pour les logs
var userRightsAccess = require('../app_modules/userRights.js'); /// Middleware pour gérer les accès en fonction des droits de l'utilisateur


module.exports = function(app) {

    var ladate = new Date();

    /// Pour récupérer l'année en cours au chargement de la page
    app.get('/CreationAccord', userRightsAccess, function(req, res, next) {
        res.render('CreationAccord', { AnneeEnCours: ladate.getFullYear() });
    });


    /// Pour récupérer les groupes et établissements + le fait qu'ils fassent déjà l'objet d'un accord après validation de l'étape 1 de la saisie d'un accord
    app.get('/CreationAccord/:Annee', userRightsAccess, function(req, res, next) {
        var AnneeSaisie = parseInt(req.params.Annee);     //console.log('req.params : ' + req.params + ' | AnneeSaisie : ' + AnneeSaisie); //TEST

        getListeGroupements(function(recordset) {
            var ListeGrpmts = recordset[0];
            getListeEtablissements(function(recordset) { 
                var ListeEtbs = recordset[0];
                res.render('templates/listesGrpsEtbs', { layout: false, ListeGrpmts: ListeGrpmts, ListeEtbs: ListeEtbs }, function(err, html) {                
                    if(err) { return next(err); } 
                    res.send(html);                
                });
            }, AnneeSaisie, next);
        }, AnneeSaisie, next);
    });





    /// Pour récupérer liste des étbs correspondant au Groupe coché ds l'étape 2
    app.post('/CreationAccord/GetLstEtbs', userRightsAccess, function(req, res, next) {
        if (!req.body) return res.sendStatus(400);

        var reqBody = req.body;

        if(reqBody.IdGrp) {
            getListeEtbsOfSelectedGroupement(function(recordset) {
                res.send(recordset[0]);
            }, reqBody.IdGrp, next);
        }
        //console.log(colors.bgYellow.black(JSON.stringify(reqBody))); //TEST
    });




    /// Pour enregistrer l'accord créé à la fin de l'étape 2 ou 3 (lors de la validation finale)
    app.post('/CreationAccord', userRightsAccess, function(req, res, next) {
        if (!req.body) return res.sendStatus(400);

        var reqBody = req.body;

        /// Partie enregistrement des données de l'accord
        console.log(colors.bgMagenta.yellow(JSON.stringify(reqBody))); //TEST
        console.log(reqBody); //TEST

        if(typeof reqBody.Etape1 !== 'undefined') {
            
            var dataGoodFormat = formatageData(reqBody);

            /// Si cas ou l'utilisateur veut autant d'accords Etablissement qu'il en existe dans le groupe qu'il a sélectionné
            if(reqBody.Etape2.MultiAccord == true && reqBody.Etape2.MultiAccordListeEtablissements.length > 0) {

                Record_MultiAccords(function(recordset) {
                    logger.log('info',  "Enregistrement de nouveaux accords (accords établ. d'un groupe)", {Login: req.app.get('userName'), Details: dataGoodFormat });
                    //res.send({ redirect: '/RechercheAccords' });
                    res.send({ redirect: '/ListeAccords' });
                }, dataGoodFormat, next);
                
            } else { /// Sinon autres cas (accord Etb, accord de Groupe, accord multi-groupes)...

                Record_SingleAccord(function(recordset) {
                    logger.log('info',  "Enregistrement d'un nouvel accord", {Login: req.app.get('userName'), Details: dataGoodFormat });
                    /*var IdAccordNouvellementCree = recordset[0][0].AccordReversionID;
                    res.send({ redirect: '/RechercheAccords/' + IdAccordNouvellementCree });*/
                    res.send({ redirect: '/ListeAccords' });
                }, dataGoodFormat, next);

            }
            
        }


    });

}

///--- Partie adaptation des données pour la procédure stockée permettant d'enregistrer un (ou plusieurs) accord(s) ---///
function formatageData(data) {

    var dataFormate = {};

    var txBase = _.findWhere(data.Etape1, {name: 'SaisieTauxRev'})['value'];
    var SaisieTauxBase = (txBase == '' ? null : parseInt(txBase));

    var txEDI = _.findWhere(data.Etape1, {name: 'SaisieTauxEDI'})['value'];
    var SaisieTauxEDI = (txEDI == '' ? null : parseInt(txEDI));

    /// Travail sur dates
    var DateDebutDecompose = (_.findWhere(data.Etape1, {name: 'SaisieDateDebutAccord'})['value']).split(/[- //]/);
    var DateFinDecompose = (_.findWhere(data.Etape1, {name: 'SaisieDateFinAccord'})['value']).split(/[- //]/);
          

    /// Si cas ou l'utilisateur veut autant d'accords Etablissement qu'il en existe dans le groupe qu'il a sélectionné
    if(data.Etape2.MultiAccord == true && data.Etape2.MultiAccordListeEtablissements.length > 0) {

        dataFormate = {
            ListeEtablissementsIndividuels : data.Etape2.MultiAccordListeEtablissements.join(','),
            NomAccord: _.findWhere(data.Etape1, {name: 'SaisieNomAccord'})['value'],
            AnneeAccord: parseInt(_.findWhere(data.Etape1, {name: 'SaisieAnneeAccord'})['value']),
            TypeTaux: parseInt(_.findWhere(data.Etape1, {name: 'SaisieTypeTauxRev'})['value']),
            TauxBase:  SaisieTauxBase,
            TauxEDI: SaisieTauxEDI,
            DebutPeriode: DateDebutDecompose[2] + '-' + DateDebutDecompose[1] + '-' + DateDebutDecompose[0],
            FinPeriode: DateFinDecompose[2] + '-' + DateFinDecompose[1] + '-' + DateFinDecompose[0]
        };

    } else { /// Sinon autres cas (accord Etb, accord de Groupe, accord multi-groupes)...

        var GrpID = null;
        var LstEtbsID = null;
        var LstGrpID = null;

        if(data.Etape2.Groupe.length > 1) { /// Cas ou plusieurs groupes pour un accord : On concatène les 'IdGroupe' et 'ListeEtbsGroupe' pour les passer à la proc. stock.
            var tab_IdGroupe = [];
            var tab_ListeEtbsGroupe = [];
            data.Etape2.Groupe.forEach(function(grp) {
                tab_IdGroupe.push(grp.IdGroupe); 
                tab_ListeEtbsGroupe.push(grp.ListeEtbsGroupe);
            });

            LstEtbsID = tab_ListeEtbsGroupe.join(",");
            LstGrpID = tab_IdGroupe.join(",");
        } else { /// ...sinon autres cas
            GrpID = (data.Etape2.Groupe.length == 1 ? parseInt(data.Etape2.Groupe[0].IdGroupe) : null);
            LstEtbsID = (data.Etape2.Groupe.length == 1 ? data.Etape2.Groupe[0].ListeEtbsGroupe.join(",") : null);
        }

        dataFormate = {
            AccordGroupe: (data.Etape2.Groupe.length == 0 ? false : true),
            MultiAccord: data.Etape2.MultiAccord,
            IdGroupement: GrpID,
            ListeEtablissementID: LstEtbsID,
            ListeGroupementID: LstGrpID,
            IdEtabblissementDestinataire: parseInt(data.Etape3 == '' ? data.Etape2.Etablissement : data.Etape3),
            AnneeAccord: parseInt(_.findWhere(data.Etape1, {name: 'SaisieAnneeAccord'})['value']),
            TypeTaux: parseInt(_.findWhere(data.Etape1, {name: 'SaisieTypeTauxRev'})['value']),
            TauxBase:  SaisieTauxBase,
            TauxEDI: SaisieTauxEDI,
            NomAccord: _.findWhere(data.Etape1, {name: 'SaisieNomAccord'})['value'],
            DebutPerdiode: DateDebutDecompose[2] + '-' + DateDebutDecompose[1] + '-' + DateDebutDecompose[0],
            FinPeriode: DateFinDecompose[2] + '-' + DateFinDecompose[1] + '-' + DateFinDecompose[0]
        };

    }

    return dataFormate;
}



function getListeGroupements(callback, data, next) {
    var conn = new sql.Connection(config); 
    conn.connect().then(function() {
        
        var request = new sql.Request(conn);
        
        request
        .input('AnneeReversion', sql.Int, data)
        .execute('ReversionApp.ps_getListeGroupementReversion')
        .then(function(recordset) {
            //console.log(colors.bgGreen.white(JSON.stringify(recordset))); //TEST
            callback(recordset);
            conn.close();
        })
        .catch(function(err) {
            next(new Error("Récupération de la liste des groupements dans l'encart n°2 => " + err));
        });

    }).catch(function(err) {
        next(new Error("Récupération de la liste des groupements dans l'encart n°2 => " + err));
    });
}



function getListeEtablissements(callback, data, next) {
    var conn = new sql.Connection(config); 
    conn.connect().then(function() {
        
        var request = new sql.Request(conn);
        
        request
        .input('AnneeReversion', sql.Int, data)
        .execute('ReversionApp.ps_getListeEtablissementReversion')
        .then(function(recordset) {
            //console.log(colors.bgCyan.white(JSON.stringify(recordset))); //TEST
            callback(recordset);
            conn.close();
        })
        .catch(function(err) {
            next(new Error("Récupération de la liste des établissements dans l'encart n°2 => " + err));
        });

    }).catch(function(err) {
        next(new Error("Récupération de la liste des établissements dans l'encart n°2 => " + err));
    });
}


function getListeEtbsOfSelectedGroupement(callback, IdGroup, next) {
    var conn = new sql.Connection(config); 
    conn.connect().then(function() {
        
        var request = new sql.Request(conn);
        
        request
        .input('IdGroupement', sql.Int, IdGroup)
        .execute('ReversionApp.ps_getEtablissementsParGroupement')
        .then(function(recordset) {
            console.log(colors.bgGreen.white(JSON.stringify(recordset))); //TEST
            callback(recordset);
            conn.close();
        })
        .catch(function(err) {
            next(new Error("Récupération de la liste des établissements quand sélection d'un groupement dans l'encart n°2 => " + err));
        });

    }).catch(function(err) {
        next(new Error("Récupération de la liste des établissements quand sélection d'un groupement dans l'encart n°2 => " + err));
    });
}


///--- Fonction d'enregistrement d'un accord lors de la validation de la 3eme étape ---///
function Record_SingleAccord(callback, data, next) {
    
    //-- TEST --//
    console.log(colors.bgYellow.black('//////////////////// Début ////////////////////')); console.log(data); console.log(colors.bgYellow.black('/////////////////// Fin /////////////////////'));

    var conn = new sql.Connection(config); 
    conn.connect().then(function() {
        
        var request = new sql.Request(conn);

        request
        .input('AccordGroupe', sql.Bit, data.AccordGroupe)
        .input('MultiAccord', sql.Bit, data.MultiAccord)
        .input('IdGroupement', sql.Int, data.IdGroupement)
        .input('ListeEtablissementID', sql.VarChar(sql.MAX), data.ListeEtablissementID)
        .input('ListeGroupementID', sql.VarChar(sql.MAX), data.ListeGroupementID)
        .input('IdEtabblissementDestinataire', sql.Int, data.IdEtabblissementDestinataire)
        .input('AnneeAccord', sql.Int, data.AnneeAccord)
        .input('TypeTaux', sql.Int, data.TypeTaux)
        .input('TauxBase', sql.Int, data.TauxBase)
        .input('TauxEDI', sql.Int, data.TauxEDI)
        .input('NomAccord', sql.VarChar(50), data.NomAccord)
        .input('DebutPerdiode', sql.Date, data.DebutPerdiode)
        .input('FinPeriode', sql.Date, data.FinPeriode)
        .execute('ReversionApp.Ps_CreationAccordReversion')
        .then(function(recordset) {
            console.log(colors.bgGreen.white(JSON.stringify(recordset))); //TEST
            callback(recordset);
            conn.close();
        })
        .catch(function(err) {
            next(new Error("Enregistrement d'un accord nouvellement créé => " + err));
        });
        
    }).catch(function(err) {
        next(new Error("Enregistrement d'un accord nouvellement créé => " + err));
    });

}


///--- Fonction d'enregistrement de plusieurs accords Etablissement lors de la validation de la 3eme étape ---///
function Record_MultiAccords(callback, data, next) {

    //-- TEST --//
    console.log(colors.bgMagenta.white('//////////////////// Début ////////////////////')); console.log(data); console.log(colors.bgMagenta.white('/////////////////// Fin /////////////////////'));

    var conn = new sql.Connection(config); 
    conn.connect().then(function() {
        
        var request = new sql.Request(conn);

        request
        .input('ListeEtablissementsIndividuels', sql.VarChar(sql.MAX), data.ListeEtablissementsIndividuels)
        .input('NomAccord', sql.VarChar(50), data.NomAccord)
        .input('AnneeAccord', sql.Int, data.AnneeAccord)
        .input('TypeTaux', sql.Int, data.TypeTaux)
        .input('TauxBase', sql.Int, data.TauxBase)
        .input('TauxEDI', sql.Int, data.TauxEDI)
        .input('DebutPeriode', sql.Date, data.DebutPeriode)
        .input('FinPeriode', sql.Date, data.FinPeriode)
        .execute('ReversionApp.Ps_CreationMultiAccordReversion')
        .then(function(recordset) {
            console.log(colors.bgBlue.white(JSON.stringify(recordset))); //TEST
            callback(recordset);
            conn.close();
        })
        .catch(function(err) {
            next(new Error("Enregistrement multi-accords => " + err));
        });
        
    }).catch(function(err) {
        next(new Error("Enregistrement multi-accords => " + err));
    });
}