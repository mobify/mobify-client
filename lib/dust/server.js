var path = require('path'),
    parser = require('./parser'),
    compiler = require('./compiler');

module.exports = function(dust) {
  compiler.parse = parser.parse;
  dust.compile = compiler.compile;

  dust.nextTick = process.nextTick;

  // expose optimizers in commonjs env too
  dust.optimizers = compiler.optimizers;

  // expose pragmas and internal JS output routines as well.
  dust.pragmas = compiler.pragmas;
  dust.x = compiler.x;
  dust.nodes = compiler.nodes;
}
