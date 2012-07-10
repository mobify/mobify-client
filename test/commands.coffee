###
Tests for src/mobify.coffee, testing command line entry points
###
FS = require 'fs'
Path = require 'path'
Assert = require 'assert'
Request = require 'request'
Wrench = require 'wrench'

Commands = require '../src/commands.coffee'
Utils = require '../src/utils.coffee'



module.exports =
    'test-build': (done) ->
        cwd = process.cwd()
        project_path = Path.join cwd, 'test/fixtures/test-project'
        process.chdir project_path

        Commands.build {}, () ->
            bld_path = Path.join project_path, 'bld'
            FS.lstat bld_path, (err, stats) ->
                process.chdir cwd
                Assert !err && stats.isDirectory()
                Wrench.rmdirSyncRecursive bld_path
                done()
    
    'test-init': (done) ->
        Commands.init 'test-project', {}, () ->
            project_path = Path.join process.cwd(), 'test-project'
            FS.lstat project_path, (err, stats) ->
                Assert !err && stats.isDirectory()
                Wrench.rmdirSyncRecursive project_path
                done()
            
    'test-preview': (done) ->
        cwd = process.cwd()
        project_path = Path.join cwd, 'test/fixtures/test-project'
        process.chdir project_path
        port = 8080
        Commands.preview {'address': '0.0.0.0', 'port': port }

        postPreview = () ->
            Request "http://127.0.0.1:#{port}/mobify.js", (err, response) ->
                process.chdir cwd
                Assert !err and response.statusCode == 200 and not /Mobify\.js\sError/.test(response.body)
                done()

        setTimeout postPreview, 2000

    'test-login': (done) ->
        Commands.login {'auth': 'test@mobify.com:12341234'}, () ->
            FS.lstat Utils.getGlobalSettingsPath(), (err, stats) ->
                Assert !err && stats.isFile()
                done()


            
