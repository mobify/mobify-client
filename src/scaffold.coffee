###
Scaffold Generator
###
Path = require 'path'

{Project} = require './project'
Utils = require './utils'


scaffoldPath = Path.join __dirname, "..", "vendor", "scaffold"

exports.generate = (name, directory=scaffoldPath, callback) ->
    console.log "Generating Project: #{name}"

    logger = (source, destination, directory) ->
        console.log "Generating: #{destination}"


    Utils.copy directory, name, logger, (err) ->
        if err
            console.log "There was an error generating the scaffold."
            return

        project_json = Path.join name, "project.json"
        
        console.log "Generating: #{project_json}"
        
        project = new Project(name)
        project.save(project_json)

        console.log "Done."

        if callback
            callback()