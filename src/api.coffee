Request = require 'request'
Utils = require './utils'

API_ENDPOINT = 'https://cloud.mobify.com/api/'


exports.post = post = (options, path, data, callback) ->
    dataBuffer = new Buffer(data);
    opts =
        uri: (options.endpoint || API_ENDPOINT) + path
        method: 'POST'
        auth: "#{options.user}:#{options.password}"
        headers:
            'Content-Length': dataBuffer.length
            'User-Agent': Utils.getUserAgent()
        proxy: options.proxy || Utils.getProxy()
    
    request = Request opts, (err, response, body) ->
        if err
            callback err
            return

        status = response.statusCode
        if status >= 400
            if status == 401
                msg = "Request unauthorized. Check your credentials."
            else if status == 404
                msg = "Project not found. Check your project name in project.json."
            else
                msg = "Got a bad response: " + body
            
            callback new Error(msg)
            return

        
        callback null, response

    writeThrottled = (buffer, destination, increment=32*1024, sleep=100) ->
        if increment < buffer.length
            endpoint = increment
        else
            endpoint = buffer.length

        if endpoint == 0
            destination.end()
            return

        sliced_buffer = buffer.slice 0, endpoint
        destination.write sliced_buffer

        remaining_buffer = buffer.slice endpoint, buffer.length

        repeat = () ->
            writeThrottled remaining_buffer, destination, increment, sleep

        setTimeout repeat, sleep

    if process.platform == 'win32'
        writeThrottled dataBuffer, request
    else
        request.end dataBuffer
    

exports.upload = upload = (options, project, stream, callback) ->
     Utils.streamToBuffer stream, (err, buffer) ->
        if err
            callback err
            return

        data_encoded = buffer.toString('base64')

        build_obj = 
            message: options.message || ''
            encoding: "base64"
            data: data_encoded

        build_json = JSON.stringify build_obj, null, 4

        post options, "projects/#{project}/builds/", build_json, (err, response) ->
            if err
                callback err
                return

            if 'location' of response.headers
                if response.headers['content-type'] == 'application/json'
                    try
                        body = JSON.parse(response.body)
                    catch error
                        callback new Error("Error reading response.")
                else
                    body = {}
                callback null, response.headers['location'], body
            else
                callback new Error("Expected build_id location. Not found.")
