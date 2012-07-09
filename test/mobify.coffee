###
Tests for src/mobify.coffee, testing command line entry points
###
FS = require 'fs'
Path = require 'path'
Assert = require 'assert'

Request = require 'request'

Mobify = require '../src/mobify.coffee'
Utils = require '../src/utils.coffee'



module.exports =
    'test-build': (done) ->
        cwd = process.cwd()
        project_path = Path.join cwd, 'test/fixtures/test-project'
        process.chdir project_path

        Mobify.build {}, () ->
            bld_path = Path.join project_path, 'bld'
            FS.lstat bld_path, (err, stats) ->
                Assert !err && stats.isDirectory()
                process.chdir cwd
                Utils.rmDir bld_path
                done()
    
    'test-init': (done) ->
        Mobify.init 'test-project', {}, () ->
            project_path = Path.join process.cwd(), 'test-project'
            FS.lstat project_path, (err, stats) ->
                Assert !err && stats.isDirectory()
                Utils.rmDir project_path
                done()
            
    'test-preview': (done) ->
        cwd = process.cwd()
        project_path = Path.join cwd, 'test/fixtures/test-project'
        process.chdir project_path
        port = 8080
        Mobify.preview {'address': '0.0.0.0', 'port': port }

        postPreview = () ->
            Request "http://127.0.0.1:#{port}/mobify.js", (err, response) ->
                # Assert not response.headers['X-Error'], 'Should not be an error.'
                Assert !err and response.statusCode == 200 and not /Mobify\.js\sError/.test(response.body)
                done()

        setTimeout postPreview, 2000

    'test-login': (done) ->
        Mobify.login {'auth': 'test@mobify.com:12341234'}, () ->
            FS.lstat Utils.getGlobalSettingsPath(), (err, stats) ->
                Assert !err && stats.isFile()
                done()


            
