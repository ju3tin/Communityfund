'use strict';

var fs = require('fs');
var express = require('express');
var router = express.Router();
var multipart = require('connect-multiparty');

var db = require('../db');

router.get('/', function (req, res) {
  db.find({ selector: { '@type': 'Offer' } }, function (err, body) {
    if (err) {
      throw err;
    }

    var offers = body.docs.map(function (doc) {
      return presentOffer(doc);
    });

    res.render('offers/index.html', {
      offers: offers,
    });
  });
});

router.get('/:id/bids/new', function (req, res) {
  var params = req.params;

  db.get(params.id, function (err, doc) {
    if (err) {
      throw err;
    }

    res.render('offers/bids/new.html', {
      offer: doc,
    });
  });
});

router.post('/bids/create', function (req, res) {
  console.log(1, req.body);

  db.get(req.body['offer-id'], onRetrieveOffer);

  function onRetrieveOffer(err, offer) {
    if (err) {
      throw err;
    }

    var bids = offer.bids || [];
    bids.push({
      '@type': 'Bid',
      cut: req.body['percentage-cut'],
      entity: {
        '@type': 'Rich',
        '_id': null,
        name: 'Rich business',
      },
    });

    db.insert(Object.assign({}, offer, { bids: bids }), offer._id, onUpdateOffer);
  }

  function onUpdateOffer(err) {
    if (err) {
      throw err;
    }

    res.redirect('/offers');
  }
});

router.get('/:id/files/:filename', function (req, res) {
  var params = req.params;

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

  db.insert({
    '@type': 'Offer',
    description: req.body.description,
    preferredPaymentDate: req.body['preferred-payment-date'],
    bids: [],
    amount: {
      currency: 'GBP',
      value: 20000,
    },
    broker: {
      '@type': 'Broker',
      name: 'Big bad business',
    },
    customer: {
      '@type': 'Customer',
      name: 'Small business',
    },
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

    res.redirect('/offers');
  }
});

function presentOffer(offer) {
  var files = Object.keys(offer._attachments);

  return Object.assign({}, offer, {
    bidUrl: '/offers/' + offer._id + '/bids/new',
    _attachments: files.reduce(function (attachments, filename) {

      attachments[filename] = Object.assign({}, offer._attachments[filename], {
        url: '/offers/' + offer._id + '/files/' + filename,
      });

      return attachments;
    }, {}),
  });
}

module.exports = router;
