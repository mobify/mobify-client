###
Setup for Mobify.js integration tests. To use:
    In console. run coffee test/integration/mobifyjs.coffee
        (this will start servers for static transformed page, tag injection, and project builds)

    Visit http://localhost:1341/ in your browser.
        (this will run test battery, building each project before working through it)
###

HTTP = require 'http'
Connect = require 'connect'
Url= require 'url'
fs = require 'fs'
program = require 'commander'

Injector = require '../../src/injector.coffee'
{Project} = require '../../src/project.coffee'
Preview = require '../../src/preview.coffee'
Scaffold = require '../../src/scaffold.coffee'

PORT = { STATIC: 1341, TAG: 1342, PREVIEW: 8080 }
requestLog = [];
logRequests = () ->
    result = requestLog.join('\n')
    requestLog = []
    result

program
    .command('performance')
    .description('Run performance tests')
    .action () ->
        start('performance')

program
    .command('integration')
    .description('Run integration tests')
    .action () ->
        start('integration')

start = (mode) ->
    integrationDir = "#{__dirname}/../integration"
    tests = fs.readdirSync(integrationDir + '/' + mode).filter((x) -> x.match(/^\d+\.[^.]+$/))

    # Static Server
    @static = new Connect()
        .use(Connect.query())
        .use('/', (req, res, next) ->
            return next() if req.query.tests or req.url != '/'
            res.writeHead(302, {Location: req.url + '?mode=' + mode + '&tests=' + tests.join('+')})
            res.end()
        )
        .use(Connect.static integrationDir)
        .use(Connect.middleware.logger((request, result) ->
            requestLog.push(result.url)
            return
        ))
        .use('/tag', (req, res) ->
            url = "http://127.0.0.1:#{PORT.TAG}" + req.url
            HTTP.get(url, (req) ->
                req.on('data', (chunk) ->
                    res.write(chunk)
                ).on('end', () ->
                    res.end()
                )
            )
        )
        .use('/end', (req, res) ->
            res.end logRequests()
        )
        .use('/submit', (req, res) ->
            body = ''
            req.on('data', (data) -> 
                body += data;
            )
            req.on('end', () ->
                console.log(body)
                res.end
            )
        )
        .use('/start', (req, res) ->
            logRequests()
            target = Url.parse(req.url).pathname
            
            previewHost = req.headers.host.replace(PORT.STATIC, PORT.PREVIEW)
            tag.options.mobifyJsPath = "http://#{previewHost}#{target}/bld/mobify.js"

            project = Project.load "test/integration/#{mode}#{target}/project.json"
            project.build_directory = "test/integration/#{mode}#{target}/bld"
            project.build({ test: true,  }, (err) ->
                if err
                    error = "Failed to build #{target}. Error: #{err}"
                    console.log(error)
                    res.contentType('text/plain');
                    res.end(error)
                else 
                    res.contentType('text/html');
                    res.end("<!DOCTYPE><script>parent.postMessage('ready', '*')</script>");
            )
        )
        .listen PORT.STATIC

    # Tag Server
    tag = @tag = Injector.createServer
            port: PORT.STATIC
            siteFolderPath: 'http://127.0.0.1:#{PORT.PREVIEW}'
        .listen(PORT.TAG)

    @preview = new Connect()
        .use(Connect.static "test/integration/#{mode}")
        .listen(PORT.PREVIEW)

    console.log "Static Server @ 127.0.0.1:#{PORT.STATIC}"
    console.log "Tag Server @ 127.0.0.1:#{PORT.TAG}"
    console.log "Konf Server @ 127.0.0.1:#{PORT.PREVIEW}"


program.parse process.argv

if process.argv.length < 1
    process.stdout.write program.helpInformation()