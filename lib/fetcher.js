var FS = require('fs')
  , Path = require('path');


// Fetcher retrieves files by resolving them relative to `bases`.
var Fetcher = module.exports = function(bases) {
        this.bases = bases || [process.cwd()];
    };

Fetcher.prototype = {
    /**
     * Within the context of the .konf file, paths that start with /base/
     * refer to mobify.js files... and should be resolved relative to the
     * base folder...
     *
     * All other paths should be resolved as they come.
     *
     */
    resolve: function(path, base) {
        if (path.indexOf('/base') == 0) path = path.slice(1);

        if (base) {
            return Path.resolve(base, path);
        } else {
            return Path.resolve(path);
        }
    },

    // Call `callback(err, data, resolved)` by resolving path `u` from bases.
    // `path` must be relative.
    get: function(path, callback, base) {
        var self = this
          , bases = this.bases.slice()
          , tried = [];

        if (base) {
            bases.unshift(base);
        }

        (function next() {
            var base = bases.shift();

            if (!base) {
                return callback(new Error('fetcher.get: ' + tried));
            }
            
            var resolved = self.resolve(path, base);

            FS.readFile(resolved, 'utf8', function(err, data) {
                if (err) {
                    tried.push(resolved);
                    return next();
                }
                return callback(err, data, resolved);
            });
        })();
    }
};
