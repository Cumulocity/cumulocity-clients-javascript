(function () {
  angular.module('c8y.sdk').directive('c8yLogout', [
    'c8yCumulocity',
    c8yLogout
  ]);

  function c8yLogout(
    c8yCumulocity
  ) {
    function link(scope, elem) {
      elem.bind('click', function (event) {
        c8yCumulocity.logout();
        scope.ngClick();
        event.stopPropagation();
      });
    }

    return {
      priority: 1,
      restrict: 'A',
      link: link,
      scope: {
        ngClick: '&'
      }
    };
  }
})();
