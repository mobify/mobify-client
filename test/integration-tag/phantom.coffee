TAG_SERVER_URL = "http://127.0.0.1:1341/"

exit = (status) ->
    phantom.exit status

page = new WebPage()
page.settings.userAgent = "iPhone"
page.open TAG_SERVER_URL, (status) ->
    if status isnt "success"
        console.log "Error: Could not open page."
        return exit 1