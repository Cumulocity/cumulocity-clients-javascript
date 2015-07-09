module.exports = function (grunt) {
  'use strict';

  var _ = require('lodash');
  var apiFiles = [];
  var apiDeps = [];
  var allFiles = [];

  grunt.loadNpmTasks('grunt-contrib-uglify');

  grunt.config('uglify.minify', {
    options: {
      sourceMap: true
    },
    files: [{
      dest:  'build/main.js',
      src: apiFiles
    }]
  });

  grunt.config('uglify.minifyAll', {
    options: {
      sourceMap: true
    },
    files: [{
      dest:  'build/main.js',
      src: allFiles
    }]
  });

  grunt.registerTask('readConfig', function () {
    var json = grunt.file.readJSON('config.json');
    grunt.log.debug('Bower dependencies:');
    _.forEach(json.bowerDependencies, function (f) {
      grunt.log.debug(f);
      allFiles.push(f);
    });
    grunt.log.debug('API Files:');
    _.forEach(json.files, function (f) {
      var path = 'src/' + f;
      grunt.log.debug(path);
      apiFiles.push(path);
      allFiles.push(path);
    });
  });

  grunt.registerTask('minify', [
    'readConfig',
    'uglify:minify'
  ]);

  grunt.registerTask('minifyAll', [
    'readConfig',
    'uglify:minifyAll'
  ]);
};
