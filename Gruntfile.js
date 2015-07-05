module.exports = function (grunt) {
  'use strict';

  var _ = require('lodash');
  var files = [];

  grunt.loadNpmTasks('grunt-contrib-uglify');

  grunt.config('uglify.build', {
    options: {
      mangle: false,
      beautify: true,
      sourceMap: true
    },
    files: [{
      dest:  'build/main.js',
      src: files
    }]
  });

  grunt.registerTask('readConfig', function () {
    var json = grunt.file.readJSON('config.json');
    _.forEach(json.bowerDependencies, function (f) {
      files.push(f);
    });
    _.forEach(json.files, function (f) {
      files.push('src/' + f);
    });
  });

  grunt.registerTask('build', [
    'readConfig',
    'uglify:build'
  ]);
};
