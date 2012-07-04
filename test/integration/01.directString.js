(function() {

var wnd = document.getElementsByTagName('iframe')[0].contentWindow;
try {
	if (wnd.document.querySelectorAll('body')[0].innerHTML != "katze")
		throw new Error('invalid body');

	if (wnd.document.querySelectorAll('title')[0].innerHTML != "katze")

		throw new Error('invalid title');
	window.complete();
} catch (ex) {
	window.complete(ex);
}

})();
