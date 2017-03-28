(function () {

'use strict';

angular.module('c8y.core')
.factory('c8yCounter', [
  '$q',
  'c8yBase',
  'c8yRealtime',
  c8yCounter
]);

/**
 * @ngdoc service
 * @name c8y.core.service:c8yCounter
 * @requires c8y.core.service:c8yBase
 * @requires c8y.core.service:c8yRealtime
 *
 * @description
 * This service provides necessary tools for creating custom counters that
 * support per request counting and realtime counting for API calling services.
 */
function c8yCounter($q, c8yBase, c8yRealtime) {

  /**
   * @ngdoc function
   * @name PropertyMap
   * @methodOf c8y.core.service:c8yCounter
   *
   * @description
   * Constructor for initializing a property map.
   *
   * @param  {array|string} propertyMap Array notation is similar to that of
   * angular's DI annotated array notation. Property names are followed by a
   * function that will be used as the filter. Array can end with a list of
   * properties in the target object to optimize memory usage as only those
   * properties of objects will be stored. With string notation, a default
   * property map is created for that property name.
   *
   * @returns {object} A PropertyMap instance.
   */
  function PropertyMap(propertyMap) {
    propertyMap = _.cloneDeep(propertyMap);
    var that = this;



    /**
     * @ngdoc property
     * @name properties
     * @type {array}
     * @propertyOf c8y.core.service:c8yCounter
     * @description
     * Array of property names for properties that are injected
     * into filter function from the filter object.
     */
    this.properties = null;


    /**
     * @ngdoc property
     * @name filterFn
     * @type {function}
     * @propertyOf c8y.core.service:c8yCounter
     * @description
     * Function that is used to filter target objects. Its arguments are
     * property values that are injected from the filter, followed by the target
     * object.
     */
    this.filterFn = null;


    /**
     * @ngdoc property
     * @name dependencies
     * @type {array}
     * @propertyOf c8y.core.service:c8yCounter
     * @description
     * List of dependent properties of the target object. Only those properties
     * are stored in memory to avoid storing huge JSON trees, but that are
     * sufficient to filter them.
     * Note: nested property names are not supported.
     */
    this.dependencies = null;

    if (_.isArray(propertyMap)) {
      if(!parse(propertyMap)) {
        throw new Error('property map is not valid');
      }
    }
    else if(_.isString(propertyMap)) {
      createDefault(propertyMap);
    }
    else {
      throw new Error('parameter is invalid');
    }

    function createDefault(prop) {
      that.properties = [prop];
      that.filterFn = function (propVal, obj) {
        return _.isEqual(propVal, obj[prop]);
      };
      that.dependencies = [prop];
    }

    function parse(propertyMap) {
      var len = propertyMap.length;
      var lastElem = _.last(propertyMap);
      if (_.isArray(lastElem)) {
        that.dependencies = lastElem;
        that.filterFn = propertyMap[len - 2];
        that.properties = propertyMap.slice(0, len - 2);
        return _.isFunction(that.filterFn) && _.every(that.properties, String);
      }
      if(_.isFunction(lastElem)) {
        that.dependencies = _.initial(propertyMap);
        that.filterFn = lastElem;
        that.properties = that.dependencies;
        return _.every(that.properties, String);
      }

      return false;
    }
  }

  PropertyMap.prototype.matches = function (filter, obj) {
    filter = _.cloneDeep(filter);

    // fill empty props with undefined so _.pick
    // returns those values
    _.forEach(this.properties, function (prop) {
      filter[prop] = filter[prop] || undefined;
    });

    var args = _.values(_.pick(filter, this.properties));
    args.push(obj);
    return this.filterFn.apply(this, args);
  };

  function FilterConfiguration(filter, config) {
    var that = this;

    this.pickList = null;
    this.queryParams = filter;

    // convert unparsed propertyMap array to PropertyMap objects.
    this.propertyMapList = config && _.map(config, function (propertyMap) {
      return new PropertyMap(propertyMap);
    }) || [];

    clearUndefinedProperties();
    fillEmptyMappings();
    createPickList();

    function clearUndefinedProperties() {
      filter = _.pickBy(filter, function (val) {
        return val !== undefined;
      });
    }

    // creates PropertyMap objects for filter properties that have no
    // corresponding PropertyMap in config. See createDefault() in
    // PropertyMap constructor class.
    function fillEmptyMappings() {
      _.forEach(_.keys(filter), function (filterName) {
        var hasMapping = _.some(that.propertyMapList, function (propertyMap) {
          return _.some(propertyMap.properties, function (prop) {
            return prop === filterName;
          });
        });

        if (!hasMapping) {
          that.propertyMapList.push(new PropertyMap(filterName));
        }
      });
    }

    // creates an array of properties that are depended on from the target
    // object to filter.
    function createPickList() {
      var pickListObj = _.reduce(that.propertyMapList, function (result, propertyMap) {
        _.forEach(propertyMap.dependencies, function (prop) {
          result[prop] = true;
        });
        return result;
      }, {});
      // always pick id
      pickListObj.id = true;
      that.pickList = _.keys(pickListObj);
    }
  }

  FilterConfiguration.prototype.matches = function (obj) {
    var that = this;

    return _.every(this.propertyMapList, function (propertyMap) {
      return propertyMap.matches(that.queryParams, obj);
    });
  };

  /**
   * @name c8y.core.service:c8yCounter
   *
   * @description
   * Constructor for initializing a counter instance.
   *
   * @param  {function} listFn  A function that returns a promise wrapping
   *                            an array of objects to be counted, after
   *                            applying a filter if available.
   * @param  {string} realtimeChannel  Channel for realtime subscription.
   * @returns {Counter} A Counter instance.
   */
  function Counter(listFn, realtimeChannel) {
    if(!_.isFunction(listFn)) {
      throw new Error('list function must be provided');
    }
    var that = this,
      isRefreshing = false,
      objects,
      count,
      notificationCallback,
      filterConfig,
      hasFilter = false,
      filter = {
        pageSize: 1
      },
      isStarted = false,
      isStopped = false;

    var REALTIME_FN_MAP = {
      CREATE: onCreate,
      UPDATE: onUpdate,
      DELETE: onDelete
    };

    c8yBase.createLocalId(this, '__realtimeId');

    /**
     * @ngdoc function
     * @name start
     * @methodOf c8y.core.service:c8yCounter
     *
     * @description
     * Fetches objects to count using the list function and subscribes to a
     * realtime channel.
     *
     * @returns {promise} Promise that resolves when tasks are
     * complete.
     */
    this.start = function () {
      if(isStarted) {
        throw new Error('Cannot restart a counter instance, please create a new instance');
      }
      isStarted = true;
      return this.refresh().then(subscribe);
    };

    /**
     * @ngdoc function
     * @name stop
     * @methodOf c8y.core.service:c8yCounter
     *
     * @description
     * Unsubscribes from the realtime channel.
     */
    this.stop = function () {
      if(!isStarted) {
        throw new Error('Cannot stop counter instance without starting it first');
      }
      if(isStopped) {
        throw new Error('Cannot stop an already stopped counter instance');
      }
      isStopped = true;
      unsubscribe();
    };


    /**
     * @ngdoc function
     * @name onNotification
     * @methodOf c8y.core.service:c8yCounter
     *
     * @description
     * Binds an event handler to realtime notification events.
     *
     * @param  {function} callback Callback that is called when count is changed
     * upon a realtime notification.
     *
     */
    this.onNotification = function (callback) {
      notificationCallback = callback;
    };


    /**
     * @ngdoc function
     * @name refresh
     * @methodOf c8y.core.service:c8yCounter
     *
     * @description
     * Fetches objects to count using the list function. Should be used to
     * refresh the count when realtime subscription is not used.
     *
     * @returns {promise} Promise that is resolved when count is refreshed.
     *
     */
    this.refresh = function () {
      isRefreshing = true;
      var queryParams = hasFilter ? filterConfig.queryParams : filter;
      return $q.when(listFn(queryParams)).then(function (objs) {
        if (hasFilter) {
          objects = _(objs)
            .filter(filterMatches)
            .map(map)
            .value();
        } else {
          count = objs.statistics.totalPages;
        }
        updateCount();
        isRefreshing = false;
      });
    };

    /**
     * @ngdoc function
     * @name filter
     * @methodOf c8y.core.service:c8yCounter
     *
     * @description
     * Gets or sets the filter.
     * Note: filter can be set only once during the lifetime of a Counter
     * instance.
     *
     * @param {object} filter Object that is used to filter counted objects.
     * @param {array} filterConfig An array of either arrays or strings that
     * are converted to PropertyMap instances. See PropertyMap class.
     *
     */
    this.filter = function (_filter, _filterConfig) {
      if(!_filter && !_filterConfig) {
        return filter;
      }
      if (hasFilter) {
        throw new Error('filter can be set only once');
      }

      hasFilter = true;
      filterConfig = new FilterConfiguration(_filter, _filterConfig);
    };

    function subscribe() {
      if (!realtimeChannel) {
        return;
      }
      var realtimeActions = c8yRealtime.realtimeActions();
      _.forEach(realtimeActions, function (action) {
        c8yRealtime.addListener(that.__realtimeId, realtimeChannel, action, onNotification);
      });
      return $q.when(c8yRealtime.start(that.__realtimeId, realtimeChannel));
    }

    function unsubscribe() {
      if(realtimeChannel) {
        c8yRealtime.removeSubscriber(that.__realtimeId, realtimeChannel);
      }
    }

    function onNotification(evt, obj) {
      if (!isRefreshing) {
        var oldCount = that.count;
        REALTIME_FN_MAP[evt.name || evt](obj);
        updateCount();
        var newCount = that.count;
        if(notificationCallback && newCount !== oldCount) {
          notificationCallback(newCount, oldCount);
        }
      }
    }

    function onCreate(obj) {
      if (!hasFilter) {
        count += 1;
      }
      else if (filterMatches(obj)) {
        objects.unshift(map(obj));
      }
    }

    function onUpdate(obj) {
      if (hasFilter) {
        var idx = _.findIndex(objects, {id: obj.id});
        if (idx === -1 && filterMatches(obj)) {
          objects.unshift(map(obj));
        }
        else if (idx !== -1 && !filterMatches(obj)) {
          objects.splice(idx, 1);
        }
      }
    }

    function onDelete(obj) {
      if (!hasFilter) {
        count -= 1;
      }
      else {
        var idx = _.findIndex(objects, {id: obj.id});
        if(idx !== -1) {
          objects.splice(idx, 1);
        }
      }
    }

    function updateCount() {
      that.count = objects && objects.length || count || 0;
    }

    // precondition: filter is defined.
    function map(obj) {
      return _.pick(obj, filterConfig.pickList);
    }

    function filterMatches(obj) {
      return filterConfig.matches(obj);
    }
  }

  var datePropertyMap = ['dateFrom', 'dateTo', function (dateFrom, dateTo, obj) {
    var date =  obj && (obj.date || obj.time);
    if (!date) {
      return false;
    }
    if(dateFrom && moment(dateFrom).isAfter(date)) {
      return false;
    }

    if(dateTo && moment(dateTo).isBefore(date)) {
      return false;
    }

    return true;
  }, ['date', 'time']];

  var sourcePropertyMap = ['source', function (source, obj) {
    return (obj && (obj.source && obj.source.id)) === source;
  }, ['source']];


  /**
   * @ngdoc object
   * @name defaultPropertyMaps
   * @propertyOf c8y.core.service:c8yCounter
   * @description Object Containing the default property maps
   */
  var defaultPropertyMaps = {
    date: datePropertyMap,
    source: sourcePropertyMap
  };

  return {
    Counter: Counter,
    defaultPropertyMaps: defaultPropertyMaps
  };
}

})();
