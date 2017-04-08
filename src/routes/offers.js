'use strict';

var fs = require('fs');
var express = require('express');
var router = express.Router();

var db = require('../db');

router.post('/create', function (req, res) {
  var file = req.files.file;

  db.insert({
    type: 'invoice',
    preferredDate: req.query.preferredDate,
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
