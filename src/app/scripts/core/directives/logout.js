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

      });
    }

    return {
      restrict: 'A',
      link: link
    };
  }
})();
