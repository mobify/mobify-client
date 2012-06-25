FS = require 'fs'
HTTP = require 'http'
Assert = require 'assert'
Path = require 'path'

Request = require 'request'
Connect = require 'connect'

{Project} = require '../src/project.coffee'
{Environment} = require '../src/build.coffee'
Preview = require '../src/preview.coffee'
Scaffold = require '../src/scaffold.coffee'
Injector = require '../src/injector.coffee'


STATIC_PORT = 1339
TAG_PORT = 1340


module.exports =
    # Tag server proxies the static server.
    'before': ->
        @static = new Connect()
            .use(Connect.static "#{__dirname}/fixtures")
        @static.listen STATIC_PORT

        @tag = Injector.createServer {port: STATIC_PORT}
        @tag.listen TAG_PORT
            
    'HTML pages are tagged': (done) ->
        Request 'http://localhost:' + TAG_PORT + '/index.html', (err, response, body) ->
            Assert.ok(/<script/.test(body), 'Where my tags at?')
            done()

    'JavaScript pages are not tagged': (done) ->
        Request 'http://localhost:' + TAG_PORT + '/alert.js', (err, response, body) ->
            Assert.ifError(err)
            Assert.equal("'alert.js';", body.slice(0, 100), 'This page should not be tagged')
            done()
