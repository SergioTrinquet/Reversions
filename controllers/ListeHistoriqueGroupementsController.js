const colors = require('colors'); // juste pour le développement
const dateFormat = require('dateformat');
var userRightsAccess = require('../app_modules/userRights.js'); /// Middleware pour gérer les accès en fonction des droits de l'utilisateur

var NbLgnPerPg = 100;

module.exports = function(app) {

      app.get('/HistoGrp', userRightsAccess, function(req, res, next) {

        //if(req.xhr) {  console.log('Ajax'); } else { console.log('Pas ajax'); } //TEST

        /// 1.On va chercher la data avec le module   mssql, 2.La passer en paramètres ds le render ci-dessous, 3.Intégrer la data dans le .ejs  
        getData(function(recordsets) {

            //console.log(colors.yellow('N° de page : ' + req.query.page)); //TEST
            /// Récupération data passée en GET ds l'URL --> Pagination
            var queryPage = req.query.page;
            var pg = (queryPage ? (queryPage > 0 ? queryPage : 1 ) : 1 );
        
            /// On détermine le nb de pages   totales
            var NbLgnsRecordset = recordsets[1][0].CountLigns;       
            var NbPgs = Math.floor(NbLgnsRecordset/NbLgnPerPg) + ((NbLgnsRecordset % NbLgnPerPg) != 0 ? 1 : 0);
            console.log(colors.magenta(NbLgnsRecordset + ' | ' + NbPgs)); //TEST
            
            res.render('ListeHistoriqueGroupements', {dataGrp: recordsets[0], numpg: pg, numtotalpg: NbPgs });
        }, 
        req.query, 
        next
        );

    });


};



function getData(callback, query, next) {
    var sql = require('mssql');
    var config = JSON.parse(JSON.stringify(require('config').get('dbConfig'))); // Nvelle version avec module 'config'

    /// Récupération des variables passées dans le req.query pour construire la requete
    var queryEtbl = (typeof query.Etablissement === 'undefined' ? '' : query.Etablissement.replace("'", "''"));
    var queryGrp = (typeof query.Groupe === 'undefined' ? '' : query.Groupe.replace("'", "''"));
    var queryDateDebut = (typeof query.DateDebut === 'undefined' ? '' : query.DateDebut);
    if(queryDateDebut != '') {
        var tabDD = queryDateDebut.split(/[- //]/);
        queryDateDebut = new Date(tabDD[2], parseInt(tabDD[1] - 1), tabDD[0]); // on cast le string en Date
        queryDateDebut = dateFormat(queryDateDebut, 'yyyy-mm-dd'); // On formate pour la requete SQL
    }
    var queryTypeOperationDate = (typeof query.MotDate === 'undefined' ? '' : query.MotDate);
    var queryDateFin = (typeof query.DateFin === 'undefined' ? '' : query.DateFin);
    if(queryDateFin != '') {
        var tabDF = queryDateFin.split(/[- //]/);
        queryDateFin = new Date(tabDF[2], parseInt(tabDF[1] - 1), tabDF[0]); // on cast le string en Date
        queryDateFin = dateFormat(queryDateFin, 'yyyy-mm-dd'); // On formate pour la requete SQL
    }
    var queryPage = query.page;
    var pg = (typeof queryPage !== 'undefined' ? (queryPage > 0 ? queryPage : 1 ) : 1 );
    console.log(colors.red('query.Etablissement : ' + queryEtbl + ' | query.Groupe : ' + queryGrp + ' | query.DateDebut : ' + queryDateDebut + ' | query.MotDate : '+ queryTypeOperationDate +' | query.DateFin : ' + queryDateFin + ' | N° de page : ' + pg)); //TEST
    

    /// Construction des requetes
    var partWhereRequete = "";
    if(queryEtbl != "" || queryGrp != "" || queryDateDebut != "") { partWhereRequete +=  "where " }
    if(queryEtbl != "") { partWhereRequete +=  " NomEtablissement like '%" + queryEtbl + "%' " }
    if(queryGrp != "") { partWhereRequete +=  (queryEtbl != "" ? " AND" : "") + " [LIBELLE GROUPEMENT] like '%" + queryGrp + "%' " }
    if(queryTypeOperationDate != "") {
        var partSQLRequest = null;
        switch(queryTypeOperationDate) {
            case 'where':
                partSQLRequest = "DateEntree = '" + queryDateDebut + "' ";
                break;
            case 'from':
                partSQLRequest = "DateEntree >= '" + queryDateDebut + "' ";
                break;
            case 'upto':
                partSQLRequest = "DateEntree <= '" + queryDateDebut + "' ";
                break;
            case 'between':
                //partSQLRequest = "DateEntree >= '" + queryDateDebut + "' and DateEntree <= '" + queryDateDebut + "' ";
                partSQLRequest = "DateEntree >= '" + queryDateDebut + "' and DateEntree <= '" + queryDateFin + "' ";
        } 
        if(queryDateDebut != "") { partWhereRequete += (queryEtbl != "" || queryGrp != "" ? " AND " : " ") + partSQLRequest }
    }


    var requete = "SELECT NomEtablissement, Cp, Ville, Adresse1, Adresse2, Adresse3, [LIBELLE GROUPEMENT] As Libelle_Groupement, DateEntree, DateSortie, " +
    " Case " +
    "when DateEntree IS NOT NULL AND DateSortie IS NULL then 1 " +
    "when DateEntree IS NOT NULL AND DateSortie IS NOT NULL then 2 " +
    "End As TypeAppartenance " +
    "FROM dbo.Vw_Etablissements " + partWhereRequete + "order by DateEntree desc ";

    /// Partie requete pour pagination
    requete += "OFFSET " + ((pg * NbLgnPerPg) - NbLgnPerPg) + " ROWS " +
    "FETCH NEXT " + NbLgnPerPg + " ROWS ONLY";

    /// 2eme requete : Pour connaitre le nb de lignes pour pagination
    requete += "; SELECT Count(*) As CountLigns FROM dbo.Vw_Etablissements " + partWhereRequete + ";";

    console.log(requete); //TEST


    sql.connect(config).then(function() {
        
        var request = new sql.Request();    
        request.multiple = true; // On autorise les requetes multiples

        request
        .query(requete)
        .then(function(recordsets) {
            callback(recordsets);
        })
        .catch(function(err) {
            next(new Error("Chargement de la liste de l'historique des groupes => " + err));
        });

    }).catch(function(err) {
        next(new Error("Chargement de la liste de l'historique des groupes => " + err));
    });
}