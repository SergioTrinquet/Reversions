const colors = require('colors'); // juste pour le développement
const fs = require('fs'); // juste pour le développement

const sql = require('mssql');
//const config = require('../config_mssql').config;
var config = JSON.parse(JSON.stringify(require('config').get('dbConfig'))); // Nvelle version avec module 'config'
const _ = require('underscore');
const promise = require('promise');
const dateFormat = require('dateformat');
const numeral = require('numeral');
const numeralFormat = require('../numeralFormat').numeralFormat;

var recordset_Etbl = null;


module.exports = function(app) {

    /// Pour imposer un formatage des montants
    numeralFormat();
    

    app.get('/ListeFacturesEtbl', function(req, res, next) {

        if(!_.isEmpty(req.query)) {

            /* V1 */
            getDataEtbl(function(recordset) {
                //console.log(colors.bgMagenta.black(recordset)); //TEST

                recordset_Etbl = FormatDataEtbl(recordset);
                getDataFactures(function(recordset) {
                    //recordset.forEach(function(item) { console.log('AAA : ' + colors.bgRed.white(item.DesignationFrCatalogue)); }); // TEST
                    var newRecordset = [];
                    newRecordset = FormatDataFactures(recordset); /// Pour formater les données comme on veut pour affichage ds vue
                    res.render('ListefacturesEtbl', { dataEtbl: recordset_Etbl, dataFactures: newRecordset });
                }, req.query, next);

            }, req.query.accordId, next);
            

            /* V2 : version précédente avec les promesses --> Fonctionne !! */
             /*getData_1(req.query.accordId).then(function(data) {
                recordset_Etbl = data;
                getData_2(req.query);
             }).then(function(data){
                res.render('ListefacturesEtbl', { dataEtbl: recordset_Etbl, dataFactures: data });
             }).catch(function (err) {
                console.error(err);
            });*/

            /* V3 : version précédente avec les promesses -6> Fonctionne !! */
            /*new Promise(function (resolve, reject) {
                getDataEtbl(function(recordset) {
                    resolve(FormatDataEtbl(recordset));
                }, req.query.accordId);
            }).then(function(data) {
                recordset_Etbl = data;
                new Promise(function (resolve, reject) {
                    getDataFactures(function(recordset) {
                        resolve(FormatDataFactures(recordset));
                    }, req.query);
                });
            }).then(function(data) {
                res.render('ListefacturesEtbl', { dataEtbl: recordset_Etbl, dataFactures: data });
             }).catch(function (err) {
                console.error(err);
            });*/


        } else {
            throw new Error("Erreur ! : des paramètres sont attendus dans l'URL pour spécifier quelle réversion et quel accord afficher.");
        }

    });


    /// Click sur bouton 'Détails réversion'
    app.post('/ListeFacturesEtbl', function(req, res, next) {

        getDataExclusions(function(recordset) {
            /// Alimentation de la popin listant les exclusions sur une facture
            res.render('templates/popinExclusions', { layout: false, exclusion: FormatExclusion(recordset) }, function(err, html) {      
                if(err) { return next(err); }               
                res.send(html);                
            });
        }, 
        req.body.ID_lgnReversion, 
        next);

    });


}



/// pour récupérer les infos de l'établissements
function getDataEtbl(callback, accordId, next) {

    var conn = new sql.Connection(config); 
    conn.connect().then(function() {
        
        var request = new sql.Request(conn);
        
        request
        .input('AccordReversionId', sql.Int, accordId)
        .execute('ReversionApp.ps_GetEtablissementInfosByAccordReversion')
        .then(function(recordset) {
            //console.log(colors.bgGreen.white(JSON.stringify(recordset[0][0]))); //TEST
            callback(recordset[0][0]);
            conn.close();
        })
        .catch(function(err) {
            next(new Error("Récupération des infos sur l'établissement => " + err));
        });

    }).catch(function(err) {
        next(new Error("Récupération des infos sur l'établissement => " + err));
    });
}


/// pour récupérer les infos sur les factures de l'établissement
function getDataFactures(callback, queries, next) {

    //console.log(colors.bgMagenta.white(JSON.stringify(queries))); //TEST

    var conn = new sql.Connection(config); 
    conn.connect().then(function() {
        
        var request = new sql.Request(conn);
        
        request
        .input('AccordReversionId', sql.Int, queries.accordId)
        .input('ReversionId', sql.Int, queries.revId)
        .execute('ReversionApp.ps_GetReversionEtablissementLignesByAccordReversion')
        .then(function(recordset) {
            //console.dir(recordset[0]); //TEST
            callback(recordset[0]);
            conn.close();
        })
        .catch(function(err) {
            next(new Error("Récupération des factures sur l'établissement => " + err));
        });

    }).catch(function(err) {
        next(new Error("Récupération des factures sur l'établissement => " + err));
    });
}


/// pour récupérer infos sur les exclusions (type, période, montant,...) pour le calcul final de la réversion 
function getDataExclusions(callback, ligneId, next) {
    var conn = new sql.Connection(config); 
    conn.connect().then(function() {
        
        var request = new sql.Request(conn);
        
        request
        .input('ReversionEtablissementLigneId', sql.Int, ligneId)
        .execute('ReversionApp.ps_GetLignesExclusionByReversionEtablissementLigne')
        .then(function(recordset) {
            callback(recordset[0]);
            conn.close();
        })
        .catch(function(err) {
            next(new Error("Récupération des exclusions sur ligne facture => " + err));
        });

    }).catch(function(err) {
        next(new Error("Récupération des exclusions sur ligne facture => " + err));
    });
}


function FormatDataEtbl(recordset) {
    var Tx = (recordset.AutreTaux == null ? recordset.Taux : recordset.AutreTaux);
    return recordset_Etbl = {
        'RaisonSociale': recordset.RaisonSociale,  
        'CC': recordset.CC,  
        'Ville': recordset.Ville,
        'CP': recordset.CP,
        'PeriodeDebut': (recordset.AutrePeriodeDebut == null ? dateFormat(recordset.PeriodeDebut, 'dd/mm/yyyy') : dateFormat(recordset.AutrePeriodeDebut, 'dd/mm/yyyy')),
        'PeriodeFin': (recordset.AutrePeriodeFin == null ? dateFormat(recordset.PeriodeFin, 'dd/mm/yyyy') : dateFormat(recordset.AutrePeriodeFin, 'dd/mm/yyyy')),    
        'TypeTauxReversion': (recordset.AutreTypeTauxReversion == null ? recordset.TypeTauxReversion : recordset.AutreTypeTauxReversion),
        'Taux': Tx,
        'TauxAvecEDI': (recordset.AutreTauxAvecEDI == null ? recordset.TauxAvecEDI : recordset.AutreTauxAvecEDI) - Tx,
        'VAPeriode': numeral(recordset.VAPeriode).format(),
        'MontantReversionCA':numeral(recordset.MontantReversionCA).format(),
        'MontantReversionCAEncaisse': numeral(recordset.MontantReversionCAEncaisse).format()
    }
}


function FormatDataFactures(recordset) {

    try {
            
            /// On isole les 'Hors contrat' pour les rajouter à la fin de la liste des factures
            var lgnsHorsContrat = _.filter(recordset, function(lgnFacture) {
                //if(lgnFacture.HorsContrat == true) {    
                if(lgnFacture.Catalogue == 'SOLUTES MASSIFS' && lgnFacture.DesignationFrCatalogue == 'AGUETTANT') {   // Pour TEST
                    //console.log(colors.bgGreen.white('lgnFacture.Catalogue ===> ') + lgnFacture.Catalogue + colors.bgYellow.black('lgnFacture.DesignationFrCatalogue ===> ') + lgnFacture.DesignationFrCatalogue); //TEST
                    return lgnFacture;
                }
            }); //console.log('Lignes factures exclues => ' + colors.bgCyan.black(JSON.stringify(lgnsHorsContrat)) + ' lgnsHorsContrat.length : ' + lgnsHorsContrat.length); // Pour TEST


            /// On exclu les 'Hors contrat' du recordset
            recordset = _.reject(recordset, function(lgnFacture) {
                //if(lgnFacture.HorsContrat == true) {    
                if(lgnFacture.Catalogue == 'SOLUTES MASSIFS' && lgnFacture.DesignationFrCatalogue == 'AGUETTANT') {   // Pour TEST
                    //console.log(colors.bgGreen.white('lgnFacture.Catalogue ===> ') + lgnFacture.Catalogue + colors.bgYellow.black('lgnFacture.DesignationFrCatalogue ===> ') + lgnFacture.DesignationFrCatalogue); //TEST
                    return lgnFacture;
                }
            });


            /// On regroupe le recordset par catalogue (chaque cat. devient une clé)
            var data = _.groupBy(recordset, 'Catalogue');
            //console.log(colors.bgMagenta.white(Object.keys(data))); //Fonctionne

            /// Insertion des lignes 'Hors contrat' après les lignes Catalogue
            data["HORS CONTRAT"] = lgnsHorsContrat;


            /// On boucle sur les catalogues + Hors contrat
            for (i in data) {       
                //console.log(colors.bgRed.white(i) + " | " + colors.bgYellow.black(JSON.stringify(data[i])));
                /// Au sein de chaque objet correspondant aux factures propres à un catalogue, on regroupe par Désignation Fnr
                var RCScatgroupByDesfr = _.groupBy(data[i], 'DesignationFrCatalogue');
                var RCScatgroupByDesfrOrdered = {};
                /// On ordonne par Désignation Fnr
                Object.keys(RCScatgroupByDesfr).sort().forEach(function(key) {
                    RCScatgroupByDesfrOrdered[key] = RCScatgroupByDesfr[key];

                    /// Formatage champs date et numéraire et ajout chp présence bt 'détails'
                    RCScatgroupByDesfrOrdered[key].forEach(function(item) {
                        item.DateFacture = dateFormat(item.DateFacture, 'dd/mm/yyyy');
                        item.PeriodeDebut = dateFormat(item.PeriodeDebut, 'dd/mm/yyyy');
                        item.PeriodeFin = dateFormat(item.PeriodeFin, 'dd/mm/yyyy');
                        item.VAFactureAvoir = numeral(item.VAFactureAvoir).format(); 
                        item.CAFactureAvoir = numeral(item.CAFactureAvoir).format(); 
                        item.EtsFactureCAAvoirEncaisseHT = numeral(item.EtsFactureCAAvoirEncaisseHT).format(); 
                        item.PresenceBoutonDetails = (item.ExclusReversionCA > 0 ? true : false);
                        item.ExclusReversionCA = numeral(item.ExclusReversionCA).format(); 
                        item.MontantReversionCA = numeral(item.MontantReversionCA).format();
                    });

                }); 
                //data[i] = RCScatgroupByDesfrOrdered; /// Version sans nb de factures
                /// Intégration nb de factures par cat.
                data[i] = {nbFactures: data[i].length, lgnsFact: RCScatgroupByDesfrOrdered};
            }

            /* Pour TEST */
            /*fs.writeFile('TEST_A_VIRER/TEST_AjNbFct.json', JSON.stringify(data), function (err) { if (err) return console.log(err); });*/

            return data;

    } catch (error) {
        throw new Error(error);
    }
}



function FormatExclusion(recordset) {
    try {
        //if(recordset.length > 0) {
            for(var i in recordset) { 
                recordset[i].ExclusReversionPeriodeDebut = dateFormat(recordset[i].ExclusReversionPeriodeDebut, 'dd/mm/yyyy');
                recordset[i].ExclusReversionPeriodeFin = dateFormat(recordset[i].ExclusReversionPeriodeFin, 'dd/mm/yyyy');
                var tab = (recordset[i].ProrataExclusionTexte).split("/");
                recordset[i].ProrataExclusionTexte = tab[0] + ' jours sur ' + tab[1];
                recordset[i].ProrataExclusion = numeral(recordset[i].ProrataExclusion*100).format();
                recordset[i].ExclusReversionCA = numeral(recordset[i].ExclusReversionCA).format();;
            }
        //}

        return recordset;
    } catch (error) {
        throw new Error("Formatage des données pour la popin 'Exclusion' : " + error);
    }
}




// TEST au 22/03/17
function getData_1(AccId) {
    return new Promise(function (resolve, reject) {
        getDataEtbl(function(recordset) {
            resolve(FormatDataEtbl(recordset));
        }, AccId);
    });
}
function getData_2(queries) {
    return new Promise(function (resolve, reject) {
        getDataFactures(function(recordset) {
            resolve(FormatDataFactures(recordset));
        }, queries);
    });
}