/**
 * @ngdoc service
 * @name c8y.core.service:c8yEvents
 * @requires c8y.core.service:c8yBase
 * @requires c8y.core.service.c8yCounter
 * @requires $http
 *
 * @description
 * This service allows for managing events.
 */
angular.module('c8y.core')
.factory('c8yEvents', ['$http', 'c8yBase', 'c8yCounter',
function ($http, c8yBase, c8yCounter) {
  'use strict';

  var clean = c8yBase.cleanFields,
    path = 'event/events',
    defaultConfig = {
      headers: c8yBase.contentHeaders('event')
    },
    /**
     * @ngdoc property
     * @name reservedKeys
     * @propertyOf c8y.core.service:c8yEvents
     * @returns {array} Array of field keys for event object. The list contains:
     *
     * - **creationTime**,
     * - **id**,
     * - **self**,
     * - **source**,
     * - **text**,
     * - **time**.
     *
     * <!--For detailed description of each event's field see specification {@link http://docs.cumulocity.com/events@TODO here}.-->
     *
     * @example
     * <pre>
     *   $scope.eventFields = c8yEvents.reservedKeys;
     * </pre>
     */
    reservedKeys = [
      'creationTime',
      'id',
      'self',
      'source',
      'text',
      'time'
    ];

  function buildDetailUrl(evt) {
    var id = evt.id || evt;
    return c8yBase.url(path + '/' + id);
  }

  /**
   * @ngdoc function
   * @name list
   * @methodOf c8y.core.service:c8yEvents
   *
   * @description
   * Gets the list of events for given filters.
   *
   * @param {object} filters Object containing filters for querying events. Supported filters are:
   *
   * - **fragmentType** - `string` - Filter events with given fragment type.
   * - **type** - `string` - Filter events with given type.
   * - **source** - `integer` - Event source's id.
   * - **dateFrom** - `string` - Limit events to those created after given date.
   * - **dateTo** - `string` - Limit events to those created before given date.
   *
   * @returns {promise} Returns promise with the list of filtered events.<!-- See event object specification {@link http://docs.cumulocity.com/events@TODO here}.-->
   *
   * @example
   * <pre>
   *   c8yEvents.list(
   *     angular.extend(c8yBase.timeOrderFilter(), {
   *       type: 'CustomEvent',
   *       source: $routeParams.deviceId
   *     })
   *   ).then(function (events) {
   *     $scope.events = events;
   *   });
   * </pre>
   */
  function list(filters) {
    var url = c8yBase.url(path),
      cfg = {
        params: c8yBase.timeOrderFilter(c8yBase.pageSizeNoTotalFilter(filters))
      },
      onList = c8yBase.cleanListCallback('events',
        list,
        cfg.params
      );

    return $http.get(url, cfg).then(onList);
  }

  /**
   * @ngdoc function
   * @name detail
   * @methodOf c8y.core.service:c8yEvents
   *
   * @description
   * Gets the details of selected event.
   *
   * @param {integer|object} event Event's id or event object.
   *
   * @returns {promise} Returns $http's promise with response from server containing event details.
   *
   * @example
   * <pre>
   *   var eventId = 1;
   *   c8yEvents.detail(eventId).then(function (res) {
   *     $scope.event = res.data;
   *   });
   * </pre>
   */
  function detail(evt) {
    var url = buildDetailUrl(evt);
    return $http.get(url);
  }

  /**
   * @ngdoc function
   * @name create
   * @methodOf c8y.core.service:c8yEvents
   *
   * @description
   * Creates a new event.
   *
   * @param {object} evt Event object.<!-- See object's specification {@link http://docs.cumulocity.com/events@TODO here}.-->
   *
   * @returns {promise} Returns $http's promise after posting new event data.
   *
   * @example
   * <pre>
   *   c8yEvents.create({
   *     type: 'CustomEvent',
   *     text: 'My Custom Event',
   *     time: moment().format(c8yBase.dateFormat),
   *     source: {id: 1}
   *   });
   * </pre>
   */
  function create(evt) {
    var url = c8yBase.url(path),
      data = clean(evt, reservedKeys),
      cfg = angular.copy(defaultConfig);
    return $http.post(url, data, cfg);
  }

  /**
   * @ngdoc function
   * @name update
   * @methodOf c8y.core.service:c8yEvents
   *
   * @description
   * Updates event data.
   *
   * @param {object} evt Event object.<!-- See object's specification {@link http://docs.cumulocity.com/events@TODO here}.-->
   *
   * @returns {promise} Returns $http's promise with the response from server.
   *
   * @example
   * <pre>
   *   var eventId = 1;
   *   c8yEvents.detail(eventId).then(function (res) {
   *     var event = res.data;
   *     event.text = 'My Modified Custom Event';
   *     return event;
   *   })
   *   .then(c8yEvents.update);
   * </pre>
   */
  function update(evt) {
    var url = buildDetailUrl(evt),
      data = clean(evt, reservedKeys),
      cfg = angular.copy(defaultConfig);
    return $http.put(url, data, cfg);
  }

  /**
   * @ngdoc function
   * @name save
   * @methodOf c8y.core.service:c8yEvents
   *
   * @description
   * Creates event if it doesn't exist. Otherwise, updates existing one.
   *
   * @param {object} evt Event object.<!-- See object's specification {@link http://docs.cumulocity.com/events@TODO here}.-->
   *
   * @returns {promise} Returns $http's promise with the response from server.
   *
   * @example
   * This will create a new event:
   * <pre>
   *   c8yEvents.save({
   *     type: 'CustomEvent',
   *     text: 'My Custom Event',
   *     time: moment().format(c8yBase.dateFormat),
   *     source: {id: 1}
   *   });
   * </pre>
   * This will update existing measurement:
   * <pre>
   *   c8yEvents.save({
   *     id: 2,
   *     text: 'My Modified Custom Event'
   *   });
   * </pre>
   */
  function save(evt) {
    return evt.id ? update(evt) : create(evt);
  }

  function isReservedKey(key) {
    return reservedKeys.indexOf(key) !== -1;
  }

  function isNotReservedKey(key) {
    return !isReservedKey(key);
  }

  /**
   * @ngdoc function
   * @name getKeys
   * @methodOf c8y.core.service:c8yEvents
   *
   * @description
   * Gets the list of keys from event which are not reserved keys.
   *
   * @param {object} evt Event object.<!-- See object's specification {@link http://docs.cumulocity.com/events@TODO here}.-->
   *
   * @returns {array} Returns the array of not reserved keys from event object.
   *
   * @example
   * <pre>
   *   var eventId = 1;
   *   c8yEvents.detail(eventId).then(function (res) {
   *     var event = res.data;
   *     $scope.customKeys = c8yEvents.getKeys(event);
   *   });
   * </pre>
   */
  function getKeys(evt) {
    var _evt = angular.copy(evt),
      props = Object.keys(_evt);

    return props.filter(isNotReservedKey);
  }

  /**
   * @ngdoc function
   * @name createCounter
   * @methodOf c8y.core.service:c8yEvents
   *
   * @description
   * Creates a counter instance. Supported filters are source, type and date.
   *
   * @param  {object} filter Object that is used to filter alarms to be counted.
   * @return {Counter} Returns a c8yCounter.Counter instance.
   */
  function createCounter(filter) {
    var counter = new c8yCounter.Counter(list, '/events/*');
    var filterConfig = [
      c8yCounter.defaultPropertyMaps.date,
      c8yCounter.defaultPropertyMaps.source
    ];
    if (filter.type) {
      var type = filter.type;
      filterConfig.push([function (obj) {
        return type === obj.type;
      }]);
    }
    // delete from filter because it will be used as queryParam
    // and querying by date, source, time is not supported.
    delete filter.type;
    counter.filter(filter, filterConfig);
    return counter;
  }

  return {
    list: list,
    detail: detail,
    create: create,
    update: update,
    save: save,
    reservedKeys: reservedKeys,
    getKeys: getKeys,
    createCounter: createCounter
  };

}]);
