FS = require 'fs'
Http = require 'http'
Https = require 'https'
Path = require 'path'
Url = require 'url'
Zlib = require 'zlib'

{appSourceDir} = require '../lib/pathUtils'
insertTags = require '../lib/insertTags'

###
# Utils
###

copy = (object) ->
    copied = {}
    for key, value of object
        copied[key] = value
    copied

extend = (obj, mixin) ->
    for name, method of mixin
        obj[name] = method
    obj

include = (klass, mixin) ->
    extend klass.prototype, mixin



getTags = (opts, version) ->
    tags = {}
    path = Path.join appSourceDir, 'vendor', 'tags', version + '/'
    FS.readdirSync(path).forEach (filename) ->
        path = Path.join path, filename
        tags[Path.basename filename, '.html'] = FS.readFileSync(path).toString()
    tags

tag = (request, response, content, options) ->
    opts = copy options
    opts.tags = getTags opts, options.tag_version
    try
        response.end insertTags content, opts
    catch error
        console.log 'Unable to insert tags:' + request.url
        response.end content


# Detects if some content is likely an HTML document
isHTML = (content) ->
    if /<html/i.test content
        true
    else if /<head/i.test content
        true
    else if /<!doctype/i.test content
        true
    else
        false

###
# Servers
###

class TagMixin
    hook: (hook, args...) ->
        callable.call @, args... for callable in @hooks[hook] or []

    handler: (request, response) =>
        response.on 'finish', () =>
            @emit 'response', request, response

        headers = copy request.headers

        proxy_options =
            method: request.method
            host: @options.host or headers.host.split(':')[0]
            port: @options.port
            path: request.url
            headers: headers
            proxy_module: @options.proxy_module

        @hook 'before_request', proxy_options
        proxy_request = proxy_options.proxy_module.request proxy_options
        proxy_request
            .on 'response', (proxy_response) =>
                @proxy_handler request, response, proxy_request, proxy_response
            .on 'error', (error) =>
                response.writeHead 500
                response.end()

        request.pipe proxy_request

    proxy_handler: (request, response, proxy_request, proxy_response) ->
        proxy_response_headers = copy proxy_response.headers

        not_html = not /text\/html/i.test proxy_response_headers['content-type']
        is_ajax = proxy_response_headers['x-requested-with']
        is_jsonp = /callback=(jQuery|jsonp)/i.test request.url
        not_okay = proxy_response.statusCode isnt 200

        # DEFAULT 1
        if not_html or is_ajax or is_jsonp or not_okay
            response.writeHead proxy_response.statusCode, proxy_response_headers
            return proxy_response.pipe response

        proxy_response_content_encoding = proxy_response_headers['content-encoding']

        # We be changing stuff.        
        @hook 'before_response', proxy_response_headers

        response.writeHead proxy_response.statusCode, proxy_response_headers

        content = ''
        stream = proxy_response

        if /gzip/.test proxy_response_content_encoding
            stream = proxy_response.pipe Zlib.createGunzip()

        stream
            .on 'data', (chunk) =>
                content += chunk
            .on 'end', () =>
                if isHTML content
                    @hook 'response', request, response, content
                # DEFAULT 2
                else
                    response.end content

# JB: I haven't found a good way to `mixin` constructors using CS.
class HttpServer extends Http.Server
    include @, TagMixin::

    constructor: (options) ->
        Http.Server.call @

        @options = options || {}
        @hooks = {}

        @on 'request', (request, response) ->
            @handler request, response

class HttpsServer extends Https.Server
    include @, TagMixin::

    constructor: (options) ->
        opts = 
            key: options.key
            cert: options.cert
        Https.Server.call @, opts

        @options = options || {}
        @hooks = {}

        @on 'request', (request, response) ->
            @handler request, response


createServer = (options) ->
    opts =
        port: 80
        proxy_module: Http
        trustServer: '//preview.mobify.com/'
        siteFolderPath: 'http://localhost:8080/'
        tag_version: 5

    klass = options.server or HttpServer
    extend opts, options
    server = new klass opts
    
    # Alter the request to remove the host header which was set earlier
    # and delete caching headers to keep content fresh.
    server.hooks.before_request = [
        (proxy_options) ->
            delete proxy_options.headers.host
            delete proxy_options.headers['if-modified-since'];
            delete proxy_options.headers['if-none-match'];
    ]
     
    # Avoid strange behaviour talking with other servers.
    # We don't repack responses and we likely change the content-length, so
    # recalculate those.
    server.hooks.before_response = [
        (proxy_response_headers) ->
            proxy_response_headers.connection = 'close';
            delete proxy_response_headers['content-encoding'];
            delete proxy_response_headers['content-length'];
    ]
     
    # Tag content.
    server.hooks.response = [
        (request, response, content) ->
            tag request, response, content, @options
    ]
    
    # Custom event emitted after a request is fufilled.
    server.on 'request', (request, response) ->
        request.start = Date.now()
    
    server.on 'response', (request, response) ->
        time = Date.now() - request.start
        console.log "#{response.statusCode} #{request.method}: #{request.url} | #{time}ms"
        if response.exception?
            console.log "#{response.exception}"
    
    server

###
# Exports
###

module.exports = 
    createServer: createServer
    HttpServer: HttpServer
    HttpsServer: HttpsServer