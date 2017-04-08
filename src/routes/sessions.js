'use strict';

var express = require('express');
var router = express.Router();
var api = require('../api');

router.post('/create', function (req, res) {
  var email = req.body.email;

  api.login(email).then(function (response) {
    req.session.token = response.token;
    req.session.user = response.user;

    res.redirect('/home');
  });
});

module.exports = router;
