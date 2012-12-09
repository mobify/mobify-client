#!/usr/bin/env coffee
program = require 'commander'

Utils = require './utils'
Commands = require './commands'


program
    .version(Utils.getVersion())

program
    .command('init <project_name>')
    .description('Initializes a project scaffold.')
    .option('-d, --directory <dir>', 'Directory to pull the project scaffold from')
    .action Commands.init

program
    .command('preview')
    .description('Runs a local server you can preview against.')
    .option('-p, --port <port>', 'port to bind to [8080]', parseInt, 8080)
    .option('-a, --address <address>', 'address to bind to [0.0.0.0]', '0.0.0.0')
    .option('-m, --minify', 'enable minification and strip logging code')
    .option('-s, --strip', 'strip logging code')
    .option('-t, --tag', 'runs a tag injecting proxy, requires sudo')
    .option('-u, --tag-version <version>', 'version of the tags to use [6]', '6')
    .action Commands.preview

program
    .command('push')
    .description('Builds and uploads the current project to Mobify Cloud.')
    .option('-m, --message <message>', 'message for bundle information')
    .option('-l, --label <label>', 'label the bundle')
    .option('-e, --endpoint <endpoint>', 'set the API endpoint eg. https://cloud.mobify.com/api/')
    .option('-u, --auth <auth>', 'username and API Key eg. username:apikey')
    .option('-p, --project <project>', 'override the project name in project.json for the push destination')
    .option('-x, --proxy <proxy url>', 'use the specified proxy. URL in the format http://[username:password@]PROXY_HOST:PROXY_PORT/')
    .action Commands.push

program
    .command('build')
    .description('Builds your project and places it into a bld folder')
    .action Commands.build

program
    .command('login')
    .description('Saves credentials to global settings.')
    .option('-u, --auth <auth>', 'Username and API Key eg. username:apikey')
    .action Commands.login


program.on '*', (command) ->
    console.log "Unknown command: '#{command}'."
    console.log "Get help and usage information with: mobify --help"

program.parse process.argv

# Print help if no command was given
if process.argv.length < 3
    process.stdout.write program.helpInformation()
