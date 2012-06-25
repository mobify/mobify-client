###
Setup for Mobify.js integration tests.

Usage:
    mobify-client$ coffee test/integration/mobifyjs.coffee &
    mobify-client$ phantomjs test/integration/phantom.coffee


To get ready to test Mobify.js, we need to put a few things in place.

1. Start a Static server.
2. Start a Tag server to tag content from Static.
3. Start a Preview server to serve the Mobify.js for the tag!

Phantom will hit the tag server and check that the scaffold adaptation runs
correctly.

###
HTTP = require 'http'

Connect = require 'connect'

Injector = require '../../src/injector.coffee'
{Project} = require '../../src/project.coffee'
Preview = require '../../src/preview.coffee'
Scaffold = require '../../src/scaffold.coffee'


STATIC_PORT = 1341
TAG_PORT = 1342
PREVIEW_PORT = 8080


# Static Server
@static = new Connect()
    .use(Connect.static "#{__dirname}/fixtures")
@static.listen STATIC_PORT

# Tag Server
@tag = Injector.createServer
            port: STATIC_PORT
            siteFolderPath: 'http://127.0.0.1:#{PREVIEW_PORT}'
@tag.listen TAG_PORT

# Preview Server
scaffold_ready = () ->
    project = Project.load 'test/fixtures-preview/project.json'
    environment = project.getEnv()
    @preview = Preview.createServer environment
    @preview.listen PREVIEW_PORT
    ready()

Scaffold.generate 'test/fixtures-preview', null, scaffold_ready


ready = () ->
    console.log "Static Server @ 127.0.0.1:#{STATIC_PORT}"
    console.log "Tag Server @ 127.0.0.1:#{TAG_PORT}"
    console.log "Preview Server @ 127.0.0.1:#{PREVIEW_PORT}"
