/// Sert si redirect vers cette page, ce qui n'est plus le cas !! => A VIRER
module.exports = function(app) {

    app.get('/AccesRefuse/:msg?', function(req, res, next) {
        if(req.query.msg == '1') {
            res.render('AccesRefuse', {msgAccesRefuse: 'Vous n\'avez pas les droits pour utiliser cette fonctionnalité.'});
        } else {
            res.render('AccesRefuse', {msgAccesRefuse: ''});
        }
    });

}