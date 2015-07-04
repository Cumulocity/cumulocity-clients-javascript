(function () {
  'use strict';

  var STORAGE_KEY = '_tcy8';

  angular.module('c8y.core').provider('c8yCumulocity', [
    'info',
    c8yCumulocityProvider
  ]).run([
    '$rootScope',
    '$window',
    '$q',
    'info',
    'c8yUser',
    run
  ]);

  function run (
    $rootScope,
    $window,
    $q,
    info,
    c8yUser
  ) {

    function setTokenFromStorage() {
      var token = $window.localStorage.getItem(STORAGE_KEY) ||
        $window.sessionStorage.getItem(STORAGE_KEY);
      info.token = token;
    }

    function setupAfterLogin() {
      if (!info.token || info.preventGetUser) {
        return $q.reject('No token');
      }
      c8yUser.current().then(function (user) {
        var c8y = $rootScope.c8y = $rootScope.c8y || {};
        c8y.user = user;
        $rootScope.$emit('c8y.api.login');
      });
    }

    setTokenFromStorage();
    setupAfterLogin();
  }

  function createGetters(info) {
    function getBaseUrl() {
      return info.baseUrl;
    }

    function getAppKey() {
      return info.appKey;
    }

    function getTenant() {
      return info.tenant;
    }

    return {
      getBaseUrl: getBaseUrl,
      getAppKey: getAppKey,
      getTenant: getTenant
    };
  }

  function c8yCumulocityProvider(
    info
  ) {
    function setBaseUrl(baseUrl) {
      info.baseUrl = baseUrl;
    }

    function setAppKey(appKey) {
      info.appKey = appKey;
    }

    function setTenant(tenant) {
      info.tenant = tenant;
    }

    var result = {
      setBaseUrl: setBaseUrl,
      setAppKey: setAppKey,
      setTenant: setTenant,
      $get: [
        'info',
        '$window',
        '$rootScope',
        'c8yUser',
        c8yCumulocity
      ]
    };

    _.assign(result, createGetters(info));
    return result;
  }

  function c8yCumulocity(
    info,
    $window,
    $rootScope,
    c8yUser
  ) {
    var getters = createGetters(info);

    function login(tenant, user, password, remember) {
      tenant = tenant || getters.getTenant();
      return c8yUser.login(
        tenant,
        user,
        password,
        remember
      ).then(setUser);
    }

    function setUser(user) {
      var c8y = $rootScope.c8y = $rootScope.c8y || {};
      c8y.user = user;
      c8yUser.logout();
      if (user) {
        $rootScope.$emit('c8y.api.login');
      }
      else {
        $rootScope.$emit('c8y.api.logout');
      }
    }

    function logout() {
      setUser(null);
      info.token = null;
      $window.localStorage.removeItem(STORAGE_KEY);
      $window.sessionStorage.removeItem(STORAGE_KEY);
    }

    var result = {
      login: login,
      logout: logout
    };

    _.assign(result, getters);
    return result;
  }
})();
