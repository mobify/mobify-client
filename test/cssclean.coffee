###
Tests for src/utils.coffee
###
Assert = require 'assert'
Path = require 'path'
Async = require 'async'
FS = require 'fs'

{CSSMinifyPostProcess} = require '../src/build.coffee'

cssFixturesFolder = Path.join __dirname, "fixtures-css"
cssFixturePath = Path.join cssFixturesFolder, "imports.css"

cssFixture = (FS.readFileSync cssFixturePath).toString()

module.exports = 
    "test_css_no_inline": (done) ->
        env = 
            production: true

        CSSMinifyPostProcess.call env, cssFixture, cssFixturePath, (err, out) ->
            Assert.ok err == null

            console.dir(out)

            expected = """html{background:#000};@import url(http://example.com/foo.css);@import url(./imported.css);body{background:#00f};"""
            Assert.equal out.toString(), expected

            done()

    "test_css_inline": (done) ->
        env = 
            production: true
            inline_imports: true

        CSSMinifyPostProcess.call env, cssFixture, cssFixturePath, (err, out) ->
            Assert.ok err == null

            console.dir(out)

            expected = """html{background:#000};@import url(http://example.com/foo.css);p{color:#fff}body{background:#00f};"""
            Assert.equal out.toString(), expected

            done()

