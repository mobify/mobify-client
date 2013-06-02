(function () {
/**
 * almond 0.2.5 Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);

                name = baseParts.concat(name.split("/"));

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (typeof callback === 'function') {

            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback.apply(defined[name], args);

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        config = cfg;
        if (config.deps) {
            req(config.deps, config.callback);
        }
        return req;
    };

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("almond", function(){});

define('mobifyjs/utils',[], function() {

// ##
// # Utility methods
// ##

var Utils = {};

Utils.extend = function(target){
    [].slice.call(arguments, 1).forEach(function(source) {
        for (var key in source)
            if (source[key] !== undefined)
                target[key] = source[key];
    });
    return target;
};

Utils.keys = function(obj) {
    var result = [];
    for (var key in obj) {
        if (obj.hasOwnProperty(key))
            result.push(key);
    }
    return result;
};

Utils.values = function(obj) {
    var result = [];
    for (var key in obj) {
      if (obj.hasOwnProperty(key))
          result.push(obj[key]);
    }
    return result;
};

Utils.clone = function(obj) {
    var target = {};
    for (var i in obj) {
        if (obj.hasOwnProperty(i)) {
          target[i] = obj[i];
        }
    }
    return target;
};

/**
 * outerHTML polyfill - https://gist.github.com/889005
 */
Utils.outerHTML = function(el){
    var div = document.createElement('div');
    div.appendChild(el.cloneNode(true));
    var contents = div.innerHTML;
    div = null;
    return contents;
};

Utils.removeBySelector = function(selector, doc) {
    doc = doc || document;

    var els = doc.querySelectorAll(selector);
    return Utils.removeElements(els, doc);
};

Utils.removeElements = function(elements, doc) {
    doc = doc || document;

    for (var i=0,ii=elements.length; i<ii; i++) {
        var el = elements[i];
        el.parentNode.removeChild(el);
    }
    return elements;
};

return Utils;

});
define('mobifyjs/capture',["mobifyjs/utils"], function(Utils) {

// ##
// # Static Variables/Functions
// ##

// v6 tag backwards compatibility change
if (window.Mobify && 
    !window.Mobify.capturing &&
    document.getElementsByTagName("plaintext").length) 
{
            window.Mobify.capturing = true;
}

var openingScriptRe = /(<script[\s\S]*?>)/gi;

// Inline styles and scripts are disabled using a unknown type.
var tagDisablers = {
    style: ' media="mobify-media"',
    script: ' type="text/mobify-script"'
};

var tagEnablingRe = new RegExp(Utils.values(tagDisablers).join('|'), 'g');

// Map of all attributes we should disable (to prevent resources from downloading)
var disablingMap = {
    img:    ['src'],
    iframe: ['src'],
    script: ['src', 'type'],
    link:   ['href'],
    style:  ['media'],
};

var affectedTagRe = new RegExp('<(' + Utils.keys(disablingMap).join('|') + ')([\\s\\S]*?)>', 'gi');
var attributeDisablingRes = {};
var attributesToEnable = {};

// Populate `attributesToEnable` and `attributeDisablingRes`.
for (var tagName in disablingMap) {
    if (!disablingMap.hasOwnProperty(tagName)) continue;
    var targetAttributes = disablingMap[tagName];

    targetAttributes.forEach(function(value) {
        attributesToEnable[value] = true;
    });

    // <space><attr>='...'|"..."
    attributeDisablingRes[tagName] = new RegExp(
        '\\s+((?:'
        + targetAttributes.join('|')
        + ")\\s*=\\s*(?:('|\")[\\s\\S]+?\\2))", 'gi');
}

/**
 * Returns the name of a node (in lowercase)
 */
function nodeName(node) {
    return node.nodeName.toLowerCase();
}

/**
 * Escape quotes
 */
function escapeQuote(s) {
    return s.replace('"', '&quot;');
}


/**
 * Helper method for looping through and grabbing strings of elements
 * in the captured DOM after plaintext insertion
 */
function extractHTMLStringFromElement(container) {
    if (!container) return '';

    return [].map.call(container.childNodes, function(el) {
        var tagName = nodeName(el);
        if (tagName == '#comment') return '<!--' + el.textContent + '-->';
        if (tagName == 'plaintext') return el.textContent;
        // Don't allow mobify related scripts to be added to the new document
        if (tagName == 'script' && ((/mobify/.test(el.src) || /mobify/i.test(el.textContent)))) {
            return '';
        }
        return el.outerHTML || el.nodeValue || Utils.outerHTML(el);
    }).join('');
}

// cached div used repeatedly to create new elements
var cachedDiv = document.createElement('div');

// ##
// # Constructor
// ##
var Capture = function(doc, prefix) {
    this.doc = doc;
    this.prefix = prefix || "x-";

    var capturedStringFragments = this.createDocumentFragmentsStrings();
    Utils.extend(this, capturedStringFragments);

    var capturedDOMFragments = this.createDocumentFragments();
    Utils.extend(this, capturedDOMFragments);
};

var init = Capture.init = function(callback, doc, prefix) {
    var doc = doc || document;

    var createCapture = function(callback, doc, prefix) {
        var capture = new Capture(doc, prefix);
        callback(capture);
    }
    // iOS 4.3, some Android 2.X.X have a non-typical "loaded" readyState,
    // which is an acceptable readyState to start capturing on, because
    // the data is fully loaded from the server at that state.
    if (/complete|interactive|loaded/.test(doc.readyState)) {
        createCapture(callback, doc, prefix);
    }
    // We may be in "loading" state by the time we get here, meaning we are
    // not ready to capture. Next step after "loading" is "interactive",
    // which is a valid state to start capturing on, and thus when ready
    // state changes once, we know we are good to start capturing.
    else {
        var created = false;
        doc.addEventListener("readystatechange", function() {
            if (!created) {
                created = true;
                createCapture(callback, doc, prefix);
            }
        }, false);
    }
};

/**
 * Grab attributes from a string representation of an elements and clone them into dest element
 */
Capture.cloneAttributes = function(sourceString, dest) {
    var match = sourceString.match(/^<(\w+)([\s\S]*)$/i);
    cachedDiv.innerHTML = '<div' + match[2];
    [].forEach.call(cachedDiv.firstChild.attributes, function(attr) {
        try {
            dest.setAttribute(attr.nodeName, attr.nodeValue);
        } catch (e) {
            console.error("Error copying attributes while capturing: ", e);
        }
    });

    return dest;
};

/**
 * Returns a string with all external attributes disabled.
 * Includes special handling for resources referenced in scripts and inside
 * comments.
 * Not declared on the prototype so it can be used as a static method.
 */
Capture.disable = function(htmlStr, prefix) {
    var self = this;
    // Disables all attributes in disablingMap by prepending prefix
    var disableAttributes = (function(){
        return function(whole, tagName, tail) {
            lowercaseTagName = tagName.toLowerCase();
            return result = '<' + lowercaseTagName + (tagDisablers[lowercaseTagName] || '')
                + tail.replace(attributeDisablingRes[lowercaseTagName], ' ' + prefix + '$1') + '>';
        }
    })();

    var splitRe = /(<!--[\s\S]*?-->)|(?=<\/script)/i;
    var tokens = htmlStr.split(splitRe);
    var ret = tokens.map(function(fragment) {
                var parsed

                // Fragment may be empty or just a comment, no need to escape those.
                if (!fragment) return '';
                if (/^<!--/.test(fragment)) return fragment;

                // Disable before and the <script> itself.
                // parsed = [before, <script>, script contents]
                parsed = fragment.split(openingScriptRe);
                parsed[0] = parsed[0].replace(affectedTagRe, disableAttributes);
                if (parsed[1]) parsed[1] = parsed[1].replace(affectedTagRe, disableAttributes);
                return parsed;
            });

    return [].concat.apply([], ret).join('');
};

/**
 * Returns a string with all disabled external attributes enabled.
 * Not declared on the prototype so it can be used as a static method.
 */
Capture.enable = function(htmlStr, prefix) {
    var attributeEnablingRe = new RegExp('\\s' + prefix + '(' + Utils.keys(attributesToEnable).join('|') + ')', 'gi');
    return htmlStr.replace(attributeEnablingRe, ' $1').replace(tagEnablingRe, '');
};

/**
 * Return a string for the opening tag of DOMElement `element`.
 */
Capture.openTag = function(element) {
    if (!element) return '';
    if (element.length) element = element[0];

    var stringBuffer = [];

    [].forEach.call(element.attributes, function(attr) {
        stringBuffer.push(' ', attr.name, '="', escapeQuote(attr.value), '"');
    })

    return '<' + nodeName(element) + stringBuffer.join('') + '>';
};

/**
 * Return a string for the doctype of the current document.
 */
Capture.prototype.getDoctype = function() {
    var doctypeEl = this.doc.doctype || [].filter.call(this.doc.childNodes, function(el) {
            return el.nodeType == Node.DOCUMENT_TYPE_NODE
        })[0];

    if (!doctypeEl) return '';

    return '<!DOCTYPE HTML'
        + (doctypeEl.publicId ? ' PUBLIC "' + doctypeEl.publicId + '"' : '')
        + (doctypeEl.systemId ? ' "' + doctypeEl.systemId + '"' : '')
        + '>';
};

/**
 * Returns an object containing the state of the original page. Caches the object
 * in `extractedHTML` for later use.
 */
 Capture.prototype.createDocumentFragmentsStrings = function() {
    var doc = this.doc;
    var headEl = doc.getElementsByTagName('head')[0] || doc.createElement('head');
    var bodyEl = doc.getElementsByTagName('body')[0] || doc.createElement('body');
    var htmlEl = doc.getElementsByTagName('html')[0];

    captured = {
        doctype: this.getDoctype(),
        htmlOpenTag: Capture.openTag(htmlEl),
        headOpenTag: Capture.openTag(headEl),
        bodyOpenTag: Capture.openTag(bodyEl),
        headContent: extractHTMLStringFromElement(headEl),
        bodyContent: extractHTMLStringFromElement(bodyEl)
    };

    /**
     * RR: I assume that Mobify escaping tag is placed in <head>. If so, the <plaintext>
     * it emits would capture the </head><body> boundary, as well as closing </body></html>
     * Therefore, bodyContent will have these tags, and they do not need to be added to .all()
     */
    captured.all = function(inject) {
        return this.doctype + this.htmlOpenTag + this.headOpenTag + (inject || '') + this.headContent + this.bodyContent;
    }

    // During capturing, we will usually end up hiding our </head>/<body ... > boundary
    // within <plaintext> capturing element. To construct source DOM, we need to rejoin
    // head and body content, iterate through it to find head/body boundary and expose
    // opening <body ... > tag as a string.

    // Consume comments without grouping to avoid catching
    // <body> inside a comment, common with IE conditional comments.
    var bodySnatcher = /<!--(?:[\s\S]*?)-->|(<\/head\s*>|<body[\s\S]*$)/gi;

    //Fallback for absence of </head> and <body>
    var rawHTML = captured.bodyContent = captured.headContent + captured.bodyContent;
    captured.headContent = '';

    // Search rawHTML for the head/body split.
    for (var match; match = bodySnatcher.exec(rawHTML); match) {
        // <!-- comment --> . Skip it.
        if (!match[1]) continue;

        if (match[1][1] == '/') {
            // Hit </head. Gather <head> innerHTML. Also, take trailing content,
            // just in case <body ... > is missing or malformed
            captured.headContent = rawHTML.slice(0, match.index);
            captured.bodyContent = rawHTML.slice(match.index + match[1].length);
        } else {
            // Hit <body. Gather <body> innerHTML.

            // If we were missing a </head> before, now we can pick up everything before <body
            captured.headContent = captured.head || rawHTML.slice(0, match.index);
            captured.bodyContent = match[0];

            // Find the end of <body ... >
            var parseBodyTag = /^((?:[^>'"]*|'[^']*?'|"[^"]*?")*>)([\s\S]*)$/.exec(captured.bodyContent);

            // Will skip this if <body was malformed (e.g. no closing > )
            if (parseBodyTag) {
                // Normal termination. Both </head> and <body> were recognized and split out
                captured.bodyOpenTag = parseBodyTag[1];
                captured.bodyContent = parseBodyTag[2];
            }
            break;
        }
    }
    return captured;
};

/**
 * Gather escaped content from the DOM, unescaped it, and then use
 * `document.write` to revert to the original page.
 */
Capture.prototype.restore = function() {
    var self = this;
    var doc = self.doc;

    var restore = function() {
        doc.removeEventListener('DOMContentLoaded', restore, false);

        setTimeout(function() {
            doc.open();
            doc.write(self.all());
            doc.close();
        }, 15);
    };

    if (/complete|interactive|loaded/.test(doc.readyState)) {
        restore();
    } else {
        doc.addEventListener('DOMContentLoaded', restore, false);
    }
};

/**
 * Set the content of an element with html from a string
 */
Capture.prototype.setElementContentFromString = function(el, htmlString) {
    // We must pass in document because elements created for dom insertion must be
    // inserted into the same dom they are created by.
    var doc = this.doc;
    for (cachedDiv.innerHTML = htmlString; cachedDiv.firstChild; el.appendChild(cachedDiv.firstChild));
};

/**
 * Grab fragment strings and construct DOM fragments
 * returns htmlEl, headEl, bodyEl, doc
 */
Capture.prototype.createDocumentFragments = function() {
    var docFrags = {};
    var doc = docFrags.capturedDoc = document.implementation.createHTMLDocument("")
    var htmlEl = docFrags.htmlEl = doc.documentElement;
    var headEl = docFrags.headEl = htmlEl.firstChild;
    var bodyEl = docFrags.bodyEl = htmlEl.lastChild;

    // Reconstruct html, body, and head with the same attributes as the original document
    Capture.cloneAttributes(this.htmlOpenTag, htmlEl);
    Capture.cloneAttributes(this.headOpenTag, headEl);
    Capture.cloneAttributes(this.bodyOpenTag, bodyEl);

    // Set innerHTML of new source DOM body
    bodyEl.innerHTML = Capture.disable(this.bodyContent, this.prefix);
    var disabledHeadContent = Capture.disable(this.headContent, this.prefix);

    // On FF4, and potentially other browsers, you cannot modify <head>
    // using innerHTML. In that case, do a manual copy of each element
    try {
        headEl.innerHTML = disabledHeadContent;
    } catch (e) {
        var title = headEl.getElementsByTagName('title')[0];
        title && headEl.removeChild(title);
        this.setElementContentFromString(headEl, disabledHeadContent);
    }

    // Append head and body to the html element
    htmlEl.appendChild(headEl);
    htmlEl.appendChild(bodyEl);

    return docFrags;
};

/**
 * Returns an escaped HTML representation of the captured DOM
 */
Capture.prototype.escapedHTMLString = function() {
    var doc = this.capturedDoc;
    var html = Capture.enable(doc.documentElement.outerHTML || Utils.outerHTML(doc.documentElement), this.prefix);
    var htmlWithDoctype = this.doctype + html;
    return htmlWithDoctype;
};

/**
 * Rewrite the document with a new html string
 */
Capture.prototype.render = function(htmlString) {
    var escapedHTMLString;
    if (!htmlString) {
        escapedHTMLString = this.escapedHTMLString();
    } else {
        escapedHTMLString = Capture.enable(htmlString);
    }

    var doc = this.doc;

    // Set capturing state to false so that the user main code knows how to execute
    if (window.Mobify) window.Mobify.capturing = false;

    // Asynchronously render the new document
    setTimeout(function(){
        doc.open("text/html", "replace");
        doc.write(escapedHTMLString);
        doc.close();
    });
};

/**
 * Get the captured document
 */
Capture.prototype.getCapturedDoc = function(options) {
    return this.capturedDoc;
};

/**
 * Insert Mobify scripts back into the captured doc
 * in order for the library to work post-document.write
 */
Capture.prototype.insertMobifyScripts = function() {
    var doc = this.capturedDoc;

    // After document.open(), all objects will be removed.
    // To provide our library functionality afterwards, we
    // must re-inject the script.
    var mobifyjsScript = document.getElementById("mobify-js");

    // v6 tag backwards compatibility change
    if (!mobifyjsScript) {
        mobifyjsScript = document.getElementsByTagName("script")[0];
        mobifyjsScript.id = "mobify-js";
        mobifyjsScript.setAttribute("class", "mobify");
    }

    // Since you can't move nodes from one document to another,
    // we must clone it first using importNode:
    // https://developer.mozilla.org/en-US/docs/DOM/document.importNode
    var mobifyjsClone = doc.importNode(mobifyjsScript, false);
    var head = this.headEl;
    head.insertBefore(mobifyjsClone, head.firstChild);

    // If main exists, re-inject it as well.
    var mainScript = document.getElementById("mobify-js-main");
    if (mainScript) {
        var mainClone = doc.importNode(mainScript, false);
        this.bodyEl.appendChild(mainClone);
    }
};

/**
 * Render the captured document
 */
Capture.prototype.renderCapturedDoc = function(options) {
    var doc = this.capturedDoc;

    // Insert the mobify scripts back into the captured doc
    this.insertMobifyScripts();

    // Inject timing point (because of blowing away objects on document.write)
    // if it exists
    if (window.Mobify && window.Mobify.points) {
        var body = this.bodyEl;
        var date = doc.createElement("div");
        date.id = "mobify-point";
        date.setAttribute("style", "display: none;")
        date.innerHTML = window.Mobify.points[0];
        body.insertBefore(date, body.firstChild);
    }


    this.render();
};

return Capture;

});

define('mobifyjs/resizeImages',["mobifyjs/utils"], function(Utils) {

var ResizeImages = {};

var absolutify = document.createElement('a');

// A regex for detecting http(s) URLs.
var httpRe = /^https?/;

// A protocol relative URL for the host ir0.mobify.com
var PROTOCOL_AND_HOST = '//ir0.mobify.com';

function getPhysicalScreenSize(devicePixelRatio) {

    function multiplyByPixelRatio(sizes) {
        var dpr = devicePixelRatio || 1;

        sizes.width = Math.round(sizes.width * dpr);
        sizes.height = Math.round(sizes.height * dpr);

        return sizes;
    }

    var iOS = navigator.userAgent.match(/iphone|ipod|ipad/i);
    var androidVersion = (navigator.userAgent.match(/android (\d)/i) || {})[1];

    var sizes = {
        width: window.outerWidth
      , height: window.outerHeight
    };

    // Old Android and BB10 use physical pixels in outerWidth/Height, which is what we need
    // New Android (4.0 and above) use CSS pixels, requiring devicePixelRatio multiplication
    // iOS lies about outerWidth/Height when zooming, but does expose CSS pixels in screen.width/height

    if (!iOS) {
        if (androidVersion > 3) return multiplyByPixelRatio(sizes);
        return sizes;
    }

    var isLandscape = window.orientation % 180;

    if (isLandscape) {
        sizes.height = screen.width;
        sizes.width = screen.height;
    } else {
        sizes.width = screen.width;
        sizes.height = screen.height;
    }

    return multiplyByPixelRatio(sizes);
}

/**
 * Returns a URL suitable for use with the 'ir' service.
 */
var getImageURL = ResizeImages.getImageURL = function(url, options) {
    var opts = Utils.clone(defaults);
    if (options) {
        Utils.extend(opts, options);
    }

    var bits = [PROTOCOL_AND_HOST];

    if (opts.projectName) {
        var projectId = "project-" + opts.projectName;
        bits.push(projectId);
    }

    if (options.cacheHours) {
        bits.push('c' + options.cacheHours);
    }

    if (opts.format) {
        bits.push(options.format + (options.quality || ''));
    }

    if (opts.maxWidth) {
        bits.push(options.maxWidth)

        if (opts.maxHeight) {
            bits.push(options.maxHeight);
        }
    }

    bits.push(url);
    return bits.join('/');
};

/**
 * Searches the collection for image elements and modifies them to use
 * the Image Resize service. Pass `options` to modify how the images are 
 * resized.
 */
ResizeImages.resize = function(imgs, options) {
    var opts = Utils.clone(defaults);
    if (options) {
        Utils.extend(opts, options);
    }

    var dpr = opts.devicePixelRatio || window.devicePixelRatio;

    var screenSize = getPhysicalScreenSize(dpr);

    // If maxHeight/maxWidth are not specified, use screen dimentions
    // in device pixels
    var width = opts.maxWidth || screenSize.width;
    var height = opts.maxHeight || screenSize.height;

    // Otherwise, compute device pixels
    if (dpr && opts.maxWidth) {
        width = width * dpr;
        if (opts.maxHeight) {
            height = height * dpr;
        }
    }

    // Doing rounding for non-integer device pixel ratios
    opts.maxWidth = Math.ceil(width);
    opts.maxHeight = Math.ceil(height);

    var attrVal;
    for(var i=0; i<imgs.length; i++) {
        var img = imgs[i];
        if (attrVal = img.getAttribute(opts.attribute)) {
            absolutify.href = attrVal;
            var url = absolutify.href;
            if (httpRe.test(url)) {
                img.setAttribute(opts.attribute, getImageURL(url, opts));
            }
        }
    }
    return imgs;
};

var defaults = {
      projectName: "oss-" + location.hostname.replace(/[^\w]/g, '-'),
      attribute: "x-src"
};

return ResizeImages;

});

//
// Dust - Asynchronous Templating v1.2.3
// http://akdubya.github.com/dustjs
//
// Copyright (c) 2010, Aleksander Williams
// Released under the MIT License.
//

var dust = {};

function getGlobal(){
  return (function(){
    return this.dust;
  }).call(null);
}

(function(dust) {

dust.helpers = {};

dust.cache = {};

dust.register = function(name, tmpl) {
  if (!name) return;
  dust.cache[name] = tmpl;
};

dust.render = function(name, context, callback) {
  var chunk = new Stub(callback).head;
  dust.load(name, chunk, Context.wrap(context)).end();
};

dust.stream = function(name, context) {
  var stream = new Stream();
  dust.nextTick(function() {
    dust.load(name, stream.head, Context.wrap(context)).end();
  });
  return stream;
};

dust.renderSource = function(source, context, callback) {
  return dust.compileFn(source)(context, callback);
};

dust.compileFn = function(source, name) {
  var tmpl = dust.loadSource(dust.compile(source, name));
  return function(context, callback) {
    var master = callback ? new Stub(callback) : new Stream();
    dust.nextTick(function() {
      tmpl(master.head, Context.wrap(context)).end();
    });
    return master;
  };
};

dust.load = function(name, chunk, context) {
  var tmpl = dust.cache[name];
  if (tmpl) {
    return tmpl(chunk, context);
  } else {
    if (dust.onLoad) {
      return chunk.map(function(chunk) {
        dust.onLoad(name, function(err, src) {
          if (err) return chunk.setError(err);
          if (!dust.cache[name]) dust.loadSource(dust.compile(src, name));
          dust.cache[name](chunk, context).end();
        });
      });
    }
    return chunk.setError(new Error("Template Not Found: " + name));
  }
};

dust.loadSource = function(source, path) {
  return eval(source);
};

if (Array.isArray) {
  dust.isArray = Array.isArray;
} else {
  dust.isArray = function(arr) {
    return Object.prototype.toString.call(arr) == "[object Array]";
  };
}

dust.nextTick = (function() {
  if (typeof process !== "undefined") {
    return process.nextTick;
  } else {
    return function(callback) {
      setTimeout(callback,0);
    };
  }
} )();

dust.isEmpty = function(value) {
  if (dust.isArray(value) && !value.length) return true;
  if (value === 0) return false;
  return (!value);
};

// apply the filter chain and return the output string
dust.filter = function(string, auto, filters) {
  if (filters) {
    for (var i=0, len=filters.length; i<len; i++) {
      var name = filters[i];
      if (name === "s") {
        auto = null;
      }
      // fail silently for invalid filters
      else if (typeof dust.filters[name] === 'function') {
        string = dust.filters[name](string);
      }
    }
  }
  // by default always apply the h filter, unless asked to unescape with |s
  if (auto) {
    string = dust.filters[auto](string);
  }
  return string;
};

dust.filters = {
  h: function(value) { return dust.escapeHtml(value); },
  j: function(value) { return dust.escapeJs(value); },
  u: encodeURI,
  uc: encodeURIComponent,
  js: function(value) { if (!JSON) { return value; } return JSON.stringify(value); },
  jp: function(value) { if (!JSON) { return value; } return JSON.parse(value); }
};

function Context(stack, global, blocks) {
  this.stack  = stack;
  this.global = global;
  this.blocks = blocks;
}

dust.makeBase = function(global) {
  return new Context(new Stack(), global);
};

Context.wrap = function(context) {
  if (context instanceof Context) {
    return context;
  }
  return new Context(new Stack(context));
};

Context.prototype.get = function(key) {
  var ctx = this.stack, value;

  while(ctx) {
    if (ctx.isObject) {
      value = ctx.head[key];
      if (!(value === undefined)) {
        return value;
      }
    }
    ctx = ctx.tail;
  }
  return this.global ? this.global[key] : undefined;
};

Context.prototype.getPath = function(cur, down) {
  var ctx = this.stack,
      len = down.length;

  if (cur && len === 0) return ctx.head;
  ctx = ctx.head;
  var i = 0;
  while(ctx && i < len) {
    ctx = ctx[down[i]];
    i++;
  }
  return ctx;
};

Context.prototype.push = function(head, idx, len) {
  return new Context(new Stack(head, this.stack, idx, len), this.global, this.blocks);
};

Context.prototype.rebase = function(head) {
  return new Context(new Stack(head), this.global, this.blocks);
};

Context.prototype.current = function() {
  return this.stack.head;
};

Context.prototype.getBlock = function(key, chk, ctx) {
  if (typeof key === "function") {
    key = key(chk, ctx).data.join("");
    chk.data = []; //ie7 perf
  }

  var blocks = this.blocks;

  if (!blocks) return;
  var len = blocks.length, fn;
  while (len--) {
    fn = blocks[len][key];
    if (fn) return fn;
  }
};

Context.prototype.shiftBlocks = function(locals) {
  var blocks = this.blocks,
      newBlocks;

  if (locals) {
    if (!blocks) {
      newBlocks = [locals];
    } else {
      newBlocks = blocks.concat([locals]);
    }
    return new Context(this.stack, this.global, newBlocks);
  }
  return this;
};

function Stack(head, tail, idx, len) {
  this.tail = tail;
  this.isObject = !dust.isArray(head) && head && typeof head === "object";
  this.head = head;
  this.index = idx;
  this.of = len;
}

function Stub(callback) {
  this.head = new Chunk(this);
  this.callback = callback;
  this.out = '';
}

Stub.prototype.flush = function() {
  var chunk = this.head;

  while (chunk) {
    if (chunk.flushable) {
      this.out += chunk.data.join(""); //ie7 perf
    } else if (chunk.error) {
      this.callback(chunk.error);
      this.flush = function() {};
      return;
    } else {
      return;
    }
    chunk = chunk.next;
    this.head = chunk;
  }
  this.callback(null, this.out);
};

function Stream() {
  this.head = new Chunk(this);
}

Stream.prototype.flush = function() {
  var chunk = this.head;

  while(chunk) {
    if (chunk.flushable) {
      this.emit('data', chunk.data.join("")); //ie7 perf
    } else if (chunk.error) {
      this.emit('error', chunk.error);
      this.flush = function() {};
      return;
    } else {
      return;
    }
    chunk = chunk.next;
    this.head = chunk;
  }
  this.emit('end');
};

Stream.prototype.emit = function(type, data) {
  if (!this.events) return false;
  var handler = this.events[type];
  if (!handler) return false;
  if (typeof handler == 'function') {
    handler(data);
  } else {
    var listeners = handler.slice(0);
    for (var i = 0, l = listeners.length; i < l; i++) {
      listeners[i](data);
    }
  }
};

Stream.prototype.on = function(type, callback) {
  if (!this.events) {
    this.events = {};
  }
  if (!this.events[type]) {
    this.events[type] = callback;
  } else if(typeof this.events[type] === 'function') {
    this.events[type] = [this.events[type], callback];
  } else {
    this.events[type].push(callback);
  }
  return this;
};

Stream.prototype.pipe = function(stream) {
  this.on("data", function(data) {
    stream.write(data, "utf8");
  }).on("end", function() {
    stream.end();
  }).on("error", function(err) {
    stream.error(err);
  });
  return this;
};

function Chunk(root, next, taps) {
  this.root = root;
  this.next = next;
  this.data = []; //ie7 perf
  this.flushable = false;
  this.taps = taps;
}

Chunk.prototype.write = function(data) {
  var taps  = this.taps;

  if (taps) {
    data = taps.go(data);
  }
  this.data.push(data);
  return this;
};

Chunk.prototype.end = function(data) {
  if (data) {
    this.write(data);
  }
  this.flushable = true;
  this.root.flush();
  return this;
};

Chunk.prototype.map = function(callback) {
  var cursor = new Chunk(this.root, this.next, this.taps),
      branch = new Chunk(this.root, cursor, this.taps);

  this.next = branch;
  this.flushable = true;
  callback(branch);
  return cursor;
};

Chunk.prototype.tap = function(tap) {
  var taps = this.taps;

  if (taps) {
    this.taps = taps.push(tap);
  } else {
    this.taps = new Tap(tap);
  }
  return this;
};

Chunk.prototype.untap = function() {
  this.taps = this.taps.tail;
  return this;
};

Chunk.prototype.render = function(body, context) {
  return body(this, context);
};

Chunk.prototype.reference = function(elem, context, auto, filters) {
  if (typeof elem === "function") {
    elem.isFunction = true;
    // Changed the function calling to use apply with the current context to make sure 
    // that "this" is wat we expect it to be inside the function
    elem = elem.apply(context.current(), [this, context, null, {auto: auto, filters: filters}]);
    if (elem instanceof Chunk) {
      return elem;
    }
  }
  if (!dust.isEmpty(elem)) {
    return this.write(dust.filter(elem, auto, filters));
  } else {
    return this;
  }
};

Chunk.prototype.section = function(elem, context, bodies, params) {
  // anonymous functions
  if (typeof elem === "function") {
    elem = elem.apply(context.current(), [this, context, bodies, params]);
    // functions that return chunks are assumed to have handled the body and/or have modified the chunk
    // use that return value as the current chunk and go to the next method in the chain
    if (elem instanceof Chunk) {
      return elem;
    }
  }
  var body = bodies.block,
      skip = bodies['else'];

  // a.k.a Inline parameters in the Dust documentations
  if (params) {
    context = context.push(params);
  }

  /*
  Dust's default behavior is to enumerate over the array elem, passing each object in the array to the block.
  When elem resolves to a value or object instead of an array, Dust sets the current context to the value 
  and renders the block one time.
  */
  //non empty array is truthy, empty array is falsy
  if (dust.isArray(elem)) {
     if (body) {
      var len = elem.length, chunk = this;
      if (len > 0) {
        // any custom helper can blow up the stack 
        // and store a flattened context, guard defensively
        if(context.stack.head) {
         context.stack.head['$len'] = len;
        }
        for (var i=0; i<len; i++) {
          if(context.stack.head) {
           context.stack.head['$idx'] = i;
          }
          chunk = body(chunk, context.push(elem[i], i, len));
        }
        if(context.stack.head) {
         context.stack.head['$idx'] = undefined;
         context.stack.head['$len'] = undefined;
        }
        return chunk;
      } 
      else if (skip) {
         return skip(this, context);
      }
     }
   }
   // true is truthy but does not change context
   else if (elem  === true) {
     if (body) { 
        return body(this, context);
     }
   }
   // everything that evaluates to true are truthy ( e.g. Non-empty strings and Empty objects are truthy. )
   // zero is truthy
   // for anonymous functions that did not returns a chunk, truthiness is evaluated based on the return value
   //
   else if (elem || elem === 0) {
     if (body) return body(this, context.push(elem));
   // nonexistent, scalar false value, scalar empty string, null,
   // undefined are all falsy
  } else if (skip) {
     return skip(this, context);
   }  
  return this;
};

Chunk.prototype.exists = function(elem, context, bodies) {
  var body = bodies.block,
      skip = bodies['else'];

  if (!dust.isEmpty(elem)) {
    if (body) return body(this, context);
  } else if (skip) {
    return skip(this, context);
  }
  return this;
};

Chunk.prototype.notexists = function(elem, context, bodies) {
  var body = bodies.block,
      skip = bodies['else'];

  if (dust.isEmpty(elem)) {
    if (body) return body(this, context);
  } else if (skip) {
    return skip(this, context);
  }
  return this;
};

Chunk.prototype.block = function(elem, context, bodies) {
  var body = bodies.block;

  if (elem) {
    body = elem;
  }

  if (body) {
    return body(this, context);
  }
  return this;
};

Chunk.prototype.partial = function(elem, context, params) {
  var partialContext;
  if (params){
    //put the params context second to match what section does. {.} matches the current context without parameters
    // start with an empty context
    partialContext = dust.makeBase(context.global);
    partialContext.blocks = context.blocks;
    if (context.stack && context.stack.tail){
      // grab the stack(tail) off of the previous context if we have it
      partialContext.stack = context.stack.tail;
    }
    //put params on
    partialContext = partialContext.push(params);
    //reattach the head
    partialContext = partialContext.push(context.stack.head);
  } else {
    partialContext = context;
  }
  if (typeof elem === "function") {
    return this.capture(elem, partialContext, function(name, chunk) {
      dust.load(name, chunk, partialContext).end();
    });
  }
  return dust.load(elem, this, partialContext);
};

Chunk.prototype.helper = function(name, context, bodies, params) {
  // handle invalid helpers, similar to invalid filters
  if( dust.helpers[name]){
   return dust.helpers[name](this, context, bodies, params);
  } else {
    return this;
  }
};

Chunk.prototype.capture = function(body, context, callback) {
  return this.map(function(chunk) {
    var stub = new Stub(function(err, out) {
      if (err) {
        chunk.setError(err);
      } else {
        callback(out, chunk);
      }
    });
    body(stub.head, context).end();
  });
};

Chunk.prototype.setError = function(err) {
  this.error = err;
  this.root.flush();
  return this;
};

function Tap(head, tail) {
  this.head = head;
  this.tail = tail;
}

Tap.prototype.push = function(tap) {
  return new Tap(tap, this);
};

Tap.prototype.go = function(value) {
  var tap = this;

  while(tap) {
    value = tap.head(value);
    tap = tap.tail;
  }
  return value;
};

var HCHARS = new RegExp(/[&<>\"\']/),
    AMP    = /&/g,
    LT     = /</g,
    GT     = />/g,
    QUOT   = /\"/g,
    SQUOT  = /\'/g;

dust.escapeHtml = function(s) {
  if (typeof s === "string") {
    if (!HCHARS.test(s)) {
      return s;
    }
    return s.replace(AMP,'&amp;').replace(LT,'&lt;').replace(GT,'&gt;').replace(QUOT,'&quot;').replace(SQUOT, '&#39;');
  }
  return s;
};

var BS = /\\/g,
    FS = /\//g,
    CR = /\r/g,
    LS = /\u2028/g,
    PS = /\u2029/g,
    NL = /\n/g,
    LF = /\f/g,
    SQ = /'/g,
    DQ = /"/g,
    TB = /\t/g;

dust.escapeJs = function(s) {
  if (typeof s === "string") {
    return s
      .replace(BS, '\\\\')
      .replace(FS, '\\/')
      .replace(DQ, '\\"')
      .replace(SQ, "\\'")
      .replace(CR, '\\r')
      .replace(LS, '\\u2028')
      .replace(PS, '\\u2029')
      .replace(NL, '\\n')
      .replace(LF, '\\f')
      .replace(TB, "\\t");
  }
  return s;
};

})(dust);

if (typeof exports !== "undefined") {
  if (typeof process !== "undefined") {
      require('./server')(dust);
  }
  module.exports = dust;
};
define("src/dust-core-1.2.3.js", function(){});

define('src/dust-templates',['src/dust-core-1.2.3.js'], function () {
	// src/tmpl/_footer.tmpl
	(function(){dust.register("src/tmpl/_footer",body_0);function body_0(chk,ctx){return chk;}return body_0;})();
	// src/tmpl/_header.tmpl
	(function(){dust.register("src/tmpl/_header",body_0);function body_0(chk,ctx){return chk.write("<header><div class=\"title\"><h1>Welcome to your first Mobify.js Mobile Page</h1><h2>As an initial example of content selection, we've selected the title of your site and placed it in _header.tmpl:</h2><p class=\"extract\">").reference(ctx.getPath(false,["header","title"]),ctx,"h").write("</p></div></header>");}return body_0;})();
	// src/tmpl/base.tmpl
	(function(){dust.register("src/tmpl/base",body_0);function body_0(chk,ctx){return chk.reference(ctx.get("doctype"),ctx,"h",["s"]).reference(ctx.get("$html"),ctx,"h",["openTag","s"]).reference(ctx.get("$head"),ctx,"h",["openTag","s"]).block(ctx.getBlock("baseScripts"),ctx,{"block":body_1},null).block(ctx.getBlock("head"),ctx,{"block":body_2},null).write("</head>").reference(ctx.get("$body"),ctx,"h",["openTag","s"]).block(ctx.getBlock("body"),ctx,{"block":body_3},null).block(ctx.getBlock("scripts"),ctx,{"block":body_5},null).write("</body></html>");}function body_1(chk,ctx){return chk.section(ctx.get("lib_import"),ctx,{},null).write("    ");}function body_2(chk,ctx){return chk.reference(ctx.get("$head"),ctx,"h",["innerHTML","s"]).write("<link rel=\"stylesheet\" href=\"").reference(ctx.getPath(false,["config","configDir"]),ctx,"h").write("style.css\" /><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no\" />");}function body_3(chk,ctx){return chk.partial("_header",ctx,null).block(ctx.getBlock("content"),ctx,{"block":body_4},null).partial("_footer",ctx,null);}function body_4(chk,ctx){return chk.reference(ctx.get("$body"),ctx,"h",["innerHTML","s"]);}function body_5(chk,ctx){return chk;}return body_0;})();
	// src/tmpl/home.tmpl
	(function(){dust.register("src/tmpl/home",body_0);function body_0(chk,ctx){return chk.write("<html><head></head><body><h1>Test</h1></body></html>");}return body_0;})();
});
require(["mobifyjs/capture", "mobifyjs/resizeImages", "src/dust-templates"], function(Capture, ResizeImages, Templates) {
    var Mobify = window.Mobify = window.Mobify || {};
    
    var capturing = window.Mobify && window.Mobify.capturing || false;
    if (capturing) {
        // Grab reference to a newly created document
        var capture = Capture.init(function(capture){
            var capturedDoc = capture.capturedDoc;
            // Resize images using Mobify Image Resizer
            // ResizeImages.resize(capturedDoc, 320);
            // Render source DOM to document
            dust.render("src/tmpl/home", {}, function(err, out){
                capture.render(out);
            });
        });
    }

}, undefined, true);
// relPath, forceSync
;
define("mobify", function(){});
}());