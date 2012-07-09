###

Ensure the default scaffold 'mobifies' correctly.


###
TAG_SERVER_URL = "http://127.0.0.1:1342"


exit = (status) ->
    phantom.exit status

page = new WebPage()
page.settings.userAgent = "iPhone"
page.open TAG_SERVER_URL, (status) ->
    if status isnt "success"
        console.log "Error: Could not open page."
        return exit 1

    mobifyjs_ready = ->
        outerHTML = page.evaluate ->
            document.documentElement.outerHTML

        needle = "Welcome to your first Mobify.js Mobile Page"
        status = if !!~outerHTML.indexOf needle then 0 else 1
        exit status

    setTimeout mobifyjs_ready, 5000