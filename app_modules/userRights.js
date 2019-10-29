const _ = require('underscore');
const configPages = JSON.parse(JSON.stringify(require('config').get('pages')));

const colors = require('colors'); // juste pour le dév.

module.exports = function (req, res, next) {

    console.log(colors.bgYellow.black('Middleware \'userRightsAccess\' => UserName : ' + req.app.get('userName') + ' | Rights : ' + req.Rights + ' | req.originalUrl : ' + req.originalUrl)); //TEST
    
    /// 1. On isole le nom de la page sur laquelle a lieu la requête
    let pg = req.originalUrl;
    pg = pg.substring(pg.indexOf('/') + 1);
    if(pg.indexOf('/') != -1) { pg = pg.substring(0, pg.indexOf('/')); }
    if(pg.indexOf('?') != -1) { pg = pg.substring(0, pg.indexOf('?')); }
    

    /// 2. On détermine les accès au menu
    let tabMenu = [];
    configPages.forEach(function(pg) {
        let access = null;
        
        if(pg.role.length === 0) { // Si pas de role, page ouverte à tout le monde
            access = true;
        } else if(pg.role.length === 1) { // Si un role
            access = hasRole(pg.role[0]);
        } else if(pg.role.length > 1) { // Si plus d'un role
            access = pg.role.some(function(role) {
                return hasRole(role) === true;
            });
        }
        
        // Cas spécifique du rôle 'Administrateur' => Accède à toutes les pages du menu
        if(hasRole("ReversionsAdministrateur") === true) { access = true; }
        
        console.log("{pg: " + pg.nom + ", intitule: " + pg.intitule + ", access: " + access + "}"); //TEST
        
        tabMenu.push({pg: pg.nom, acces: access, intitule: pg.intitule});
    });
    req.app.locals.menu = tabMenu;


    /// 3. Gestion des accès aux pages ou fonctionnalités dans les pages
    if(hasRole("ReversionsAdministrateur")) {    
        req.app.locals.limitationAcces = false; /// Variable coté vue : On ne limite pas l'accès
        next();
    } else {
        switch(pg) {        
            case "CreationAccord":

                if(hasRole("ReversionsCreationAccord")) {
                    next();
                } else {
                    res.render('AccesRefuse', {msgAccesRefuse: 'Vous n\'avez pas les droits pour accéder à cette page (rôle : ' + req.Rights + ').'});               
                }
                break;

            case "RechercheAccords":

                if(hasRole("ReversionsRechercheAccordLectureEcriture")) {
                    req.app.locals.limitationAcces = false; // Variable coté vue : On ne limite pas l'accès
                    next();
                } else if(hasRole("ReversionsRechercheAccordLecture")) {
                    console.log('typeof req.body.NumeroAccord : ' + typeof req.body.NumeroAccord + ' | req.xhr : ' + req.xhr); //TEST
                    if((req.method == 'POST' && typeof req.body.NumeroAccord !== 'undefined') || req.method == 'DELETE') {
                        res.render('AccesRefuse', {msgAccesRefuse: 'Vous n\'avez pas les droits pour utiliser cette fonctionnalité (rôle : ' + req.Rights + ').'});     
                    } else {
                        req.app.locals.limitationAcces = true; // Pour limiter l'accès au niveau de l'interface (menu et boutons désactivés par ex.)
                        next();
                    }
                } else {
                    res.render('AccesRefuse', {msgAccesRefuse: 'Vous n\'avez pas les droits pour accéder à cette page (rôle : ' + req.Rights + ').'});               
                }
                break;

            case "ListeAccords":

                if(hasRole("ReversionsListeAccordLectureEcriture")) {
                    req.app.locals.limitationAcces = false; // L'utilisateur peut modifier des données
                    next();
                } else if(hasRole("ReversionsListeAccordLecture")) {
                    req.app.locals.limitationAcces = true; // L'utilisateur est limité à la lecture (pas de modif. d'infos possibles)
                    next();
                } else {
                    res.render('AccesRefuse', {msgAccesRefuse: 'Vous n\'avez pas les droits pour accéder à cette page (rôle : ' + req.Rights + ').'});
                }
                break;

            default: // pg 'ListeHistoriqueGroupements'

                next();
        }
    }

    function hasRole(nomRole) {
        return _.contains(req.Rights, nomRole);
    }
}

