// TODO: Right now these tests depend on where nodeunit is ran from... fix that.
var assert = require('assert')
  , http = require('http')
  , path = require('path')
  , coffee = require('coffee-script')
  , request = require('request')
  , build = require('../../src/build')
  , preview = require('../../src/preview')
  , utils = require('../utils/utils');
  
var port = utils.uniquePort();

var env = build.createEnvironment('test', 'vendor/mobify-js/1.0');
var preview = new preview.PreviewServer(env);
preview.listen(port);
console.log(port);
