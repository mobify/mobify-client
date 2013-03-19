/*
Detector script, runs synchronously once per domain, and is loaded async ever after (or until cookie expires)
Subsequent loads are still essential (for they tell us the actual adaptation URL), but are async now.

Our minification optimizations are less aggressive/unreadable here, as we are not asking people to plop this code right into their HTML.
*/

(function(params) {
	Mobify.ajs = params.ajs;
	Mobify.detector = 1; // Flag used by bootstrap tag to identify successful load of detector

	var doc = document
	  , firstScript = doc.getElementsByTagName('script')[0]
      , paths = params.detect && params.detect() || [0, params.ajs]
      , unmobifyUrl = '//cdn.mobify.com/unmobify2.js'
      , isPreviewish = function(cookie) {
      		return cookie && !isNaN(parseInt(cookie)) && isNaN(+cookie)
      }
	  , getParam = function(key, source) {
	  		var re = new RegExp('(; |^)mobify-' + key + '=([^;]*)');
	  		var match = source.match(re);
	  		if (!match) return;

			return decodeURIComponent(match[2]);
		}
	  , setCookieParam = function(key, value) {
	  		// Differs from bootstrap tag version, as it is now reenterant and permits arbitrary values
	  		// If a host is defined, we use it with no broadening or narrowing
	  		// Otherwise, we use broadest one that lets us set the cookie
	  		// TODO: re-add clearing and expiry date capability
			var host = cookieHost ? [ cookieHost ] : location.host.split(':')[0].split('.')
			  , i = host.length
			  , encodedValue = encodeURIComponent(value);

			debugger;

	    	while (i-- && (getParam(key, doc.cookie) !== '' + value)) {
	    		doc.cookie = 'mobify-' + key + '=' + encodedValue
	    			+ '; domain=.' + host.slice(i).join('.') + '; path=/';
	    	}
	    }
      , next = function() {
		    var src = paths.shift() || 1;
		    if (Mobify.api || +src) {
		        ~src || setCookieParam('capture', '')
		    } else {
		        var script = doc.createElement('script');
		        script.src = src;
		        script.onload = script.onerror = next;
		        script.className = "mobify-ignore";
		        firstScript.parentNode.insertBefore(script, firstScript);
		    }
		}
	  , guardPaths = function(captureCookie) {
	  		var newPaths = [].slice.call(captureCookie.split(/(^-?\d*)/), 1);
	  		newPaths[0] = +newPaths[0];
	  		newPaths[1] = '//preview.mobify.com/v7/' + escape(newPaths[1]);
	  		newPaths[2] = 1;
	  		return newPaths;
	    }
	  , cookieHost
	  , hostPatterns = params.hostPatterns || [];

	for (var i = 0, host = location.host, hostPattern; !cookieHost && (i++ < hostPatterns.length);) {
		hostPattern = hostPatterns[i];
		cookieHost = hostPattern.apply ? hostPattern(host) : (host.match(hostPattern) || 0)[0];
	}

	var captureCookie = getParam('capture', doc.cookie);


	// Note that this name check includes =, while equivalent in tag does not
	// This is intentional, as it allows name 'mobify-capture' to trigger redetection
	// without forcing specific values

	var previewInit = (0 === window.name.indexOf("mobify-capture="));
	var isSynchronous = doc.querySelectorAll && doc.querySelectorAll('script[src$="#msd"]').length;

	// Detection

	// TODO: consider multidomain walking. That may change name parameter storage,
	// and require redirection after init for all but the last page.

	if (previewInit) {
		// Received a name from preview.
		// Should rely name rather than on detector function when deciding what to load
		// Also, should store that result in a cookie, as names are tamperable 
		captureCookie = getParam('capture', window.name);
		var nextTarget = getParam('target', window.name);
		if (!nextTarget) {
			window.name = "";
		} else {
			// Eat only the first target. Name might have several. All are called alike,
			// and rely on grab-first behavoir of getParam to be gradually consumed.
			window.name = window.name.replace(/mobify-target=[^;]*[;\s]*/, '');
			setTimeout(function() {
				location.href = nextTarget;
			});
		}
	} else if (captureCookie !== "" && !isPreviewish(captureCookie)) {
		// mobify-capture="" is explicit optout through user action. We respect that
		// mobify-capture="1" or "0" is a fruit of detection, overrideable by future detection scripts.
		// (this may happen if detection rules are updated but old cookie persists)

		// Store output of detection functions for future bootstrap tag invocations.
		// Now, bootstrap will not need to ask this script to know if it needs <plaintext>.
		captureCookie = paths[0];
	}
	setCookieParam('capture', captureCookie);
	
	// Want a <plaintext> but did not get one from the bootstrap
	if (isSynchronous && parseInt(captureCookie)) { 
    	doc.write('<plaintext style="display:none">');
    	doc.addEventListener('DOMContentLoaded', function() {
    		window.stop && window.stop();
    		interpretCookie(); // Delayed to prevent interruption of script/iframe loads by stop()
    	}, false);
	} else {
		interpretCookie();
	}	
	

	// If needed, replace current path(s) to load with ones from the cookie. 
	// May involve iframe interrogation if operating in one tab mode.
	function interpretCookie() {
		if (isPreviewish(captureCookie)) {
			var candidatePaths = guardPaths(captureCookie);

			// Here, we specialize the first detector field. 1 means all tabs, 2 means one tab
			// One tab mode relies on consulting oracle iframe on preview, which is asynchronous
			if (((candidatePaths[0] === 2) || (candidatePaths[0] === -1))
					&& ('onmessage' in window) && ('sessionStorage' in window)) {
				var iframe = document.createElement('iframe');
				iframe.src = "https://preview.mobify.com/tabPreviewing.html";
				iframe.setAttribute('style', 'display: none;')
				iframe.className = "mobify-ignore";
				document.getElementsByTagName('head')[0].appendChild(iframe);

				window.addEventListener("message", function(ev) {
					if (ev.source !== iframe.contentWindow) return;
					if (ev.data === "accept") paths = candidatePaths;
					loadScripts();
				}, false);
			} else { // All tab mode just treats cookie path as one true way
				paths = candidatePaths;
				loadScripts();
			}			
		} else {
			loadScripts();
		}
	}

	// Actually load those damn scripts. The only scary complication here is that scripts
	// might expect a different case of capturing than provided. 
	function loadScripts() {
		var actuallyCapturing = !!document.getElementsByTagName('plaintext').length;
		var wantsCapturing = paths.shift() > 0;
		
		if (wantsCapturing) paths.push(unmobifyUrl, -1);

		if (wantsCapturing && !actuallyCapturing) {
			// When we are not capturing, even though detector/preview cookie would like to
			// Will typically happen when a desktop opt-out link was activated. If so, we just
			// load the normal a.js analytics

			paths = [params.ajs];
		} else if (!wantsCapturing && actuallyCapturing) {
			// Fix things up when forcing capturing in preview in one tab mode,
			// and then loading an independent tab.

			// When this happens, plaintext will catch content, but then oracle iframe
			// will tell us that capturing was not needed at all.
			// So, we unmobify and lose analytics or other light transforms.
			// This should not matter as we are in preview... unless we start previewing
			// light and heavy transforms side by side in separate tabs within same browser.

			// If so, this can be improved by rerunning light transforms AFTER unmobify 			
			paths = [unmobifyUrl];
		}
		
		setTimeout(next);
	}

})({
	detect: function() {
	    return [1, 'http://' + location.hostname + ':8080/verifyV7.js'];
	}
});