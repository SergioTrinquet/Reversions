const numeral = require('numeral');

/// Pour formater les montants
exports.numeralFormat = function(){
    numeral.defaultFormat('0,0.00'); //--> pour imposer une séparation ts les 3 chiffres et 2 chiffres après la virgule
    // load a locale
    numeral.register('locale', 'fr', { //--> Pour imposer un espace comme séparateur ts les 3 chiffres, et une virgule avant les décimales 
        delimiters: {
            thousands: ' ',
            decimal: ','
        }
    });
    // switch between locales
    numeral.locale('fr');
};