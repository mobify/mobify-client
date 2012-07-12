(function() {

var wnd = document.getElementsByTagName('iframe')[0].contentWindow;
try {
	var request = new XMLHttpRequest();  
	request.open('GET', '/end', false);  
	request.send();
	
	ok(request.responseText.split('\n').length == 2, "resource leak")
	start();
} catch (ex) {
	ok(false, 'unexpected exception')
}

})();
