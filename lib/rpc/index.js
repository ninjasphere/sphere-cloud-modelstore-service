var debug = require('debug')('modelstore-service:rpc');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var when = require('when');
var _ = require('lodash-node');

function ModelStoreServiceFacet(service, name) {
  this.service = service;
  this.name = name;
}
util.inherits(ModelStoreServiceFacet, EventEmitter);

ModelStoreServiceFacet.prototype.initialise = function() {
  return this.service.facets('couchdb').spread(function(couchdb) {
  	this.couchdb = couchdb;
    debug('got dependency', couchdb.name);
  }.bind(this));
};

ModelStoreServiceFacet.prototype.rpc_methods = {};

var modelstore = {};
_.assign(modelstore, require('./modelstore/syncing'));
_.assign(modelstore, require('./modelstore/access'));

ModelStoreServiceFacet.prototype.rpc_methods.modelstore = modelstore;

module.exports = ModelStoreServiceFacet;
