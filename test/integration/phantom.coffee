TAG_SERVER_URL = "http://127.0.0.1:1342"

page = new WebPage()
page.settings.userAgent = "iPhone"
page.open TAG_SERVER_URL, (status) ->
    if status isnt "success"
        console.log "Error: Could not open page."
        return phantom.exit 1

    mobifyjs_ready = ->
        outerHTML = page.evaluate ->
            document.documentElement.outerHTML

        needle = "Welcome to your first Mobify.js Mobile Page"
        status = if !!~outerHTML.indexOf needle then 0 else 1
        phantom.exit status

    setTimeout mobifyjs_ready, 1000