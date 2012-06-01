var dust = require('../lib/dust/duster');

module.exports = {
    'dust.compile and dust.render accept windows filenames': function(test) {
        var name = 'c:\\test',
            source = 'test',
            compiled;
        
        compiled = dust.compile(source, name);
        dust.loadSource(compiled);
        dust.render(name, {}, function(err) {
            test.ok(!err, 'Should be no error.');
            test.done();
        })
    }
}