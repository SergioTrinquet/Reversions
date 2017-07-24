const _ = require('underscore');
var configPages = JSON.parse(JSON.stringify(require('config').get('pages')));

const colors = require('colors'); // juste pour le développement

module.exports = function (req, res, next) {
    console.log(colors.bgYellow.black('Middleware \'userRightsAccess\' => UserName : ' + req.app.get('userName') + ' | Rights : ' + req.Rights + ' | req.originalUrl : ' + req.originalUrl)); //TEST
    
    /// 1. On isole le nom de la page sur laquelle a lieu la requête
    var pg = req.originalUrl;
    pg = pg.substring(pg.indexOf('/') + 1);
    if(pg.indexOf('/') != -1) { pg = pg.substring(0, pg.indexOf('/')); }
    if(pg.indexOf('?') != -1) { pg = pg.substring(0, pg.indexOf('?')); }
    

    /// 2. On détermine les accès au menu
    // V1
    /*req.app.locals.menu = [
        { pg: "HistoGrp", acces: true, intitule: "Historique des groupements" }, // Pas de droits dessus : Ouvert à tous le monde
        { pg: "CreationAccord", acces: (_.contains(req.Rights, "ReversionsCreationAccord") ? true : false), intitule: "Créer un accord" },
        { pg: "RechercheAccords", acces: (_.contains(req.Rights, "ReversionsRechercheAccordLecture") || _.contains(req.Rights, "ReversionsRechercheAccordLectureEcriture") ? true : false), intitule: "Rechercher un accord" }
    ];*/
    // V2
    var tabMenu = [];
    configPages.forEach(function(pg) {
        var access = null;
        
        if(pg.role.length === 0) { // Si pas de role, page ouverte à tout le monde
            access = true;
        } else if(pg.role.length === 1) { // Si un role
            access = _.contains(req.Rights, pg.role[0]);
        } else if(pg.role.length > 1) { /// Si plus d'un role
            access = pg.role.some(function(role) {
                return _.contains(req.Rights, role) === true;
            });
        }
        
        /// cas spécifique du rôle 'Administrateur' => Accède à ttes les pages du menu
        if(_.contains(req.Rights, "ReversionsAdministrateur") === true) { access = true; }
        
        console.log("{pg: " + pg.nom + ", acces: " + access + ", intitule: " + pg.intitule + "}"); //TEST
        tabMenu.push({pg: pg.nom, acces: access, intitule: pg.intitule});
    });
    req.app.locals.menu = tabMenu;


    /// 3. Gestion des accès aux pages ou fonctionnalités dans les pages
    var limitationAccesCoteClient = false; /// Pour limiter l'accès côté client (menu et boutons désactivés par ex.)    
    //console.log(req.Rights); //TEST
    if(_.contains(req.Rights, "ReversionsAdministrateur")) {
        next();
    } else {
        switch(pg) {        
            case "CreationAccord":
                if(_.contains(req.Rights, "ReversionsCreationAccord")) {
                    next();
                } else {
                    res.render('AccesRefuse', {msgAccesRefuse: 'Vous n\'avez pas les droits pour accéder à cette page (rôle : ' + req.Rights + ').'});               
                }
                break;
            case "RechercheAccords":
                if(_.contains(req.Rights, "ReversionsRechercheAccordLectureEcriture")) {
                    next();
                } else if(_.contains(req.Rights, "ReversionsRechercheAccordLecture")) {
                    limitationAccesCoteClient = true;
                    console.log('typeof req.body.NumeroAccord : ' + typeof req.body.NumeroAccord + ' | req.xhr : ' + req.xhr); //TEST
                    if((req.method == 'POST' && typeof req.body.NumeroAccord !== 'undefined') || req.method == 'DELETE') {
                        res.render('AccesRefuse', {msgAccesRefuse: 'Vous n\'avez pas les droits pour utiliser cette fonctionnalité (rôle : ' + req.Rights + ').'}); //Envoi coté client car POST fait en AJAX      
                    } else {
                        next();
                    }
                } else {
                    res.render('AccesRefuse', {msgAccesRefuse: 'Vous n\'avez pas les droits pour accéder à cette page (rôle : ' + req.Rights + ').'});               
                }
                        
                break;
            default: // pg 'ListeHistoriqueGroupements'
                next();
        }
    }
    req.app.locals.limitationAcces = limitationAccesCoteClient;


}

