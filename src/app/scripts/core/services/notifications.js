/**
 * @ngdoc service
 * @name c8y.core.service:c8yNotifications
 * @requires c8y.core.service:c8yBase
 * @requires app.service:info
 * @requires $routeScope
 * @requires $q
 *
 * @description
 * This service allows for subscribing to notification channels and handling received messages.
 */
angular.module('c8y.core')
.factory('c8yNotifications', ['$rootScope', '$q', '$timeout', 'c8yBase', 'info',
function ($rootScope, $q, $timeout, c8yBase, info) {
  'use strict';

  var cometd =  $.cometd,
    subscriptionMap = {},
    path = 'cep/customnotifications',
    pathNotifications = 'cep/notifications',
    url = c8yBase.url(path),
    cfg = {
      url: url,
      logLevel: 'info',
      requestHeaders: {
        Authorization: 'Basic ' + info.token,
        UseXBasic: true
      },
      appendMessageTypeToURL: false
    },
    timeout = 570000,
    abortConnection,
    onSubscribeListener,
    debugNotificationsCfg = angular.copy(cfg);

  debugNotificationsCfg.url = c8yBase.url(pathNotifications);

  cometd.unregisterTransport('websocket');
  cometd.registerExtension('acceptEmptyMessages', {
    incoming: function(message) {
      if (message.successful === undefined && message.data === undefined) {
        message.data = {message: 'The output from statement was empty'};
      }
    }
  });

  cometd.configure(angular.copy(cfg));

  function newAbortConnectionTimer() {
    return $timeout(function() {
      cometd.getTransport().abort();
    },timeout);
  }

  function onSubscribe(msg) {
    var subscription = getSubscriptionByMsg(msg);
    subscription.scope.$emit('connected');
    subscription.scope.connected = true;
    scopeApply();
  }

  function onMessage(scope, msg) {
    if (abortConnection) {
      $timeout.cancel();
      abortConnection = newAbortConnectionTimer();
    }
    scope.$emit('message', msg);
    scopeApply();
  }

  function onUnsubscribe(sub) {
    sub.counter--;
    if (!sub.counter) {
      cometd.unsubscribe(sub.comet);
      delete subscriptionMap[sub.channel];
      if (!Object.keys(subscriptionMap).length) {
        disconnect();
      }
    }
  }

  function disconnect() {
    if (abortConnection) {
      $timeout.cancel(abortConnection);
      abortConnection = undefined;
    }
    cometd.removeListener(onSubscribeListener);
    cometd.disconnect();
  }

  function scopeApply() {
    if (!$rootScope.$$phase) {
      $rootScope.$apply();
    }
  }

  function connect() {
    var defer = $q.defer();

    if (cometd.isDisconnected()) {
      cometd.handshake();
      var connectListener = cometd.addListener('/meta/connect', function () {
        defer.resolve(true);
        cometd.removeListener(connectListener);
      });

      onSubscribeListener = cometd.addListener('/meta/subscribe', onSubscribe);
    } else {
      defer.resolve(true);
    }

    return defer.promise;
  }

  function getSubscriptionByMsg(msg) {
    var subscriptions = Object.keys(subscriptionMap).filter(function(sub) {
        return msg.subscription.match(sub);
      });
    return subscriptionMap[subscriptions[0]];
  }

  function getSubscription(channel) {
    return subscriptionMap[channel];
  }

  /**
   * @ngdoc function
   * @name subscribe
   * @methodOf c8y.core.service:c8yNotifications
   * 
   * @description
   * Subscribes to notification channel.
   * 
   * @param {string} channel Path to notification chanel.
   * 
   * @returns {promise} Returns promise with the subscription's scope object. The following events are emitted on this scope:
   * 
   * - **connected** - when connection to the channel is established,
   * - **message** - when message is received, passes message data.
   * 
   * @example
   * Controller:
   * <pre>
   *   var subscription;
   *   var channel = '/bootstrap';
   *   
   *   function init() {
   *     c8yNotifications.subscribe(channel).then(onSubscription);
   *   }
   *   
   *   function onSubscription(_subscription) {
   *     subscription = _subscription;
   *     subscription.$on('connected', onSubscriptionConnected);
   *     subscription.$on('message', onSubscriptionMessage);
   *   }
   *   
   *   function onSubscriptionConnected() {
   *     c8yAlert.success('Subscribed to channel successfully!');
   *   }
   *   
   *   function onSubscriptionMessage(evt, message) {
   *     c8yAlert.success('New device with id ' + message.data.id + ' has been connected with status ' + message.data.status + '.');
   *   }
   *   
   *   function onDestroy() {
   *     if (subscription && subscription.unsubscribe) {
   *       subscription.unsubscribe();
   *     }
   *   }
   * 
   *   $scope.$on('$destroy', onDestroy);
   * 
   *   init();
   * </pre>
   */
  function subscribe(channel) {
    var sub = getSubscription(channel) || {},
      created = false;

    if (!sub.channel) {
      created = true;
      subscriptionMap[channel] = sub;
      sub.channel = channel;
      sub.scope = $rootScope.$new(true);
      sub.scope.unsubscribe = angular.bind({}, onUnsubscribe, sub);
      sub.counter = 0;
    }

    sub.counter++;

    return connect().then(function () {
      if (created) {
        sub.comet = cometd.subscribe(channel, angular.bind({}, onMessage, sub.scope));
        abortConnection = newAbortConnectionTimer();
      }
      return sub.scope;
    });
  }

  /**
   * @ngdoc function
   * @name configure
   * @methodOf c8y.core.service:c8yNotifications
   * 
   * @description
   * Sets up cometd configuration in running or debug mode.
   * 
   * @param {string} type Type of configuration to set up. Available values are:
   * 
   * - **debug** - set up debug configuration for cometd.
   * 
   * Any other value will set up default running configuration.
   * 
   * @example
   * <pre>
   *   c8yNotifications.configure('debug');
   * </pre>
   */
  function configure(type) {
    var _cfg = angular.copy(type === 'debug' ? debugNotificationsCfg : cfg);
    cometd.configure(_cfg);
  }

  return {
    subscribe: subscribe,
    configure: configure
  };

}]);
