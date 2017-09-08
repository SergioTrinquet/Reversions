const nodemailer = require('nodemailer');
const config = require("config");

module.exports = function(errMsg, errStack) {

    var dataConfigMail = config.get('infosMail');

    var transporter = nodemailer.createTransport({
        host: dataConfigMail.mailTransporter.host,
        port: dataConfigMail.mailTransporter.port,
        secure: dataConfigMail.mailTransporter.secure, // upgrade later with STARTTLS
        auth: {
            user: dataConfigMail.mailTransporter.user,
            pass: dataConfigMail.mailTransporter.pass
        }
    });

    var message = {
        from: dataConfigMail.mailMessage.from,
        to: dataConfigMail.mailMessage.to,
        subject: "Erreur sur l'application 'Réversions'",
        //text: 'Plaintext version of the message',
        html: "<div><p style='background-color:red; color:#ffffff; font-weight:bold; text-align:center; padding: 10px'>" + errMsg + "</p><p><u>Détails de l'erreur survenue à " + new Date().toLocaleString() + " " + new Date().getMilliseconds() + "ms" + "</u> :<br/>" + errStack + "</p></div>"
    };


    
    transporter.sendMail(message, function(error, info){
        if (error) {
            //console.log(error); // Pour dev
            logger.log('error', error); // Pour prod.
        } /*else {
            console.log('Email sent: ' + info.response); // Pour dev
        }*/
    });

}