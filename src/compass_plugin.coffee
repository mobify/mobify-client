Compass = require './compass.coffee'
Build = require './build.coffee'
Preview = require './preview.coffee'

Preview.registerPlugin Compass.plugin
Build.registerPlugin Compass.plugin
