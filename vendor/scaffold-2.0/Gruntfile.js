// http://stackoverflow.com/questions/13567312/working-project-structure-that-uses-grunt-js-to-combine-javascript-files-using-r
var fs = require("fs");

/*global module:false*/
module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        lint: {
            files: ['grunt.js', 'src/**/*.js', 'tests/**/*.js']
        },
        // qunit: {
        //     all: {
        //       options: {
        //         urls: [
        //           'http://localhost:3000/tests/mobify-library.html',
        //           'http://localhost:3000/tests/capture.html',
        //           'http://localhost:3000/tests/jazzcat.html',
        //           'http://localhost:3000/tests/resizeImages.html',
        //           'http://localhost:3000/tests/unblockify.html',
        //         ]
        //       }
        //     }
        // },
        connect: {
            server: {
                options: {
                    hostname: '0.0.0.0',
                    port: 8080,
                    base: '.',
                }
            },
        },
        requirejs: {
            // Building mobify.js
            full: {
                options: {
                    almond: true,
                    mainConfigFile: "./config.js",
                    optimize: "none",
                    keepBuildDir: true,
                    name: "mobify",
                    out: "./build/mobify.js",
                }
            },
        },
        uglify: {
            full: {
                files: {
                    'build/mobify.min.js': ['build/mobify.js']
                }
            },
        },
        watch: {
            files: ["src/**/*",
                  "mobify.js"
            ],
            tasks: ['build'],
        },
        dust: {
            templates: {
                files: {
                    'src/dust-templates.js': 'src/**/*.tmpl'
                },
                options: {
                    relative: true,
                    amd: {
                        deps: ['src/dust-core-1.2.3.js']
                    }
                }
            },
        }
    });

    grunt.loadNpmTasks('grunt-requirejs');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-qunit');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-dust');

    grunt.registerTask('test', ['connect', 'qunit']);
    grunt.registerTask('build', ["dust:templates", "requirejs:full", "uglify:full"]);
    grunt.registerTask('default', 'build');
    grunt.registerTask('preview', ['connect', 'watch']);
    grunt.registerTask('serve', 'preview');
};
