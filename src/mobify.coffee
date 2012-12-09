#!/usr/bin/env coffee
program = require 'commander'

Utils = require './utils'
Commands = require './commands'


program
    .version(Utils.getVersion())

program
    .command('init <project_name>')
    .description('Initializes a project scaffold.')
    .option('-d, --directory <dir>', 'Directory to pull the project scaffold from')
    .action Commands.init

program
    .command('preview')
    .description('Runs a local server you can preview against.')
    .option('-p, --port <port>', 'port to bind to [8080]', parseInt, 8080)
    .option('-a, --address <address>', 'address to bind to [0.0.0.0]', '0.0.0.0')
    .option('-m, --minify', 'enable minification and strip logging code')
    .option('-s, --strip', 'strip logging code')
    .option('-t, --tag', 'runs a tag injecting proxy, requires sudo')
<<<<<<< HEAD
    .option('-u, --tag-version <version>', 'version of the tags to use [6]', parseInt, 6)
    .action (options) ->
        try
            project = Project.load()
        catch err
            if err instanceof Errors.ProjectFileNotFound
                console.log "Could not find your project. Make sure you are inside your project folder."
                console.log "Visit https://cloud.mobify.com/docs/ for more information.\n"
                console.log err.toString()
            else
                console.log "Unexpected Error."
                console.log "Please report this error to https://cloud.mobify.com/support/\n"
                console.log err.stack
            return
    
        environment = project.getEnv()

        if options.minify
            environment.production = true
            environment.minify = true

        if options.strip
            environment.production = true

        server = Preview.createServer(environment)
        server.listen options.port, options.address
        console.log "Running Preview at http://#{options.address}:#{options.port}/"
        
        if options.tag
            host = '0.0.0.0'
            port = 80
            opts = 
                tag_version: options.tagVersion
            server = Injector.createServer opts
            server.listen port, host
            console.log "Running Tag at http://#{host}:#{port}/"

            port = 443
            opts.port = port
            opts.key = FS.readFileSync(Path.join appSourceDir, 'vendor', 'certs', 'server.key')
            opts.cert = FS.readFileSync(Path.join appSourceDir, 'vendor', 'certs', 'server.crt')
            opts.proxy_module = HTTPS
            opts.server = Injector.HttpsServer
            server = Injector.createServer opts
            server.listen port, host
            console.log "Running Tag at https://#{host}:#{port}/"

        console.log "View local changes at https://cloud.mobify.com/projects/#{project.name}/preview/?bundle_id=localhost"
        console.log "Press <CTRL-C> to terminate."

push = (options) ->
        try
            project = Project.load()
        catch err
            if err instanceof Errors.ProjectFileNotFound
                console.log "Could not find your project. Make sure you are inside your project folder."
                console.log "Visit https://cloud.mobify.com/docs/ for more information.\n"
                console.log err.toString()
            else
                console.log "Unexpected Error."
                console.log "Please report this error to https://cloud.mobify.com/support/\n"
                console.log err.stack
            return

        do_it = (err, credentials) ->
            if err
                console.log err
                return

            if credentials
                options.user = credentials.user
                options.password = credentials.password

            project.build options, (err, url, body) ->
                if err
                    console.log err
                    process.exit 1
                    return

                if options.test
                    console.log "See #{url}/"
                else
                    console.log "Bundle Uploaded."
                    if body and body.message
                        console.log body.message

        if options.test
            do_it()
        else if options.auth
            [user, password] = options.auth.split ':'
            credentials =
                user: user
                password: password
            
            do_it null, credentials
        else
            getCredentials do_it
=======
    .option('-u, --tag-version <version>', 'version of the tags to use [6]', '6')
    .action Commands.preview
>>>>>>> a4663a16e68692a34d1816f587a048399937113a

program
    .command('push')
    .description('Builds and uploads the current project to Mobify Cloud.')
    .option('-m, --message <message>', 'message for bundle information')
    .option('-l, --label <label>', 'label the bundle')
    .option('-e, --endpoint <endpoint>', 'set the API endpoint eg. https://cloud.mobify.com/api/')
    .option('-u, --auth <auth>', 'username and API Key eg. username:apikey')
    .option('-p, --project <project>', 'override the project name in project.json for the push destination')
    .option('-x, --proxy <proxy url>', 'use the specified proxy. URL in the format http://[username:password@]PROXY_HOST:PROXY_PORT/')
    .action Commands.push

program
    .command('build')
    .description('Builds your project and places it into a bld folder')
    .action Commands.build

program
    .command('login')
    .description('Saves credentials to global settings.')
    .option('-u, --auth <auth>', 'Username and API Key eg. username:apikey')
    .action Commands.login


program.on '*', (command) ->
    console.log "Unknown command: '#{command}'."
    console.log "Get help and usage information with: mobify --help"

program.parse process.argv

# Print help if no command was given
if process.argv.length < 3
    process.stdout.write program.helpInformation()
