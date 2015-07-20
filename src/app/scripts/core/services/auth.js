/**
 * @ngdoc service
 * @name c8y.core.service:c8yAuth
 * @requires app.service:info
 * @requires $location
 * @requires $window
 *
 * @description
 * This service handles authentication.
 */
angular.module('c8y.core')
.factory('c8yAuth', ['$location', '$window', 'info', function ($location, $window, info) {
  'use strict';

  var token = info.token,
    TOKEN_KEY = '_tcy8';

  function decodeToken(token) {
    var decoded = atob(token),
      split = decoded.match(/(([^\/]*)\/)?([^\/:]+):(.+)/);

    return {
      tenant: split[2],
      user: split[3],
      password: split[4]
    };
  }

  function encodeToken(user, password, tenant) {
    tenant = tenant ? tenant + '/' : '';
    return btoa( tenant + user  + ':' + password);
  }

  /**
   * @ngdoc function
   * @name updatePassword
   * @methodOf c8y.core.service:c8yAuth
   *
   * @description
   * Updates token with a new password.
   *
   * @param {string} password New password to store in  token.
   *
   * @example
   * <pre>
   *   c8yAuth.updatePassword('new-password');
   * </pre>
   */
  function updatePassword(password) {
    var decodedToken = decodeToken(token);
    info.token = token = encodeToken(decodedToken.user, password, decodedToken.tenant);
    $window.localStorage.setItem(TOKEN_KEY, token);
  }

  /**
   * @ngdoc function
   * @name request
   * @methodOf c8y.core.service:c8yAuth
   *
   * @description
   * Function used to transform outcoming requests by adding authorization headers.
   *
   * @param {object} config $http's request config.
   *
   * @returns {object} Updated $http's request config.
   *
   * @example
   * <pre>
   *   $httpProvider.interceptors.push('c8yAuth');
   * </pre>
   */
  function transformRequest(config) {
    var url = config.url,
      isCumulocity = !url.match(/http/) || url.match(/^https?\:\/\/.*cumulocity\.com/),
      isBaseUrl = url.indexOf(info.baseUrl) === 0;

    //Make sure we don't want to send the auth token to another server.
    if (isCumulocity || isBaseUrl) {
      if (!config.headers) {
        config.headers = {};
      }
      if (!config.headers.Authorization) {
        config.headers.Authorization = 'Basic ' + info.token;
      }
      angular.extend(config.headers, {
        UseXBasic: true
      });
    }
    return config;
  }

  /**
   * @ngdoc function
   * @name logout
   * @methodOf c8y.core.service:c8yAuth
   *
   * @description
   * Logs user out (invokes {@link app.service:info#logout info.logout}).
   *
   * @example
   * <pre>
   *   c8yAuth.logout();
   * </pre>
   */
  function logout() {
    if (angular.isFunction(info.logout)) {
      info.logout();
    }
  }

  return {
    decodeToken: decodeToken,
    logout: logout,
    updatePassword: updatePassword,
    request: transformRequest
  };

}])
.config(['$httpProvider', function ($httpProvider) {
  //c8yAuth factory export the 'request' method so it behaves like an interceptor
  $httpProvider.interceptors.push('c8yAuth');
}]);
