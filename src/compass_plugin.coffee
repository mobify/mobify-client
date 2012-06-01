ChildProcess = require 'child_process'
Preview = require './preview.coffee'
Build = require './build.coffee'


class CompassPlugin
    bindPreview: (preview_server) ->
            console.log "Binding Compass Preview"

            child = ChildProcess.spawn 'compass', ['watch']
            
            child.stderr.on 'data', (data) ->
                console.log "Compass: #{data}"

            # Compass doesn't seem to print to stdout.
            child.stdout.on 'data', (data) ->
                console.log "Compass: #{data}"

            process.on 'exit', () ->
                child.kill()

    bindBuild: (build) ->
        console.log "Binding Compass Build"

        build.addHook 'prebuild', (callback) ->
            console.log 'Compass Compile'

            ChildProcess.exec 'compass compile -e production', (err, stdout, stderr) ->
                if err?
                    callback err
                    return

                console.log stdout
                console.log stderr
                console.log "Compass Compile Complete."

                callback()

Preview.registerPlugin CompassPlugin
Build.registerPlugin CompassPlugin
