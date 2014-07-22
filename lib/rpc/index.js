var debug = require('debug')('modelstore-service:rpc');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var when = require('when');

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

ModelStoreServiceFacet.prototype.rpc_methods.modelstore = require('./modelstore');

module.exports = ModelStoreServiceFacet;
