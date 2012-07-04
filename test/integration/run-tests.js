var tests = location.search.replace(/^\?tests=/,'').split('+');
var log = document.getElementById('testLog');
var Repeat = 5, repeat;
var iter = 0;
var perf = [];
var innerWin, test;
var result = {};

window.addEventListener('message', function(ev) {
	if (ev.data != "ready" || ev.source != innerWin) throw new Error("Wrong message or origin");
	if (repeat > 1) {
		result[test] = result[test] || [];
		result[test].push(innerWin.Mobify.timing.points);
		window.complete();
	} else {
		var script = document.createElement('script');
		var firstScript = document.getElementsByTagName('script')[0];
		script.src = test + '.js';
		firstScript.parentNode.insertBefore(script, firstScript);
	}

}, false);

window.nextTest = function(testPerf) {
	if (typeof testPerf == "boolean") {
		repeat = testPerf ? Repeat : 1;
		document.body.className += 'running';
	}

	if (iter == 0) {
		test = tests.shift();
		if (!test) {
			log.innerHTML += "\nCompleted test harness";
			console.log(result);
			return;
		} else {
			log.innerHTML += "\nRunning test " + test + (repeat > 1 ? " x" + repeat : '') + '... ';
		}
	}

	iter = ++iter % repeat;

	var iframe = document.createElement('iframe');
	iframe.src = '/start/' + test + '?redir=/tag/' + test + '.html';
	document.body.appendChild(iframe);
	
	innerWin = iframe.contentWindow;
	innerWin.addEventListener("load", function() {
		var injectable = function() {
			var old = document.close;
			document.close = function () {
				parent.postMessage('ready', '*');
				return old.apply(this, arguments);
			}
		}
		innerWin.eval('(' + injectable + ')()');
	}, false);
}

window.complete = function(ex) {
	if (!ex) {
		log.innerHTML += "+";
		var iframe = document.getElementsByTagName('iframe')[0];
		if (iframe) iframe.parentNode.removeChild(iframe);
		window.nextTest();
	} else {
		debugger;
		log.innerHTML += "Failed\n" + ex.message;
	}
	
}