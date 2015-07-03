/**
 * @ngdoc service
 * @name c8y.core.service:c8yRealtime
 * @requires c8y.core.service:c8yBase
 * @requires app.service:info
 * @requires $routeScope
 * @requires $http
 *
 * @description
 * This service allows for using realtime notifications.
 *
 * @example
 * The following example controller uses c8yRealtime service to handle operation updates.
 * <pre>
 *   angular.module('myModule')
 *   .controller(function ($scope, c8yRealtime, c8yDeviceControl, c8yAlert) {
 *     var scopeId = $scope.$id;
 *     var channel = '/operations/*';
 *
 *     function onRealtimeNotification(evt, data) {
 *       if (isOperationCompleted(data)) {
 *         c8yAlert.success(
 *           'Operation with id ' + data.id +
 *           ' has been completed with status ' + data.status + '!'
 *         );
 *       }
 *     });
 *
 *     function isOperationCompleted(operation) {
 *       return (operation.status === c8yDeviceControl.status.SUCCESSFUL
 *         || operation.status === c8yDeviceControl.status.FAILED);
 *     }
 *
 *     function onDestroy() {
 *       c8yRealtime.stop(scopeId, channel);
 *     }
 *
 *     c8yRealtime.addListener(scopeId, channel, c8yRealtime.realtimeActions().UPDATE, onRealtimeNotification);
 *     c8yRealtime.start(scopeId, channel);
 *
 *     $scope.$on('$destroy', onDestroy);
 *   });
 * </pre>
 */
angular.module('c8y.core')
.factory('c8yRealtime', ['$http', '$rootScope', '$timeout', 'c8yBase', 'info',
function ($http, $rootScope, $timeout, c8yBase, info) {
  'use strict';

  var path = 'cep/realtime',
  config = {
    url: c8yBase.url(path),
    logLevel: 'info',
    requestHeaders: {
      Authorization: 'Basic ' + info.token,
      UseXBasic: true
    },
    appendMessageTypeToURL: false,
  },
  timeout = 570000,
  abortConnection,
  disconnecting,
  overallSubscriptions = 0,
  subscriptionQueue = [],
  restartConnection,
  cometd = new $.Cometd(),
  icons = {},
  subscriptionMap = {},
  realtimeActions = {
    CREATE: 'CREATE',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE'
  },
  lastConnect,
  bus = $rootScope.$new(true);

  icons[true] = 'check-circle-o';
  icons[false] = 'circle-o';

  cometd.unregisterTransport('websocket');
  cometd.configure(config);

  cometd.addListener('/meta/connect', function (data) {
    subscriptionQueue.forEach( function (s) {
      subscribe(s);
    });
    subscriptionQueue.length = 0;

    if (data.successful) {
      if (lastConnect) {
        bus.$emit('connect', {
          fromLastConnect: moment().diff(lastConnect, 'seconds')
        });
      }
      lastConnect = moment();
    } else {
      bus.$emit('connectfailure', data);
    }
  });

  cometd.addListener('/meta/disconnect', function () {
    disconnecting = false;
    if (typeof restartConnection === 'function') {
      restartConnection();
      restartConnection = undefined;
    }
  });

  cometd.addListener('/meta/subscribe', function (msg) {
    if (msg.successful) {
      var scope = subscriptionMap[msg.subscription].scope,
      subscribers = subscriptionMap[msg.subscription].subscribers;
      subscriptionMap[msg.subscription].ready = true;
      overallSubscriptions++;
      for (var id in subscribers) {
        if (subscribers[id].active) {
          scope.$emit(id+'-subscribed');
        }
      }
      apply();
    } else {
      if (!cometd.isDisconnected() && overallSubscriptions === 0) {
        cometd.disconnect();
        disconnecting = true;
      }
    }
  });

  cometd.addListener('/meta/unsubscribe', function () {
    overallSubscriptions--;
    if (!cometd.isDisconnected() && overallSubscriptions === 0) {
      if (abortConnection) {
        $timeout.cancel(abortConnection);
        abortConnection = undefined;
      }
      cometd.disconnect();
      disconnecting = true;
    }
  });

  function initConnection() {
    if (cometd.isDisconnected() && !restartConnection) {
      if (disconnecting) {
        restartConnection = function() {
          cometd.handshake();
        };
      } else {
        cometd.handshake();
      }
    }

    // if (!connectListener) {
    //   addConnectListener();
    // }
  }

  function newAbortConnectionTimer() {
    return $timeout(function() {
      cometd.getTransport().abort();
    },timeout);
  }

  function subscribe(channel) {
    if (cometd.isDisconnected()) {
      initConnection();
      subscriptionQueue.push(channel);
      return;
    }

    var subObj = cometd.subscribe(channel, function (msg) {
      var scope = subscriptionMap[channel].scope;
      scope.$emit(msg.data.realtimeAction, msg.data.data);
      if (abortConnection) {
        $timeout.cancel();
        abortConnection = newAbortConnectionTimer();
      }
      apply();
    });
    abortConnection = newAbortConnectionTimer();

    if (!subscriptionMap[channel].subObj) {
      subscriptionMap[channel].subObj = subObj;
    }

    return subObj;
  }

  function unsubscribe(subObj) {
    if (subObj) {
      cometd.unsubscribe(subObj);
    }
  }

  // function addConnectListener() {
  //   connectListener = cometd.addListener('/meta/connect', function () {
  //     subscriptionQueue.forEach( function (s) {
  //       subscribe(s);
  //     });
  //     cometd.removeListener(connectListener);
  //     connectListener = undefined;
  //     subscriptionQueue.length = 0;
  //   });
  // }

  function apply() {
    if (!$rootScope.$$phase) {
      $rootScope.$apply();
    }
  }

  /**
   * @ngdoc function
   * @name switchRealtime
   * @methodOf c8y.core.service:c8yRealtime
   *
   * @description
   * If subscription defined by id and channel is active then it is stopped.
   * Otherwise it is started.
   *
   * @param {string} id Unique subscription id, using the id of scope responsible for handling subscription is recommended.
   * @param {string} channel Subscribed channel.
   *
   * @example
   * <pre>
   *   var id = $scope.$id;
   *   var channel = '/operations/*';
   *   c8yRealtime.switchRealtime(id, channel);
   * </pre>
   */
  function switchRealtime(id, channel) {
    if(subscriptionMap[channel].subscribers[id].active) {
      stop(id, channel);
    }else {
      start(id, channel);
    }
  }

  /**
   * @ngdoc function
   * @name icon
   * @methodOf c8y.core.service:c8yRealtime
   *
   * @description
   * Gets icon for subscription activity status.
   *
   * @param {boolean} status Subscription activity status.
   *
   * @example
   * <pre>
   *   var channel = '/operations/*';
   *   $scope.realtimeActive = function () {
   *     return c8yRealtime.getStatus($scope.$id, channel);
   *   };
   *   $scope.realtimeIcon = function() {
   *     var state = $scope.realtimeActive();
   *     if (state !== undefined) {
   *       return c8yRealtime.icon(state);
   *     }
   *     return c8yRealtime.icon(false);
   *   };
   * </pre>
   */
  function getIcon(status) {
    return icons[status];
  }

  function getSubscriptionMap() {
    return subscriptionMap;
  }

  /**
   * @ngdoc function
   * @name realtimeActions
   * @methodOf c8y.core.service:c8yRealtime
   *
   * @description
   * Gets the map of available realtime actions.
   *
   * @returns {object} Object containing the map of available realtime actions. It includes the following actions:
   *
   * - **CREATE** - item has been created,
   * - **UPDATE** - item has been updated,
   * - **DELETE** - item has been removed.
   *
   * @example
   * See usage example {@link c8y.core.service:c8yRealtime#example here}.
   */
  function getRealtimeActions() {
    return realtimeActions;
  }

  /**
   * @ngdoc function
   * @name getStatus
   * @methodOf c8y.core.service:c8yRealtime
   *
   * @description
   * Gets status for given subscription id and channel.
   *
   * @param {string} id Unique subscription id, using the id of scope responsible for handling subscription is recommended.
   * @param {string} channel Subscribed channel.
   *
   * @returns {boolean} Boolean value indicating whether given subscription is active or not.
   *
   * @example
   * <pre>
   *   var id = $scope.$id;
   *   var channel = '/operations/*';
   *   var subscriptionActivityStatus = c8yRealtime.getStatus(id, channel);
   * </pre>
   */
  function getStatus(id, channel) {
    var channelObj = subscriptionMap[channel];
    if (channelObj === undefined) {
      return false;
    }
    var subscriber = channelObj.subscribers[id];
    return subscriber && subscriber.hasOwnProperty('active') ? subscriber.active : false;
  }

  /**
   * @ngdoc function
   * @name removeSubscriber
   * @methodOf c8y.core.service:c8yRealtime
   *
   * @description
   * First calls {@link c8y.core.service:c8yRealtime#methods_stop stop(id, channel)}
   * and then removes all listeners for given subscription id and channel.
   * If this was the last subscription on given channel then the broadcasting scope
   * would be destroyed.
   *
   * @param {string} id Unique subscription id, using the id of scope responsible for handling subscription is recommended.
   * @param {string} channel Subscribed channel.
   *
   * @example
   * <pre>
   *   var id = $scope.$id;
   *   var channel = '/operations/*';
   *   c8yRealtime.removeSubscriber(id, channel);
   * </pre>
   */
  function removeSubscriber(id, channel) {
    if (getStatus(id,channel) === false) {
      throw new Error('There is no listener registered for your scope on the channel \"'+channel+'\"');
    }
    stop(id, channel);
    delete subscriptionMap[channel].subscribers[id];
    if (Object.keys(subscriptionMap[channel].subscribers).length === 0) {
      subscriptionMap[channel].scope.$destroy();
      delete subscriptionMap[channel];
    }
  }

  /*
   * creates a scope for broadcasting realtime events for this channel. if there is already another
   * listener for this channel no new scope will be created and instead a new listener will be
   * added to the scope.
   *
   * @param id: the id of the scope that subscribes to the service
   * @param channel: the channel that will be subscribed
   */

  function init(id, channel) {
    if (!subscriptionMap[channel]) {
      subscriptionMap[channel] = {
          scope: $rootScope.$new(true),
          subscribers: {},
          activeSubscribers: 0,
          subObj: undefined,
          ready: false
        };
    }
    subscriptionMap[channel].subscribers[id] = {
        listeners: [],
        unreg: undefined
      };
  }

  /**
   * @ngdoc function
   * @name addListener
   * @methodOf c8y.core.service:c8yRealtime
   *
   * @description
   * Adds a new Listener to a realtime channel for the given scope id.
   *
   * @param {string} id Unique subscription id, using the id of scope responsible for handling subscription is recommended.
   * @param {string} channel Subscribed channel.
   * @param {string} watch the event name on the channel that triggers the function
   * @param {function} func the function that will be triggered by the event
   *
   * @example
   * See usage example {@link c8y.core.service:c8yRealtime#example here}.
   */
  function addListener(id, channel, watch, func) {
    if (!subscriptionMap[channel] || !subscriptionMap[channel].subscribers[id]) {
      init(id, channel);
    }
    subscriptionMap[channel].subscribers[id].listeners.push({
      watch: watch,
      func: func
    });
  }

  /**
   * @ngdoc function
   * @name start
   * @methodOf c8y.core.service:c8yRealtime
   *
   * @description
   * Starts listening for realtime notifications for given id and channel.
   * Registers all listeners added previously for the channel using
   * {@link c8y.core.service:c8yRealtime#methods_addListener addListener} method.
   *
   * @param {string} id Unique subscription id, using the id of scope responsible for handling subscription is recommended.
   * @param {string} channel Subscribed channel.
   *
   * @example
   * See usage example {@link c8y.core.service:c8yRealtime#example here}.
   */
  function start(id, channel) {
    if (subscriptionMap[channel] === undefined) {
      throw new Error('There is no listener registered for your scope on the channel \"'+channel+'\"');
    }
    var scope = subscriptionMap[channel].scope,
     listeners = subscriptionMap[channel].subscribers[id].listeners,
     unreg = [];
    for (var listener in listeners) {
      unreg.push({
        watch: listeners[listener].watch,
        func: scope.$on(listeners[listener].watch, listeners[listener].func)
      });
    }
    subscriptionMap[channel].subscribers[id].unreg = unreg;
    subscriptionMap[channel].subscribers[id].active = true;

    if (subscriptionMap[channel].activeSubscribers === 0) {
      subscribe(channel);
    } else if (subscriptionMap[channel].ready){
      scope.$emit(id+'-subscribed');
    }
    subscriptionMap[channel].activeSubscribers++;
  }

  /**
   * @ngdoc function
   * @name stop
   * @methodOf c8y.core.service:c8yRealtime
   *
   * @description
   * Erases all registered listeners from this scope for the channel.
   * If no other scope is active on this channel the channel will be unsubscribed.
   *
   * @param {string} id Unique subscription id, using the id of scope responsible for handling subscription is recommended.
   * @param {string} channel Subscribed channel.
   *
   * @example
   * See usage example {@link c8y.core.service:c8yRealtime#example here}.
   */
  function stop(id, channel) {
    var scope = subscriptionMap[channel].scope,
      unsub,
      unreg = subscriptionMap[channel].subscribers[id].unreg;

    if (unreg !== undefined) {
      unreg.forEach(function(element) {
        if (element.watch === id+'-unsubscribed'){
          unsub = element.func;
        } else {
          element.func();
        }
      });
    }

    if (unsub) {
      scope.$emit(id+'-unsubscribed');
      unsub();
    }

    subscriptionMap[channel].subscribers[id].unreg = undefined;
    subscriptionMap[channel].subscribers[id].active = false;
    subscriptionMap[channel].activeSubscribers--;
    if (subscriptionMap[channel].activeSubscribers <= 0) {
      if (subscriptionMap[channel].subObj) {
        unsubscribe(subscriptionMap[channel].subObj);
        subscriptionMap[channel].subObj = undefined;
        subscriptionMap[channel].ready = false;
      }
      subscriptionMap[channel].activeSubscribers = 0;
    }
  }

  /**
   * @ngdoc function
   * @name destroySubscription
   * @methodOf c8y.core.service:c8yRealtime
   *
   * @description
   * Destroys the subscription for given id and channel it it is active.
   *
   * @param {string} id Unique subscription id, using the id of scope responsible for handling subscription is recommended.
   * @param {string} channel Subscribed channel.
   *
   * @example
   * <pre>
   *   var id = $scope.$id;
   *   var channel = '/operations/*';
   *   c8yRealtime.destroySubscription(id, channel);
   * </pre>
   */
  function destroySubscription(id, channel) {
    if (getStatus(id, channel) === true) {
      removeSubscriber(id, channel);
    }
  }

  return {
    start: start,
    stop: stop,
    bus: function () {
      return bus;
    },
    addListener: addListener,
    removeSubscriber: removeSubscriber,
    switchRealtime: switchRealtime,
    icon: getIcon,
    getStatus: getStatus,
    realtimeActions: getRealtimeActions,
    destroySubscription: destroySubscription,
    //for testing
    getSubscriptionMap: getSubscriptionMap
  };
}]);
