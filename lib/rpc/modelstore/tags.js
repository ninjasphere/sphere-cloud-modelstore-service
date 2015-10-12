'use strict';

var debug = require('debug')('rpc:modelstore:tags');
var Joi = require('joi');
var errors = require('../errors');
var schemas = require('./schemas');

// gets the latest value of a tag
module.exports.getTag = function (user, site, tag) {
	Joi.assert(user, schemas.UserRecord);
	Joi.assert(site, schemas.ObjectId);
	Joi.assert(tag, schemas.ObjectId);

	return this.service.facet('mysql').then(function(mysql) {
	    return mysql.query(
	    	'SELECT `value` FROM `tags` WHERE user_id=? AND site_id=? AND tag=? AND updated=(select max(updated) from tags where user_id=? AND site_id=? AND tag=?);',
	    	[user.id,site,tag,user.id,site,tag]
	    ).then(function(results) {
	      if (results.length > 0) {
	        return JSON.parse(results[0].value);
	      } else {
	      	throw errors.tags.no_such_object;
	      }
	    });
  	});
};

// updates the current tag
module.exports.putTag = function (user, site, tag, body) {
	Joi.assert(user, schemas.UserRecord);
	Joi.assert(site, schemas.ObjectId);
	Joi.assert(tag, schemas.ObjectId);
	Joi.assert(body, Joi.object());
	return this.service.facet('mysql').then(function(mysql) {
		return mysql.query(
			'select max(updated) as updated from `tags` where user_id=? AND site_id=? AND tag=?;',
			[user.id, site, tag]
		).then(function(results) {
			if (results.length > 0 && results[0].updated) {
			    return mysql.query(
			    	'UPDATE `tags` SET `value` = ?, updated=current_timestamp WHERE user_id=? AND site_id=? AND tag=? AND updated=?;',
			    	[JSON.stringify(body), user.id,site,tag, results[0].updated]
			    ).then(function(results) {
			    	return {};
			    });
			} else {
				return mysql.query(
					'INSERT INTO `tags` (user_id, site_id, tag, `value`) VALUES (?, ?, ?, ?);',
					[user.id,site,tag,JSON.stringify(body)]
				).then(function(results) {
					return {};
				});
			}
		})
	});
};

// always creates a new version of the tag
module.exports.postTag = function (user, site, tag, body) {
	Joi.assert(user, schemas.UserRecord);
	Joi.assert(site, schemas.ObjectId);
	Joi.assert(tag, schemas.ObjectId);
	Joi.assert(body, Joi.object());
	return this.service.facet('mysql').then(function(mysql) {
	    return mysql.query(
	    	'INSERT INTO `tags` (user_id, site_id, tag, `value`) VALUES (?, ?, ?, ?);',
	    	[user.id,site,tag,JSON.stringify(body)]
	    ).then(function(results) {
	    	return {};
	    });
	});
};

