const colors = require('colors'); // Juste pour le dév.

const sql = require('mssql');
const dateFormat = require('dateformat');
const _ = require('underscore');
const logger = require('../log/logConfig.js').logger;
var config = JSON.parse(JSON.stringify(require('config').get('dbConfig'))); // Pour obtenir paramètres de config (connexion bdd, droits)
var userRightsAccess = require('../app_modules/userRights.js'); // Middleware pour gérer les accès en fonction des droits de l'utilisateur

module.exports = function(app) {

    // Page 'ListeAccords' est la page par défaut
    app.get('/', function(req, res, next) {
        res.redirect('/ListeAccords');
    });

    // Chargement des accords
    app.get('/ListeAccords', userRightsAccess, function(req, res, next) {
        getlisteAccords(function(recordset) {
            var ListeAccords = recordset[0];
            ListeAccords = formatData(ListeAccords);
            res.render('ListeAccords', { ListeAccords: ListeAccords });
        }, next);
    });



    // Inscription de la date de validation/règlement de la réversion
    app.post('/ListeAccords/setDate/:operation/:idAccordRev', userRightsAccess, async function(req, res, next) {
        if(req.app.locals.limitationAcces === false) { // Si utilisateur n'a pas de droits limités  
            try {

                let laDate = req.body.date;
                let dateDecomposee = laDate.split(/[- //]/);
                let dateGoodFormat = dateDecomposee[2] + '-' + dateDecomposee[1] + '-' + dateDecomposee[0];
                
                let operation = req.params.operation;
                if(operation === "validation") { // Pour validation de réversion
                    console.log(colors.bgRed.yellow("VALIDATION de rev.")); //TEST

                    setDateValidation(function(recordset) {
                        logger.log(
                            'info',  
                            "Accord (id: " + req.params.idAccordRev + ") validé au " + laDate + " par " + req.app.get('userName'), 
                            {
                                Login: req.app.get('userName'), 
                                IdAccord: req.params.idAccordRev,
                                DateDeValidation: laDate
                            }
                        );    
                        
                        getlisteAccords(function(recordset) {
                            let ListeAccords = recordset[0];
                            ListeAccords = formatData(ListeAccords);
                            //console.log("req.params.idAccordRev => " + req.params.idAccordRev); console.log("ListeAccords => " + JSON.stringify(ListeAccords)); console.log("-----------------------"); //TEST
                            var SingleAccord = _.findWhere(ListeAccords, {AccordReversionId: parseInt(req.params.idAccordRev) });
                            
                            res.render('templates/ligneListeAccords', { accord: SingleAccord }, function(err, html) {                
                                if(err) { return next(err); } 
                                res.send(html);                
                            });
                        }, next);
                    }, req.params, dateGoodFormat, next);

                } else if(operation === "reglement") { // Pour règlement de réversion
                    console.log(colors.bgBlue.yellow("REGLEMENT de rev.")); //TEST
                    
                    setDateReglement(function (recordset){
                        logger.log(
                            'info',  
                            "Accord (id: " + req.params.idAccordRev + ") réglé au " + laDate + " par " + req.app.get('userName'), 
                            {
                                Login: req.app.get('userName'), 
                                IdAccord: req.params.idAccordRev,
                                DateDeValidation: laDate
                            }
                        );
                        
                        getlisteAccords(function(recordset) {
                            let ListeAccords = recordset[0];
                            ListeAccords = formatData(ListeAccords);
                            //console.log("req.params.idAccordRev => " + req.params.idAccordRev); console.log("ListeAccords => " + JSON.stringify(ListeAccords)); console.log("-----------------------"); //TEST
                            var SingleAccord = _.findWhere(ListeAccords, {AccordReversionId: parseInt(req.params.idAccordRev) });
                            
                            res.render('templates/ligneListeAccords', { accord: SingleAccord }, function(err, html) {                
                                if(err) { return next(err); } 
                                res.send(html);                
                            });
                        }, next);
                    }, req.params, dateGoodFormat, next);
                    
                }


            } catch (err) {
                if(!err.customMsg) { err.customMsg = "Phase d'inscription d'une date de validation ou de règlement d'un accord."; }
                next(err);
            }

        } else {

            next({
                customMsg: "Droits insuffisants", 
                message: "Vous n'avez pas les droits d'écriture : Impossible de saisir une date !" 
            });
        }

    });

    // Modification du montant de la 'somme versée'
    app.post('/ListeAccords/changeAmount/:idAccordRev', userRightsAccess, async function(req, res, next) {
        if(req.app.locals.limitationAcces === false) { // Si utilisateur n'a pas de droits limités  
            try {
                let sum = req.body.somme;
                let idAccordRev = req.params.idAccordRev;

                setSommeVersee(function() {
                    logger.log(
                        'info',  
                        "Accord (id: " + idAccordRev + ") - Modification du champ 'somme versée'. Nouveau montant saisi (=> " + sum + ")  par " + req.app.get('userName'), 
                        {
                            Login: req.app.get('userName'), 
                            IdAccord: idAccordRev,
                            SommeVersee: sum
                        }
                    );

                    getlisteAccords(function(recordset) {
                        let ListeAccords = recordset[0];
                        ListeAccords = formatData(ListeAccords);
                        //console.log("req.params.idAccordRev => " + idAccordRev); console.log("ListeAccords => " + JSON.stringify(ListeAccords)); console.log("-----------------------"); //TEST
                        var SingleAccord = _.findWhere(ListeAccords, {AccordReversionId: parseInt(idAccordRev) });
                        
                        res.render('templates/ligneListeAccords', { accord: SingleAccord }, function(err, html) {                
                            if(err) { return next(err); } 
                            res.send(html);                
                        });
                    }, next);

                }, idAccordRev, sum, next);

            } catch (err) {
                if(!err.customMsg) { err.customMsg = "Phase de modification du montant de la 'somme versée'"; }
                next(err);
            }

        } else {
            next({
                customMsg: "Droits insuffisants", 
                message: "Vous n'avez pas les droits d'écriture : Impossible de saisir une somme !" 
            });
        }

    });

}


function formatData(LstAccords) {
    if(typeof LstAccords !== "undefined") {     //console.log(colors.bgYellow.black(JSON.stringify(LstAccords))); //TEST
        var LstAccords_NEW = [];
        // On groupe les enregistrements par le champ 'AccordReversionId' pour gérer le cas ou un accord comprend plusieurs groupes (du coup, plusieurs lignes correspondant au même accord, ce qui ne correspond pas à ce que l'on veut)
        var LstAccords_GroupByAccordReversionId = _.groupBy(LstAccords, 'AccordReversionId');   //console.log(colors.bgGreen.white(JSON.stringify(LstAccords_GroupByAccordReversionId))); //TEST
        for(var acc in LstAccords_GroupByAccordReversionId) {
            
            var accord = LstAccords_GroupByAccordReversionId[acc][0];
            var validRevDate =  accord.ValidationReversionDate;       
            accord.ValidationReversionDate = (validRevDate !== null ? dateFormat(validRevDate, 'dd/mm/yyyy') : "Non");
            accord.ReversionValidee = (validRevDate !== null ? "oui" : "non");
            accord.dataAttr_ValidationReversionDate = (validRevDate !== null ? dateFormat(validRevDate, 'yyyymmdd') : "-");
            var AvisRegl = accord.AvisReglement;
            accord.AvisReglement  = (AvisRegl !== null ? dateFormat(AvisRegl, 'dd/mm/yyyy') : "Non");
            accord.ReversionReglee = (AvisRegl !== null ? "oui" : "non");
            accord.dataAttr_AvisReglement = (AvisRegl !== null ? dateFormat(AvisRegl, 'yyyymmdd') : "-");
            var CreatedDate = accord.CreatedDate;
            accord.CreatedDate = dateFormat(CreatedDate, 'dd/mm/yyyy HH:MM:ss');
            accord.dataAttr_CreatedDate = dateFormat(CreatedDate, 'yyyymmddHHMMss');
            accord.MultiGroupes = false;
            accord.PeriodeDebut = dateFormat(accord.PeriodeDebut, 'dd/mm/yyyy'); // Pas utilisé
            accord.PeriodeFin = dateFormat(accord.PeriodeFin, 'dd/mm/yyyy'); // Pas utilisé
            //accord.InfoComplAccord = "Accord pour " + (accord.AccordGroupe == 0 ? "établ." : "groupe") + " "  + (accord.GroupementId == 96 ? " n'appartenant à aucun groupe" : (acc.AccordGroupe == 1 ? "<span>" + acc.Groupe + "</span>" : (acc.AccordGroupe == 0 ? " appartenant au groupe <span>" + acc.Groupe + "</span>" : ""))); // PAs utilisé
            
            if(LstAccords_GroupByAccordReversionId[acc].length > 1) { // Dans cas ou plusieurs lignes correspondant au même accord
                var ListeGroupes = [];
                for(var i = 0; i < LstAccords_GroupByAccordReversionId[acc].length; i++ ) {
                    ListeGroupes.push(LstAccords_GroupByAccordReversionId[acc][i].Groupe);
                }
                accord.Groupe = ListeGroupes.join(" - ");
                accord.MultiGroupes = true;
            }

            //console.log(colors.bgGreen.white(LstAccords_GroupByAccordReversionId[acc].length + "////////////////") + " \
            //        " + colors.bgBlue.white(JSON.stringify(LstAccords_GroupByAccordReversionId[acc]))); //TEST
            
            LstAccords_NEW.push(accord);
        }
    }

    //console.log(JSON.stringify(LstAccords_GroupByAccordReversionId[5018])); //TEST

    // On ordonne le tableau en classant par ordre descendant sur le champ 'dataAttr_CreatedDate'
    LstAccords_NEW = _.sortBy(LstAccords_NEW, 'dataAttr_CreatedDate').reverse();            //console.log(colors.bgMagenta.yellow(JSON.stringify(LstAccords_NEW))); //TEST
    
    return LstAccords_NEW;
}




// Pour alimenter la liste complète des accords
function getlisteAccords(callback, next) {
    let msg = "Récupération de la liste des accords => ";
    
    var conn = new sql.Connection(config); 
    conn.connect().then(function() {
        var request = new sql.Request(conn);
        request
        .execute('ReversionApp.ps_ListeAccordsEnCours')
        .then(function(recordset) {
            callback(recordset);
            conn.close();
        })
        .catch(function(err) {
            next(new Error(msg + err));
        });

    }).catch(function(err) {
        next(new Error(msg + err));
    });
}




// Pour inscrire date de validation d'un accord'
function setDateValidation(callback, params, selectedDate, next) {
    let msg = "Ecriture de date de validation d'un accord parmi la liste des accords => ";
    let idAccordRev = params.idAccordRev;
    
    var conn = new sql.Connection(config); 
    conn.connect().then(function() {
        var request = new sql.Request(conn);
        
        request
        .input('AccordReversionId', sql.Int, idAccordRev)
        .input('Date', sql.Date, selectedDate)
        .execute('ReversionApp.ps_MajDateValidationReversion')
        .then(function(recordset) {
            conn.close();
            callback(recordset);
        })
        .catch(function(err) {
            next(new Error(msg + err));
        });

    }).catch(function(err) {
        next(new Error(msg + err));
    });
}

// Pour inscrire date de réglement d'un accord
function setDateReglement(callback, params, selectedDate, next) {
    let msg = "Ecriture de date de règlement d'un accord parmi la liste des accords => ";
    let idAccordRev = params.idAccordRev;
    
    var conn = new sql.Connection(config); 
    conn.connect().then(function() {
        var request = new sql.Request(conn);

        console.log("idAccordRev => " + idAccordRev + " | selectedDate => " + selectedDate); //TEST
        
        request
        .input('AccordReversionId', sql.Int, idAccordRev)
        .input('DateReglement', sql.Date, selectedDate)
        .execute('ReversionApp.ps_MajDateMontantReversion')
        .then(function(recordset) { 
            conn.close();
            callback(recordset);
        })
        .catch(function(err) {
            next(new Error(msg + err));
        });

    }).catch(function(err) {
        next(new Error(msg + err));
    });
}

// Pour corriger somme versée d'un accord
function setSommeVersee(callback, idAccordRev, somme, next) {
    let msg = "Ecriture (correction) du montant de la somme versée d'un accord parmi la liste des accords => ";
    
    var conn = new sql.Connection(config); 
    conn.connect().then(function() {
        var request = new sql.Request(conn);
        
        request
        .input('AccordReversionId', sql.Int, idAccordRev)
        //.input('DateReglement', sql.Date, null) // <= Ici valeur nulle car même proc. stock. pour usage différent, etds ce cas ici mettre un chp vide au lieu de date
        .input('MontantReglement', sql.Float, somme)
        .execute('ReversionApp.ps_MajDateMontantReversion')
        .then(function(recordset) {
            conn.close();
            callback(recordset);
        })
        .catch(function(err) {
            next(new Error(msg + err));
        });

    }).catch(function(err) {
        next(new Error(msg + err));
    });
}