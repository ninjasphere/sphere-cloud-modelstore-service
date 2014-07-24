'use strict';

var debug = require('debug')('rpc:modelstore:access');
var when = require('when');
var Joi = require('joi');

var schemas = require('./schemas');
var errors = require('../errors');

module.exports.listItems = function(user, modelName) {
  Joi.assert(user, schemas.UserRecord);
  Joi.assert(modelName, schemas.ModelName);

  var query = {
    key: [user.id, modelName],
    include_docs: true
  };

  return this.couchdb.view('manifest/manifest', query).then(function(result) {
    var results = [];
    
    result.rows.map(function(row) {
      results.push(row.doc.data);
    });

    return results;
  });
};

module.exports.getItem = function(user, modelName, objectId) {
  Joi.assert(user, schemas.UserRecord);
  Joi.assert(modelName, schemas.ModelName);
  Joi.assert(objectId, schemas.ObjectId);

  var couchId = [user.id, modelName, objectId].join(':');

  return this.couchdb.get(couchId).then(function(result) {
    return result.data;
  });
};
