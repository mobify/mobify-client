(function() {
	Mobify.api = 1; // Let tag know that unmobify is not needed

	var report = function(msg) {
		var url = 'http://' + location.hostname + ':1343/endTest';
		if (msg) url = url + '?msg=' + encodeURIComponent(msg);
		location.href = url;
		report = function(){};
	}

	var success = {};

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
		debugger;
		throw new Error('Unknown testcase');
	}

	var verify = function() {
		try {
			var props = {
				'ua' : navigator.userAgent
			  , 'path': location.pathname
			  , 'capture' : '' + !!(Mobify.transform || document.querySelectorAll('plaintext').length)
			  , 'reqs' : (function() {
					var request = new XMLHttpRequest();  
					request.open('GET', '/__listRequests', false);  
					request.send();

					return request.responseText.split('\n').length;
				})()
			};

			checkBranch(props, [
				['path', /\/7firstload\.html$/
				  , ['ua', /iphone/i, function() {
						['capture', 'true', function() {
							if (props.reqs >= 12) throw 'Leaked too much ' + props.reqs;
						}]
					}]
				  , ['capture', 'false', function() {
				  		// 27 requests + 1 file + 1 detector.js
						if (props.reqs !== 29) throw 'Failed to load normal desktop resources' + props.reqs;
					}]
			    ]
			  , ['path', /\/7secondload\.html$/
				  , ['ua', /iphone/i, 
						['capture', 'true', function() {
							if (props.reqs !== 2) throw 'Leaked at all' + props.reqs;
						}]
					]
				  , ['capture', 'false', function() {
				  		// 27 requests + 1 file + 1 detector.js
						if (props.reqs !== 29) throw 'Failed to load normal desktop resources' + props.reqs;
					}]
				]
			]);
		} catch (ex) {
			console.log(ex);
			// Found and verified a single testing branch
		}
	};
	if (document.readyState !== "loading") {
		window.addEventListener('load', verify, false);
	} else {
		verify();
	}
})();