(function() {
  'use strict';

  angular.module('c8y.core')
  .factory('c8yMessaging', [
    '$http',
    '$q',
    'c8yBase',
    c8yMessaging
  ]);

  function c8yMessaging (
    $http,
    $q,
    c8yBase
  ) {
    var METHOD = 'POST',
      PATH = {
        prefix: 'service/sms/smsmessaging/v1/outbound/',
        suffix: '/requests'
      };

    function buildRequestFunction(data) {
      var url,
        cfg;

      url = c8yBase.url(PATH.prefix + data.outboundSMSMessageRequest.senderAddress + PATH.suffix);
      data.outboundSMSMessageRequest.receiptRequest = data.outboundSMSMessageRequest.receiptRequest || {
        notifyUrl: null,
        callbackData: null
      };
      data.outboundSMSMessageRequest.receiptRequest.notifyUrl = data.outboundSMSMessageRequest.receiptRequest.notifyUrl || null;
      data.outboundSMSMessageRequest.receiptRequest.callbackData = data.outboundSMSMessageRequest.receiptRequest.callbackData || null;
      data.outboundSMSMessageRequest.senderName = data.senderName || null;
      cfg = {
        method: METHOD,
        url: url,
        data: data,
        headers: {
          'Accept': 'application/json',
          'Content-type': 'application/json'
        }
      };
      return $http(cfg);
    }

    function sendSms(data) {
      return (data.outboundSMSMessageRequest &&
              data.outboundSMSMessageRequest.address &&
              data.outboundSMSMessageRequest.senderAddress &&
              data.outboundSMSMessageRequest.outboundSMSTextMessage &&
              data.outboundSMSMessageRequest.outboundSMSTextMessage.message) ?
              buildRequestFunction(data) :
              $q.reject('Invalid SMS data');
    }

    return {
      sendSms: sendSms
    };
  }
}());
