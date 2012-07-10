
FS = require 'fs'
Path = require 'path'

{Environment, Builder} = require './build.coffee'
API = require './api'
Utils = require './utils'
Errors = require './errors'

###
{
    "name": "xxx",
    "api": "1.0",
    "source_directory": "src",
    "build_directory": "bld",
    "plugins":["compass_plugin"],
    "exclude": [
        "_*",
        "*.scss",
        ".*"
    ]
}


###


class Project
    @load = (filename='project.json') ->
        try
            data = FS.readFileSync(filename)
        catch err
            if err.code == 'ENOENT'
                throw new Errors.ProjectFileNotFound(null, filename)
            else
                throw err

        project_obj = JSON.parse(data)
        project = new Project()

        for prop of project_obj
            project[prop] = project_obj[prop]

        project.base_directory = Path.join __dirname, '../vendor/mobify-js/' + project.api
        project.source_directory = Path.join Path.dirname(filename), 'src'
        project

    constructor: (name) ->
        @name = name
        @api = "1.1"
        # @source_directory = 'src'
        @build_directory = 'bld'
        @plugins = []
        @exclude = [
            "*.tmpl"
        ]

    loadPlugins: () ->
        for plugin in @plugins
            require("./#{plugin}.coffee")

    getEnv: (production=false) ->
        @loadPlugins()
        new Environment(@source_directory, @base_directory, @name, production)

    build: (options, callback) ->
        ###
        Constructs and uploads a build.

        @param {Object} options - message, test, endpoint, user, password
        ###
        message = options.message || ''
        name = options.project || @name

        env = @getEnv(true)
        builder = new Builder(env)
        for rule in @exclude
            builder.exclude rule
        
        builder.buildToDirectory @build_directory, (errors) =>
            if errors.length > 0
                callback new Error("There were some errors during the build.")
                return

            if options.test
                callback null, @build_directory
                return

            tgz_stream = Utils.archive '.'
            API.upload options, name, tgz_stream, callback

    save: (path='project.json') ->
        output = JSON.stringify(@, null, 4)
        FS.writeFileSync(path, output)


exports.Project = Project
