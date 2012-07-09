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


init = (project_name, options, callback) ->
        Scaffold.generate(project_name, options.directory, callback)

preview = (options) ->
        try
            project = Project.load()
        catch err
            if err instanceof Errors.ProjectFileNotFound
                console.log "Could not find project.json. Ensure you are working inside the project folder."
                console.log err.toString()
            else
                console.log "Unexpected Error."
                console.log "Please report this error at https://support.mobify.com/\n"
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
                console.log "Could not find project.json. Ensure you are working inside the project folder."
                console.log err.toString()
            else
                console.log "Unexpected Error."
                console.log "Please report this error at https://support.mobify.com/\n"
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

build = (options, callback) ->
        try
            project = Project.load()
        catch err
            if err instanceof Errors.ProjectFileNotFound
                console.log "Could not find project.json. Ensure you are working inside the project folder."
                console.log err.toString()
            else
                console.log "Unexpected Error."
                console.log "Please report this error at https://support.mobify.com/\n"
                console.log err.stack
            return

        options.test = true

        project.build options, (err, url, body) ->
            if err
                console.log err
                process.exit 1
                return

            console.log "See #{url}/"

            if callback
                callback()
    
login = (options, callback) ->
        save_credentials = (username, api_key) ->
            Utils.getGlobalSettings (err, settings) ->
                settings.username = username
                settings.api_key = api_key
                Utils.setGlobalSettings settings, (err) ->
                    if err
                        console.log err
                    console.log "Credentials saved to: #{Utils.getGlobalSettingsPath()}"
                    if callback
                        callback()

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

program
    .version(Utils.getVersion())

program
    .command('init <project_name>')
    .description('Initializes a project scaffold.')
    .option('-d, --directory <dir>', 'Directory to pull the project scaffold from')
    .action init

program
    .command('preview')
    .description('Runs a local server you can preview against.')
    .option('-p, --port <port>', 'port to bind to [8080]', parseInt, 8080)
    .option('-a, --address <address>', 'address to bind to [0.0.0.0]', '0.0.0.0')
    .option('-m, --minify', 'enable minification')
    .option('-t, --tag', 'runs a tag injecting proxy, requires sudo')
    .option('-u, --tag-version <version>', 'version of the tags to use [6]', parseInt, 6)
    .action preview
    

program
    .command('push')
    .description('Builds and uploads the current project to Mobify Cloud.')
    .option('-m, --message <message>', 'message for bundle information')
    .option('-l, --label <label>', 'label the bundle')
    .option('-t, --test', 'do a test build, do not upload')
    .option('-e, --endpoint <endpoint>', 'set the API endpoint eg. https://cloud.mobify.com/api/')
    .option('-u, --auth <auth>', 'username and API Key eg. username:apikey')
    .option('-p, --project <project>', 'override the project name in project.json for the push destination')
    .action push

program
    .command('build')
    .description('Builds your project and places it into a bld folder')
    .action build

program
    .command('login')
    .description('Saves credentials to global settings.')
    .option('-u, --auth <auth>', 'Username and API Key eg. username:apikey')
    .action login


program.on '*', (command) ->
    console.log "Unknown command: '#{command}'."
    console.log "Get help and usage information with: mobify --help"

program.parse process.argv

# Print help if no command was given
if process.argv.length < 3
    process.stdout.write program.helpInformation()

exports.init = init
exports.preview = preview
exports.build = build
exports.push = push
exports.login = login
