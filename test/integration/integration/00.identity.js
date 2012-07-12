(function() {

var wnd = document.getElementsByTagName('iframe')[0].contentWindow;
try {
	ok(wnd.document.querySelectorAll('h1')[0].innerHTML == "h1", 'invalid body');
	ok(wnd.document.querySelectorAll('title')[0].innerHTML == "title", 'invalid title');

	start();
} catch (ex) {
	ok(false, 'unexpected exception')
}

})();
