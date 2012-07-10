###
Collection of utility functions.
###
Async = require 'async'
Path = require 'path'
FS = require 'fs'
FStream = require 'fstream'
Zlib = require 'zlib'
Tar = require 'tar'
Uglify = require 'uglify-js'


###
Composes a series of async functions, so they are called in sequence.
Each functions must accept an equal number of arugments, of which the last
is a callback of the form (err, n-1 args).

'this' is preserved throughout.

@param {Function} functions...
###
composeFunctions = exports.composeFunctions = (functions...) ->
    if functions.length == 0
        return (args..., callback) ->
            callback null, args...
    else
        [head..., tail] = functions
        head ||= []
        head_composed = composeFunctions(head...)

        return (args..., callback) ->
            head_composed.call @, args..., (err, out_args...) =>
                if err
                    callback err
                    return
                tail.call @, out_args..., callback

###
Walks a tree, producing an array of files.

@param {String} path
@param {Function} filter
@param {Function} callback
###

walkTree = (path, filter, callback) ->
    filter ||= () -> true

    handle_file = (path, callback) =>
        FS.stat path, (err, stats) =>
            if err?
                callback err
                return                       
            if stats.isDirectory()
                # If it's a directory, we recurse.
                directory_cb = (err, paths) ->
                    if err?
                        callback err
                        return
                    callback null, paths
                walkTree path, filter, directory_cb
            else if stats.isFile()
                callback null, [path]

    # Read files in directory.
    FS.readdir path, (err, files) ->
        if err?
            callback err
        if not files? 
            callback null, []
        full_path_files = []
        for file in files
            if filter file
                full_path = Path.join path, file
                full_path_files.push full_path
        Async.concat(full_path_files, handle_file, callback)

###
Walks a tree, producing an array of files, relative to the given path.

@param {String} path
@param {Function} filter
@param {Function} callback
###
exports.listFiles = listFiles = (path, filter..., callback) ->
    filter = filter[0]
    walkTree path, filter, (err, paths) ->
        if err?
            callback err
            return
        relative_paths = paths.map Async.apply(Path.relative, path)
        callback null, relative_paths

###
Splits a path in to its component parts

@param {String} path
###
exports.splitPath = splitPath = (path) ->
    basename = Path.basename path
    dirname = Path.dirname path
    if dirname.match /^(\/|\w\:\\)$/
        paths = [path]
    else if dirname.match /^[.]$/
        paths = []
        paths.push(basename)
    else
        paths = splitPath(dirname) 
        paths.push(basename)
    return paths    
        

###
Makes a directory recursively.

@param {String} path
@param {Function} callback
###
exports.makeDirectorySync = makeDirectorySync = (path) ->
    parts = splitPath path
    full_path = ''
    for part in parts
        full_path = Path.join full_path, part
        try
            stat = FS.statSync full_path
        catch error
            FS.mkdirSync full_path, 16877



###
Copies a file or folder from source to destination

@param {String} source
@param {String} destination
###

exports.copy = copy = (source, destination, file_callback..., callback) ->
    file_callback = file_callback[0] || () ->
    FS.stat source, (err, stat) ->
        if stat.isFile()
            file_callback source, destination, false

            FS.readFile source, (err, data) ->
                if err
                    callback err
                    return
                FS.writeFile destination, data, callback

        else if stat.isDirectory()
            file_callback source, destination, true
            makeDirectorySync destination
            FS.readdir source, (err, files) ->
                to_copy = []
                for file in files
                    source_path = Path.join source, file
                    destination_path = Path.join destination, file
                    to_copy.push Async.apply(copy, source_path, destination_path, file_callback)
                Async.parallel(to_copy, callback)

###
Changes extension of `path` to `ext`

@param {String} path
@param {String} ext
###

exports.changeExt = changeExt = (path, ext) ->
    if getExt(path) != ''
        path.replace /[.](\w+)$/, ".#{ext}"
    else
        "#{path}.#{ext}"
###
Returns the extension of a filename

@param {String} filename
###
exports.getExt = getExt = (filename) ->
    parts = filename.match /[.](\w+)$/
    if parts
        return parts[1]
    else
        return ''


###
Checks if a file exists

@param {String} path
@param {Function} callback
###
exports.fileExists = fileExists = (path, callback) ->
    FS.stat path, (err, stats) =>
        if err?
            callback false
            return                       
        if stats.isFile()
            callback true
        else
            callback false

exports.fileExistsSync = fileExistsSync = (path) ->
    try
        stat = FS.statSync path
        stat.isFile()
    catch err
        false

###
Checks if a path exists

@param {String} path
@param {Function} callback
###
exports.pathExists = pathExists = (path, callback) ->
    FS.stat path, (err, stats) =>
        if err?
            callback false                
        else
            callback true

exports.pathExistsSync = pathExistsSync = (path) ->
    try
        FS.statSync path
        true
    catch err
        false

###
Reads a stream in to a buffer

@param {ReadableStream} stream
@param {Function} callback
###

exports.streamToBuffer = (stream, callback) ->
    buffer_size = 16*1024
    content_length = 0

    buffer = new Buffer(buffer_size)

    increase_buffer = (atleast) ->
        target_size = content_length + atleast
        while (buffer_size < target_size)
            buffer_size = 2*buffer_size
        new_buffer = new Buffer(buffer_size)
        buffer.copy new_buffer
        buffer = new_buffer

    stream.on "data", (data) ->
        buffer_remaining = buffer_size - content_length
        # If it's a string
        if typeof data == 'string'
            length = Buffer.byteLength data.length
            if length > buffer_remaining
                increase_buffer length
            buffer.write data, content_length
            content_length = content_length + length

        # If it's a buffer
        else if Buffer.isBuffer(data)
            length = data.length
            if length > buffer_remaining
                increase_buffer length
            data.copy buffer, content_length
            content_length = content_length + length

        else
            callback new Error("Data event was not 'string' or 'Buffer' object.")

    stream.on "end", () ->
        final_buffer = buffer.slice(0, content_length)
        callback null, final_buffer

###
Returns a .tgz stream from a folder.

@param {String} path
###
exports.archive = (path) ->
    files = FStream.Reader {
        path: path,
        type: "Directory",
        filter: () ->
            return !/^[.]/.test @basename
    }
    tar = Tar.Pack()
    gz = Zlib.createGzip()
    
    tar.pipe(gz)
    files.pipe(tar)

    return gz

###
Returns the settings file for the tools.

###

exports.getGlobalSettingsPath = getGlobalSettingsPath = () ->
    if process.platform == 'win32'
        home = process.env['USERPROFILE']
    else
        home = process.env['HOME']

    Path.join home, ".mobify"

###
Returns an object literal parsed from the settings file.

@param {Function} callback
###
exports.getGlobalSettings = getMobifySettings = (callback) ->
    path = getGlobalSettingsPath()
    Path.exists path, (exists) ->
        if exists
            FS.readFile path, (err, data) ->
                if err
                    callback err
                    return

                try
                    decoded = JSON.parse data
                    callback null, decoded
                catch error
                    callback new Error("Error parsing '#{path}'.")
        else
            callback null, {}


exports.setGlobalSettings = setGlobalSettings = (data, callback) ->
    path = getGlobalSettingsPath()
    data = JSON.stringify data, null, 4
    Path.exists path, (exists) ->
        if not exists
            directory = Path.dirname 'path'
            makeDirectorySync directory
        FS.writeFile path, data, callback

        
###
Returns the version as stored in package.json.

###
version = null
exports.getVersion = getVersion = () ->
    if version
        return version

    path = scaffoldPath = Path.join __dirname, "..", "package.json"
    package_json = FS.readFileSync(path, encoding='utf8')
    package_obj = JSON.parse(package_json)
    version = package_obj.version

###
Returns the User-Agent/Server of the tools

###
exports.getUserAgent = getUserAgent = () ->
    "mobify-client v#{getVersion()};"


###
Returns the compressed vesrion of the JavaScript string `js`.

###
exports.compressJs = compressJs = (js) ->
    ast = Uglify.parser.parse js
    ast = Uglify.uglify.ast_mangle ast
    ast = Uglify.uglify.ast_squeeze ast
    Uglify.uglify.gen_code ast
