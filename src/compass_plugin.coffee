Compass = require './compass.coffee'
Build = require './build.coffee'
Preview = require './preview.coffee'

Build.registerPlugin Compass.plugin
Preview.registerPlugin Compass.plugin