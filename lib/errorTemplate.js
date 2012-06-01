var _ = require('./underscore')
  , pathUtils = require('./pathUtils')
  , templates = { 
        errorHtml: pathUtils.appFile('lib/errorHtml.ejs')
      , error: pathUtils.appFile('lib/error.ejs')
    }


module.exports = function(err) {
    var errorHtml = _.template(templates.errorHtml, {error: err});
    errorHtml = errorHtml.replace(/'/g, "\\'")
                         .replace(/[\n\r]+/g, '\\n');
    return _.template(templates.error, {errorHtml: errorHtml});
}
