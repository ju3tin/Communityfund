'use strict';

var config = require('./config');
var cloudant = require('cloudant')(config.dbCredentials.url);

module.exports = cloudant.use(config.dbCredentials.dbName);
