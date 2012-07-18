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
analyzeDeltas = require './analyzeDeltas.js'

PORT = { STATIC: 1341, TAG: 1342, PREVIEW: 8080 }
PERF_ITERATIONS = 50
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
    tests = fs.readdirSync(integrationDir + '/' + mode)
        .filter((x) -> x.match(/^\d+\.[^.]+$/))

    # Static Server
    @static = new Connect()
        .use(Connect.query())
        .use(Connect.cookieParser())
        .use(Connect.session({ secret: "keyboard cat" }))      
        .use('/', (req, res, next) ->
            if !req.query.tests and req.url == '/'
                res.writeHead(302, {Location: req.url + "?mode=#{mode}&tests=" + tests.join('+')})
                res.end()
                return

            if +req.query.iter >= PERF_ITERATIONS
                if (req.query.tests and req.query.tests.length)
                    remainingTests = req.query.tests;
                    res.writeHead(302, {Location: "/?mode=#{mode}&tests=#{remainingTests}"})
                else
                    res.writeHead(302, {Location: "/done"})
                res.end()
                return


            if (req.query.perf)
                url = req.url.split('?')[0].split('/').pop().replace(/\.html$/, '')
                console.log('RECORDING', url)
                req.session[url] = (req.session[url] || '') + req.query.perf + '\n'
            next()
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
            res.end(logRequests())
        )
        .use('/done', (req, res) ->
            for key in tests
                results = JSON.parse('[' + req.session[key].split('\n').join(',') + '0]')
                results.pop()
                res.write(key + '\n' + analyzeDeltas(results) + '\n')
            res.end()
        )
        .use('/start', (req, res) ->
            logRequests()
            target = Url.parse(req.url).pathname
            
            previewHost = req.headers.host.replace(PORT.STATIC, PORT.PREVIEW)
            tag.options.mobifyJsPath = "http://#{previewHost}#{target}/bld/mobify.js"

            project = Project.load "test/integration/#{mode}#{target}/project.json"
            project.build_directory = "test/integration/#{mode}#{target}/bld"
            project.build({ test: true, production:false  }, (err) ->
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