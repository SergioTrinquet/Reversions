const gulp = require('gulp');
const plugins = require('gulp-load-plugins')(); /// Tous les plugins de package .json

/// Variables de chemins
var source = "./public/assets/src";
var destination = "./public/assets/dist";


///--- Taches CSS ---///
gulp.task('minifyMainCSS', function() {
    return gulp.src([source + '/styles/style_reversion.css', source + '/styles/sidenav.css'])
    .pipe(plugins.sourcemaps.init()) /// Interessant pour débugger -> Donne l'emplacement du code ds fichiers non transformés (minifiés, concaténés,...) à partir des fichiers transformés 
    .pipe(plugins.concat('global_reversion.css'))
    .pipe(plugins.csso()) /// Plugin pour minifier
    //.pipe(plugins.rename({ suffix: '.min' }))
    .pipe(plugins.sourcemaps.write('/maps'))
    .pipe(gulp.dest(destination + '/styles/'));
});
gulp.task('minifyErrorCSS', function() {
    return gulp.src([source + '/styles/erreur.css'])
    .pipe(plugins.sourcemaps.init()) /// Interessant pour débugger -> Donne l'emplacement du code ds fichiers non transformés (minifiés, concaténés,...) à partir des fichiers transformés 
    .pipe(plugins.csso()) /// Plugin pour minifier
    //.pipe(plugins.rename({ suffix: '.min' }))
    .pipe(plugins.sourcemaps.write('/maps'))
    .pipe(gulp.dest(destination + '/styles/'));
});
/// Transfert autres fichiers
gulp.task('autresCSS', function() {
    return gulp.src([source + '/styles/jquery/jquery-ui.datepicker.theme.css'])
    .pipe(gulp.dest(destination + '/styles/jquery/'));
});

gulp.task('css', ['minifyMainCSS', 'minifyErrorCSS', 'autresCSS']);



///--- Taches JS ---///
/// Fichiers propres à page 'RechercheAccords.js'
gulp.task('optimisationJS_RA', function() {
    var lstJS = ['datepicker-fr', 'sidenav', 'ParamsDatePickers', 'RechercheAccords', 'highlight'];
    optimisationJS(lstJS, 'global_RechercheAccords');
});

/// Fichiers propres à page 'CreationAccord.js'
gulp.task('optimisationJS_CA', function() {
    var lstJS = ['datepicker-fr', 'sidenav', 'ParamsDatePickers', 'CreationAccord'];
    optimisationJS(lstJS, 'global_CreationAccord');
});

/// Fichiers propres à page 'ListeHistoriqueGroupements.js'
gulp.task('optimisationJS_LHG', function() {
    var lstJS = ['datepicker-fr', 'sidenav', 'highlight', 'ListeHistoriqueGroupe'];
    optimisationJS(lstJS, 'global_ListeHistoriqueGroupements');
});


function optimisationJS(listeJS, FinalFileName) {
    /// Ajout chemin pour fichiers JS à traiter
    var ListeJSwithPath = [];
    listeJS.forEach(function(file) {
        ListeJSwithPath.push(source + '/scripts/' + file + '.js');
    });
    
    /// Traitements des fichiers (minimisation, concaténation, sourcemap)
    return gulp.src(ListeJSwithPath)
    .pipe(plugins.sourcemaps.init()) /// Interessant pour débugger -> Donne l'emplacement du code ds fichiers non transformés (minifiés, concaténés,...) à partir des fichiers transformés 
    .pipe(plugins.concat(FinalFileName + '.js'))
    .pipe(plugins.uglify())
    .pipe(plugins.sourcemaps.write('/maps'))
    .pipe(gulp.dest(destination + '/scripts/'));
}


/// Transfert fichier 'underscore.min.js' (si un jour intégration 'ListeFactures.js', ne pas oublier d'intégrer dans cette tache le transfert du rép. js 'numeral')
gulp.task('autresJS', function() {
    return gulp.src([source + '/scripts/underscore-min.js'])
    .pipe(gulp.dest(destination + '/scripts/'));
});



gulp.task('js', ['optimisationJS_RA', 'optimisationJS_CA', 'optimisationJS_LHG', 'autresJS']);


/// Pour mise en prod.
gulp.task('prod', ['css', 'js']);
