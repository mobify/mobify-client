Compass = require './compass.coffee'
Build = require './build.coffee'
Preview = require './preview.coffee'

Preview.registerPlugin CompassPlugin
Build.registerPlugin CompassPlugin
