(function () {
  'use strict';

  checkGettextModule();

  angular.module('c8y.core', ['ngRoute', 'angularFileUpload', 'gettext'])
    .constant('c8yConfig', window.c8yConfig);

  function checkGettextModule() {
    try {
      angular.module('gettext');
    } catch (e) {
      angular.module('gettext', [])
        .constant('gettext', identity)
        .constant('gettextCatalog', {
          getString: identity
        });
    }
  }

  function identity(str) {
    return str;
  }
})();
