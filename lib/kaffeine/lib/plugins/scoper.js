var Token = require("../token");

module.exports = function(stream) {

  stream.each(function() {
    Token.current_token = this
   
    if(this.text === "#") {
      if (this.next.text === "#") return;

      var dotty = false,
          word, start, end, context, key, replacement;

      start = this.expressionStart(function() { 
          if(this.operator && this.text != ".") return true;
      }) // break on operators

      end = this.find(function() {
        if (this.square) return this.lbracket ? this.matching : true
        if (this.word) {
          word = this;
          return true;
        }
        if (this.operator && this.text === ".") {
          dotty = true
          return
        }
        if (this.whitespace || (this.text === "#")) return;
        else return false
      })

      if ((start === this) || !end) return;

      context = start.collectText(this.prev);
      key = word
        ? '"' + word.text + '"'
        : end.matching.next.collectText(end.prev);

      if (dotty) {
        replacement = context + '.env().tail[' + key + ']';
      } else {
        var closure = this.findClosure();
        var keyVar = closure.getUnusedVar('_s_');
        closure.vars[keyVar] = true;
        //console.log(tempVar);
        replacement = '(' + keyVar + '=' + context
          + '.env().ref(' + key + ')).target['+ keyVar + '.key]';
      }
      
      var tokens = Token.ize(replacement);
      var injectAt = end.next;
      start.remove(end);
      injectAt.before(tokens);

      //console.log(start, '===', end);
      return injectAt;
    }
  })
}

