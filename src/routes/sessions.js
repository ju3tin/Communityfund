'use strict';

var express = require('express');
var router = express.Router();
var api = require('../api');

router.post('/create', function (req, res) {
  api.login(req, res).then(function () {
    res.redirect('/home');
  });
});

module.exports = router;
