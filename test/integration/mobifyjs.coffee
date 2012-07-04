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
Url= require 'url'
fs = require 'fs'

Injector = require '../../src/injector.coffee'
{Project} = require '../../src/project.coffee'
Preview = require '../../src/preview.coffee'
Scaffold = require '../../src/scaffold.coffee'


STATIC_PORT = 1341
TAG_PORT = 1342
PREVIEW_PORT = 8080
preview = undefined

requestLog = [];
close = () ->
    return true if !preview
    preview.close()    
    preview = undefined
    result = requestLog.join('\n')
    requestLog = []
    result


integrationDir = "#{__dirname}/../integration"

# Static Server
@static = new Connect()
    .use(Connect.query())
    .use('/', (req, res, next) ->
        return next() if req.query.tests or req.url != '/'
        tests = fs.readdirSync(integrationDir).filter((x) -> x.match(/^\d+\.[^.]+$/))
        res.writeHead(302, {Location: req.url + '?tests=' + tests.join('+')})
        res.end()
    )
    .use(Connect.static integrationDir)
    .use(Connect.middleware.logger((request, result) ->
        requestLog.push(result.url)
        return
    ))

    .use('/tag', (req, res) ->
        url = "http://127.0.0.1:#{TAG_PORT}" + req.url
        HTTP.get(url, (req) ->
            req.on('data', (chunk) ->
                res.write(chunk)
            ).on('end', () ->
                res.end()
            )
        )
    )
    .use('/end', (req, res) ->
        res.end close()
    )
    .use('/start', (req, res) ->
        target = Url.parse(req.url).pathname
        console.log("#{integrationDir}#{target}/project.json")

        close()
        project = Project.load "test/integration#{target}/project.json"
        environment = project.getEnv()
        preview = Preview.createServer(environment)
        preview.listen PREVIEW_PORT
        ready()
        res.writeHead(302, {Location: req.query.redir }) if req.query.redir
        res.end()
    )

@static.listen STATIC_PORT

# Tag Server
@tag = Injector.createServer
            port: STATIC_PORT
            siteFolderPath: 'http://127.0.0.1:#{PREVIEW_PORT}'
@tag.listen TAG_PORT

ready = () ->
    console.log "Static Server @ 127.0.0.1:#{STATIC_PORT}"
    console.log "Tag Server @ 127.0.0.1:#{TAG_PORT}"
    console.log "Konf Server @ 127.0.0.1:#{PREVIEW_PORT}"
