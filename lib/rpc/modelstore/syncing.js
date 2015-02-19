'use strict';

var debug = require('debug')('rpc:modelstore:syncing');
var when = require('when');
var Joi = require('joi');

var schemas = require('./schemas');
var errors = require('../errors');

module.exports.calculateSyncItems = function(user, modelName, nodeManifest) {
  Joi.assert(user, schemas.UserRecord);
  Joi.assert(modelName, schemas.ModelName);
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
  Joi.assert(user, schemas.UserRecord);
  Joi.assert(modelName, schemas.ModelName);
  Joi.assert(requestedObjectIds, Joi.array().includes(schemas.ObjectId));
  Joi.assert(pushedItems, Joi.object());

  // check that pushed items look like what we expect
  for (var objectId in pushedItems) {
    Joi.assert(pushedItems[objectId], schemas.MinimalObject.allow(null));
  }

  // retrieve the requested objects

  var query = {
    keys: [],
    include_docs: true
  };

  requestedObjectIds.forEach(function(v) {
    Joi.assert(v, schemas.ObjectId);
    query.keys.push([user.id, modelName, v]);
  });

  var responseItems = this.couchdb.view('manifest/manifest', query).then(function(result) {
    var resultMap = {};
    
    result.rows.map(function(row) {
      resultMap[row.doc.model.id] = {
        data: row.doc.data,
        last_modified: row.doc.last_modified
      };
    });

    return resultMap;
  });

  var existingIds = Object.keys(pushedItems).map(function(objectId) {
    return [user.id, modelName, objectId].join(':');
  });

  var savePromise = this.couchdb.getAll(existingIds).then(function(result) {
    // update the objects provided by the node
    var toSave = [];

    var oldDocLookup = {};
    result.forEach(function(doc) {
      if (doc !== null) {
        oldDocLookup[doc._id] = doc;
      }
    });

    for (var objectId in pushedItems) {
      var object = pushedItems[objectId];

      Joi.assert(objectId, schemas.ObjectId);
      Joi.assert(object, Joi.object().keys({ last_modified: Joi.number(), data: Joi.object().allow(null) }));

      // object exists
      var newDocument = {
        _id: [user.id, modelName, objectId].join(':'),
        user: user,
        model: {
          type: modelName,
          id: objectId
        },
        data: object.data,
        last_modified: object.last_modified
      };

      if (object.data === null) {
        newDocument._deleted = true; // mark as couchdb-deleted
      }

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
    savePromise
  ]).spread(function(requestedObjects, saveResponse) {
    var pushedObjects = {};

    if (saveResponse) {
      saveResponse.forEach(function(doc) {
        pushedObjects[doc.model.id] = (typeof doc._rev === 'string')
      });
    }

    return {
      model: modelName,
      requestedObjects: requestedObjects,
      pushedObjects: pushedObjects
    };
  });
};

module.exports.pushItemChange = function(user, modelName, pushedItem) {
  Joi.assert(user, schemas.UserRecord);
  Joi.assert(modelName, schemas.ModelName);
  Joi.assert(pushedItem, Joi.object().keys({
    id: schemas.ObjectId,
    last_modified: Joi.number(),
    data: schemas.MinimalObject.allow(null)
  }));

  var newDocument = {
    _id: [user.id, modelName, pushedItem.id].join(':'),
    user: user,
    model: {
      type: modelName,
      id: pushedItem.id
    },
    data: pushedItem.data,
    last_modified: pushedItem.last_modified
  };

  if (pushedItem.data === null) {
    newDocument._deleted = true; // mark as couchdb-deleted
  }

  return this.couchdb.get(newDocument._id).then(function(oldDoc) {
    debug('pushItemChange', 'oldDoc', oldDoc);
    if (oldDoc) {
      if (oldDoc.last_modified < newDocument.last_modified) {
        newDocument._rev = oldDoc._rev;
      } else {
        return; // timestamp mismatch
      }
    }

    return this.couchdb.save(newDocument);
  }.bind(this)).then(function(result) {
    var success = !!(result && result._rev);
    var pushedObjects = {};
    pushedObjects[newDocument.model.id] = success;
    return {
      model: modelName,
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