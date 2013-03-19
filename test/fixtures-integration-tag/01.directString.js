(function() {

var wnd = document.getElementsByTagName('iframe')[0].contentWindow;
try {
	ok(wnd.document.querySelectorAll('body')[0].innerHTML == "katze", 'invalid body');
	ok(wnd.document.querySelectorAll('title')[0].innerHTML == "katze", 'invalid title');

	start();
} catch (ex) {
	ok(false, 'unexpected exception')
}

})();
