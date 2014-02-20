Events = require 'events'
FS = require 'fs'
Http = require 'http'
Path = require 'path'
Url = require 'url'
Request = require 'request'

Express = require 'express'
Connect = require 'connect'

{Environment} = require './build.coffee'
Utils = require './utils.coffee'

errorTemplate = require '../lib/errorTemplate.js'


MimeTypes =
    'css': 'text/css; charset=utf8'
    'html': 'text/html; charset=utf8'
    'xml': 'application/xml; charset=utf8'
    'xhtml': 'application/xhtml+xml; charset=utf8'
    'js': 'application/javascript; charset=utf8'
    'json': 'application/json; charset=utf8'
    'jpeg': 'image/jpeg'
    'jpg': 'image/jpeg'
    'png': 'image/png'
    'gif': 'image/gif'
    'svg': 'image/svg+xml'


exports.Plugins = Plugins = []

exports.registerPlugin = registerPlugin = (PluginClass) ->
    Plugins.push(PluginClass)

class PreviewHandler
    constructor: (env) ->
        for Plugin in Plugins
            plugin = new Plugin()
            plugin.bindPreview @

        @env = env

    get: (request, response) =>
        request.on "end", =>
            url = Url.parse request.url
            path = url.pathname.slice 1

            ext = Utils.getExt path
            type = MimeTypes[ext] or 'application/octect-stream'
            @env.get path, (err, data) =>
                status = 200
                content_type = type
                response_data = data
                if err?
                    # response.setHeader 'X-Error', '1'
                    if path == 'mobify.js'
                        response_data = errorTemplate(err)
                    else
                        status = 404

                response.writeHead status,
                        'Content-Type': type
                if response_data?
                    response.write response_data
                response.end()
        request.resume()

    # Write a file to disk from the request body or from a location indicated by
    # the location header.
    save: (request, response) =>
        buf = ''

        request.on "data", (chunk) ->
            buf += chunk

        request.on "end", =>
            url = Url.parse request.url
            path = url.pathname.slice 1
            headers = {"Content-Type": "text/plain"}

            process_body = (body) =>
                try
                    local_path = @env.getPathInProject path
                catch err
                    response.writeHead 400, headers
                    response.end "Path falls outside project root: #{path}"
                    return

                FS.writeFile local_path, body, (err, data) ->
                    if err
                        response.writeHead 400, headers
                        response.end "Could not write #{local_path}"
                        return

                    response.writeHead 200, headers
                    response.end "OKAY."

            if request.headers["location"]
                location = request.headers["location"]

                Request {
                    uri: location
                    encoding: null
                }, (err, response, body) ->
                    if err
                        response.writeHead 400, headers
                        response.end "Could not load #{location}"
                        return

                    process_body body
            else
                process_body buf.toString()


exports.PreviewHandler = PreviewHandler
exports.PreviewMiddleware = PreviewMiddleware = (request, response, next) ->
    response.setHeader "Cache-Control", "no-cache, no-store, must-revalidate"
    response.setHeader "Expires", "0"
    response.setHeader "Pragma", "no-cache"
    response.setHeader "Server", Utils.getUserAgent()
    response.setHeader "Access-Control-Allow-Origin", "*"
    response.setHeader "Access-Control-Expose-Headers", "Server"

    next()

exports.createServer = createServer = (env, opts) ->
    handler = new PreviewHandler env

    if opts
        app = Express.createServer(opts, Connect.middleware.logger('tiny'), PreviewMiddleware)
    else
        app = Express.createServer(Connect.middleware.logger('tiny'), PreviewMiddleware)

    app.get '/', (request, response) ->
        path = Path.join __dirname, 'index.html'
        body = FS.readFile path, (err, data) ->
            if request.method == 'HEAD'
                response.end()
            response.end data

    app.get '*', handler.get

    app.put '*', handler.save

    app.options '*', (request, response) ->
        request.on "end", () ->
            response.writeHead 200,
                "Access-Control-Allow-Origin": "*"
                "Access-Control-Allow-Methods": "GET, PUT, OPTIONS"
                "Access-Control-Allow-Headers": "Origin, Accept, X-Requested-With, Content-Type, Location"
            response.end("GET, PUT, OPTIONS")

    app
