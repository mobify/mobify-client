// Grab nodeunit: npm install nodeunit
// Run tests:
// cd ~/git/prospector/prospector/prospector/
// /Users/john/node_modules/nodeunit/bin/nodeunit tests.js
var insertTags = require('../lib/insertTags');

// Basic.
var test1 = '<html><head></head><body><style></style></body></html>';
var expected1 = '<html><head>bootstrapclosehead</head><body>openbody<style></style>closestyleclosebody</body></html>';

// Style in Script.
var test2 = '<html><head><script>"</style>"</script></head><body><style></style></body></html>';
var expected2 = '<html><head>bootstrap<script>"<&#47;style><!--INSCRIPT-->"</script>closehead</head><body>openbody<style></style>closestyleclosebody</body></html>';

// No head.
var test3 = '<html><body></body></html>';

var testMultilineHead = '<html><head\n></head><body\n><style\n></style></body></html>'
var expectedMultilineHead = '<html><head\n>bootstrapclosehead</head><body\n>openbody<style\n></style>closestyleclosebody</body></html>'


var testHeader = '<html><head></head><body><header></header></body></html>'
var expectedHeader = '<html><head>bootstrapclosehead</head><body>openbody<header></header>closebody</body></html>';


var o = {
        confBase: 'confBase',
        projectName: 'projectName',
        tags: {
            bootstrap: 'bootstrap',
            open_head: 'openhead',
            close_head: 'closehead',
            open_body: 'openbody',
            close_body: 'closebody',
            close_style: 'closestyle'
        }
    };


exports['Test Insert Tags'] = function(test) {
    function t(html, expected) {
        test.equals(insertTags(html, o), expected);
    }

    t(test1, expected1);
    t(test2, expected2);
    
    test.throws(function() {
        insertTags(test3, o);
    });
    
    t(testMultilineHead, expectedMultilineHead);
    t(testHeader, expectedHeader);

    test.done();
}