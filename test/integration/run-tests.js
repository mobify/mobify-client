(function() {

window.log = function(value) {
	results.push(value);
	console.log(value);
};

var tests = location.search.match(/(^\?|&)tests=([^&]*)/,'')[2].split('+')
  , mode = location.search.match(/(^\?|&)mode=([^&]*)/,'')[2]
  , remainingTests = tests.slice()
  , iframe = document.createElement('iframe')
  , results = []
  , advance;

window.addEventListener('message', function (ev) {
	if (ev.data != "ready" || ev.source != iframe.contentWindow)
		throw new Error("Wrong message or origin");
	
	advance();
}, false);

document.body.appendChild(iframe);
iframe.addEventListener("load", function() {
	function inject() {
		var old = document.close;
		if (old.toString().match('postMessage')) return;

		document.close = function () {
			parent.postMessage('ready', '*');
			return old.apply(this, arguments);
		}
	}
	iframe.contentWindow.eval('(' + inject + ')()');
}, false);

if (mode == 'performance') {
	var runTest = function() {
		if (!remainingTests.length) {
			var request = new XMLHttpRequest();
			request.open('POST', '/submit', true);  
			request.send(results.join('\n'));
			return;
		}

		var testName = remainingTests.shift()
		  , timingPoints = []
		  , deferred
		  , suite = new Benchmark.Suite();

		advance = function() {
			var MobifyObj = iframe.contentWindow.Mobify;
			MobifyObj && MobifyObj.timing && timingPoints.push(MobifyObj.timing.points);
			
			deferred
				? (deferred.resolve(), deferred = undefined)
				: suite.run({async: true});
		};
		iframe.src = '/start/' + testName;

		suite.add(testName, { initCount: 1, minSamples: 250, defer: true, fn: function(defer) {
			deferred = defer;
			iframe.src = '/tag/' + mode + '/' + testName + '.html?' + +new Date;
		}}).on('cycle', function(event) {
			log(String(event.target));
		}).on('complete', function() {
			window.analyzeDeltas(timingPoints);			
			runTest();
		})
	};
	runTest();
} else {
	document.getElementById("qunit").style.display = "block";
	tests.forEach(function(testName) {
		asyncTest(testName, function() {
			var ready;
			advance = function() {
				if (ready) {
					var script = document.createElement('script');
					var firstScript = document.getElementsByTagName('script')[0];
					script.src = mode + '/' + testName + '.js';
					firstScript.parentNode.insertBefore(script, firstScript);					
				} else {
					iframe.src = '/tag/' + mode + '/' + testName + '.html?' + +new Date;
					ready = true;
				}
			}			
			iframe.src = '/start/' + testName;
		});
	});	
};

})();