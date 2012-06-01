var path = require('path'),
    parser = require('./parser'),
    compiler = require('./compiler'),
    Script = process.binding('evals').NodeScript;

//require.paths.unshift(path.join(__dirname, '..'));

module.exports = function(dust) {
  compiler.parse = parser.parse;
  dust.compile = compiler.compile;

  /*dust.loadSource = function(source, path) {
    var res = Script.runInNewContext(source, {dust: dust}, path);
    return res;
  };*/

  dust.nextTick = process.nextTick;

  // expose optimizers in commonjs env too
  dust.optimizers = compiler.optimizers;

  // expose pragmas and internal JS output routines as well.
  dust.pragmas = compiler.pragmas;
  dust.x = compiler.x;
  dust.nodes = compiler.nodes;
}
