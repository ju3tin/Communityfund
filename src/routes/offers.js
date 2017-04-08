'use strict';

var fs = require('fs');
var express = require('express');
var router = express.Router();
var multipart = require('connect-multiparty');

var db = require('../db');

router.get('/:id/files/:filename', function (req, res) {
  const params = req.params;

  db.attachment.get(params.id, params.filename, function (err, body) {
    if (err) {
      res.status(500);
      res.setHeader('Content-Type', 'text/plain');
      res.write('Error: ' + err);
      res.end();
      return;
    }

    res.status(200);
    res.setHeader('Content-Disposition', 'inline; filename="' + params.filename + '"');
    res.write(body);
    res.end();
  });
});

router.post('/create', multipart(), function (req, res) {
  var file = req.files.invoice;

  console.log(1, req.body);

  db.insert({
    '@type': 'Offer',
    preferredPaymentDate: req.body['preferred-payment-date'],
  }, null, onDocumentInserted);

  function onDocumentInserted(err, doc) {
    if (err) {
      throw err;
    }

    fs.readFile(file.path, createOnFileRead(doc));
  }

  function createOnFileRead(doc) {
    return function onFileRead(err, data) {
      if (err) {
        throw err;
      }

      db.attachment.insert(doc.id, file.name, data, file.type, {
        rev: doc.rev,
      }, onAttachmentInserted);
    };
  }

  function onAttachmentInserted(err) {
    if (err) {
      throw err;
    }

    res.write(JSON.stringify({
      success: true,
    }));
    res.end();
  }
});

module.exports = router;
