var fs = require('fs')
  , Path = require('path')
  , _ = require('./underscore')
  , pathUtils = require('./pathUtils')
  , isWindows = process.platform == 'win32'
  , SEP = isWindows ? '\\' : '/';


var existsSync = fs.existsSync || Path.existsSync;

// Returns an array of files matching glob expression `u`.
// glob('test/*.js') -> ['test/test.js']
// glob('*.js', 'test') -> ['test.js']
// Exists is an internal param.
module.exports = function glob(u, from, exists) {
    var path = Path.join(from, u);

    if (!path.match(/\*|\?/)) {
        return (exists || existsSync(path)) ? [u] : [];
    }

    var tail = path.split(SEP)
      , base = [];
    
    while (tail.length && !tail[0].match(/\*|\?/)) {
        base.push(tail.shift());
    }

    if (!tail.length) {
        return u;
    }

    var pattern = new RegExp('^' + tail.shift()
                    .replace(/([\\\^\$\+\.])/g,'\\$1')
                    .replace('*', '.*')
                    .replace('?', '.') + '$')
      , sBase = base.join(SEP) || '.'
      , files = existsSync(sBase) ? fs.readdirSync(sBase) : []
      , result = _.flatten(files.filter(function(file) {
            return file.match(pattern);
        }).map(function(file) {
            var relative = Path.join(sBase, file);
            relative = from ? relative.slice(from.length + 1): relative;
            return glob(relative, from, true);
        }));
    
    return result;
}
