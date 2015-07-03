(function () {
  angular.module('c8y.core').directive('c8yRepeat', [
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
    function link(scope, elem, attrs, ctrl, transcludeFn) {
      var serviceName;

      function replaceWithNgRepeat() {
        var regex = /^\s*([^\s]+)\s*in\s*([^\s]+)\s*/;
        var matches = regex.exec(attrs.c8yRepeat);
        var varName = matches[1];
        serviceName = matches[2];

        elem.removeAttr('c8y-repeat');
        elem.removeAttr('data-c8y-repeat');
        elem.attr(
          'ng-repeat', varName + ' in serviceResult track by ' +
          varName + '.id'
        );

        transcludeFn(scope.$parent.$new(), function (transcludeElem) {
          elem.append(transcludeElem);
        });

        $compile(elem)(scope);
      }

      function assingRefreshFunction() {
        scope.refresh = fetchResults;
      }

      function fetchResults() {
        if ($rootScope.c8y && $rootScope.c8y.user) {
          callService().then(function (result) {
            scope.serviceResult = result;
          });
        }
      }

      function callService() {
        var filter = scope.filter || {};
        switch(serviceName) {
          case 'inventory':
            return $injector.get('c8yInventory').list(filter).then(function (res) { return res.data; });
          default:
            return $injector.get('c8y' + capitalize(serviceName)).list(filter);
        }
      }

      function capitalize(s) {
        return s[0].toUpperCase() + s.slice(1);
      }

      function init() {
        replaceWithNgRepeat();
        assingRefreshFunction();

        $rootScope.$on('c8y.api.login', function () {
          fetchResults();
        });

        scope.$watch('filter', fetchResults, true);
      }

      init();
    }

    return {
      restrict: 'A',
      link: link,
      transclude: true,
      scope: {
        filter: '=?c8yFilter',
        refresh: '=?c8yRefresh'
      }
    };
  }
})();
