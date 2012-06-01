// A server for use with mobify.js browser tests.
// Allows loading tagVersion by querystring.
var Url = require('url')
  , tagInjector = require('../../lib/tag-injector');
    
tagInjector.createServer({
    port: 3050,
    sslPort: 3051,
    getOpts: function(request, response) {
        var q = Url.parse(request.url, true).query
          , tagVersion = q.tagVersion && parseInt(q.tagVersion) || this.tagVersion;

        return {
            tagVersion: tagVersion
        };
    }
});
