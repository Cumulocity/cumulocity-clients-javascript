(function () {
  'use strict';
  angular.module('c8y.core', ['ngRoute','angularFileUpload'])
    .constant('c8yConfig', window.c8yConfig)
    .constant('gettextCatalog', {
      getString: function (a) {return a}
    });
})();
