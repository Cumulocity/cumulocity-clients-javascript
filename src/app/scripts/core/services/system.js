/**
 * Created by jzolnowski on 25.05.15.
 */
/**
 * @ngdoc service
 * @name c8y.core.service:c8ySystem
 * @requires c8y.core.service:c8yBase
 * @requires $http
 * @requires $q
 * @requires info
 *
 * @description
 * This service allows for fetch system properties.
 */
angular.module('c8y.core')
  .factory('c8ySystem', ['$http', '$q', 'c8yBase', '$window',
    function ($http, $q, c8yBase, $window) {
      'use strict';
      var path = 'tenant/system/options/system/version';

      /**
       * @ngdoc function
       * @name getBackendVersion
       * @methodOf c8y.core.service:c8ySystem
       *
       * @description
       * Get backend version provided via system cluster properties
       *
       * @returns {Object} Returns object containing backend version
       *
       * @example
       * <pre>
       *   c8ySystem.getBackendVersion().then(function (response) {
   *     $scope.backendVersion = response.value;
   *   });
       * </pre>
       */
      function getBackendVersion() {
        var url = c8yBase.url(path);
        return $http.get(url).then(c8yBase.getResData);
      }

      /**
       * @ngdoc function
       * @name getUIVersion
       * @methodOf c8y.core.service:c8ySystem
       *
       * @description
       * Get UI version from the package.json
       *
       * @returns {Number} Returns version of the UI.
       *
       * @example
       * <pre>
       *   c8ySystem.getUIVersion().then(function (version) {
   *     $scope.uiVersion = version;
   *   });
       * </pre>
       */
      function getUIVersion() {
        return $q.when($window.UI_VERSION || 'dev');
      }

      return {
        getBackendVersion: getBackendVersion,
        getUIVersion: getUIVersion
      };

    }]);
