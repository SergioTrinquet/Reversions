const winston = require('winston');

exports.logger = new (winston.Logger)({
    transports: [
        //new (winston.transports.Console)({
        //    colorize: true
        //}),
        new (winston.transports.File)({ 
            name: 'fichier-logs',
            //level: 'info',
            filename: './log/logfile_All.log',
            maxsize: 5242880, //5MB
            prettyPrint: true,
            json: false,
            timestamp: function() {
                return new Date().toLocaleString() + " " + new Date().getMilliseconds() + "ms";
            },
            handleExceptions: true
        }),
        new (winston.transports.File)({ 
            name: 'fichier-erreurs',
            level: 'error',
            filename: './log/logfile_Error.log',
            maxsize: 5242880, //5MB
            json: false,
            timestamp: function() {
                return new Date().toLocaleString() + " " + new Date().getMilliseconds() + "ms";
            },
            handleExceptions: true
        })
    ]
});