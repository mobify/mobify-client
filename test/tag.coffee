###

Helper for testing new versions of the tags!

Usage:

    coffee test/tag.coffee

    navigate to 

    http://127.0.0.1:1340/

    checkout fixtures/tags for the goods


###
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


PREVIEW_PORT = 1338
STATIC_PORT = 1339
TAG_PORT = 1340


if require.main == module
    # Tag server proxies the static server.
    @static = new Connect().use(Connect.static "#{__dirname}/fixtures")
    @static.listen STATIC_PORT

    @tag = Injector.createServer
                port: STATIC_PORT
                # tag_version: 7
                tag_version: 'o'
                mobifyjsPath: "http://localhost:#{PREVIEW_PORT}/mobify.js"
    @tag.listen TAG_PORT

    project = Project.load "#{__dirname}/fixtures/tags/mobifyjs-project/project.json"
    environment = project.getEnv()

    @preview = Preview.createServer environment
    @preview.listen PREVIEW_PORT

    console.log "Tagging #{__dirname}/fixtures @ 127.0.0.1:#{TAG_PORT}"
    console.log "Preview #{__dirname}/fixtures/tags/mobifyjs-project @ 127.0.0.1:#{PREVIEW_PORT}"