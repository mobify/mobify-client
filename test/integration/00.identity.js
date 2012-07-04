(function() {

var wnd = document.getElementsByTagName('iframe')[0].contentWindow;
try {
	if (wnd.document.querySelectorAll('h1')[0].innerHTML != "h1")
		throw new Error('invalid header');

	if (wnd.document.querySelectorAll('title')[0].innerHTML != "title")
		throw new Error('invalid title');
	
	window.complete();
} catch (ex) {
	window.complete(ex);
}

})();
