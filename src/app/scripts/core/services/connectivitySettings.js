(function () {
  'use strict';

  angular.module('c8y.core')
    .factory('c8yConnectivitySettings', [
      '$http',
      'c8yBase',
      'c8ySettings',
      c8yConnectivitySettings
    ]);

  function c8yConnectivitySettings(
    $http,
    c8yBase,
    c8ySettings
  ) {
    var url = c8yBase.url('service/register/connectivity');

    function request(method, data) {
      if (data && data.microservice && data.microservice.url) {
        delete data.microservice;
      }
      var cfg = {
        method: method,
        url: url,
        data: data,
        headers: {
          'Accept': 'application/json',
          'Content-type': 'application/json'
        }
      };
      return $http(cfg).then(c8yBase.getResData).then(function(response) {
        response.valid = response.valid === 'true';
        return response;
      });
    }

    function exists() {
      return request('GET')
      .then(function(response) {
        return !!response['microservice.url'];
      })
      .catch(function() {
        return false;
      });
    }

    function shouldShow() {
      var option = {
        category: 'connectivity',
        key: 'microservice.url'
      };
      var defaultValue = false;
      return c8ySettings.getSystemOptionValue(option, defaultValue)
        .then(function (value) {
          return !!value;
        });
    }

    return {
      detail: _.partial(request, 'GET'),
      update: _.partial(request, 'PUT'),
      exists: exists,
      shouldShow: shouldShow
    };
  }
}());
