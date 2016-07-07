/* jshint expr: true */
'use strict';

// import plugins
const expect = require('chai').expect;
const chaiHttp = require('chai-http');
const chaiDatetime =  require('chai-datetime');

/*
 * Configure NodeJS/Mocha to continue working even with invalid TLS certs
 * This explicitly disables cert errors for the parent Node process, and
 * should only be done for testing cases.
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

// base URL for all tests
const port = process.env.PORT || '8080';
exports.baseUrl = 'https://localhost:' + port;

// login using the base URL and user
exports.login = function login(agent) {
  // base user defined in test data
  var user = { username : 'superuser', password : 'superuser', project: 1};

  return function () {
    return agent
      .post('/login')
      .send(user);
  };
};

/**
 * Clones the object and removes the field, to test if the field is required
 * and the server error codes
 *
 * @param {Object} object - any valid JS object
 * @param {String} field - a key on the passed in object
 * @returns {Object} clone - the copied object missing the propertay
 */
exports.mask = function mask(object, field) {
  var clone = JSON.parse(JSON.stringify(object));
  delete clone[field];
  return clone;
};

// generic configuration for chai
exports.configure = function configure(chai) {
  // workaround for low node versions
  if (!global.Promise) {
    var q = require('q');
    chai.request.addPromises(q.Promise);
  }

  // attach plugins
  chai.use(chaiHttp);
  chai.use(chaiDatetime);
};

// generic error handler
exports.handler = function handler(err) {
  throw err;
};

/* bindings for API-specific response tests */
const api = exports.api = {};

/* ensure that objectA's key/values are contained in and identical to objectB's */
exports.identical = function identical(objectA, objectB) {
  return Object.keys(objectA).every(function (key) {
    return objectA[key] === objectB[key];
  });
};

/**
 * Ensures that a create API request has returned the expected results for
 * further API usage.
 *
 * @method created
 * @param {object} res - the HTTP response object
 *
 * @example
 * var helpers = require('path/to/helpers.js');
 * var obj = { name : 'xyz', timestamp : new Date() }
 * agent.post('some/route')
 * .send(obj)
 * .then(function (res) {
 *   helpers.api.created(res);
 *
 *   // do something useful with the response, like further tests
 * })
 * .catch(helpers.handler);
 */
api.created = function created(res) {

  // make sure the response has correct HTTP headers
  expect(res).to.have.status(201);
  expect(res).to.be.json;

  // ensure that we received a correct uuid in return
  expect(res.body, `${res.req.method} ${res.req.path} returned an empty body.`).to.not.be.empty;

  // make sure that we either have a UUID or an ID
  expect(res.body, `${res.req.method} ${res.req.path} did not return an id or uuid.`).to.satisfy(o => o.id || o.uuid);

  // id checks
  if (res.body.id) {
    expect(res.body.id, `${res.req.method} ${res.req.path} returned a non-numeric id.`).to.be.a('number');

  // uuid checks
  } else {
    expect(res.body, `${res.req.method} ${res.req.path} returned an invalid uuid.`).to.have.property('uuid');
    expect(res.body.uuid).to.be.a('string');
    expect(res.body.uuid).to.have.length(36);
  }
};

/**
 * Ensures that an API request has properly errored with translatable text.
 *
 * @method errored
 * @param {object} res - the HTTP response object
 * @param {number} status - the appropiate HTTP status
 *
 * @example
 * var helpers = require('path/to/helpers.js');
 * agent.get('some/invalid/id')
 * .then(function (res) {
 *   helpers.api.errored(res);
 * })
 * .catch(helpers.handler);
 */
api.errored = function errored(res, status, key) {
  var keys = [ 'code' ];

  // make sure the response has the correct HTTP headers
  expect(res).to.have.status(status);
  expect(res).to.be.json;

  // the error codes should be sent back
  expect(res.body).to.not.be.empty;
  expect(res.body).to.contain.all.keys(keys);

  // ensure the error properties conform to standards
  expect(res.body.code).to.be.a('string');

  // if a key was passed in, expect that key
  if (key) {
    expect(res.body.code).to.equal(key);
  }
};

/**
 * @description
 * Ensures that an original object has been updated.  Does not support
 * deep equality.
 *
 * @note - this will have some issues with dates.
 * @todo
 *
 * @method updated
 * @param {object} res - the HTTP response object
 * @param {object} original - the virgin object before changes
 * @param {array} changedKeys - a list of properties expected to change
 *
 * @example
 * agent.get('some/id') // TODO
 */
api.updated = function updated(res, original, changedKeys) {
  // make sure the response has the correct HTTP headers
  expect(res).to.have.status(200);
  expect(res).to.be.json;

  // make sure we received a body
  expect(res.body).to.not.be.empty;

  // loop through the body, asserting that only the correct properties
  // have changed
  Object.keys(res).forEach(function (key) {

    // if the key is in "changedKeys", it should not equal the original
    if (changedKeys.indexOf(key) > -1) {
      expect(res.body[key]).to.not.equal(original[key]);
    } else {
      expect(res.body[key]).to.equal(original[key]);
    }
  });
};

/**
 * Ensures that a DELETE API request was successful and conforms to API
 * standards.
 *
 * @method deleted
 * @param {object} res - the HTTP response object
 *
 * @example
 * var helpers = require('path/to/helpers');
 *
 * agent.delete('some/id')
 * .then(function (res) {
 *   helpers.api.deleted(res);
 * })
 * .catch(helpers.handler);
 */
api.deleted = function deleted(res) {
  // make sure that the response has the correct HTTP headers
  expect(res).to.have.status(204);
  expect(res.body, `${res.req.method} ${res.req.path} was not empty.`).to.be.empty;
};

/**
 * Ensures that a GET API request was successful and conforms to API standards.
 * This tests is only for "list" methods, which return an array of records from
 * the database with a 200 success code expected.
 *
 * @method listed
 * @param {object} res - the HTTP response object
 * @param {number} len - the expected length of the array returned
 *
 * @example
 * var helpers = require('path/to/helpers');
 *
 * agent.get('some/route')
 * .then(function (res) {
 *   helpers.api.listed(res, 10);
 * })
 * .catch(helpers.handler);
 */
api.listed = function listed(res, len) {
  // make sure that the response has the correct HTTP headers
  expect(res, `${res.req.method} ${res.req.path} returned ${res.res.statusCode} ${res.res.statusMesage}.`).to.have.status(200);
  expect(res, `${res.req.method} ${res.req.path} did not return JSON.`).to.be.json;

  // assert that the length is the expected length.
  expect(res.body, `${res.req.method} ${res.req.path} did not return an array of length ${len}.`).to.have.length(len);
};

/*
 * Data helpers to clarify the code
 */
exports.data = {
  USD : 2,
  FC : 1,
  PROJECT : 1,
  PRICE_LIST : '75e09694-dd5c-11e5-a8a2-6c29955775b0',
  ADMIN_SERVICE : 2,
  SUPERUSER : 1,
  OTHERUSER : 2,
};
