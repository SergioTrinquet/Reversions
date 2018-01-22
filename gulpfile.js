const gulp = require('gulp');
const plugins = require('gulp-load-plugins')(); /// Tous les plugins de package .json
const pump = require('pump'); // permet entre autre en cas d'erreur ds la génération d'obtenir un message d'erreur précis donnant le fichier et la ligne ou se trouve l'erreur, ce qui n'est pas le cas autrement

/// Variables de chemins
var source = "./public/assets/src";
var destination = "./public/assets/dist";


///--- Taches CSS ---///
gulp.task('minifyMainCSS', function(cb) {
    return pump([
        gulp.src([source + '/styles/style_reversion.css', source + '/styles/sidenav.css',  source + '/styles/erreur.css']),
        plugins.sourcemaps.init(), /// Interessant pour débugger -> Donne l'emplacement du code ds fichiers non transformés (minifiés, concaténés,...) à partir des fichiers transformés 
        plugins.concat('global_reversion.css'),
        plugins.csso(), /// Plugin pour minifier
        //plugins.rename({ suffix: '.min' }),
        plugins.sourcemaps.write('/maps'),
        gulp.dest(destination + '/styles/')
    ], cb);
});
gulp.task('minifyErrorCSS', function(cb) {
    return pump([
        gulp.src([source + '/styles/erreur.css']),
        plugins.sourcemaps.init(), /// Interessant pour débugger -> Donne l'emplacement du code ds fichiers non transformés (minifiés, concaténés,...) à partir des fichiers transformés
        plugins.csso(), /// Plugin pour minifier
        //plugins.rename({ suffix: '.min' }),
        plugins.sourcemaps.write('/maps'),
        gulp.dest(destination + '/styles/')
    ], cb);
});
/// Transfert autres fichiers
gulp.task('autresCSS', function() {
    return gulp.src([source + '/styles/jquery/jquery-ui.datepicker.theme.css'])
    .pipe(gulp.dest(destination + '/styles/jquery/'));
});

gulp.task('css', ['minifyMainCSS', 'minifyErrorCSS', 'autresCSS']);



///--- Taches JS ---///
/// Fichiers propres à page 'RechercheAccords.js'
gulp.task('optimisationJS_RA', function(cb) {
    var lstJS = ['datepicker-fr', 'sidenav', 'ParamsDatePickers', 'RechercheAccords', 'highlight'];
    optimisationJS(lstJS, 'global_RechercheAccords', cb);
});

/// Fichiers propres à page 'CreationAccord.js'
gulp.task('optimisationJS_CA', function(cb) {
    var lstJS = ['datepicker-fr', 'sidenav', 'ParamsDatePickers', 'CreationAccord'];
    optimisationJS(lstJS, 'global_CreationAccord', cb);
});

/// Fichiers propres à page 'ListeHistoriqueGroupements.js'
gulp.task('optimisationJS_LHG', function(cb) {
    var lstJS = ['datepicker-fr', 'sidenav', 'highlight', 'ListeHistoriqueGroupe'];
    optimisationJS(lstJS, 'global_ListeHistoriqueGroupements', cb);
});


function optimisationJS(listeJS, FinalFileName, cb) {
    /// Ajout chemin pour fichiers JS à traiter
    var ListeJSwithPath = [];
    listeJS.forEach(function(file) {
        ListeJSwithPath.push(source + '/scripts/' + file + '.js');
    });
    
    /// Traitements des fichiers (minimisation, concaténation, sourcemap)
    /* Ancienne version au 09/01/18 => Sans 'pump' */
    /*
    return gulp.src(ListeJSwithPath)
    .pipe(plugins.sourcemaps.init()) /// Interessant pour débugger -> Donne l'emplacement du code ds fichiers non transformés (minifiés, concaténés,...) à partir des fichiers transformés 
    .pipe(plugins.concat(FinalFileName + '.js'))
    .pipe(plugins.uglify())
    .pipe(plugins.sourcemaps.write('/maps'))
    .pipe(gulp.dest(destination + '/scripts/'));
    */

    /* Nouvelle version au 09/01/18 => Avec 'pump' */
    return pump([
        gulp.src(ListeJSwithPath),
        plugins.sourcemaps.init(),  /// Interessant pour débugger -> Donne l'emplacement du code ds fichiers non transformés (minifiés, concaténés,...) à partir des fichiers transformés
        plugins.uglify(),
        plugins.concat(FinalFileName + '.js'),
        plugins.sourcemaps.write('/maps'),
        gulp.dest(destination + '/scripts/')
    ], cb);

}


/// Transfert fichier 'underscore.min.js' (si un jour intégration 'ListeFactures.js', ne pas oublier d'intégrer dans cette tache le transfert du rép. js 'numeral')
gulp.task('autresJS', function() {
    return gulp.src([source + '/scripts/underscore-min.js'])
    .pipe(gulp.dest(destination + '/scripts/'));
});



gulp.task('js', ['optimisationJS_RA', 'optimisationJS_CA', 'optimisationJS_LHG', 'autresJS']);


/// Pour mise en prod.
gulp.task('prod', ['css', 'js']);
