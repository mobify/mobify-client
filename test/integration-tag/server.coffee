###
Setup for Mobify.js integration tests. To use:
    In console. run coffee test/integration/mobifyjs.coffee
        (this will start servers for static transformed page, tag injection, and project builds)

    Visit http://localhost:1343/ in your browser.
        (this will run test battery, building each project before working through it)
###

HTTP = require 'http'
Connect = require 'connect'
Url = require 'url'
fs = require 'fs'

Injector = require '../../src/injector.coffee'
{Project} = require '../../src/project.coffee'
Preview = require '../../src/preview.coffee'
Scaffold = require '../../src/scaffold.coffee'

PORT = {
    STATIC: 1341, # Serve static HTML pages and detector.js, lets client see what requests it made previously
    TAG: 1342, # Wraps static server, injects tags
    PREVIEW: 8080, # Serves compiled konfs
    DRIVER: 1343 # Test driver - this is where browser reports success or failure of a test
}

integrationDir = "#{__dirname}/../fixtures-integration-tag"
manifest = JSON.parse(fs.readFileSync(integrationDir + '/manifest.json', 'utf8'))

# A list that tracks requests that were made by the client
requestList = [];
getRequests = () ->
    result = requestList.join('\n');
    requestList = [];
    return result;


startServers = (done) ->
    @static = new Connect()
        .use(Connect.middleware.logger((req, result) ->
            # Do not record requests starting with /__, as those are related to testcase plumbing and are not real page content
            if (!result.originalUrl.match(/^\/__\w/))
                requestList.push(result.originalUrl)
            return
        ))
        .use(Connect.static integrationDir)
        .use('/', (req, res, next) ->
            driverHost = req.headers.host.replace(PORT.STATIC, PORT.DRIVER)
            if (-1 != (req.headers.referer || '').indexOf(driverHost + '/startTest'))
                getRequests();
            next()
        )
        # Tag injector is revealed back on original static port to simplify switching between injecting and non-injecting testcases
        .use('/__injectTag', (req, res) ->
            url = "http://127.0.0.1:#{PORT.TAG}" + req.url
            HTTP.get(url, (req) ->
                req.on('data', (chunk) ->
                    res.write(chunk)
                ).on('end', () ->
                    res.end()
                )
            )
        )
        .use('/__listRequests', (req, res) ->
            res.end(getRequests());
        )
        .listen PORT.STATIC

    # Tag Server
    tag = @tag = Injector.createServer
            port: PORT.STATIC
            siteFolderPath: 'http://127.0.0.1:#{PORT.PREVIEW}'
        .listen(PORT.TAG)

    @preview = new Connect()
        .use(Connect.static integrationDir)
        .listen(PORT.PREVIEW)

    @driver = new Connect()
        .use(Connect.query())
        .use(Connect.cookieParser())
        .use(Connect.session({ secret: "keyboard cat" }))      
        .use('/', (req, res, next) ->
            if req.url == '/'
                res.writeHead(302, { Location: "startTest?test=0" })
                res.end()
                return
            next()
        )
        .use('/startTest', (req, res) ->
            currentTestIndex = req.query.test
            req.session.currentTestIndex = currentTestIndex
            if currentTestIndex >= manifest.tests.length
                res.writeHead(302, { Location: 'showResults' })
                res.end()
            else
                currentTest = manifest.tests[currentTestIndex]
                currentPath = currentTest.path
            
                doStartTest = () ->
                    staticHost = req.headers.host.replace(PORT.DRIVER, PORT.STATIC)
                    initPageURL = currentTest.init
                    if (initPageURL instanceof Object)
                        initPageURL = '__setProps.html?' + encodeURIComponent(JSON.stringify(initPageURL))

                    goal = 'http://' + staticHost + '/' + initPageURL
                    res.setHeader("Content-Type", "text/html")
                    res.end("<meta http-equiv=\"refresh\" content=\"0;URL='#{goal}'\">")

                # Different testcases may test different tag variants. This will switch tag injector to insert an appropriate tag variant
                tag.options.tag_version = currentTest.tagVersion || manifest.tagVersion

                projectJSON = "../fixtures-integration-tag/#{currentPath}/project.json"

                if (fs.existsSync(projectJSON))
                    previewHost = req.headers.host.replace(PORT.DRIVER, PORT.PREVIEW)
                    tag.options.mobifyjsPath = "http://#{previewHost}/#{currentPath}/bld/mobify.js"

                    project = Project.load projectJSON
                    project.build_directory = "../fixtures-integration-tag/#{currentPath}/bld"
                    project.build({ test: true, production:false }, (err) ->
                        if err
                            error = "Failed to build #{currentPath}. Error: #{err}"
                            res.contentType('text/plain');
                            res.end(error)
                            return
                        else
                            doStartTest() 
                    )
                else
                    doStartTest()
        )
        .use('/endTest', (req, res) ->
            currentTestIndex = req.session.currentTestIndex
            msg = req.query.msg;
            req.session[currentTestIndex] = msg;
            res.writeHead(302, { Location: 'startTest?test=' + (+currentTestIndex + 1)})
            res.end()
            callback = manifest.tests[currentTestIndex].callback            
            if (msg)
                callback(new Error(msg))
            else
                callback()            
        )
        .use('/showResults', (req, res) ->
            res.write('Finished ' + manifest.tests.length + ' tests.\n')
            result = manifest.tests.map((test, testIndex) ->
                return test.path + ': ' + req.session[testIndex] || 'success'
            ).join('\n');
            res.end(result)
            setTimeout(servedResults)
        )
        .listen PORT.DRIVER


    console.log "Static Server @ 127.0.0.1:#{PORT.STATIC}"
    console.log "Tag Server @ 127.0.0.1:#{PORT.TAG}"
    console.log "Konf Server @ 127.0.0.1:#{PORT.PREVIEW}"
    console.log "Test Driver (open me in a browser) @ 127.0.0.1:#{PORT.DRIVER}"
    done()

testObj = {}

manifest.tests.forEach((test, i) ->
    testObj[i] = {
        '' : (done) ->
            test.callback = done
    }
)
    
testObj.before = startServers
servedResults = undefined;
testObj.after = (done) ->
    servedResults = done

module.exports = testObj