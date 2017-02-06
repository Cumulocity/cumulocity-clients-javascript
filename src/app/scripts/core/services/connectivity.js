(function(){
  'use strict';
  angular.module('c8y.core')
  .factory('c8yConnectivity', [
    '$http',
    '$q',
    'c8yBase',
    'c8yConnectivitySettings',
    c8yConnectivity
  ]);

  function c8yConnectivity(
    $http,
    $q,
    c8yBase,
    c8yConnectivitySettings
  ) {

    var mainPath = 'service/connectivity',
      typePaths = {
        getTerminalDetails: {
          prefix: 'mo',
          suffix: 'op/terminal',
          mo: true,
          method: 'GET'
        },
        getTerminalSessionInfo: {
          prefix: 'mo',
          suffix: 'op/terminal/session',
          mo: true,
          method: 'GET'
        },
        setTerminalSimStatus: {
          prefix: 'mo',
          suffix: 'op/terminal/sim_status',
          mo: true,
          method: 'PUT'
        },
        getTerminalAuditLogs: {
          prefix: 'mo',
          suffix: 'op/terminal/audit',
          mo: true,
          method: 'GET'
        },
        getTerminalUsage: {
          prefix: 'mo',
          suffix: 'op/billing',
          mo: true,
          method: 'GET'
        },
        getTerminalVoiceUsage: {
          prefix: 'mo',
          suffix: 'op/billing/voice',
          mo: true,
          method: 'GET'
        },
        getTerminalDataUsage: {
          prefix: 'mo',
          suffix: 'op/billing/data',
          mo: true,
          method: 'GET'
        },
        getTerminalSmsUsage: {
          prefix: 'mo',
          suffix: 'op/billing/sms',
          mo: true,
          method: 'GET'
        },
        sendSms: {
          prefix: 'mo',
          suffix: 'op/sms',
          mo: true,
          method: 'POST'
        },
        getSms: {
          prefix: 'mo',
          suffix: 'op/sms',
          mo: true,
          method: 'GET'
        },
        getSmsDetails: {
          prefix: 'mo',
          suffix: 'op/sms/details',
          mo: true,
          method: 'GET'
        },
        ping: {
          suffix: 'op/ping',
          mo: false,
          method: 'GET'
        },
      };

    function buildRequestFunction(type, mo, data, params, cfg) {
      var pathArray = [c8yBase.url(mainPath)],
        componentArray = ['prefix', 'mo', 'suffix'],
        url,
        _cfg;

      if (typePaths[type].mo) {
        typePaths[type].mo = mo;
      } else {
        delete typePaths.mo;
      }

      _.forEach(componentArray, function(component) {
        if (typePaths[type][component]) {
          pathArray.push(typePaths[type][component]);
        }
      });

      url = pathArray.join('/');
      _cfg = {
        method: [typePaths[type].method],
        url: url,
        data: data,
        params: params,
        headers: {
          'Accept': 'application/json',
          'Content-type': 'application/json;charset=UTF-8'
        }
      };
      _cfg = _.assign(_cfg, cfg || {});
      return $http(_cfg);
    }

    function formattedRequest(type, mo, data, params, cfg) {
      return request(type, mo, data, params, cfg).then(c8yBase.getResData);
    }

    function request(type, mo, data, params, cfg) {
      return (mo && type) ? buildRequestFunction(type, mo, data, params, cfg) : $q.reject('Device not valid');
    }

    function updateValidityOption(value) {
      return c8yConnectivitySettings.update({
        valid: value
      });
    }

    function updateValidityAfterPing(response) {
      var willUpdate = response && (response.status === 200 || response.status === 400),
        updateValue = willUpdate && response.status === 200;
      return !willUpdate ? $q.reject(response) : updateValidityOption(updateValue).then(function() {
          return response;
      });
    }

    function ping() {
      return request('ping', 'mo', {}, {}, {silentError: true})
      .then(updateValidityAfterPing, updateValidityAfterPing);
    }

    function pingIfPossible(options) {
      if (options.valid) {
        return ping();
      } else {
        return $q.reject();
      }
    }

    function safePing() {
      return c8yConnectivitySettings.detail()
      .then(pingIfPossible);
    }

    return {
      detail: formattedRequest,
      getTerminalDetails: _.partial(formattedRequest, 'getTerminalDetails'),
      getTerminalSessionInfo: _.partial(formattedRequest, 'getTerminalSessionInfo'),
      setTerminalSimStatus: _.partial(formattedRequest, 'setTerminalSimStatus'),
      getTerminalAuditLogs: _.partial(formattedRequest, 'getTerminalAuditLogs'),
      getTerminalUsage: _.partial(formattedRequest, 'getTerminalUsage'),
      getTerminalVoiceUsage: _.partial(formattedRequest, 'getTerminalVoiceUsage'),
      getTerminalDataUsage: _.partial(formattedRequest, 'getTerminalDataUsage'),
      getTerminalSmsUsage: _.partial(formattedRequest, 'getTerminalSmsUsage'),
      getSms: _.partial(formattedRequest, 'getSms'),
      sendSms: _.partial(formattedRequest, 'sendSms'),
      getSmsDetails: _.partial(formattedRequest, 'getSmsDetails'),
      ping: ping,
      safePing: safePing
    };
  }
}());
