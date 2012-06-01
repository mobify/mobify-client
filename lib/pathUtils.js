var fs = require('fs')
  , Path = require('path');

var pathUtils = {
    	appFile: function(path) {
    		return fs.readFileSync(appSourceDir + '/' + path, 'utf8');
    	},
    };

// /mobify-js-tools/
var appSourceDir = Path.join(__dirname, '..');
pathUtils.appSourceDir = appSourceDir;
module.exports = pathUtils;