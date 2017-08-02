const expressSession = require('express-session');

module.exports = expressSession({
    cookie: {
        expires: false //to enable the cookie to remain for only the duration of the user-agent
    },
    secret: 'blargadeeblargblarg' // should be a large unguessable string
});