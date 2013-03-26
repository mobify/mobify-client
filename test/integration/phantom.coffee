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

        needles = [ "Welcome to your first Mobify.js Mobile Page", "Horus Isis Osiris" ]
        for needle in needles
            if !~outerHTML.indexOf needle then return exit 1

        return exit 0

    setTimeout mobifyjs_ready, 5000