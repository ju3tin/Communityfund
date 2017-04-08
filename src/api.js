'use strict';

var uuidV4 = require('uuid/v4');
var rp = require('request-promise');

module.exports = {
  login: login,
  isLoggedIn: isLoggedIn,
};

function login(req) {
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
  }).then(function (response) {
    req.session.token = response.token;
  });
}

function isLoggedIn(req) {
  return Boolean(req.session && req.session.token);
}
