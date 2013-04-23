ChildProcess = require 'child_process'


COMPASS_PROC = if process.platform is 'win32'
    "compass.bat"
else
    "compass"

class CompassPlugin
    bindPreview: (preview_server) ->
            console.log "Binding Compass Preview"
            
            ChildProcess.exec "#{COMPASS_PROC} clean", (err, stdout, stderr) ->
                if err
                    console.log "Failed to clean SCSS files. Please manually clean files."

                console.log stdout
                console.log stderr 

                child = ChildProcess.spawn "#{COMPASS_PROC}", ['watch']
                
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
            
            ChildProcess.exec "#{COMPASS_PROC} clean", (err, stdout, stderr) ->
                if err
                    console.log "Failed to clean SCSS files. Please manually clean files."

                console.log stdout
                console.log stderr 

                ChildProcess.exec "#{COMPASS_PROC} compile -e production", (err, stdout, stderr) ->
                    if err
                        callback err
                        return

                    console.log stdout
                    console.log stderr
                    console.log "Compass Compile Complete."

                    callback()


exports.plugin = CompassPlugin
