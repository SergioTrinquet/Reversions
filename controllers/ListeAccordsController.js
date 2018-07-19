const colors = require('colors'); // Juste pour le dév.

const sql = require('mssql');
const dateFormat = require('dateformat');
const _ = require('underscore');
var config = JSON.parse(JSON.stringify(require('config').get('dbConfig'))); // Pour obtenir paramètres de config (connexion bdd, droits)
var userRightsAccess = require('../app_modules/userRights.js'); /// Middleware pour gérer les accès en fonction des droits de l'utilisateur

module.exports = function(app) {

    
    /// Page 'ListeAccords' est la page par défaut
    app.get('/', function(req, res, next) {
        res.redirect('/ListeAccords');
    });


    app.get('/ListeAccords', userRightsAccess, function(req, res, next) {

        getlisteAccords(function(recordset) {
            var ListeAccords = recordset[0];
            ListeAccords = formatData(ListeAccords);
            res.render('ListeAccords', { ListeAccords: ListeAccords });
        }, next);
        
    });

}

function formatData(LstAccords) {
   
    if(typeof LstAccords !== "undefined") {

        var LstAccords_NEW = [];
        // On groupe les enregistrements par le champ 'AccordReversionId' pour gérer le cas ou un accord comprend plusieurs groupes (du coup, plusieurs lignes correspondant au même accord, ce qui ne correspond pas à ce que l'on veut)
        var LstAccords_GroupByAccordReversionId = _.groupBy(LstAccords, 'AccordReversionId');
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
                    //console.log(LstAccords_GroupByAccordReversionId[acc][i].Groupe + " / ");
                }
                //console.log("ListeGroupes : "+ ListeGroupes.join(" - ")); //TEST
                accord.Groupe = ListeGroupes.join(" - ");
                accord.MultiGroupes = true;
            }

            //console.log(colors.bgGreen.white(LstAccords_GroupByAccordReversionId[acc].length + "////////////////") + " " + colors.bgBlue.white(JSON.stringify(LstAccords_GroupByAccordReversionId[acc]))); //TEST
            
            LstAccords_NEW.push(accord);
        }
    }

    // On ordonne le tableau en classant par ordre descendant sur le champ 'dataAttr_CreatedDate'
    LstAccords_NEW = _.sortBy(LstAccords_NEW, 'dataAttr_CreatedDate').reverse();
    //console.log(JSON.stringify(LstAccords_NEW)); //TEST

    return LstAccords_NEW;
}

function getlisteAccords(callback, next) {
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
            next(new Error("Récupération de la liste des accords => " + err));
        });

    }).catch(function(err) {
        next(new Error("Récupération de la liste des accords => " + err));
    });
}