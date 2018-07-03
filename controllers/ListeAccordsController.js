const colors = require('colors'); // Juste pour le développement

const sql = require('mssql');
//const _ = require('underscore');
var config = JSON.parse(JSON.stringify(require('config').get('dbConfig'))); // Pour obtenir paramètres de config (connexion bdd, droits)
var logger = require('../log/logConfig.js').logger; // Pour les logs
var userRightsAccess = require('../app_modules/userRights.js'); /// Middleware pour gérer les accès en fonction des droits de l'utilisateur

module.exports = function(app) {

    app.get('/ListeAccords', userRightsAccess, function(req, res, next) {

        res.render('ListeAccords'); /// Version temporaire au 03/07/18

        /// Bonne version : En attente de finalisation
        getlisteAccords(function(recordset) {
            var ListeAccords = recordset[0];
            res.render('ListeAccords', { ListeAccords: ListeAccords });
        }, next);
        
    });

}