'use strict';

var debug = require('debug')('sphere:modelstore');
var when = require('when');
var errors = require('./errors');
var Joi = require('joi');

var VALID_MODELS = ['room', 'thing'];

var UserSchema = Joi.object().keys({id: Joi.string().guid()});

module.exports.calculateSyncItems = function(user, modelName, nodeManifest) {
  Joi.assert(user, UserSchema);
  Joi.assert(modelName, Joi.string().valid(VALID_MODELS));
  Joi.assert(nodeManifest, Joi.object());

  var query = {
    key: [user.id, modelName]
  };
  return this.couchdb.view('manifest/manifest', query).then(function(result) {
    var cloudManifest = _makeManifest(result);
    var cloudNewerItems = _findGreaterItems(cloudManifest, nodeManifest);
    var nodeNewerItems = _findGreaterItems(nodeManifest, cloudManifest);

    var response = {
      model: modelName,
      cloud_requires: nodeNewerItems,
      node_requires: cloudNewerItems
    };

    return response;
  });
};

module.exports.doSyncItems = function(user, modelName, pushedItems, requestedObjectIds) {
  Joi.assert(user, UserSchema);
  Joi.assert(modelName, Joi.string().valid(VALID_MODELS));
  Joi.assert(requestedObjectIds, Joi.array().includes(Joi.string().guid()));
  Joi.assert(pushedItems, Joi.object());

  // retrieve the requested objects

  var query = {
    keys: [],
    include_docs: true
  };

  requestedObjectIds.forEach(function(v) {
    Joi.assert(v, Joi.string().guid());
    query.keys.push([user.id, modelName, v]);
  });

  var responseItems = this.couchdb.view('manifest/manifest', query).then(function(result) {
    var resultMap = {};
    
    result.rows.map(function(row) {
      resultMap[row.doc.model.id] = row.doc;
    });

    return resultMap;
  });

  // update the objects provided by the node
  var toSave = [];

  var existingIds = Object.keys(pushedItems).map(function(objectId) {
    return [user.id, modelName, objectId].join(':');
  });

  var savePromise = this.couchdb.getAll(existingIds).then(function(result) {
    var oldDocLookup = {};
    result.forEach(function(doc) {
      if (doc !== null) {
        oldDocLookup[doc._id] = doc;
      }
    });

    for (var objectId in pushedItems) {
      var object = pushedItems[objectId];

      Joi.assert(objectId, Joi.string().guid());
      Joi.assert(object, Joi.object().keys({ last_modified: Joi.number(), data: Joi.object() }));

      var newDocument = {
        _id: [user.id, modelName, objectId].join(':'),
        user: user,
        model: {
          type: modelName,
          id: objectId,
        },
        data: object.data,
        last_modified: object.last_modified,
      };

      if (oldDocLookup.hasOwnProperty(newDocument._id)) {
        var oldDoc = oldDocLookup[newDocument._id];
        if (oldDoc.last_modified < newDocument.last_modified) {
          newDocument._rev = oldDoc._rev;
        } else {
          continue; // skip this document, it's been updated in cloud in the meantime
        }
      }

      toSave.push(newDocument);
    }

    if (toSave.length > 0) {
      return this.couchdb.saveAll(toSave);
    }
  }.bind(this));

  // merge for response

  return when.all([
    responseItems,
    savePromise,
  ]).spread(function(requestedObjects, saveResponse) {
    var pushedObjects = {};

    if (saveResponse) {
      saveResponse.forEach(function(doc) {
        pushedObjects[doc.data.id] = (typeof doc._rev === 'string')
      });
    }

    return {
      model: modelName,
      requestedObjects: requestedObjects,
      pushedObjects: pushedObjects
    };
  });
};

function _makeManifest(result) {
  var manifest = {};

  result.rows.forEach(function(row) {
    manifest[row.value.id] = row.value.last_modified;
  });

  return manifest;
}

function _findGreaterItems(src, dst) {
  var greater = {};

  for (var k in src) {
    var sv = src[k];
    var dv = dst[k];

    if (!dv || dv < sv) {
      greater[k] = sv;
    }
  }

  return greater;
}