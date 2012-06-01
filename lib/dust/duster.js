// Mobify extensions to dust.js.
require('coffee-script');
var Path = require('path')
  , compressJs = require('../../src/utils').compressJs
  , dust = module.exports = require('./dust')  
  , glob = require('../glob')
  , Kaffeine = require('../kaffeine')
  , _ = require('../underscore')



// Modify `dust.nodes.path` to use `getAscendablePath`.
var oldPath = dust.nodes.path;

dust.nodes.path = function(context, node) {
    return oldPath(context, node).replace(/^ctx.getPath/, 'ctx.getAscendablePath');
}

var Context = dust.makeBase({}).constructor
  , Chunk = dust.stream('', {}).head.constructor
  , oldBlock = Chunk.prototype.block;

// Add `_SUPER_` to the block context.
Chunk.prototype.block = function(elem, context, bodies) {
    var topElem = elem ? elem.shift() : undefined;
    if (topElem) {          
        context = new context.constructor(
            context.stack,
            _.extend(context.global || {}, {
                '_SUPER_' : function(_elem, context, _bodies) {
                    return _elem.block(elem, context, bodies);                       
                }
            })
        , context.blocks);
    }
    return oldBlock.call(this, topElem, context, bodies);
};


var descend = function(ctx, down, i) {
    while (ctx && i < down.length) {
        if (ctx._async) {
            var unwrap = Async($.noop);
            ctx.onresult.push(function(result) {
                unwrap.result(descend(result, down, i));
            });
            return unwrap;
        }
        ctx = ctx[down[i]];
        i++;
    }
    
    return ctx;
}

Context.prototype.getAscendablePath = function(cur, down) {
    var ctx = this.stack;

    if (cur) return this.getPath(cur, down);
    if (!ctx.isObject) return undefined;

    ctx = this.get(down[0]);

    return descend(ctx, down, 1);
};

Context.prototype.getBlock = function(key) {
    var blocks = this.blocks;

    if (!blocks) return [];

    blocks = _.compact(_.pluck(blocks, key));
    return blocks;
};

var oldLoad = dust.load;
dust.load = function(name, chunk, context) {
    return name
        ? oldLoad.apply(this, arguments)
        : chunk;
}


// Add ability to store good stuff here.
var visit = dust.optimizers['%'];

dust.optimizers['%'] = function(context, node) {
    var pragmaName = node[1][1];
    var pragmaValue = node[2][1];
    
    pragmaValue = pragmaValue && pragmaValue[1];

    var shouldPreserveWhitespace = (pragmaName === "script")
        || (pragmaName === "whitespace" && pragmaValue === "true");

    var old = context.preserveWhitespace;

    context.preserveWhitespace = shouldPreserveWhitespace;

    var out = visit.call(this, context, node);

    context.preserveWhitespace = old;

    return out;
}

// By default, Dust skips over whitespace nodes by processing
// them with a nullifying optimizer. We allow them to stay if pragma
// optimizer is kind to them.
dust.optimizers.format = function(context, node) {
    if (context.preserveWhitespace) {
        return ['buffer', node[1] + node[2]];
    }
}

// preserveWhitespace flag is set via a {%whitespace:true}...{/whitespace} 
// pragma, and unset with {%whitespace:false}...{/whitespace}. Whitespace 
// preservation state is changed while generating output for content within 
// pragma, and then restored to original, allowing multiple whitespace pragmas 
// to be nested within each other.
dust.pragmas.whitespace = function(compiler, context, bodies, params) {
    var out = dust.x.compileParts(compiler, bodies.block);
    return out;
}

// {%script}...{/script} will output a <script>...</script> and preserve line 
// wraps (but not other whitespace) inside.
dust.pragmas.script = function(compiler, context, bodies, params) {
    var text = []
      , out;
    
    if (bodies.block.every(function(el, i) {
        if (i == 0) return true;
        if (el[0].match(/^(buffer|format)$/)) {
            text.push(el[1]);
            return true;
        }
    })) {
        out = ".write(\"<script>" + dust.escapeJs(compressJs(text.join(''))) + "</script>\")";
    } else {
        bodies.block.push(['buffer', '</script>']);
        bodies.block.splice(1, 0, ['buffer', '<script>']);
        out = dust.x.compileParts(compiler, bodies.block);
    }
    return out;
}

// Moidfy partial behaviour.
var oldPartial = dust.nodes.partial;
dust.nodes.partial = function(context, node) {
    if (context.base) {
        // Support '/' in `base`.
        var base = context.base.replace(/\\/g, '\\\\');

        return ".relativePartial("
             + dust.x.compileNode(context, node[1])
             + ",'" + base + "'"
             + "," + dust.x.compileNode(context, node[2]) + ")";
    }

    return oldPartial.apply(this, arguments);
}


// reserve another spot in the output
// like a normal partial, can accept a content body, or a function
// in which can the output of the function si evaulated first and we 
// return the outcome asynchronously.
Chunk.prototype.relativePartial = function(elem, base, context) {
    if (typeof elem === 'function') {
        return this.capture(elem, context, function(name, chunk) {
            dust.emitRelativePartial(name, base, chunk, context).end();
        });
    }
    return dust.emitRelativePartial(elem, base, this, context);     
}

// Evalutes relative partial `name` current `base`.
// Relatively referenced partials are resolved from `base`, which can be 
// modified during rendering using {%rebase} but defaults to the `base` file
// that started rendering, usually mobify.konf. Absolutely referenced partials
// are always rendered from original `base`.
dust.emitRelativePartial = function(name, base, chunk, context) {
    // console.log('{>"' + name + '"} - ' + base);

    var fetcher = context.get('fetcher')
      , isGlob = name.match(/\*|\?/)
      , relative = Path.dirname(base);

    return chunk.map(function(chunk) {
        // Handle glob partials, eg. {>"*.tmpl"}
        if (isGlob) {
            // Names returned by glob must be consistent with `name`:
            // {>"/base/*.tmpl"}
            // >>> ['/base/this.tmpl', ...]
            // {>"tmpl/*.tmpl/"}
            //  -> ['tmpl/that.tmpl', ...]
            var leadingSlash = false;
            if (name[0] == '/') {
                leadingSlash = true;
                name = name.slice(1);
            }

            // Glob all bases to find the files.
            var bases = [relative].concat(fetcher.bases.slice())
              , globBase
              , globbed;

            while (globBase = bases.shift()) {
                globbed = glob(name, globBase);
                if (globbed.length) break;
            }

            if (!globbed.length) {
                return chunk.setError(new Error('No files found in glob exresspsion.'));
            }

            // Put back the leading slash if we took it away.
            if (leadingSlash) {
                globbed = globbed.map(function(u) {
                    return '/' + u;
                });
            }

            globbed.forEach(function(u) {
                chunk = chunk.relativePartial(u, base, context).write('\n');
            });

            return chunk.end();
        }

        // Handle file partials, eg. {>"base.konf"}
        fetcher.get(name, function(err, data, url) {
            if (err) {
                err.url = context.global.compiling;
                err.message = 'Failed loading partial: {>"' + name + '"}'
                return chunk.setError(err);
            }

            context.global.compiling = url;

            // .konf files are compiled into the dustjs cache and then
            // rendered as a partial.
            if (url.match(/\.konf$/)) {
                var source = pragmify(data, {whitespace: true, seturl: url, setbase: base})
                  , compiled;

                try {
                    compiled = dust.compile(source, url);
                } catch (err) {
                    err.url = url;
                    err.message = 'Dustjs failed compiling partial: '
                                + '{> "' + name + '"}\n';
                    return chunk.setError(err);
                }

                // Load the newly compiled partial into the cache, then render it.
                dust.loadSource(compiled);
                return chunk.partial(url, context).end();
            }
            
            // .tmpl files are compiled into a template string and appended
            // to the output so they can be used on the client side.
            if (url.match(/([^\/\\]*)\.tmpl$/)) {
                var templateName = RegExp.$1
                  , source = pragmify(data, {whitespace: false})
                  , compiled;

                // Templates are named after their filename.
                try {
                    compiled = dust.compile(source, templateName);
                } catch(err) {
                    err.url = url;
                    err.message = 'Dustjs failed compiling template:\n'
                                + url + '\n'
                                + 'Message:\n' 
                                + err.toString();
                    return chunk.setError(err);
                }
                return chunk.end(compiled);
            }            
            chunk.end(data);

        }, relative);
    });
}


// Default Kaffeine Pragma.
var kaffeinePragma = '#using multiline_strings arrow scoper hash at '
                   + 'brackets_for_keywords operators pre_pipe '
                   + 'implicit_brackets extend_for prototype super '
                   + 'implicit_return pipe bang default_args '
                   + 'implicit_vars\n';


// Pragmify dust source, adding parameters.
var pragmify = dust.pragmify = function(source, pragmas) {
    for (p in pragmas) {
        source = '{%' + p +
               (p == 'whitespace'
                    ? ':' + pragmas[p] + '}\n'
                    : '}{@val}' + pragmas[p] + '{/val}') +
                source + '{/' + p + '}\n';
    }
    return source;
}

// Dustjs handler for Kaffeine compilation.
dust.kaffeine = function(data, chunk, u) {
    var source;

    // Kaffeine hates windows.
    data = data.replace(/\r\n/g, '\n');

    try {
        source = new Kaffeine().compile(kaffeinePragma + data)
    } catch (err) {
        // Translate Kaffeine error messages.
        // Most likely these errors happened in mobify.konf inside the {data}
        // block, but it's difficult to trace because the block won't be filed 
        // until base_konf.konf.
        var msg = err.message || err;
        err = new Error('Kaffeine failed compiling "' + u + '":\n' + {
                'missing bracket': 'Missing closing bracket.',
                'cannot set property \'matching\' of undefined': 'Missing opening bracket.'
            }[msg.toLowerCase()] || msg);
        err.url = u
        return chunk.setError(err);
    }

    return chunk.write(source).end();
}


// Generates JavaScript to store scripts in the Ark.
// Usage:
//  {#ark name="lib" passive="true"} ... {/ark}
// `name` is what to store it under.
// `passive` is whether it should be a string or a method.
// 
// {#ark name="lib" passive="true"}function(){}{/ark}
// Mobify.ark.store('lib', 'function(){}', true)
//
// {#ark name="lib"}function(){}{/ark}
// Mobify.ark.store('lib', function(){}, false) 
dust.ark = function(data, chunk, params) {    
    params = params || {};
    if (params.passive === 'false') {
        params.passive = false;
    }

    var name = params.name ? '"' + dust.escapeJs(params.name) + '",' : ''
      , skipExecution = params.passive ? 'true' : 'false';

    if (params.passive) {
        body = '"' + dust.escapeJs(compressJs(data)) + '",';
    } else {
        body = 'function(){' + data + '},'
    }

    return chunk.write('Mobify.ark.store(').write(name).write(body).write(skipExecution)
        .write(');').end();
}

function makePragmaHandler(key, source) {
    return function(compiler, context, bodies, params) {
        var oldKey = compiler[key];
        if (source) {
            compiler[key] = compiler[source];
        } else {
            // whut.
            compiler[key] = bodies.block[1][4][1][2][1][1];
            bodies.block.splice(1, 1);
        }

        var out = dust.x.compileParts(compiler, bodies.block);

        compiler[key] = oldKey;
        return out;
    }     
}

dust.pragmas.rebase = makePragmaHandler('base', 'url');
dust.pragmas.setbase = makePragmaHandler('base');
dust.pragmas.seturl = makePragmaHandler('url'); 
