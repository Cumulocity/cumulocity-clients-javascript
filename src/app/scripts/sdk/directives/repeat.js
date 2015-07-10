(function () {
  angular.module('c8y.sdk').directive('c8yRepeat', [
    '$injector',
    '$compile',
    '$rootScope',
    c8yRepeat
  ]);

  function c8yRepeat(
    $injector,
    $compile,
    $rootScope
  ) {
    function link(scope, elem, attrs) {
      var serviceName, ngRepeatLink, parentScope;

      function replaceWithNgRepeat() {
        var regex = /^\s*([^\s]+)\s*in\s*([^\s]+)\s*/;
        var matches = regex.exec(attrs.c8yRepeat);
        var varName = matches[1];
        serviceName = matches[2];

        elem.removeAttr('c8y-repeat');
        elem.removeAttr('data-c8y-repeat');
        elem.attr(
          'ng-repeat', varName + ' in __c8y_serviceResult track by ' +
          varName + '.id'
        );

        ngRepeatLink = $compile(elem);
      }

      function assignRefreshFunction() {
        scope.refresh = fetchResults;
      }

      function fetchResults() {
        if ($rootScope.c8y && $rootScope.c8y.user) {
          callService().then(function (result) {
            parentScope.__c8y_serviceResult = result;
          });
        }
      }

      function callService() {
        var filter = scope.filter || {};
        return $injector.get('c8y' + capitalize(serviceName)).list(filter);
      }

      function capitalize(s) {
        return s[0].toUpperCase() + s.slice(1);
      }

      function init() {
        parentScope = scope.$parent;
        ngRepeatLink(parentScope);
        assignRefreshFunction();

        $rootScope.$on('c8y.api.login', function () {
          fetchResults();
        });

        scope.$watch('filter', fetchResults, true);
      }

      replaceWithNgRepeat();
      init();
    }

    return {
      restrict: 'A',
      link: link,
      transclude: false,
      scope: {
        filter: '=?',
        refresh: '=?'
      }
    };
  }
})();
