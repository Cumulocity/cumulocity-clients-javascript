/* global org */
(function () {
  'use strict';

  /**
   * @ngdoc service
   * @name c8y.core.service:c8yRealtime
   * @requires $q
   * @requires $rootScope
   * @requires c8y.core.service:c8yBase
   * @requires c8y.core.service:c8yAuth
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
  angular
    .module('c8y.core')
    .factory('c8yRealtime', c8yRealtime);

  c8yRealtime.$inject = [
    '$q',
    '$rootScope',
    'c8yBase',
    'c8yAuth',
    'c8yLongPollingTransport'
  ];

  function c8yRealtime(
    $q,
    $rootScope,
    c8yBase,
    c8yAuth,
    c8yLongPollingTransport
  ) {
    if (c8yBase.getFlag('e2e')) {
      var E2eExtension = function () {
        function setIntervalValue(interval) {
          return _.toNumber(interval) || (_.toNumber(interval) === 0 ? 0 : 2000);
        }

        function setTimeoutValue(timeout) {
          return _.toNumber(timeout) || (_.toNumber(timeout) === 0 ? 0 : 1000);
        }

        this.registered = function () {
        };

        this.outgoing = function (message) {
          message.advice = {
            reconnect: 'retry',
            interval: setIntervalValue(c8yBase.getRuntimeOption('realtimeInterval')),
            timeout: setTimeoutValue(c8yBase.getRuntimeOption('realtimeTimeout'))
          };
        };

        this.getName = function () {
          return 'e2eExtension';
        };
      };
      var e2eExtension = new E2eExtension();
    }

    var cometd = new org.cometd.CometD();
    cometd.unregisterTransports();
    cometd.registerTransport('long-polling', new c8yLongPollingTransport.LongPollingTransport());
    cometd.websocketEnabled = false;
    /*
     * @see https://docs.cometd.org/current/reference/#_javascript_configure
     */
    function configure() {
      cometd.configure({
        url: c8yBase.url('cep/realtime'),
        logLevel: 'info',
        requestHeaders: c8yAuth.headers(),
        appendMessageTypeToURL: false
      });
      if (c8yBase.getFlag('e2e')) {
        cometd.registerExtension(e2eExtension.getName(), e2eExtension);
      }
    }


    /*
     *
     * @see https://docs.cometd.org/current/reference/#_javascript_handshake
     */
    var handshakeDeferred = $q.defer();
    cometd.addListener('/meta/handshake', function (message) {
      if (message.successful) {
        /**
         * In (rare) case of a re-handshake, resubscribe valid subscriptions.
         * @see https://docs.cometd.org/current/reference/#_javascript_subscribe_resubscribe
         */
        _.forEach(channels, function (channel) {
          var subscription = channel.subscription;

          if (subscription) {
            cometd.resubscribe(subscription);
          }
        });

        handshakeDeferred.resolve();
      } else {
        var err = new Error('Handshake failed.');

        handshakeDeferred.reject(err);
        throw err;
      }
    });
    var unauthorizedListener = cometd.addListener('/meta/connect', function (message) {
      if (message.failure && message.failure.httpCode === 401) {
        disconnect();
        cometd.removeListener(unauthorizedListener);
      }
    });

    $rootScope.$on('authStateChange', function onAuthStateChange(evt, state) {
      if (state.hasAuth) {
        configure();
        cometd.handshake();
      } else {
        disconnect();
      }
    });

    function disconnect() {
      handshakeDeferred = $q.defer();
      cometd.disconnect();
    }

    /*
     * @see https://docs.cometd.org/current/reference/#_javascript_subscribe_exception_handling
     */
    cometd.onListenerException = function (err, subscription, isListener) {
      // Uh-oh, something went wrong, disable this listener/subscriber
      // Object "this" points to the CometD object
      if (isListener) {
        this.removeListener(subscription);
      } else {
        this.unsubscribe(subscription);
      }
      if (c8yBase.getFlag('e2e')) {
        cometd.unregisterExtension(e2eExtension.getName());
      }

      throw new Error('Something went wrong: ' + err);
    };

    var channels = [];
    // The data structure of subscription channels will pretty much look like this:
    // channels = [
    //  {
    //    name: '/alarms/*',
    //    subscription: cometdSubscriptionObject,
    //    subscribers: [
    //      {
    //        id: '001',
    //        subscribedEvents: [
    //          { name: CREATE, listeners: [listener0, listener1, ...] },
    //          { name: UPDATE, listeners: [listener0, listener1, ...] },
    //          { name: DELETE, listeners: [listener0, listener1, ...] },
    //          ...
    //        ],
    //        active: true
    //      },
    //      ...
    //    ]
    //  },
    //  ...
    // ]

    // c8yRealtime service API.
    var service = {
      addListener: _.wrap(addListener, commaSeparatedChannelSegmentDecorator),
      realtimeActions: realtimeActions,
      switchRealtime: _.wrap(switchRealtime, commaSeparatedChannelSegmentDecorator),
      getStatus: getStatus,
      start: _.wrap(start, commaSeparatedChannelSegmentDecorator),
      stop: _.wrap(stop, commaSeparatedChannelSegmentDecorator),
      removeSubscriber: _.wrap(removeSubscriber, commaSeparatedChannelSegmentDecorator),
      destroySubscription: _.wrap(destroySubscription, commaSeparatedChannelSegmentDecorator),
      icon: icon,
      watch: watch,
      _getSubscriptionChannels: getChannels,
      status: status
    };

    return service;

    ////////////

    /**
     * @ngdoc function
     * @name addListener
     * @methodOf c8y.core.service:c8yRealtime
     *
     * @description
     * Adds a new Listener to a realtime channel for the given scope id.
     *
     * @param {string} subscriberId Unique subscription id, using the id of scope responsible for handling subscription is recommended.
     * @param {string} channelName Subscribed channel.
     * @param {string} subscribedEventName the event name on the channel that triggers the function
     * @param {function} listener the function that will be triggered by the event
     *
     * @example
     * See usage example {@link c8y.core.service:c8yRealtime#example here}.
     */
    function addListener(subscriberId, channelName, subscribedEventName, listener) {
      var channel = _.find(channels, { name: channelName });

      if (!channel) {
        channel = createChannel(channelName);
        channels.push(channel);
      }

      var subscribers = channel.subscribers;
      var subscriber = _.find(subscribers, { id: subscriberId });

      if (!subscriber) {
        subscriber = createSubscriber(subscriberId);
        subscribers.push(subscriber);
      }

      var subscribedEvents = subscriber.subscribedEvents;
      var subscribedEvent = _.find(subscribedEvents, { name: subscribedEventName });

      if (!subscribedEvent) {
        subscribedEvent = createSubscribedEvent(subscribedEventName);
        subscribedEvents.push(subscribedEvent);
      }

      subscribedEvent.listeners.push(listener);
    }

    function createChannel(name) {
      return {
        name: name,
        subscription: undefined,
        subscribers: []
      };
    }

    function createSubscriber(id) {
      return {
        id: id,
        subscribedEvents: _.map(realtimeActions(), createSubscribedEvent),
        active: false
      };
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
    function realtimeActions() {
      return {
        CREATE: 'CREATE',
        UPDATE: 'UPDATE',
        DELETE: 'DELETE'
      };
    }

    function createSubscribedEvent(name) {
      return {
        name: name,
        listeners: []
      };
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
     * @param {string} subscriberId Unique subscription id, using the id of scope responsible for handling subscription is recommended.
     * @param {string} channelName Subscribed channel.
     *
     * @example
     * <pre>
     *   var id = $scope.$id;
     *   var channel = '/operations/*';
     *   c8yRealtime.switchRealtime(id, channel);
     * </pre>
     */
    function switchRealtime(subscriberId, channelName) {
      var active = getStatus(subscriberId, channelName);

      if (active) {
        stop(subscriberId, channelName);
      } else {
        start(subscriberId, channelName);
      }
    }

    /**
     * @ngdoc function
     * @name getStatus
     * @methodOf c8y.core.service:c8yRealtime
     *
     * @description
     * Gets status for given subscription id and channel.
     *
     * @param {string} subscriberId Unique subscription id, using the id of scope responsible for handling subscription is recommended.
     * @param {string} channelName Subscribed channel.
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
    function getStatus(subscriberId, channelName) {
      var channelNames = collectChannelNames(channelName);

      return _.every(channelNames, function (name) {
        var active = false;
        var channel = _.find(channels, { name: name });

        if (channel) {
          active = Boolean(_.find(channel.subscribers,
            { id: subscriberId, active: true }));
        }

        return active;
      });
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
     * @param {string} subscriberId Unique subscription id, using the id of scope responsible for handling subscription is recommended.
     * @param {string} channelName Subscribed channel.
     *
     * @example
     * See usage example {@link c8y.core.service:c8yRealtime#example here}.
     */
    function stop(subscriberId, channelName) {
      var subscriber = getSubscriber(subscriberId, channelName);

      if (subscriber) {
        subscriber.active = false;
      }
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
     * @param {string} subscriberId Unique subscription id, using the id of scope responsible for handling subscription is recommended.
     * @param {string} channelName Subscribed channel.
     *
     * @example
     * See usage example {@link c8y.core.service:c8yRealtime#example here}.
     */
    function start(subscriberId, channelName) {
      var subscriber = getSubscriber(subscriberId, channelName);

      if (subscriber) {
        subscriber.active = true;
        var channel = _.find(channels, { name: channelName });

        if (_.isUndefined(channel.subscription)) {
          return subscribe(channel);
        }
      }
    }

    function subscribe(channel) {
      ensureHandshakeSuccessful()
        .then(function () {
          channel.subscription = cometd.subscribe(channel.name, function (message) {
            var messageData = message.data;
            var subscribedEventName = messageData.realtimeAction;
            var data = messageData.data;

            _(channel.subscribers)
              .filter('active')
              .forEach(function (subscriber) {
                var subscribedEvent = _.find(subscriber.subscribedEvents, { name: subscribedEventName });
                var listeners = subscribedEvent.listeners;

                _.forEach(listeners, function (listener) {
                  listener(subscribedEventName, data);
                });
              });
          });
        });
    }

    function ensureHandshakeSuccessful() {
      return handshakeDeferred.promise;
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
     * @param {string} channelName Subscribed channel.
     *
     * @example
     * <pre>
     *   var id = $scope.$id;
     *   var channel = '/operations/*';
     *   c8yRealtime.removeSubscriber(id, channel);
     * </pre>
     *
     */
    function removeSubscriber(id, channelName) {
      var subscriber = getSubscriber(id, channelName);

      if (subscriber) {
        var channel = _.find(channels, { name: channelName });
        var subscribers = channel.subscribers;

        _.remove(subscribers, { id: id });

        if (_.isEmpty(subscribers)) {
          unsubscribe(channel);
        }
      }
    }

    function getSubscriber(id, channelName) {
      var subscriber;
      var channel = _.find(channels, { name: channelName });

      if (channel) {
        subscriber = _.find(channel.subscribers, { id: id });
      } else {
        throw new Error('There is no listener registered for your scope ' +
                        'on the channel \"' + channelName + '\"');
      }

      return subscriber;
    }

    function unsubscribe(channel) {
      var subscription = channel.subscription;

      if (subscription) {
        cometd.unsubscribe(subscription);
      }

      _.remove(channels, channel);
    }

    /**
     * @ngdoc function
     * @name destroySubscription
     * @methodOf c8y.core.service:c8yRealtime
     *
     * @description
     * Destroys the subscription for given id and channel it it is active.
     *
     * @param {string} subscriberId Unique subscription id, using the id of scope responsible for handling subscription is recommended.
     * @param {string} channelName Subscribed channel.
     *
     * @example
     * <pre>
     *   var id = $scope.$id;
     *   var channel = '/operations/*';
     *   c8yRealtime.destroySubscription(id, channel);
     * </pre>
     */
    function destroySubscription(subscriberId, channelName) {
      removeSubscriber(subscriberId, channelName);
    }

    /*
     * Leverage some c8yRealtime service APIs to support comma-separated channel
     * name in a channel segment (e.g. /measurements/10200,10201,10202).
     */
    function commaSeparatedChannelSegmentDecorator(func) {
      // drop `func` argument -> [subscriberId, channelName, ...]
      var args = _.drop(arguments);
      var channelFullName = args[1];

      var channelNames = collectChannelNames(channelFullName);

      _.forEach(channelNames, function (channelName) {
        args[1] = channelName;
        func.apply(this, args);
      }.bind(this));
    }

    function collectChannelNames(channelFullName) {
      var channelNames = [];

      /*
       * Matches patterns like:
       * - /measurements/10200,10201,10202
       * - /measurements/10200
       * - /alarms/*
       * - ... etc.
       */
      var matches = channelFullName.match(/(\/.*)\/(.*)$/);

      if (_.isEmpty(matches)) {
        channelNames.push(channelFullName);
      } else {
        var channelBaseName = matches[1];
        var channelSegmentNames = matches[2].split(',');

        _.forEach(channelSegmentNames, function (channelSegmentName) {
          channelNames.push(channelBaseName + '/' + channelSegmentName);
        });
      }

      return channelNames;
    }

    /**
     * @ngdoc function
     * @name icon
     * @methodOf c8y.core.service:c8yRealtime
     *
     * @description
     * Gets icon for subscription activity status.
     *
     * @param {boolean} state Subscription activity status.
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
    function icon(state) {
      return state ? 'check-circle-o' : 'circle-o';
    }

    function watch(config) {
      var subscriberId = config.id || String(Math.random()).substr(2);
      var channelName = config.channel;
      var subscribedEventNames = _.flattenDeep([config.ops || _.values(realtimeActions())]);
      var listener = config.onUpdate || _.noop;

      _.forEach(subscribedEventNames, function (subscribedEventName) {
        addListener(subscriberId, channelName, subscribedEventName, listener);
      });

      start(subscriberId, channelName);

      return {
        stop: function () {
          stop(subscriberId, channelName);
        }
      };
    }

    function getChannels() {
      if (!c8yBase.getFlag('test')) {
        console.warn('DO NOT USE THIS API CALL: it will break encapsulation, ' +
          'use it only for doing state verification in unit test.');
      }

      return channels;
    }
    function status() {
      return cometd.getStatus();
    }
  }
}());
