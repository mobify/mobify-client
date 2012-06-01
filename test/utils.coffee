###
Tests for src/utils.coffee
###
Assert = require 'assert'
Path = require 'path'
Async = require 'async'
FS = require 'fs'

Utils = require '../src/utils.coffee'

package = Path.join __dirname, '../'


module.exports = 
    'test_getExt': ->
        # Basic Case
        input = "foo.konf"
        actual = Utils.getExt input, "js"
        expected = "konf"

        Assert.equal actual, expected, "Extension incorrect."

        # Nested Case
        input = Path.join "bar", "foo.konf"
        actual = Utils.getExt input, "js"
        expected = "konf"

        Assert.equal actual, expected, "Extension incorrect."

        # Many dots case
        input = "foo..konf"
        actual = Utils.getExt input, "js"
        expected = "konf"

        Assert.equal actual, expected, "Extension incorrect."

        # No extension
        input = "foo"
        actual = Utils.getExt input, "js"
        expected = ""

        Assert.equal actual, expected, "Extension incorrect."

    'test_changeExt': ->
        # Basic Case
        input = "foo.konf"
        actual = Utils.changeExt input, "js"
        expected = "foo.js"

        Assert.equal actual, expected, "Extension incorrect."

        # Nested Case
        input = Path.join "bar", "foo.konf"
        actual = Utils.changeExt input, "js"
        expected = Path.join "bar", "foo.js"

        Assert.equal actual, expected, "Extension incorrect."

        # Many dots case
        input = "foo..konf"
        actual = Utils.changeExt input, "js"
        expected = "foo..js"

        Assert.equal actual, expected, "Extension incorrect."

        # No extension
        input = "foo"
        actual = Utils.changeExt input, "js"
        expected = "foo.js"

        Assert.equal actual, expected, "Extension incorrect."


    'test_splitPath': ->
        expected = ["foo", "bar"]
        input = Path.join.apply(Path.join, expected)
        actual = Utils.splitPath input
        Assert.deepEqual actual, expected, "Split incorrectly 1."

        expected = ["/foo", "bar"]
        input = Path.join.apply(Path.join, expected)
        actual = Utils.splitPath input
        Assert.deepEqual actual, expected, "Split incorrectly 2."

        expected = ["..", "foo", "bar"]
        input = Path.join.apply(Path.join, expected)
        actual = Utils.splitPath input
        Assert.deepEqual actual, expected, "Split incorrectly 3."

    'test_fileExists': (done) ->
        fixture = Path.join package, "test", "fixtures-cli", "exists.txt"
        fixture_2 = Path.join package, "test", "fixtures-cli", "doesnotexist.txt"

        Async.parallel [
            (callback) -> Utils.fileExists fixture, (exists) ->
                Assert.ok exists, "File '#{fixture}' should exist."
                callback()

            (callback) -> Utils.fileExists fixture_2, (exists) ->
                Assert.ok not exists, "File '#{fixture_2}' should not exist."
                callback()
            ], done

    'test_listFiles': (done) ->
        fixture = Path.join package, "test", "fixtures-cli"

        Async.parallel [
            # Basic Case
            (callback) -> Utils.listFiles fixture, (err, files) ->
                Assert.deepEqual files, [
                        'exists.txt'
                    ], "Unexpected files."
                callback()
            # Filter
            (callback) -> Utils.listFiles fixture, ((path) -> false), (err, files) ->
                Assert.deepEqual files, [], "Unexpected files."
                callback()
        ], done

    'test_streamToBuffer': (done) ->
        fixture = Path.join package, "test", "fixtures-cli", "exists.txt"
        input = FS.createReadStream fixture

        Utils.streamToBuffer input, (err, buffer) ->
            output = buffer.toString('utf8')
            Assert.equal output, "This file should exist."
            done()

    'test_compressJs': (done) ->
        input = '(function(){var big; return big})();'
        expected = '(function(){var a;return a})()'
        Assert.equal Utils.compressJs(input), expected
        done()