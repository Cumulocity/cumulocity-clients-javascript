/* global org */
(function () {
  angular
    .module('c8y.core')
    .factory('c8yLongPollingTransport', c8yLongPollingTransport);

  _.assign(org.cometd.JSON, {
    toJSON: JSON.stringify,
    fromJSON: JSON.parse
  });

  /* @ngInjec */
  function c8yLongPollingTransport($http, c8yBase) {
    var _send = send;
    var transport = {
      LongPollingTransport: LongPollingTransport,
      enable: function (value) {
        if (value) {
          _send = send;
        } else {
          _send = sendMock;
        }
      }
    };
    transport.enable(!c8yBase.getFlag('test'));

    return transport;

    function LongPollingTransport() {
      var _super = new org.cometd.LongPollingTransport();
      var that = org.cometd.Transport.derive(_super);

      that.xhrSend = function (packet) {
        return _send(packet);
      };
      return that;
    }

    function send(packet) {
      var xhr = {};
      var hdrs = packet.headers || {};
      hdrs['Content-Type'] = 'application/json;charset=UTF-8';
      if (!transport.disabled) {
        $http.post(packet.url, packet.body, {
          headers: hdrs,
          withCredentials: true
        }).success(function (data, status) {
          xhr.status = status;
          packet.onSuccess(data);
        }).error(function (data, status, headers, config, reason) {
          xhr.status = status;
          packet.onError(reason);
        });
      }

      return xhr;
    }

    function sendMock(packet) {
      var data = JSON.parse(packet.body);
      setTimeout(function () {
        packet.onSuccess({
          successful: true,
          id: data.id,
          channel: data.channel
        }, 100);
      });
      return {
        status: 200
      };
    }
  }
})();
