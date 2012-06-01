// TODO: Right now these tests depend on where nodeunit is ran from... fix that.
var assert = require('assert')
  , http = require('http')
  , path = require('path')
  , coffee = require('coffee-script')
  , request = require('request')
  , build = require('../src/build')
  , preview = require('../src/preview')
  , utils = require('./utils/utils');

var port = utils.uniquePort();

var env = build.createEnvironment('test', 'vendor/mobify-js/1.0');
var preview = new preview.PreviewServer(env);
preview.listen(port);


require('nodeunit').once('done', function() {
    preview.close();
});

module.exports = {
    'mobify.js resolves to mobify.konf': function(test) {
        request('http://localhost:' + port + '/fixtures/mobify.js', function(err, response, body) {
            test.ok(/mobify\.konf/i.test(body), 'Should have loaded mobify.konf');
            test.done();
        });
    },

    'detect.js resolves to detect.konf': function(test) {
        request('http://localhost:' + port + '/fixtures/detect.js', function(err, response, body) {
            test.ok(/detect\.konf/i.test(body), 'Should have loaded detect.konf');
            test.done();
        });
    },

    'missing file causes error': function(test) {
        request('http://localhost:' + port + '/fixtures-404/detect.js', function(err, response, body) {
            test.ok(/Error/.test(body), 'This should be an error page.');
            test.done(); 
        });
    },

    'konf with dustjs error causes error': function(test) {
        request('http://localhost:' + port + '/fixtures-konf-dustjs-error/mobify.js', function(err, response, body) {
            test.ok(/failed\scompiling/i.test(body), 'error');
            test.done();
        });
    },

    'konf that includes partial with kaffeine error causes error': function(test) {
        request('http://localhost:' + port + '/fixtures-kaffeine-error/mobify.js', function(err, response, body) {
            test.ok(/kaffeine\sfailed/i.test(body), 'Broken partials should be broken.');
            test.done();
        });
    },

    'konf that includes partial konf with error causes error': function(test) {
        request('http://localhost:' + port + '/fixtures-broken-partial-konf/mobify.js', function(err, response, body) {
            test.ok(/dustjs\sfailed/i.test(body), 'Broken partials should be broken.');
            test.done();
        });
    },

    // TODO: Something in nodeunit expands %s
    'tmpl with {% script} error causes error': function(test) {
        request('http://localhost:' + port + '/fixtures-tmpl-with-script-error/mobify.js', function(err, response, body) {
            test.ok(/failed\scompiling/.test(body), 'Compiling should raise an error.');
            test.done();
        });
    },

    '{%kaffeine} preserves whitespace': function(test) {
        request('http://localhost:' + port + '/fixtures-whitespace/mobify.js', function(err, response, body) {
            test.ok(!/failed/.test(body), 'Kaffeine must behave.');
            test.done(); 
        });
    },

    'konf with missing partial error causes error': function(test) {
        request('http://localhost:' + port + '/fixtures-missing-partial/mobify.js', function(err, response, body) {
            test.ok(/failed\sloading\spartial/i.test(body), 'This should be an error page.');
            test.done();
        });  
    },

    // They used to print twice!
    'regression: templates print once': function(test) {
        request('http://localhost:' + port + '/fixtures-tmpl-print-once/mobify.js', function(err, response, body) {
            test.ok(body.length == 112, 'Templates should only print once.');
            test.done();
        });
    }
}
