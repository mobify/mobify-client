var requirejs = require('requirejs'),
    fs = require('fs'),
    compressJs = require('./utils').compressJs,
    minifyFn = function(text) {
        try {
            text = compressJs(text.replace(/^\s*<!(?:\[CDATA\[|\-\-)/, "/*$0*/"));
            result = ['', text];
        } catch(e) {
            console.log(e);
            result = ['Minification failed: ' + e, text];
        }
        return result;
    };

module.exports = function compose(confPath, composedCallback, opts) {
    var confDir = confPath.split('/')
      , confFile = confDir.pop();

    confDir = confDir.join('/');
    var jsonPath = confDir + 'site.json';

    fs.readFile(jsonPath, 'utf8', function(err, jsonBody) {
        opts.context = {
            site_config: jsonBody || '{}',
            build_dt: Date.now(),            
            production: opts.production
        };

        var baseDir = opts.base + '/base';
        
        var requireConfig = {
            baseUrl: confDir,
            name: "build/almond",
            include: [ confFile ],
            wrap: {
                start: ';',
                end: ';require("' + confFile + '");'
            },
            out: "mobify-built.js",
            config: {
                rdust: {
                    minify: opts.minify ? minifyFn : function(x) { return ['', x] }
                },
                cond: {
                    dev: !opts.production
                },
                dev: {
                    development: !opts.production
                }
            },
            paths: {
                "mobifyjs": baseDir + "/api",
                "vendor" : baseDir + "/vendor",
                "build" : baseDir + "/build",
                "rdust" : baseDir + "/build/rdust",
                "cond" : baseDir + "/build/cond",
                "dev" : baseDir + "/build/dev",
                "dust" : baseDir + "/vendor/dust-core"
            },
            stubModules: ["rdust", "cond"]          
        };

        if (!opts.minify) requireConfig.optimize = "none";
        try {
            requirejs.optimize(requireConfig, function (buildResponse) {
                //buildResponse is just a text output of the modules
                //included. Load the built file for the contents.
                //Use config.out to get the optimized file contents.
                var contents = fs.readFileSync(requireConfig.out, 'utf8');
                composedCallback('', contents);
            });
        } catch (err) {
            console.log(err);
            composedCallback(err);
        }
    });
}
