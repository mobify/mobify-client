#!/usr/bin/env coffee
FS = require 'fs'
Path = require 'path'
HTTPS = require 'https'
program = require 'commander'
Async = require 'async'

{appSourceDir} = require '../lib/pathUtils'
{Project} = require './project.coffee'
Injector = require './injector.coffee'
Preview = require './preview.coffee'
Scaffold = require './scaffold.coffee'
Utils = require './utils'
Errors = require './errors'


program
    .version(Utils.getVersion())

program
    .command('init <project_name>')
    .description('Initializes a project scaffold.')
    .option('-d, --directory <dir>', 'Directory to pull the project scaffold from')
    .action (project_name, options) ->
        Scaffold.generate(project_name, options.directory)

program
    .command('preview')
    .description('Runs a local server you can preview against.')
    .option('-p, --port <port>', 'port to bind to [8080]', parseInt, 8080)
    .option('-a, --address <address>', 'address to bind to [0.0.0.0]', '0.0.0.0')
    .option('-m, --minify', 'enable minification')
    .option('-t, --tag', 'runs a tag injecting proxy, requires sudo')
    .option('-u, --tag-version <version>', 'version of the tags to use [6]', '6')
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

        server = Preview.createServer(environment)
        server.listen options.port, options.address
        console.log "Running Preview at address #{options.address} and port #{options.port}"
        
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

program
    .command('push')
    .description('Uploads the contents of the working directory as a bundle.')
    .option('-m, --message <message>', 'Message for bundle information')
    .option('-l, --label <label>', 'Label the bundle')
    .option('-t, --test', 'Do a test build, do not upload')
    .option('-e, --endpoint <endpoint>', 'Set the API endpoint eg. https://cloud.mobify.com/api/')
    .option('-u, --auth <auth>', 'Username and API Key eg. username:apikey')
    .option('-p, --project <project>', 'Override the project for a build')
    .action push

program
    .command('login')
    .description('Saves credentials to global settings.')
    .option('-u, --auth <auth>', 'Username and API Key eg. username:apikey')
    .action (options) ->
        save_credentials = (username, api_key) ->
            Utils.getGlobalSettings (err, settings) ->
                settings.username = username
                settings.api_key = api_key
                Utils.setGlobalSettings settings, (err) ->
                    if err
                        console.log err
                    console.log "Credentials saved to: #{Utils.getGlobalSettingsPath()}"

        if options.auth
            [username, api_key] = options.auth.split ':'
            save_credentials username, api_key
        else
            promptCredentials (err, username, api_key) ->
                if err
                    console.log err
                    return
                save_credentials username, api_key

getCredentials = (callback) ->
    Utils.getGlobalSettings (err, settings) ->
        if err
            callback err

        else if settings.username and settings.api_key
            console.log "Using saved credentials: #{settings.username}"
            callback null, user: settings.username, password: settings.api_key

        else
            promptCredentials (err, username, api_key) ->
                if err
                    callback err
                    return
                callback null, user: username, password: api_key


promptCredentials = (callback) ->
    promptUsername = (callback) ->
        program.prompt "Username: ", (input) ->
            if not input
                callback new Error("Username must not be blank.")
                return
            callback null, input

    promptKey = (callback) ->
        program.prompt "API Key: ", (input) ->
            if not input
                callback new Error("API Key must not be blank.")
                return
            callback null, input


    Async.series [promptUsername, promptKey], (err, results) ->
        if err
            callback err
            return

        [username, api_key] = results
        callback null, username, api_key

        process.stdin.pause()
        # Destroy stdin otherwise Node will hang out for ever.
        # This is fixing in 0.6.12, and we won't have to destroy it explicitly.
        # Which means we can read from it later, at this time
        # once it's destroyed, it's gone.
        process.stdin.destroy()

program.on '*', (command) ->
    console.log "Unknown command: '#{command}'."
    console.log "Get help and usage information with: mobify --help"

program.parse process.argv

# Print help if no command was given
if process.argv.length < 3
    process.stdout.write program.helpInformation()
