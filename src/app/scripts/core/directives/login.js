(function () {
  angular.module('c8y.core').directive('c8yLogin', [
    'c8yCumulocity',
    c8yLogin
  ]);

  function c8yLogin(
    c8yCumulocity
  ) {
    function link(scope, elem) {
      elem.bind('click', function () {
        c8yCumulocity.login(
          scope.tenant(),
          scope.user(),
          scope.password(),
          scope.remember()
        ).then(scope.onSuccess).catch(scope.onFailure);
      });
    }

    return {
      restrict: 'A',
      link: link,
      scope: {
        tenant: '&',
        user: '&',
        password: '&',
        remember: '&',
        onSuccess: '&',
        onFailure: '&'
      }
    };
  }
})();
