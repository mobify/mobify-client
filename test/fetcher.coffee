Path = require 'path'
Assert = require 'assert'
Fetcher = require '../lib/fetcher'


module.exports =
    'test-resolve': (done) ->
        fetcher = new Fetcher()
        Assert.equal (fetcher.resolve '/base\\tmpl\\base_root.tmpl'), (Path.resolve 'base\\tmpl\\base_root.tmpl')
        Assert.equal (fetcher.resolve '/base/tmpl/base_root.tmpl'), (Path.resolve 'base/tmpl/base_root.tmpl')
        Assert.equal (fetcher.resolve '/tmpl/base_root.tmpl'), (Path.resolve '/tmpl/base_root.tmpl')
        done()
