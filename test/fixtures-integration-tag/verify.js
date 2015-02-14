(function() {
	// This file will validate state of page after tag/detector/konf have their
	// way with it. To validate the state, it needs to figure out what page it is,
	// and what is expected to happen on that page for the current device.

	// For example, a mobile device would be expected to capture content and
	// strictly limit number of requests it loads.
	// Meanwhile, desktop browsers are expected to not capture content,
	// load detector script and retain all existing page content.

	Mobify.api = 1; // Let tag know that unmobify is not needed

	// Since actual state tracking happens on server, errors have to be reported
	// via an HTTP request.
	var report = function(msg) {
		var url = 'http://' + location.hostname + ':1343/endTest';
		if (msg) url = url + '?msg=' + encodeURIComponent(msg);
		location.href = url;
		report = function(){};
	}

	// Once we successfully figure out what expectations the current page
	// should conform to, we want to terminate all processing and exit all loops
	// The simplest way to accomplish that is to throw a not-really-exception
	// object. Yes, it is the new goto.
	var success = {};


	// Recursive expectation validator, essentially a multilevel konf choose()
	// At every level, it chooses a branch to go into.
	// If branch contains subbranches, one will be chosen once again.
	// If branch contains only a function body, that function will be run,
	// and the search is ended.
	// If no branch can be chosen, checkBranch fails. In practice, this would
	// happen if it is invoked on unknown page, by unknown device, or in a 
	// similar 'everything is wrong' scenario.

	// Branches are chosen based on property matching a regular expression
	// or a test function. First parameter of a branch is the variable to be
	// tested, and second is a function or regexp that accepts or rejects the
	// value of property. checkBranch will walk into accepted branch, and will
	// skip rejected ones until it runs out of branches at current level.

	// checkBranch will not back out of a previously chosen branch if
	// all its subbranches fail. 

	var checkBranch = function(props, validators) {
		validators.forEach(function(validator) {
			if (validator instanceof Function) {
				try {
					validator();
				} catch (ex) {
					report(ex.toString());
				} finally {
					report();
					throw success;
				}
			} else if (validator.forEach) {
				var prop = validator[0];
				var filter = validator[1];
				if (filter.apply ? filter(props[prop]) : props[prop].match(filter)) {
					checkBranch(props, validator.slice(2));
				}
			}
		});
		throw new Error('Unknown testcase');
	}

	var verify = function() {
		try {
			var request = new XMLHttpRequest();  
			request.open('GET', '/__listRequests', false);  
			request.send();

			var requestList = request.responseText.split('\n');

			// Property values that will be used by checkBranch
			var props = {
				'ua' : navigator.userAgent
			  , 'path': location.pathname
			  , 'capture' : '' + !!(Mobify.transform || document.querySelectorAll('plaintext').length)
			  , 'reqs' : requestList.length // Number of HTTP requests
			};
			// This simple test suite we will handle only iPhone and desktop 
			// browsers. We should add support for Androids, and differentiate
			// between old/new ones (determines if window.stop() trick works)
			// and between handsets and tablets.
			checkBranch(props, [
				['path', /\/7firstload\.html$/
				  , ['ua', /iphone/i, function() {
						['capture', 'true', function() {
							// window.stop() trick should limit, but can't prevent leakage
							if (props.reqs >= 12) throw 'Leaked too much ' + props.reqs;
						}]
					}]
				  , ['capture', 'false', function() {
				  		// All content should properly load
				  		// 27 content requests + 1 file + 1 detector.js
						if (props.reqs !== 29) throw 'Failed to load normal desktop resources' + props.reqs;
					}]
			    ]
			  , ['path', /\/7secondload\.html$/
				  , ['ua', /iphone/i, 
				  		// After first page setting cookie through detector,
				  		// subsequent visits should leak nothing at all
						['capture', 'true', function() {
							if (props.reqs !== 2) throw 'Leaked at all' + props.reqs;
						}]
					]
				  , ['capture', 'false', function() {
				  		// 27 content requests + 1 file + 1 detector.js
						if (props.reqs !== 29) throw 'Failed to load normal desktop resources' + props.reqs;
					}]
				]
			]);
		} catch (ex) {
			if (ex !== success) {
				alert(ex.toString());
				window.console && console.error(ex);
			}
		}
	};
	if (document.readyState !== "loading") {
		window.addEventListener('load', verify, false);
	} else {
		verify();
	}
})();