(function () {
  angular.module('c8y.sdk').directive('c8yLogin', [
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
          scope.rememberMe()
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
        rememberMe: '&',
        onSuccess: '&',
        onFailure: '&'
      }
    };
  }
})();
