(function () {
  'use strict';

  angular.module('c8y.core').directive('c8yBaseUrl', [
    'info',
    c8yBaseUrl
  ]);

  function c8yBaseUrl(
    info
  ) {
    function link(scope, elem, attrs) {
      info.baseUrl = attrs.c8yBaseUrl;
    }

    return {
      restrict: 'A',
      link: link
    };
  }
})();
