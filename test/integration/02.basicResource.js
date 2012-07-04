(function() {

var wnd = document.getElementsByTagName('iframe')[0].contentWindow;
try {
	var request = new XMLHttpRequest();  
	request.open('GET', '/end', false);  
	request.send();
	
	if (request.responseText.split('\n').length != 2)
		throw new Error('Resource leak');

	window.complete();
} catch (ex) {
	window.complete(ex);
}

})();
