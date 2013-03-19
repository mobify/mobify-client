var report = function(msg) {
	var url = 'http://' + location.hostname + ':1343/endTest';
	if (msg) url = url + '?msg=' + encodeURIComponent(msg);
	location.href = url;
	report = function(){};
}

var countRequests = function() {
	var request = new XMLHttpRequest();  
	request.open('GET', '/listRequests', false);  
	request.send();

	return request.responseText.split('\n').length;
}

try {
	debugger;
	if (location.pathname.match(/7firstload\.html$/)) {
		(countRequests() < 12) || report('Leaked too much');
	} else if (location.pathname.match(/7secondload\.html$/)) {
		(countRequests() == 2) || report('Should not have leaked at all');
	} else throw new Error('unexpected testcase')
	report();
	
} catch (ex) {
	report('unexpected exception')
}
report();