Assert = require 'assert'

{Environment} = require '../src/build.coffee'

module.exports =
    'test-resolve': (done) ->
        source_directory = 'test/fixtures-build/src'
        env = new Environment(source_directory)
        env.resolve 'mobify.konf', (err) ->
            Assert.ok err == null
            done()

    'test-resolve-traversal': (done) ->
        source_directory = 'test/fixtures-build/src'
        env = new Environment(source_directory)
        env.resolve '../project.json', (err) ->
            Assert.ok err != null, 'Files outside `source_directory` must not be accessible.'
            done()