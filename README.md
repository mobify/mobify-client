# Mobify Client
---------------

Mobify Client is a tool that builds Mobify.js projects, and (optionally) pushes them to the Mobify Cloud.

This repository contains the Mobify.js API as a set of submodules, which can be found in vender/mobify-js.
There are three versions - 1.0, 1.1 (default), and 1.2, which are all submodules that reference different
branches on the Mobify.js repository, which can be found here:

https://github.com/mobify/mobifyjs

### Usage
---------

* `mobify`: Print help text.

* `mobify init <project_name>`: Create a new project from the scaffold. Project name should match the project name on Mobify.

* `mobify preview`: Runs a local server you can preview against.
        -h, --help                  output usage information
        -p, --port <port>           port to bind to [8080]
        -a, --address <address>     address to bind to [0.0.0.0]
        -m, --minify                enable minification
        -t, --tag                   runs a tag injecting proxy, requires sudo
        -u, --tag-version <version> version of the tags to use with tag injection [6]

* `mobify build`: Builds your project and places it into a bld folder

* `mobify push`: Builds and uploads the current project to Cloud.
        -h, --help                 output usage information
        -m, --message <message>    Message for build information
        -l, --label <label>        Label the build
        -t, --test                 Do a test build, do not upload
        -e, --endpoint <endpoint>  Set the API endpoint eg. https://cloud.mobify.com/api/
        -u, --auth <auth>          Username and API Key eg. username:apikey
        -p, --project <project>    Override the project name in project.json for the push destination

* `mobify login`: Saves Mobify Cloud credentials to global settings.
        -h, --help                 output usage information
        -u, --auth <auth>  Username and API Key eg. username:apikey


### Installation
----------------

The mobify client requires Node >= 0.6.2. 

#### Install from npm repo
--------------------------

First remove any previously installed versions of the client:

    sudo npm -g remove mobify-client

Then install the client by running this command from Terminal. 

    sudo npm -g install mobify-client

Test that the client is installed by running the `mobify` command in Terminal:

    $ mobify -V
    0.3.X

#### Install from source
------------------------

If you're a developer, and you would like to fix a bug/contribute to the Mobify.js project, you'll have to
checkout the source code:

    git clone https://github.com/mobify/mobify-client/
    cd mobify-client

After you have the code, you must install the node dependencies:

    npm install

You also need to install the submodule dependancies, which are just different versions of the Mobify.js API, which are
installed in vender/mobify-js:

    git submodule init; git submodule update

Versions 1.1 and 1.2 of the API also have node and git submodule dependancies:

    cd vendor/mobify-js/1.1/base/; npm install; git submodule init; git submodule update
    cd vendor/mobify-js/1.2/base/; npm install; git submodule init; git submodule update

Test that the client is installed by running the `mobify.js` command in the Terminal:
    
    $ bin/mobify.js -V
    0.3.X

You should add <your-path>/mobify-client/bin to your $PATH.

You also may have noticed that the command in this scenario is `mobify.js`, not `mobify`. This is just to make it easier to run
both from source and from the public npm repository simultaneously.


### Running the Tests
---------------------

    make tests


### License
----------

The MIT License (MIT)

Copyright (c) Mobify R&D Inc.
http://www.mobify.com/

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
