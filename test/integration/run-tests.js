(function() {

window.log = function(value) {
	results.push(value);
	console.log(value);
};

var tests = location.search.match(/(^\?|&)tests=([^&]*)/,'')[2].split('+')
  , mode = location.search.match(/(^\?|&)mode=([^&]*)/,'')[2]
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
	var firstTest = tests.shift();
	advance = function() {
		window.location.href = '/tag/' + mode + '/' + firstTest + '.html?iter=0&perf=&tests=' + tests.join('+');
	};
	iframe.src = '/start/' + firstTest;
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