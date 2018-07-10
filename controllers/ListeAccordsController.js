const colors = require('colors'); // Juste pour le développement

const sql = require('mssql');
const dateFormat = require('dateformat');
//const _ = require('underscore');
var config = JSON.parse(JSON.stringify(require('config').get('dbConfig'))); // Pour obtenir paramètres de config (connexion bdd, droits)
var logger = require('../log/logConfig.js').logger; // Pour les logs
var userRightsAccess = require('../app_modules/userRights.js'); /// Middleware pour gérer les accès en fonction des droits de l'utilisateur

module.exports = function(app) {

    app.get('/ListeAccords', userRightsAccess, function(req, res, next) {

        /// Bonne version : En attente de finalisation
        getlisteAccords(function(recordset) {
            var ListeAccords = recordset[0];
            ListeAccords = formatData(ListeAccords);
            console.log(JSON.stringify(ListeAccords)); //TEST

            //res.render('ListeAccords'); /// Version temporaire au 03/07/18
            res.render('ListeAccords', { ListeAccords: ListeAccords }); ///  Version à terminer !
        }, next);
        
    });

}

function formatData(LstAccords) {
    if(typeof LstAccords !== "undefined") {
        LstAccords.forEach(function(acc) {     
            var validRevDate =  acc.ValidationReversionDate;       
            acc.ValidationReversionDate = (validRevDate !== null ? dateFormat(validRevDate, 'dd/mm/yyyy') : "Non");
            acc.ReversionValidee = (validRevDate !== null ? "oui" : "non");
            var AvisRegl = acc.AvisReglement;
            acc.AvisReglement  = (AvisRegl !== null ? dateFormat(AvisRegl, 'dd/mm/yyyy') : "Non");
            acc.ReversionReglee = (AvisRegl !== null ? "oui" : "non");
            
            acc.InfoComplAccord = "Accord pour " + (acc.AccordGroupe == 0 ? "établ." : "groupe") + " "  + (acc.GroupementId == 96 ? " n'appartenant à aucun groupe" : (acc.AccordGroupe == 1 ? "<span>" + acc.Groupe + "</span>" : (acc.AccordGroupe == 0 ? " appartenant au groupe <span>" + acc.Groupe + "</span>" : "")));
        });
    }
    
    return LstAccords;
}

function getlisteAccords(callback, next) {
    var conn = new sql.Connection(config); 
    conn.connect().then(function() {
        
        var request = new sql.Request(conn);
        
        request
        .execute('ReversionApp.ps_ListeAccordsEnCours')
        .then(function(recordset) {
            //console.log(colors.bgYellow.blue(JSON.stringify(recordset))); //TEST
            callback(recordset);
            conn.close();
        })
        .catch(function(err) {
            next(new Error("Récupération de la liste des accords => " + err));
        });

    }).catch(function(err) {
        next(new Error("Récupération de la liste des accords => " + err));
    });
}