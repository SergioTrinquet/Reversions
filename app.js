const express = require('express');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const dateFormat = require('dateformat');
var logger = require('./log/logConfig.js').logger;
const listHistoGrpController = require('./controllers/ListeHistoriqueGroupementsController'); // Custom module
const CreateAccordController = require('./controllers/CreationAccordController'); // Custom module
const RechAccordsController = require('./controllers/RechercheAccordsController'); // Custom module
const ListeAccordsController = require('./controllers/ListeAccordsController'); // Custom module
const ListeFacturesEtblController = require('./controllers/ListeFacturesEtblController'); // Custom module
var session = require('./app_modules/session.js');
var authentification = require('./app_modules/authentification.js');
var email = require('./app_modules/mail.js');
const config = require("config");

const colors = require('colors'); // juste pour le développement

const app = express();

/// Pour rendre les fonctionnalités de 'dateformat' accessibles dans ttes les pages .ejs, sous forme d'une variable locale
app.locals.dateFormat = dateFormat;

/// Set up template engine
app.set('view engine', 'ejs');

app.use(helmet()); /// Helmet helps you secure your Express apps 


//app.locals.ENV = app.get('env');//TEST
console.log('Mode : ' + app.get('env')); //TEST
console.log('TEST sur module CONFIG: ' + config.get('env') + " | " + config.get('dbConfig.server') + " | " + config.get('dbConfig.database')); //TEST


/// Static files
const env = app.get('env'); /// Pour détecter si on est en mode 'development' ou 'production', ou autre
app.locals.ENV = env; /// Pour être eccessible ds les .ejs
app.use(express.static('./public/assets/' + (env === 'development' ? 'src' : 'dist')));
app.use(express.static('./public/assets/docs'));


/// Partie authentification après l'appel des static files car sinon ne trouve pas le chemin du .css pour 'AccesRefuse.ejs'
app.use(session); /// Middleware pour création de session
app.use(authentification); /// Middleware pour authentification



///Partie log (placé après l'appel des static files, sinon les enregistre)
//console.log(colors.bgBlue.white('=> userName : ' + app.get('userName'))); //TEST
/*app.use(require('winston-request-logger').create(logger, {
    //'login': app.get('userName'),
    'method': ':method', 
    'url': ':url[pathname]',
    'responseTime': ':responseTime ms'  // output 'X ms'   	
}));*/


/// Middleware pour le POST
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: false }));



listHistoGrpController(app); /// Pour la page 'Historique des groupes'
RechAccordsController(app); /// Pour la page de recherche des accords
ListeFacturesEtblController(app); /// Pour la page de liste des factures pour un établissements
CreateAccordController(app); /// Pour la page de création d'un accord
ListeAccordsController(app); /// Pour la page de liste des accords


// Middleware pour gérer les erreurs qui sont remontées
app.use(function (err, req, res, next) {
    if(env === 'production') {
        email(err.message, err.stack);
    }
    
    console.log(colors.bgRed.white(err.stack));
    logger.log('error', err.stack, {login: req.app.get('userName')}); 

    if(req.xhr) { // Si erreur suite à appel ajax
        res
            .status(err.status || 500)
            .render('templates/encartErreur', { titre: err.customMsg, message: err.message, stack: err.stack }); // Version en Html
    
    } else { // Autre

        res
            .status(err.status || 500)
            .render('Erreur', {erreur_msg: err.message, erreur_stack: err.stack});

    }
})


// On écoute le port
app.listen(process.env.PORT || 3000);
