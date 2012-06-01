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

    npm -g remove mobify-js-tools

Then install the client by running this command from Terminal. Use your email address and API key from Portal:

    npm -g install https://<EMAIL>:<KEY>@portal.mobify.com/npm/mobify-js-tools/

Test that the client is install by running the `mobify` command in Terminal:

    $ mobify -V
    0.2.X

### Running the Tests
---------------------

    make tests


### Updating the base API Version
---------------------------------

1) Go in to `vendor/mobify-js/latest/base`, and checkout the version you want.

2) Commit your change to the submodule.

3) To "bake" the latest verison in to a named versioned (eg, 1.0) go:

    make bake VERSION=1.0

4) This will copy files out of the mobify-js submodule and into the tools repo. You must then commit them.


### Releasing a new version
---------------------------

1) Update the API, as above if necessary.

2) Update the CHANGELOG and project.json with new (higher) version number.

3) Make a new tools tarball:

    make

4) Copy new tarball to portal/protected and update symlink.