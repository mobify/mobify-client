
var startingPort = 3050;
var startingSslPort = 3100;

exports.uniquePort = function() { return startingPort++ }
exports.uniqueSslPort = function() { return startingSslPort++ }
