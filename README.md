# Mobify Client
---------------

### Usage
---------

* `mobify`: Print help text.
* `mobify init <project_name>`: Create a new project from the scaffold. Project name should match the project name on Mobify.
* `mobify preview`: Preview the current project.

        -h, --help                  output usage information
        -p, --port <port>           port to bind to
        -a, --address <address>     address to bind to
        -m, --minify                enable minification
        -t, --tag                   runs a tag injecting proxy (sudo)
        -u, --tag-version <version> version of the tags to use (6)

* `mobify push`: Uploads the current project to Portal.

        -h, --help                 output usage information
        -m, --message <message>    Message for build information
        -l, --label <label>        Label the build
        -t, --test                 Do a test build, do not upload
        -e, --endpoint <endpoint>  Set the API endpoint eg. https://portal.mobify.com/api/
        -u, --auth <auth>          Username and API Key eg. username:apikey
        -p, --project <project>    Override the project for a build




### Installation
----------------

The mobify client requires Node >= 0.6.2.

First remove any previously installed versions of the client:

    sudo npm -g remove mobify-client

Then install the client by running this command from Terminal. Use your email address and API key from Portal:

    sudo npm -g install mobify-client

Test that the client is install by running the `mobify` command in Terminal:

    $ mobify -V
    0.2.X

### Running the Tests
---------------------

    make tests

### Publish
---------------------

Note: you'll need to be an owner on NPM to publish.
    
    $ git status
    (ensure clean working directory)
    $ make archive
    (creates archive mobify-client.v.x.x.x.tgz)
    $ npm publish mobify-client.v.x.x.x.tgz


