var _ = require('./underscore')
  , dust = require('./dust/duster')
  , Fetcher = require('./fetcher')

// Uses the `cauldron` strategy to compile file resolved from `path`, calling 
// `cb(err, compiled)`. Optionally, `site.json` populates the dustjs context.
//
// `opts`
//  : bootstrap: activate a special handler
//  : bases: pass in additional bases.
module.exports = function cauldron(path, cb, opts) {
    var bases = [process.cwd()]
    if (opts.base) {
        bases = bases.concat(opts.base);
    }

    // TODO: Initialize the fetcher w/ the `base` directory.
    var fetcher = new Fetcher(bases)
      , json = path.replace(/[^\/]*$/, 'site.json')
      , konf = path.replace(/js$/, 'konf')

    fetcher.get(json, function(err, data) {
        opts.context = {
            project_name: opts.project_name,
            site_config: data || '{}',
            build_dt: Date.now(),            
            fetcher: fetcher
        };

        fetcher.get(konf, function(err, data, resolved) {
            if (err) {
                // Konf file missing.
                // When using the `mobify` command locally, site folder
                // requests should go through the `src` folder.
                // - Are you running mobify.js from your site folder?
                // - Check that path is localhost:8080/src/
                // - Check that <file>.konf exists.
                err.url = resolved;
                err.message = '"' + path + '" resolved to "' + resolved + '"'
                            + ' which could not be retrieved.'
                return cb(err);
            }

            compileDustyJs(resolved, data, cb, opts);
        });
    });
}

// TODO: Is it possible to reduce this to a single context?
// kaffeine - handler for {#kaffeine} content {/kaffeine}
// bootstrap - 
// context - {site_conifg, build_dt, fetcher}
//
// Compile file at path `u` with contents `data`, calling `cb(err, compiled)`.
// opts: bootstrap
function compileDustyJs(u, data, cb, opts) {

    var ctx = _.extend({
            kaffeine: function(chunk, context, bodies) {
                // Pass this reference for error handling.
                var u = context.global.compiling;

                return chunk.capture(bodies.block, context, function(data, chunk) {
                    return dust.kaffeine(data, chunk, u);
                });
            },
            lib_export: function(chunk, context, bodies, params) {
                return chunk.capture(bodies.block, context, function(data, chunk) {
                    return dust.ark(data, chunk, params);
                });
            }
        }, opts);
    
    // Track the file being compiled in the global context.
    var globalContext = opts.context;
    globalContext.compiling = u;

    var dustContext = dust.makeBase(globalContext).push(ctx)
      , source = dust.pragmify(data, {whitespace: true, seturl: u, setbase: u})
      , compiled;

    // Template is compiled and registered under its path name, `u`.
    try {
        compiled = dust.compile(source, u);
    } catch(err) {
        // Error compiling konf file.
        // - Do you have error in your dust syntax? The line/column provided
        //   by dust isn't very helpful.
        err.url = u;
        err.message = 'Dust failed compiling "' + u + '":\n' + err.message;
        return cb(err);
    }
    // Partials are compiled during rendering, passing compilation errors to `cb`.
    dust.loadSource(compiled);
    dust.render(u, dustContext, cb);
}