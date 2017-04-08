'use strict';

var bluebird = require('bluebird');
var uuidV4 = require('uuid/v4');
var rp = require('request-promise');
var db = require('./db');
var find = bluebird.promisify(db.find);

module.exports = {
  login: login,
  isLoggedIn: isLoggedIn,
  acceptBid: acceptBid,
};

function login(email) {
  return find({
    selector: {
      '@type': 'User',
      email: email,
    },
  }).then(function (response) {
    if (!response[0].docs.length) {
      return bluebird.reject(new Error('Email and password combination was incorrect'));
    }

    var user = response[0].docs[0];

    return rp({
      uri: 'https://app-gateway.hackathon.ixaris.com/api/auth/login',
      json: true,
      method: 'POST',
      headers: {
        'X-CallRef': uuidV4(),
        'X-programmeKey': 'team-20|873945959536871',
      },
      body: {
        programmeId: 873945959536871,
        password: '8Cw8QKc£',
        credentialCode: 'team-20',
      }
    }).then(function (ixRes) {
      return {
        token: ixRes.token,
        user: user,
      };
    });
  });
}

function isLoggedIn(req) {
  return Boolean(req.session && req.session.token);
}

function acceptBid(token, offer, bidIndex) {
  var bid = offer.bids[bidIndex];

  return rp({
      uri: 'https://app-gateway.hackathon.ixaris.com/api/transfers/_/create',
      json: true,
      method: 'POST',
      headers: {
        'X-CallRef': uuidV4(),
        'X-programmeKey': 'team-20|873945959536871',
        'Authorization': token,
      },
      body: {
        profileId: 97593089101269760,
        amount: {
          currency: 'GBP',
          amount: 100,
        },
        sourceInstrumentId: {
          id: bid.entity.managedAccountId,
          type: 'managed_accounts'
        },
        destinationInstrumentId: {
          id: offer.customer.managedAccountId,
          type: 'managed_accounts'
        },
        fees: [],
      }
    });
}
