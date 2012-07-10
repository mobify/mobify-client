FS = require 'fs'
Path = require 'path'
HTTPS = require 'https'
program = require 'commander'
Async = require 'async'
Wrench = require 'wrench'

{appSourceDir} = require '../lib/pathUtils'
{Project} = require './project.coffee'
Injector = require './injector.coffee'
Preview = require './preview.coffee'
Scaffold = require './scaffold.coffee'
Utils = require './utils'
Errors = require './errors'

exports.init = init = (project_name, options, callback) ->
        Scaffold.generate(project_name, options.directory, callback)

exports.preview = preview = (options) ->
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

        server = Preview.createServer environment
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

exports.push = push = (options) ->
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
        
        options.upload = true

        do_it = (err, credentials) ->
            if err
                console.log err
                return

            if credentials
                options.user = credentials.user
                options.password = credentials.password

            project.build options, (err, url, body) ->
                if Utils.pathExistsSync project.build_directory 
                    console.log "Removing #{project.build_directory}"
                    Wrench.rmdirSyncRecursive project.build_directory

                if err
                    console.log err
                    process.exit 1
                    return

                console.log "Bundle Uploaded."
                if body and body.message
                    console.log body.message

        if options.auth
            [user, password] = options.auth.split ':'
            credentials =
                user: user
                password: password
            
            do_it null, credentials
        else
            getCredentials do_it

exports.build = build = (options, callback) ->
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

        options.upload = false

        project.build options, (err, url, body) ->
            if err
                console.log err
                process.exit 1
                return

            console.log "Project built successfully in #{url}/"

            if callback
                callback()
    
exports.login = (options, callback) ->
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
