/*
const expressSession = require('express-session');
const FileStore = require('session-file-store')(expressSession); // Ajouté le 29/08/17

module.exports = expressSession({
    cookie: {
        expires: false //Pour permettre au cookie d'exister juste le temps pendant lequel le navigateur est ouvert
    },
    secret: 'blargadeeblargblarg', // should be a large unguessable string
    store: new FileStore(
        { 
        path: "./TestFilesSession",
        //reapInterval: 10, // En sec. 
        }
    ),resave: true,
    saveUninitialized: false
});
*/


// V2 : Avec cookie-session
const cookieSession = require('cookie-session');
module.exports = cookieSession({
    name: 'cookieSession',
    secret: 'blargadeeblargblarg' // should be a large unguessable string
});