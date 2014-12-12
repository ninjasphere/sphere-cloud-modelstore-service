'use strict';

var debug = require('debug')('rpc:modelstore:access');
var Joi = require('joi');
var uuid = require('node-uuid');

var schemas = require('./schemas');

module.exports.listItems = function (user, modelName) {
  Joi.assert(user, schemas.UserRecord);
  Joi.assert(modelName, schemas.ModelName);

  var query = {
    key: [user.id, modelName],
    include_docs: true
  };

  return this.couchdb.view('manifest/manifest', query).then(function (result) {
    var results = [];

    result.rows.map(function (row) {
      results.push(row.doc.data);
    });

    return results;
  });
};

module.exports.getItem = function (user, modelName, objectId) {
  Joi.assert(user, schemas.UserRecord);
  Joi.assert(modelName, schemas.ModelName);
  Joi.assert(objectId, schemas.ObjectId);

  debug('getItem', modelName, 'id', objectId);

  var couchId = [user.id, modelName, objectId].join(':');

  return this.couchdb.get(couchId).then(function (result) {
    return result.data;
  });
};


module.exports.updateItem = function (user, modelName, objectId, data) {
  Joi.assert(user, schemas.UserRecord);
  Joi.assert(modelName, schemas.ModelName);
  Joi.assert(objectId, schemas.ObjectId);


  debug('updateItem', modelName, 'id', objectId);

  var couchId = [user.id, modelName, objectId].join(':');

  return this.couchdb.get(couchId).then(function (result) {
    debug('updateDoc', result._id, 'data', data);

    result.data = data;

    return this.couchdb.save(result);
  }.bind(this)).then(function (result) {
    return result.data;
  });

};

module.exports.createItem = function (user, modelName, data) {
  Joi.assert(user, schemas.UserRecord);
  Joi.assert(modelName, schemas.ModelName);

  var objectId = uuid.v4(); // Generate a v4 (random) id

  debug('createItem', modelName, 'id', objectId);

  // add the id to match the existing behaviour
  data.id = objectId;

  var newDocument = {
    _id: [user.id, modelName, objectId].join(':'),
    user: user,
    model: {
      type: modelName,
      id: objectId
    },
    data: data
  };

  return this.couchdb.save(newDocument).then(function (result) {
    return result.data;
  });

};

module.exports.deleteItem = function (user, modelName, objectId) {
  Joi.assert(user, schemas.UserRecord);
  Joi.assert(modelName, schemas.ModelName);
  Joi.assert(objectId, schemas.ObjectId);


  debug('deleteItem', modelName, 'id', objectId);

  var couchId = [user.id, modelName, objectId].join(':');

  return this.couchdb.get(couchId).then(function (result) {
    debug('deleteDoc', result._id);

    result._deleted = true;

    return this.couchdb.save(result);
  }.bind(this)).then(function (result) {
    return result.data;
  });

};