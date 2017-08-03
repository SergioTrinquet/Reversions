const expressSession = require('express-session');

module.exports = expressSession({
    cookie: {
        expires: false //Pour permettre au cookie d'exister juste le temps pendant lequel le navigateur est ouvert
    },
    secret: 'blargadeeblargblarg' // should be a large unguessable string
});