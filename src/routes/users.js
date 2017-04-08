'use strict';

var express = require('express');
var router = express.Router();

var db = require('../db');

router.post('/create', function (req, res) {
  db.insert({
    '@type': 'User',
    name: req.body.name,
    email: req.body.email,
    managedAccountId: req.body['managed-account-id'],
  }, function (err, doc) {
    if (err) {
      throw err;
    }

    res.json({
      success: true,
      doc: doc,
    });
    res.end();
  });
});

module.exports = router;
