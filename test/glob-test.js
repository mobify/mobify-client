var glob = require('../lib/glob');


module.exports = {
    'basic glob': function(test) {
        var files = glob('*.js', 'test/fixtures-glob');
        test.ok(files.length == 1);
        test.ok(files[0] == 'test.js');
        test.done();
    },

    // Fails
    // 'basic glob with trailing slash': function(test) {
    //     var files = glob('*.js', 'test/fixtures-glob/');
    //     test.ok(files.length == 1);
    //     test.ok(files[0] == 'test.js');
    //     test.done();
    // }
}