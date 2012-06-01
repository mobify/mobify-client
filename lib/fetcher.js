var fs = require('fs')
  , Path = require('path');


// Fetcher retrieves files by resolving them relative to `bases`.
var Fetcher = module.exports = function(bases) {
    this.bases = bases || [process.cwd()];
};

Fetcher.prototype = {
    resolve: function(u, base) {
        if (u[0] == '/') u = u.slice(1);
        return Path.resolve(base, u);
    },

    // Call `cb(err, data, resolved)` by resolving path `u` from bases.
    get: function(u, cb, base) {
        var self = this
          , bases = this.bases.slice()
          , tried = [];

        if (base) {
            bases.unshift(base);
        }

        (function next() {
            var base = bases.shift()
              , resolved = self.resolve(u, base);

            if (!base) {
                return cb(new Error('fetcher.get: ' + tried));
            }

            fs.readFile(resolved, 'utf8', function(err, data) {
                if (err) {
                    tried.push(resolved);
                    return next();
                }
                return cb(err, data, resolved);
            });
        })();
    }
};