###

Setup the following for Mobify.js integration tests:

1. A static server.
2. A tag server.
3. A preview server to serve the tag.

Phantom.js will hits the tag server and ensures that the scaffold from the 
preview server runs correctly.

###
Connect = require 'connect'

Injector = require '../../src/injector.coffee'
{Project} = require '../../src/project.coffee'
Preview = require '../../src/preview.coffee'
Scaffold = require '../../src/scaffold.coffee'


STATIC_PORT = 1341
TAG_PORT = 1342
PREVIEW_PORT = 1343

# Static Server
@static = new Connect().use(Connect.static "#{__dirname}/../fixtures")
@static.listen STATIC_PORT

# Tag Server
@tag = Injector.createServer
            port: STATIC_PORT
            mobifyjsPath: "http://127.0.0.1:#{PREVIEW_PORT}/mobify.js"
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