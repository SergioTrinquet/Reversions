const sql = require('mssql');
const _ = require('underscore');
var dbConfig = JSON.parse(JSON.stringify(require('config').get('dbConfig_CRM')));
var listeApplicationRole = JSON.parse(JSON.stringify(require('config').get('listeApplicationRole')));
var logger = require('../log/logConfig.js').logger;
const colors = require('colors'); // juste pour le dév.


module.exports = function(req, res, next) {
    // Récupération de l'identifiant de l'utilisateur
    var nomUtilisateur = "Non identifié";
    if(req.app.locals.ENV == 'development') {
        const path = require('path');
        nomUtilisateur = process.env['USERPROFILE'].split(path.sep)[2];
    } else if(req.app.locals.ENV == 'production') {
        nomUtilisateur = req.headers['x-iisnode-auth_user'];
        nomUtilisateur = nomUtilisateur.replace("AD\\", "").replace("ad\\", ""); // Pour retirer le nom de domaine, sinon 'AD\jmartin' par ex.
    }
    req.app.set('userName', nomUtilisateur);
    req.app.locals.UserName = nomUtilisateur; /// Pour rendre l'info facilement accessible dans les vues
          
          
    /// TEST
    //console.log('Ici, MiddleWare pour authentification !! | nomUtilisateur : ' + nomUtilisateur);  
    console.log(colors.bgWhite.black('req.session.userName : ' + req.session.userName + ' | req.session.rights : ' + req.session.rights)); //TEST
    //req.session.userName ? console.log('Il y a un session.rights : ' + req.session.rights) : console.log('Pas de session : ' + req.session.rights);
    /// Fin TEST

    // Si pas de session, ou bien si session mais que l'utilisateur est différent de celui enregistré dans la session, 
    // on en créé une où l'on y stocke le role
    if( (!req.session.rights) || (req.session.rights && req.session.userName !== nomUtilisateur) ) {

        // Check des droits pour cet utilisateur
        getRole(function(recordset) {
            console.log(colors.bgMagenta.white(JSON.stringify(recordset)) + " " + recordset.length); //TEST
            
            // Redirection ou pas en fonction du nbr de rôles
            if(recordset.length == 0) { // Si pas de rôle
                
                logger.log('error',  "Middleware d'authentification : Pas de rôle pour " + nomUtilisateur + "."); 
                res.render('AccesRefuse', {msgAccesRefuse: 'Vous n\'avez pas les droits pour accéder à cette page.'});
                
            } else {  // Sinon, on stocke son role (qui va servir ensuite pour donner accès ou non à telle page(s)/fonctionnalités), puis 'next();'
                
                req.Rights = _.pluck(recordset, 'RoleName');    
                //req.Rights = ['ReversionsRechercheAccordLecture', 'ReversionsCreationAccord', 'ReversionsListeAccordLecture'];  //Pour faires des TESTs 
                //console.log(req.Rights); //TEST
                
                // Pour rendre ces infos accessibles au niveau de la vue 'userInfo.ejs'
                req.app.locals.Rights = req.Rights;
                // Enregistrement dans la session des données
                req.session.rights = req.Rights; 
                req.session.userName = nomUtilisateur;
                
                next();
            }

        }, nomUtilisateur, next);

    } else {
        req.Rights = req.session.rights;
        req.app.locals.Rights = req.Rights; // Pour rendre ces infos accessibles au niveau de la vue 'userInfo.ejs'
        next();
    }

}



///--- Pour récupérer le(s) role(s) d'un utilisateur ---///
function getRole(callback, data, next) {
    /// Traitement pour ajouter des apostrophes aux éléments du tableau de rôles
    var tempTab = [];
    listeApplicationRole.forEach(function(role) { tempTab.push("'" + role + "'"); });

    var requete = "" +
    "SELECT Appli.ApplicationRole.RoleName " +
    "FROM Appli.UserInApplicationRole " + 
        "LEFT OUTER JOIN Appli.ApplicationRole ON Appli.UserInApplicationRole.ApplicationRoleID = Appli.ApplicationRole.ApplicationRoleID " +
        "RIGHT OUTER JOIN Appli.[User] ON Appli.UserInApplicationRole.UserID = Appli.[User].UserID " +
    "WHERE (Appli.[User].Login = '" + data + "') AND Appli.ApplicationRole.RoleName in(" + tempTab.join(", ") + ")";

    var msg = "Récupération du role de l'utilisateur pour affecter les droits => ";

    var conn = new sql.Connection(dbConfig); 
    conn.connect().then(function() {
        var request = new sql.Request(conn);
        
        request
        .query(requete)
        .then(function(recordset) {
            //console.log(colors.bgGreen.white(JSON.stringify(recordset))); //TEST
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
