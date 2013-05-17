module.exports = function insertTags(html, o) {    
    var scriptRe = /(<script[\s\S]*?<\/script[\s\S]*?>)/gmi
      , closeStyleRe = /(<\/(style(\s[\s\S]*?)?>)(?!<!--INSCRIPT-->))/gmi
      , noscriptRe = /(<noscript[\s\S]*?<\/noscript>)/gmi
      , openBodyRe = /(<body(\s[\s\S]*?)?>)/mi
      , openHeadRe = /(<head(\s[\s\S]*?)?>)/mi
      , closeHeadRe = /(<\/head>)/mi
      , closeTextareaRe = /(<\/textarea>)/gmi
      , mobifyRe = /Mobify/
      , mobifyTagRe = /<!-- MOBIFY[\s\S]*?END MOBIFY -->/gmi
      , opts = '{path:"' + o.siteFolderPath + '"}';

    // Remove the Mobify bootstrap <script>.
    // For legacy implementations escape <style> inside <script>.
    // Only do this transformation for legacy mobify tags (below v5)
    if (o.tag_version < 5) {
        html = html.replace(scriptRe, function(str) {
            if (mobifyRe.test(str)) return '';
            return str.replace(closeStyleRe, '<&#47;$2<!--INSCRIPT-->');
        });
    }
    
    // Remove <noscript>. Old Mobify tags are wrapped by these.
    html = html.replace(noscriptRe, '');

    // Remove existing Mobify.js tags.
    html = html.replace(mobifyTagRe, '');
    
    // Insert `close_style`.
    if (o.tags.close_style) {
        html = html.replace(closeStyleRe, '$1' + o.tags.close_style);
    }

    // Insert `close_textarea`.
    if (o.tags.close_textarea) {
        html = html.replace(closeTextareaRe, '$1' + o.tags.close_textarea);
    }

    // Insert `close_head` and </head> if it doesn't exist.
    if (o.tags.close_head) {
        if (!closeHeadRe.test(html)) {
            html = html.replace(openBodyRe, '</head>$1');
        }
        html = html.replace(closeHeadRe, o.tags.close_head + '$1');
    }
    
    var hasOpenHead = false;
    
    // Insert `bootstrap`.
    html = html.replace(openHeadRe, function(str) {
        hasOpenHead = true;

        // Python str replace.
        var tag = str + o.tags.bootstrap;
        tag = tag.replace('%(configure_opts)s', opts);
        tag = tag.replace('%(trust)s', o.trustServer);

        // New Style Replace.
        var mobifyjsPath = o.mobifyjsPath || 'http://localhost:8080/mobify.js'
        tag = tag.replace('{{ mobifyjsPath }}', mobifyjsPath)
        return tag;
    });

    // If no <head>, error out.
    if (!hasOpenHead) {
        throw new Error('No open head.')
    }
         
    // Insert `open_body`.
    if (o.tags.open_body) {
        var openBodyStart = html.toLowerCase().lastIndexOf('<body');
        if (openBodyStart != -1) {
            openBodyEnd = html.indexOf('>', openBodyStart) + 1;
            html = html.substring(0, openBodyEnd) + o.tags.open_body 
                 + html.substring(openBodyEnd);
        }
    }
    
    // Insert `close_body`.
    if (o.tags.close_body) {
        var closeBodyStart = html.toLowerCase().lastIndexOf('</body');
        if (closeBodyStart != -1) {
            html = html.substring(0, closeBodyStart) + o.tags.close_body 
                 + html.substring(closeBodyStart);
        }
    }
    
    return html;
}
