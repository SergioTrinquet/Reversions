const sessions = require('client-sessions');
const sql = require('mssql');
const _ = require('underscore');
var dbConfig = JSON.parse(JSON.stringify(require('config').get('dbConfig_CRM')));
var listeApplicationRole = JSON.parse(JSON.stringify(require('config').get('listeApplicationRole')));
var logger = require('../log/logConfig.js').logger;

const colors = require('colors'); // juste pour le dév.


exports.setSession = sessions({
    cookieName: 'maSession', // cookie name dictates the key name added to the request object 
    secret: 'blargadeeblargblarg', // should be a large unguessable string 
    duration: 24 * 60 * 60 * 1000, // how long the session will stay valid in ms 
    activeDuration: 1000 * 60 * 5, // if expiresIn < activeDuration, the session will be extended by activeDuration milliseconds 
    cookie: {
        ephemeral: true // when true, cookie expires when the browser closes 
    }
});


exports.authentification = function(req, res, next) {
    /// Récupération de l'identifiant de l'utilisateur
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
    console.log('Ici, MiddleWare pour authentification !! | nomUtilisateur : ' + nomUtilisateur);  
    req.maSession.userName ? console.log('Il y a un session.rights : ' + req.maSession.rights) : console.log('Pas de session : ' + req.maSession.rights);
    /// Fin TEST

    /// Si pas de session, on en créé une où l'on y stocke le role
    /*if(!req.maSession.rights) {  */
    if( (!req.maSession.rights) || (req.maSession.rights && req.maSession.userName !== nomUtilisateur) ) {  /// Nvelle version au 28/07/2017 /// Si pas de session, ou bien si session mais que l'utilisateur est différent de celui enregistré dans la session

        /// On va voir pour cet utilisateur s'il a des droits
        getRole(function(recordset) {
            console.log(colors.bgMagenta.white(JSON.stringify(recordset)) + " " + recordset.length); //TEST
            
            /// Redirection ou pas en fonction du nbr de rôles
            if(recordset.length == 0) { /// Si pas de rôle
                
                logger.log('error',  "Middleware d'authentification : Pas de rôle pour " + nomUtilisateur + "."); 
                res.render('AccesRefuse', {msgAccesRefuse: 'Vous n\'avez pas les droits pour accéder à cette page.'});
                
            } else {  /// Sinon, on stocke son role (qui va servir ensuite pour donner accès ou non à telle fonctionnalités), puis 'next();'
                
                req.Rights = _.pluck(recordset, 'RoleName');    
                //req.Rights = ['ReversionsRechercheAccordLecture', 'ReversionsCreationAccord'];  //Pour faires des TESTs 
                //console.log(req.Rights); //TEST
                
                /// Pour rendre ces infos accessibles au niveau de la vue 'userInfo.ejs'
                req.app.locals.Rights = req.Rights;
                /// Enregistrement dans la session des données
                req.maSession.rights = req.Rights; 
                req.maSession.userName = nomUtilisateur;
                
                next();
            }

        }, nomUtilisateur, next);


    
    } else {
        req.Rights = req.maSession.rights;
        req.app.locals.Rights = req.Rights; /// Pour rendre ces infos accessibles au niveau de la vue 'userInfo.ejs'
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

    console.log(colors.bgCyan.yellow(requete)); //TEST
    
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
            next(new Error("Récupération du role de l'utilisateur pour affecter les droits => " + err));
        });

    }).catch(function(err) {
        next(new Error("Récupération du role de l'utilisateur pour affecter les droits => " + err));
    });
}
