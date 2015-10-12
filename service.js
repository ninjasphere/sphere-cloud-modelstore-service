process.title = 'sphere-cloud-modelstore';

if (process.env.BUGSNAG_KEY) {
  var bugsnag = require("bugsnag");
  bugsnag.register(process.env.BUGSNAG_KEY, { releaseStage: process.env.USVC_CONFIG_ENV || 'development' });
}

var usvc = require('usvc');

var service = usvc.microService({
  // backing stores
  couchdb: usvc.facets.db.couchdb(),
  mysql: usvc.facets.db.mysqlPool(),

  // rpc interface
  rpcService: usvc.facets.rpc.jsonServer(['modelStoreService']),
  modelStoreService: require('./lib/rpc')
}).run();
