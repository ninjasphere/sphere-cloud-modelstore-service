"use strict";
var fs = require('fs');
var usvc = require('usvc');
var nodeFn = require('when/node');

var debug = require('debug')('test:modelstore');

var expect = require('chai').expect;
var readFile = nodeFn.lift(fs.readFile);

describe('cloud modelstore', function () {

  var service = usvc.microService({
    // backing stores
    couchdb: usvc.facets.db.couchdb(),

    // rpc interface
    rpcService: usvc.facets.rpc.jsonServer(['modelStoreService']),
    modelStoreService: require('../lib/rpc')
  });

  before(function (done) {
    service.run();

    service.facet('couchdb').then(function (facet) {

      facet._client.destroy();
      facet._client.create();

      readFile('./couchdb/designs/manifest.json', {encoding: 'utf8'}).then(function (data) {
        return JSON.parse(data);
      }).then(function (result) {
        return facet._client.save(result);
      }).then(function () {
        return facet.saveAll([
          {
            _id: '343f84cb-c137-4db1-aeab-8a985e9f7414:room:2d3fea7f-485d-4a51-b045-b86602a0fc7f',
            user: {
              id: '343f84cb-c137-4db1-aeab-8a985e9f7414'
            },
            model: {
              type: 'room',
              id: '2d3fea7f-485d-4a51-b045-b86602a0fc7f'
            },
            data: {
              name: 'food',
              id: '2d3fea7f-485d-4a51-b045-b86602a0fc7f',
              things: []
            }
          }
        ]);
      }).then(function (newDocs) {
        done();
      });

    })
  });

  it('should get a room', function (done) {

    service.facet('rpcService').then(function (facet) {

      function getRoom(result) {
        debug('getRoom', 'result', result);
        expect(result.name).to.equal('food');
        done();
      }

      facet.methods['modelStoreService.modelstore.getItem']({id: '343f84cb-c137-4db1-aeab-8a985e9f7414'}, 'room', '2d3fea7f-485d-4a51-b045-b86602a0fc7f').then(getRoom);
    });

  });

  it('should list rooms', function (done) {

    service.facet('rpcService').then(function (facet) {

      function listRooms(results) {
        debug('results', results);
        expect(results.length).to.equal(1);
        done();
      }

      facet.methods['modelStoreService.modelstore.listItems'](
        {id: '343f84cb-c137-4db1-aeab-8a985e9f7414'},
        'room'
      ).then(listRooms);
    });

  });

  it('should update a room', function (done) {

    service.facet('rpcService').then(function (facet) {

      function updatedRoom(result) {
        debug('updatedRoom', 'result', result);
        expect(result.name).to.equal('food NEW NAME');
        done();
      }

      facet.methods['modelStoreService.modelstore.updateItem']({id: '343f84cb-c137-4db1-aeab-8a985e9f7414'}, 'room', '2d3fea7f-485d-4a51-b045-b86602a0fc7f',
        {
          "name": 'food NEW NAME',
          "id": '2d3fea7f-485d-4a51-b045-b86602a0fc7f',
          "things": []
        }
      ).then(updatedRoom);

    });

  });

  it('should delete a room', function (done) {

    service.facet('rpcService').then(function (facet) {

      function deleteRoom(result) {
        debug('deleteRoom', 'result', result);
        expect(result.name).to.equal('food NEW NAME');
      }

      function checkDeleteRoom(result) {
        debug('deleteRoom', 'result', result);
        expect(result).to.be.null;
        done();
      }

      facet.methods['modelStoreService.modelstore.deleteItem'](
        {id: '343f84cb-c137-4db1-aeab-8a985e9f7414'},
        'room',
        '2d3fea7f-485d-4a51-b045-b86602a0fc7f'
      ).then(deleteRoom).then(function () {

          service.facet('couchdb').then(function (facet) {
            facet._client.get('343f84cb-c137-4db1-aeab-8a985e9f7414:room:2d3fea7f-485d-4a51-b045-b86602a0fc7f').then(checkDeleteRoom);
          });

        });

    });

  });

  it('should create a room', function (done) {

    service.facet('rpcService').then(function (facet) {

      function createdRoom(result) {
        debug('createdRoom', 'result', result);
        expect(result.name).to.equal('beer');
        done();
      }

      facet.methods['modelStoreService.modelstore.createItem']({id: '343f84cb-c137-4db1-aeab-8a985e9f7414'}, 'room',
        {
          "name": 'beer',
          "things": []
        }
      ).then(createdRoom);

    });

  });

});