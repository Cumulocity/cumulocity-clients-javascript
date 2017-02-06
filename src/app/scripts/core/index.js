(function () {
  'use strict';
  angular.module('c8y.core', ['ngRoute', 'angularFileUpload', 'gettext'])
    .constant('c8yConfig', window.c8yConfig)
    .constant('gettextCatalog', {
      getString: function (a) {return a}
    });
})();
