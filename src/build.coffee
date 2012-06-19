###
Mobify Build System
###

FS = require 'fs'
Path = require 'path'
Util = require 'util'
Events = require 'events'
Zlib = require 'zlib'

FStream = require 'fstream'
Tar = require 'tar'
Async = require 'async'
CleanCSS = require 'clean-css'

Utils = require './utils.coffee'

compile = require '../lib/compile.js'


###
Environment Class

The `Environment` is a class which can be used to compile files based on
their path in the source directory, or what their output path is after
being compiled.

Implements Events:
    - compile: (path)
    - fetch: (path)
    - get: (path)

@param {String} source_path
###


exports.Plugins = Plugins = []
exports.registerPlugin = registerPlugin = (PluginClass) ->
    Plugins.push(PluginClass)

class Environment extends Events.EventEmitter
    @handlers = {}
    @reverse_handlers = {}
    @post_processors = {}


    ###
    Registers a handler class for all Environment instances.

    @param {String} ext
    @param {String} out_ext
    @param {Class} handlerClass
    ###
    @registerHandler = (ext, out_ext, handler) ->
        # Setup Forward Handler
        if ext of @handlers
            throw new TypeError("Only one handler can be registered for an extension.")
        
        @handlers[ext] = [out_ext, handler]

        # Setup Reverse Mapping
        @reverse_handlers[out_ext] ||= []
        @reverse_handlers[out_ext].push ext

    ###
    Registers a handler function for all Environment instances.

    @param {String} ext
    @param {Fucntion} handler
    ###

    @registerPostProcessor = (ext, handler) ->
        handlers = @post_processors[ext] || []
        handlers.push handler
        @post_processors[ext] = handlers

    constructor: (paths, base_path, production=false) ->
        if paths instanceof Array
            @paths = paths
        else
            @paths = [paths]
        @base_path = base_path
        @production = production

    ###
    Class Property Accessors
    ###
    defaultHandler: (path, callback) ->
        FS.readFile path, callback

    getHandler: (ext, out_ext) ->
        if ext of Environment.handlers
            if Environment.handlers[ext][0] == out_ext
                return Environment.handlers[ext][1]
            else
                return @defaultHandler
        else
            # Default Handler
            return @defaultHandler

    getReverseHandlers: (ext) ->
        Environment.reverse_handlers[ext] or []

    getHandlerExt: (ext) ->
        if ext of Environment.handlers
            return Environment.handlers[ext][0]
        else
            # No handler, no extension change.
            return ext

    getPostProcessor: (ext) ->
        handlers = Environment.post_processors[ext] || []
        return Utils.composeFunctions(handlers...)


    ###
    Gives output path given source path.

    @param {String} path
    ### 
    resolvePath: (path) ->
        ext = Utils.getExt path
        return Utils.changeExt path, @getHandlerExt(ext)

    ###
    Lists possible source path given an output path.
    
    @param {String} path    
    ###
    resolveReversePath: (path) ->
        possible = [path]
        ext = Utils.getExt path

        for rev in @getReverseHandlers ext
            possible.push(Utils.changeExt path, rev)
        
        return possible


    ###
    Gives a full path given a source path. `path` must be inside `@paths`.

    Returns the fist match in @paths that exists.

    @param {String} path
    @param {Function} callback
    ### 
    resolve: (path, callback) ->
        exists = (root, callback) ->
            joined = Path.join(root, path)
            if 0 != joined.indexOf root
                callback false
            else
                Utils.fileExists joined, callback

        Async.detectSeries @paths, exists, (result) ->
            if result
                callback null, Path.join(result, path)
            else
                callback new Error("No possible source file for '#{path}'")

        null

    getPathInProject: (path) ->
        root = @paths[0]

        joined = Path.join(root, path)
        if 0 != joined.indexOf root
            throw new Error("Path leads outside project root.")
        else
            joined
    
    ###
    Gives a full path given a output path.

    Ensures there is at most one possible way to resolve the path.
    
    @param {String} path    
    ###
    resolveReverse: (path, callback) ->
        # Calculate possible routes.
        paths = @resolveReversePath path

        exists = (path, callback) =>
            @resolve path, (err, full_path) ->
                if err
                    callback false
                else
                    callback true
    
        filter_cb = (results) =>
            if results.length is 0
                callback new Error("No possible source file for '#{path}'.")
            else if results.length is 1
                callback null, results[0]
            else
                callback new Error("More than one possible source file for '#{path}'.")
        
        Async.filter paths, exists, filter_cb


    ###
    Compiles a file given a source path.

    Emits 'compile'

    @param {String} path
    @param {Function} callback
    ###

    compile: (path, output_path, callback) ->
        @emit "compile", path
        filename = Path.basename path
        extension = Utils.getExt filename

        output_extension = Utils.getExt output_path
        
        handler = @getHandler extension, output_extension
        post_processor = @getPostProcessor output_extension


        @resolve path, (err, full_path) =>
            if err
                callback err
                return
            handler.call @, full_path, (err, data) =>
                if err
                    callback err
                    return
                post_processor.call @, data, callback
    ###
    Gives a file, given an source path

    Emits 'fetch'

    @param {String} path
    @param {Function} callback
    ###

    fetch: (path, callback) ->
        @emit "fetch", path
        
        handler = @getDefaultHandler

        @resolve path, (err, full_path) ->
            if err
                callback err
                return
            handler full_path, callback
                    
    ###
    Compiles a file given an output path.

    Emits 'get'

    @param {String} path
    @param {Function} callback
    ###
    get: (path, callback) ->
        @emit 'get', path
        
        @resolveReverse path, (err, source_path) =>
            if err
                callback err
                return
            @compile source_path, path, callback


    ###
    Lists the files in a directory, recursively.

    @param {String} path
    ###
    list: (path, filter..., callback) ->
        filter = filter[0] || (path) -> true

        iterator = (item_path, callback) ->
            full_path = Path.join item_path, path
            Utils.listFiles full_path, filter, callback

        clean = (err, paths) ->
            # Removes duplicate paths.
            if err
                callback err
                return

            temp = {}
            distinct = []
            for path in paths
                temp[path] = path
            for path of temp
                distinct.push(path)
            callback null, distinct


        Async.concat(@paths, iterator, clean)
        

KonfHandler = (path, callback) ->
    # bootstrap for old api, clientTransform for newest changes, both here for backwards compatibility
    compile path, callback, {bootstrap: true, clientTransform: true, base: @base_path, production: @production, minify: @minify}



JSMinifyPostProcessor = (data, callback) ->
    if @minify
        code = Utils.compressJs(data.toString())
        callback null, code
    else
        callback null, data

CSSMinifyPostProcess = (data, callback) ->
    if @minify
        minified = CleanCSS.process data.toString()
        callback null, minified
    else
        callback null, data


Environment.registerHandler "konf", "js", KonfHandler
Environment.registerPostProcessor "js", JSMinifyPostProcessor
Environment.registerPostProcessor "css", CSSMinifyPostProcess

###
Builder

Builds files in an Environment

Events
    - start ()
    - file (err, path, data)
    - error (err)
    - end ()

###

class Builder extends Events.EventEmitter  
    constructor: (env) ->
        @env = env
        
        @excluded_paths = []
        @excluded_patterns = []

        @hooks = {}

        for Plugin in Plugins
            plugin = new Plugin()
            plugin.bindBuild(@)


    fireHooks: (step, callback) ->
        steps = @hooks[step] or []
        Async.series(steps, callback)

    addHook: (step, hook) ->
        if step of @hooks
            @hooks[step].push hook
        else
            @hooks[step] = [hook]


    ###
    Iterates through all the files in an `Environment`.

    Fires Events:
        - start ()
        - file (err, path, file)
            - On each file
        - end ()
    
    Fire Hooks:
        - prebuild
    ###
    start: () ->
        @emit "start"
        @fireHooks 'prebuild', (err) =>
            if err?
                @emit "error", err
                return

            build_path = (path, callback) =>
                target_path = @env.resolvePath path

                @env.compile path, target_path, (err, data) =>
                    if err?
                        @emit "file", err, target_path, data

                    @emit "file", null, target_path, data
                    callback()
            
            walk_cb = (err, paths) =>
                if err?
                    @emit err
                    return
                Async.forEach paths, build_path, () =>
                    @emit "end"                

            filter = (path) =>
                not @isExcluded path

            @env.list '/', filter, walk_cb

    ###

    ###
    buildToDirectory: (build_path, callback) ->
        errors = []
        @on "file", (err, path, data) ->
            if err?
                errors.push err
                console.log "Problem building '#{path}':\n#{err}"
                return            

            target_path = Path.join build_path, path
            console.log "Built: #{target_path}."

            Utils.makeDirectorySync Path.dirname(target_path)
            FS.writeFile target_path, data, (err) ->
                if err?
                    errors.push err
                    console.log "Problem writing '#{target_path}':\n#{err}"
        
        @on "error", (err) ->
            console.log "Problem with build:\n#{err}"
            errors.push err

        @on "start", () ->
            console.log "Starting Build in #{build_path}"

        @on "end", () ->
            if errors.length > 0
                console.log "There were some errors in the build process."
            else
                console.log "Build Complete."
            callback(errors)
        
        @start()
                              

    ###
    Excludes files from being built based on a pattern matching
    the filename.

    @param {RegExp|String} pattern
    ###
    exclude: (patterns...) -> 
        for pattern in patterns
            if pattern instanceof RegExp
                @excluded_patterns.push pattern

            else if typeof pattern is 'string'
                ###
                A few types:
                    - 'foo.ext'
                    - '*foo.*'
                ###
                globbed_pattern = pattern.replace /[-[\]{}()+?.,\\^$|#\s]/g, "\\$&"
                globbed_pattern = globbed_pattern.replace /([*])/g, ".*"

                re = RegExp "^#{globbed_pattern}$"
                @excluded_patterns.push re
            else
                throw "Unknown type of pattern."
        return @
    
    ###
    Excludes a file or folder from being built.

    @param {String} path
    ###
    excludePath: (paths...) ->
        for path in paths
            @excluded_paths.push path
        return @

    ###
    Checks if a file is excluded.

    @param {String} path
    ###
    isExcluded: (path) ->
        filename = Path.basename(path)
        for pattern in @excluded_patterns
            if filename.match pattern
                return true        
        for ex_path in @excluded_paths
            if path.indexOf(ex_path) is 0
                return true
        return false
              
        

exports.Environment = Environment
exports.Builder = Builder

exports.createEnvironment = (source_path, base_path) ->
    return new Environment(source_path, base_path)

exports.createBuilder = (env) ->
    return new Builder(env)

exports.archive = (path) ->
    files = FStream.Reader(path: path, type: "Directory")
    tar = Tar.Pack()
    gz = Zlib.createGzip()
    
    tar.pipe(gz)
    files.pipe(tar)

    return gz
