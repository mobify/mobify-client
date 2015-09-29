# Mobify Client

The Mobify Client is a command line tool for building and deploying Mobify.js projects.

## Usage

* `mobify`: Print help text.

* `mobify init <project_name>`: Create a new project from the scaffold.

* `mobify preview`: Runs a local server which dynamically builds the project.

        -h, --help                  output usage information
        -p, --port <port>           port to bind to [8080]
        -s, --sslPort <sslPort>     ssl port to bind to [8443]
        -a, --address <address>     address to bind to [0.0.0.0]
        -m, --minify                enable minification
        -t, --tag                   runs a tag injecting proxy, requires sudo
        -u, --tag-version <version> version of the tags to use with tag injection [6]

* `mobify build`: Builds the project and places it into a bld folder.

* `mobify push`: Builds and uploads the project to the Mobify Cloud.

        -h, --help                 output usage information
        -m, --message <message>    message for build information
        -l, --label <label>        label the build
        -e, --endpoint <endpoint>  set the API endpoint
        -u, --auth <auth>          username and API Key
        -p, --project <project>    override the project name for push endpoint

* `mobify login`: Saves Mobify Cloud credentials to global settings.

        -h, --help                 output usage information
        -u, --auth <auth>          username and API Key eg. username:apikey


## Installation

The Mobify Client supports Node 0.6.2 to 0.12.x 

### Install from NPM

Remove previously installed versions of the client:

    $ sudo npm -g remove mobify-client

Install the client:

    $ sudo npm -g install mobify-client

Test the client is installed:

    $ mobify -V
    0.3.X

### Install from Source

To checkout the source from GitHub and install dependencies:

    git clone https://github.com/mobify/mobify-client/
    cd mobify-client
    make install

Test the client is installed:

    $ bin/mobify.js -V
    0.3.X

The source installed version of the client is available via the `mobify.js` command. this makes it easier to run both source and NPM versions of the client simultaneously. Add `:path/mobify-client/bin` to `$PATH` to run the `mobify.js` command from anywhere.

## Contributing

Create a branch and submit a pull request to this repo!

### Reporting a bug

File an issue!

### Running the tests

    make tests

### Publish
---------------------

Make sure you modify the changelog.

Note: you'll need to be an owner on NPM to publish.
    
    $ git status
    (ensure clean working directory)
    $ make archive
    (creates archive mobify-client.v.x.x.x.tgz)
    $ npm publish mobify-client.v.x.x.x.tgz
