(function () {
  angular.module('c8y.core').directive('c8yLogout', [
    'c8yCumulocity',
    c8yLogout
  ]);

  function c8yLogout(
    c8yCumulocity
  ) {
    function link(scope, elem) {
      elem.bind('click', function () {
        c8yCumulocity.logout();
        scope.ngClick();
      });
    }

    return {
      priority: 1,
      terminal: true,
      restrict: 'A',
      link: link,
      scope: {
        ngClick: '&'
      }
    };
  }
})();
