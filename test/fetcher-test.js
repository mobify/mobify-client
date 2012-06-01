var assert = require('assert')
  , Fetcher = require('../lib/fetcher');

var fetcher = new Fetcher();

module.exports = {
    'fetcher.get absolute': function(test) {
        fetcher.get('/test/fixtures-fetcher/test.js', function(err, data, resolved) {
           test.ok(/test\.js/.test(data))
           test.done()
        });
    },

    'fetcher.get relative': function(test) {
        fetcher.get('test/fixtures-fetcher/test.js', function(err, data, resolved) {
           test.ok(/test\.js/.test(data))
           test.done()
        });
    },

    'fetcher.get 404': function(test) {
        fetcher.get('/test/fixtures-fetcher/404.js', function(err, data, resolved) {
           test.ok(err)
           test.done()
        });
    }
}