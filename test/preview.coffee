###
Tests for src/preview.coffee
###
FS = require 'fs'
HTTP = require 'http'
Assert = require 'assert'

Request = require 'request'
Static = require 'node-static'

{Project} = require '../src/project.coffee'
{Environment} = require '../src/build.coffee'
Preview = require '../src/preview.coffee'
Scaffold = require '../src/scaffold.coffee'

STATIC_PORT = 1337
PREVIEW_PORT = 1338


module.exports =
    'before': (done) ->
        # Static Server
        static_handler = new Static.Server 'test/fixtures'
        @static = HTTP.createServer (request, response) ->
            static_handler.serve request, response
        @static.listen STATIC_PORT

        generated = () ->
            # Preview Server
            project = Project.load 'test/fixtures-preview/project.json'
            environment = project.getEnv()
            @preview = Preview.createServer environment
            @preview.listen PREVIEW_PORT
            done()

        Scaffold.generate 'test/fixtures-preview', null, generated

    'test-get': (done) ->
        Request 'http://127.0.0.1:1338/mobify.js', (err, response) ->
            # Assert not response.headers['X-Error'], 'Should not be an error.'
            Assert not /Mobify\.js\sError/.test(response.body), 'Should not be an error.'
            done()

    'test-get-404': (done) ->
        Request 'http://127.0.0.1:1338/404', (err, response) ->
            Assert.equal response.statusCode, 404
            done()

    'test-save': (done) ->
        body = 'Yo Joe!'

        Request {
            method: 'PUT'
            uri: 'http://127.0.0.1:1338/mobify.konf'
            body: body
        }, (err, response) ->
            Assert.equal response.statusCode, 200

            FS.readFile 'test/fixtures-preview/src/mobify.konf', (err, data) ->
                Assert.equal data.toString(), body
                done()

    'test-save-bad-file': (done) ->
        Request {
            method: 'PUT'
            uri: 'http://127.0.0.1:1338/../naughty'
            body: 'Turtle Power!'
        }, (err, response, body) ->
            Assert.equal response.statusCode, 400
            done()

    'test-save-from-location': (done) ->
        Request {
            method: 'PUT'
            uri: 'http://127.0.0.1:1338/mobify.konf'
            headers:
                location: 'http://127.0.0.1:1337/fixtures/alert.js'
        }, (err, response, body) ->
            Assert.equal response.statusCode, 200
            done()
