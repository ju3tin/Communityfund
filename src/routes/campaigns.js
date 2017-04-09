'use strict';

var fs = require('fs');
var express = require('express');
var router = express.Router();
var multipart = require('connect-multiparty');

var api = require('../api');
var db = require('../db');

router.get('/', function (req, res) {
  var user = req.session.user;

  db.find({ selector: { '@type': 'Campaign', 'customer._id': { '$ne': user._id } } }, function (err, body) {
    if (err) {
      throw err;
    }

    var campaigns = body.docs.map(function (doc) {
      return presentCampaign(doc);
    });

    res.render('campaigns/index.html', {
      campaigns: campaigns,
    });
  });
});

router.get('/my', function (req, res) {
  var user = req.session.user;

  db.find({ selector: { '@type': 'Campaign', 'customer._id': user._id } }, function (err, body) {
    if (err) {
      throw err;
    }

    var campaigns = body.docs.map(function (doc) {
      return presentCampaign(doc);
    });

    res.render('campaigns/my.html', {
      campaigns: campaigns,
    });
  });
});

router.get('/:id/bids/new', function (req, res) {
  var params = req.params;

  db.get(params.id, function (err, doc) {
    if (err) {
      throw err;
    }

    res.render('campaigns/bids/new.html', {
      campaign: doc,
    });
  });
});

router.get('/:id/bids/:index', function (req, res) {
  var params = req.params;

  db.get(params.id, function (err, doc) {
    if (err) {
      throw err;
    }

    var campaign = presentCampaign(doc);

    res.render('campaigns/bids/show.html', {
      bid: campaign.bids[params.index],
      campaign: campaign,
    });
  });
});

router.post('/:id/bids/:index/accept', function (req, res) {
  var params = req.params;

  db.get(params.id, onRetrieveCampaign);

  function onRetrieveCampaign(err, campaign) {
    if (err) {
      throw err;
    }

    api.acceptBid(req.session.token, campaign, params.index)
      .then(createOnTransactionComplete(campaign));
  }

  function createOnTransactionComplete(campaign) {
    return function onTransactionComplete() {
      db.insert(Object.assign({}, campaign, {
        acceptedBid: params.index,
      }), campaign._id, onUpdateCampaign);
    };
  }

  function onUpdateCampaign(err) {
    if (err) {
      throw err;
    }

    res.redirect('/campaigns/my');
  }
});

router.post('/bids/create', function (req, res) {
  var user = req.session.user;

  db.get(req.body['campaign-id'], onRetrieveCampaign);

  function onRetrieveCampaign(err, campaign) {
    if (err) {
      throw err;
    }

    var bids = campaign.bids || [];
    bids.push({
      '@type': 'Bid',
      cut: req.body['percentage-cut'],
      entity: user,
    });

    db.insert(Object.assign({}, campaign, { bids: bids }), campaign._id, onUpdateCampaign);
  }

  function onUpdateCampaign(err) {
    if (err) {
      throw err;
    }

    res.redirect('/campaigns');
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

  var user = req.session.user;

  db.insert({
    '@type': 'Campaign',
    description: req.body.description,
    preferredPaymentDate: req.body['preferred-payment-date'],
    bids: [],
    acceptedBid: null,
    amount: {
      currency: 'GBP',
      value: 20000,
    },
    broker: {
      '@type': 'Broker',
      name: 'Big bad business',
    },
    customer: user,
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

    res.redirect('/campaigns/my');
  }
});

function presentCampaign(campaign) {
  var files = Object.keys(campaign._attachments);

  return Object.assign({}, campaign, {
    bidUrl: '/campaigns/' + campaign._id + '/bids/new',
    bids: campaign.bids.map(function (bid, index) {
      return Object.assign({}, bid, {
        reviewUrl: '/campaigns/' + campaign._id + '/bids/' + index,
        acceptUrl: '/campaigns/' + campaign._id + '/bids/' + index + '/accept',
      });
    }),
    _attachments: files.reduce(function (attachments, filename) {

      attachments[filename] = Object.assign({}, campaign._attachments[filename], {
        url: '/campaigns/' + campaign._id + '/files/' + filename,
      });

      return attachments;
    }, {}),
  });
}

module.exports = router;
