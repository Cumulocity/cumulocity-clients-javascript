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
(function () {
  'use strict';

  angular.module('c8y.core')
    .factory('c8yAuth', c8yAuth)
    .config(['$httpProvider', config]);

  function config($httpProvider) {
    // c8yAuth factory export the 'request' method so it behaves like an interceptor
    $httpProvider.interceptors.push('c8yAuth');
  }

  /* @ngInject */
  function c8yAuth(
    $location,
    $rootScope,
    $injector,
    $q,
    $log,
    $window,
    $timeout,
    info
  ) {
    // var token = info.token,
    var TOKEN_KEY = '_tcy8';
    var TFATOKEN_KEY = 'TFAToken';
    var HEADER_APPKEY = 'X-Cumulocity-Application-Key';
    var PASSWORD_RESET_USER = {u: 'passwordreset', p: 'p455w0rdr3537'};
    var URL_PARAM_PASSWORD_RESET = 'token';
    var authTokenDefered = $q.defer();
    var emptyDefer = $q.defer();
    var testHtml = /\.html$/;
    var testJson = /\.json$/;
    var urlObj = document.createElement('a');
    var authState = {hasAuth: false};
    var appKey = info.appKey;
    var resetPasswordToken;
    var authToken;
    var lastTriedAuthToken;
    var TFAToken;
    var $http;
    var c8yBase;
    var c8yApplication;

    emptyDefer.resolve();
    setRecoverPassToken(info.passResetToken || search().token);


    function search() {
      if ($location.search) {
        return $location.search();
      }
      return {};
    }

    function decodeToken(token) {
      var decoded = decodeURIComponent(escape(atob(token)));
      var split = decoded.match(/(([^\/]*)\/)?([^\/:]+):(.+)/);

      return {
        tenant: split[2],
        user: split[3],
        password: split[4]
      };
    }

    function encodeToken(user, password, tenant) {
      var str = (tenant ? tenant + '/' : '') + user + ':' + password;
      return btoa(unescape(encodeURIComponent(str)));
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
      var decodedToken = decodeToken(authToken);
      var token = encodeToken(decodedToken.user, password, decodedToken.tenant);
      return onSetToken(token);
    }

    function transformApiRequest(config) {
      if (!config.headers) {
        config.headers = {};
      }

      _.defaults(config.headers, headers());

      return config;
    }

    function hasAuthHeader(config) {
      return !!(config.headers && config.headers.Authorization);
    }

    function shouldWaitForAppKey(config) {
      return !authToken || !config.noAppKey;
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
    function request(config) {
      var url = config.url;
      var isApi = isApiDomain(url);

      if (!isApi || testHtml.test(url) || testJson.test(url)) {
        return config;
      }

      var wait = isApi && !hasAuthHeader(config) && shouldWaitForAppKey(config);
      var promise;

      if (wait) {
        if (!out.initializing.done) {
          promise = $q.all([out.initializing, authTokenDefered.promise]);
        } else {
          promise = authTokenDefered.promise;
        }
      } else {
        promise = emptyDefer.promise;
      }
      var doTransform = isApi ? _.partial(transformApiRequest, config) : function () {
        return config;
      };

      if (authToken && window.c8y_testing) {
        return doTransform();
      }

      return promise.then(doTransform);
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
      clearTokens();
      if (_.isFunction(info.logout)) {
        info.logout();
      }
    }

    /**
     * @ngdoc function
     * @name responseError
     * @methodOf c8y.core.service:c8yAuth
     *
     * @description
     * Function used to logout user automatically when TFA token has expired and user is actually logged in.
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
    function responseError(rejection) {
      if (rejection.headers('tfatokenexpired') && authState.hasAuth) {
        logout();
      }
      return $q.reject(rejection);
    }

    // Make sure we don't send the auth token to another server.
    function isApiDomain(url) {
      // if url is not falsy, allow it.
      // empty string is a relative path to current domain
      // which is OK
      var baseUrl = info.baseUrl || '/';
      if (!url) {
        return true;
      }

      urlObj.href = url || '';
      var host = urlObj.host;
      // allow if baseUrl matches
      return (baseUrl.length > 1 && url.indexOf(baseUrl) > -1) ||
        !host ||
        // sending to self should be allowed.
        host === fullHost();
    }

    function fullHost() {
      var host = $location.host();
      var port = $location.port();
      // don't append port number when port is 80 or 443
      if (port === 80 || port === 443) {
        return host;
      }
      return [host, port].join(':');
    }

    function setAuthToken(token) {
      lastTriedAuthToken = token;
      var url = c8yBase.url('user/currentUser?auth');
      if (window.c8y_testing) {
        return $q.when(onSetToken(token));
      }
      var httpConfig = {
        url: url,
        silentError: true,
        headers: {
          Authorization: token ? ('Basic ' + token) : undefined,
          UseXBasic: true,
          Accept: 'application/vnd.com.nsn.cumulocity.user+json;'
        }
      };
      return $http(httpConfig)
        .then(c8yBase.getResData)
        .then(_.partial(updateTokenFromUser, token))
        .then(onSetToken);
    }

    function updateTokenFromUser(token, user) {
      var decodedToken = decodeToken(token);
      return encodeToken(
        decodedToken.user,
        decodedToken.password,
        getTenantFromUser(user)
      );
    }

    function getTenantFromUser(user) {
      return user.self.match(/\/user\/(\w+)\//)[1];
    }

    function onSetToken(token) {
      authToken = info.token = token;
      setAppKey(info.appKey);
      var needsAppKey = !appKey;
      var promise = needsAppKey ? fetchAppInfo() : $q.when();
      updateSavedAuthToken();
      return promise.then(authReady);
    }

    function clearAuthToken() {
      delete info.token;
      if (authTokenDefered.promise.$$state.status) {
        authTokenDefered = $q.defer();
      }
      notifyAuthState({hasAuth: false});
      clearSavedAuthToken();
    }

    function fetchAppInfo() {
      return c8yApplication.currentAppCached()
        .then(function (app) {
          info.appConfig = _.defaults(info.appConfig || {},  app);
          setAppKey(app.key);
        });
    }

    function authReady() {
      authTokenDefered.resolve();
      notifyAuthState({hasAuth: true});
    }

    function notifyAuthState(state) {
      if (_.isEqual(state, authState)) {
        return;
      } else {
        authState = state;
        $rootScope.$emit('authStateChange', authState);
      }
    }

    function clearTFAToken() {
      TFAToken = undefined;
      delete info.TFAToken;
      clearSavedTFAToken();
    }

    function setTFAToken(token) {
      TFAToken = info.TFAToken = token;
      saveToken(TFAToken, true, TFATOKEN_KEY);
    }

    function clearTokens() {
      clearTFAToken();
      clearAuthToken();
    }

    function saveToken(token, remember, key) {
      var storage = $window[(remember ? 'local' : 'session') + 'Storage'];
      storage.setItem(key, token);
    }

    function getSavedToken(key) {
      return $window.localStorage.getItem(key) || $window.sessionStorage.getItem(key);
    }

    function updateSavedAuthToken() {
      if ($window.sessionStorage) {
        $window.sessionStorage.setItem(TOKEN_KEY, authToken);
      }
      if ($window.localStorage.getItem(TOKEN_KEY)) {
        $window.localStorage.setItem(TOKEN_KEY, authToken);
      }
    }

    function saveAuthToken(remember) {
      saveToken(authToken, remember, TOKEN_KEY);
    }

    function setAppKey(key) {
      appKey = info.appKey = key;
    }

    function clearSavedAuthToken() {
      $window.localStorage.removeItem(TOKEN_KEY);
      $window.sessionStorage.removeItem(TOKEN_KEY);
    }

    function clearSavedTFAToken() {
      $window.localStorage.removeItem(TFATOKEN_KEY);
    }

    function checkSavedTokens() {
      var savedAuthToken = info.token || getSavedToken(TOKEN_KEY);
      var savedTFAToken = info.TFAToken || getSavedToken(TFATOKEN_KEY);
      setAppKey(info.appKey);

      if (savedTFAToken) {
        setTFAToken(savedTFAToken);
      }

      if (savedAuthToken) {
        var promise = setAuthToken(savedAuthToken);
        promise.catch(clearSavedAuthToken);
        return promise;
      }

      return $q.when();
    }

    function headers() {
      var headers = {
        Authorization: authToken ? ('Basic ' + authToken) : undefined,
        tfatoken: TFAToken,
        UseXBasic: true
      };
      headers[HEADER_APPKEY] = appKey;
      return headers;
    }

    function headersResetUser(tenant) {
      var token = encodeToken(PASSWORD_RESET_USER.u, PASSWORD_RESET_USER.p, tenant);
      return {
        Authorization: 'Basic ' + token
      };
    }

    function resetPasword(user) {

      var config = {
        silentError: true,
        url: c8yBase.url('user/passwordReset'),
        method: 'POST',
        data: {email: user.email},
        headers: headersResetUser(user.tenant)
      };
      return $http(config);
    }

    function changePasswordWithResetToken(user) {
      var tenant = user.tenant;
      var newPassword = user.newPassword;
      var passwordStrength = (user.passwordStrength || '').toUpperCase();
      var config = {
        silentError: true,
        url: c8yBase.url('user/passwordReset'),
        method: 'PUT',
        data: {
          token: resetPasswordToken,
          newPassword: newPassword,
          passwordStrength: passwordStrength
        },
        headers: headersResetUser(tenant)
      };

      function onSuccess(res) {
        resetPasswordToken = undefined;
        $location.url($location.path());
        return res;
      }

      return $http(config).then(onSuccess);
    }

    function setRecoverPassToken(token) {
      resetPasswordToken = token;
    }

    function verifyTFACode(code) {
      clearSavedTFAToken();
      var config = {
        url: c8yBase.url('user/pin'),
        data: {pin: code},
        method: 'POST',
        silentError: true,
        headers: {
          Authorization: 'Basic ' + lastTriedAuthToken,
          'Content-Type': 'application/vnd.com.nsn.cumulocity.user+json;'
        }
      };
      return $http(config).then(onTFAVerification);
    }

    function onTFAVerification(res) {
      var tfatoken = res.headers('tfatoken');
      if (tfatoken) {
        setTFAToken(tfatoken);
      }
      setAuthToken(lastTriedAuthToken);
    }

    function getPassword() {
      return authToken && decodeToken(authToken).password;
    }

    function mustEnforcePasswordStrength(tenant) {
      var settings = [
        {
          path: 'system/options/password/enforce.strength',
          prop: 'systemLevel',
          checkFn: function (res) {
            return (res.data || {}).value === 'true';
          }
        },
        {
          path: 'security-options/password/strength.validity',
          prop: 'tenantLevel',
          checkFn: function (res) {
            return  (res.data || {}).value === 'true';
          }
        }
      ];

      return getOptionSettings(settings, tenant)
        .then(function (props) {
          return props.systemLevel || props.tenantLevel;
        });
    }

    function getPasswordMinGreenLength(tenant) {
      var settings = [
        {
          path: 'system/options/password/green.min-length',
          prop: 'minGreenLength',
          checkFn: function (res) {
            return _.parseInt((res.data || {}).value);
          }
        }
      ];

      return getOptionSettings(settings, tenant)
        .then(function (props) {
          return props.minGreenLength;
        });
    }

    function getOptionSettings(settings, tenant) {
      var promises = _.map(settings, function (obj) {
        var o = {};
        o[obj.prop] = false;
        return $http({
          url: c8yBase.url('tenant/' + obj.path),
          headers: headersResetUser(tenant),
          silentError: true
        })
        .then(function (res) {
          var o = {};
          o[obj.prop] = obj.checkFn(res);
          return o;
        })
        .catch(function () {
          return o;
        });
      });

      return $q.all(promises).then(function (objs) {
        var props =  _.reduce(objs, function (merged, o) {
          return _.assign(merged, o);
        }, {});
        return props;
      });
    }

    var out = {
      decodeToken: decodeToken,
      encodeToken: encodeToken,
      logout: logout,
      updatePassword: updatePassword,
      request: request,
      responseError: responseError,
      setAuthToken: setAuthToken,
      clearTokens: clearTokens,
      setTFAToken: setTFAToken,
      clearTFAToken: clearTFAToken,
      saveAuthToken: saveAuthToken,
      checkSavedTokens: checkSavedTokens,
      setAppKey: setAppKey,
      headers: headers,
      resetPasword: resetPasword,
      changePasswordWithResetToken: changePasswordWithResetToken,
      setRecoverPassToken: setRecoverPassToken,
      verifyTFACode: verifyTFACode,
      getPassword: getPassword,
      mustEnforcePasswordStrength: mustEnforcePasswordStrength,
      getPasswordMinGreenLength: getPasswordMinGreenLength
    };
    // Deal with circular dependencies
    out.initializing = $q.when().then(function () {
      $http = $injector.get('$http');
      c8yBase = $injector.get('c8yBase');
      c8yApplication = $injector.get('c8yApplication');

      if (window.c8y_testing) {
        onSetToken(info.token);
        return {testing: true};
      }

      if (resetPasswordToken) {
        $location.search(URL_PARAM_PASSWORD_RESET, resetPasswordToken);
        clearTokens();
        return {recoverPassword: true};
      }
      if (info.noSavedTokens) {
        return {noSavedTokens: true};
      } else {
        return checkSavedTokens();
      }
    })
    .finally(function () {
      out.initializing.done = true;
    });

    if (window.c8y_testing) {
      if (!$window.localStorage) {
        $window.localStorage = window.localStorage;
      }
      if (!$window.sessionStorage) {
        $window.sessionStorage = window.sessionStorage;
      }
    }

    return out;
  }

}());
