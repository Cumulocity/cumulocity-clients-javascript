/**
 * @ngdoc service
 * @name c8y.core.service:c8yMeasurements
 * @requires c8y.core.service:c8yBase
 * @requires c8y.core.service:c8yCepModule
 * @requires $http
 * @requires $q
 *
 * @description
 * This service allows for managing measurements.
 */
angular.module('c8y.core')
.factory('c8yMeasurements', ['$http', '$q', 'c8yBase', 'c8yCepModule',
function ($http, $q, c8yBase, c8yCepModule) {
  'use strict';

  var clean = c8yBase.clean,
    path = 'measurement/measurements',
    defaultConfig = {
      headers: c8yBase.contentHeaders('measurement')
    },
    cepModule = {
      status: 'DEPLOYED',
      name: 'c8yui_measurements',
      body: 'insert into SendNotification select measurement as payload, "c8yui/measurements" as channelName ' +
        'from MeasurementCreated;'
    },
    PAGE_SIZE = 1440;

  function buildDetailUrl(measurement) {
    var id = measurement.id || measurement;
    return c8yBase.url(path) + '/' + id;
  }

  /**
   * @ngdoc function
   * @name list
   * @methodOf c8y.core.service:c8yMeasurements
   *
   * @description
   * Gets the list of measurements for given filters.
   *
   * @param {object} filters Object containing filters for querying measurements. Supported filters are:
   *
   * - **fragmentType** - `string` - Filter measurements with given fragment type.
   * - **type** - `string` - Filter measurements with given type.
   * - **source** - `integer` - Measurements source's id.
   * - **dateFrom** - `string` - Limit measurements to those after given date.
   * - **dateTo** - `string` - Limit measurements to those before given date.
   * - **revert** - `boolean` - Get measurements in reverse order i.e. from the most recent ones.
   *
   * @returns {promise} Returns promise with the list of filtered measurements.<!-- See measurement object specification {@link http://docs.cumulocity.com/measurements@TODO here}.-->
   *
   * @example
   * <pre>
   *   c8yMeasurements.list(
   *     angular.extend(c8yBase.timeOrderFilter(), {
   *       type: 'CustomMeasurement',
   *       source: $routeParams.deviceId
   *     })
   *   ).then(function (measurements) {
   *     $scope.measurements = measurements;
   *   });
   * </pre>
   */
  function list(filters) {
    var page_size_custom = PAGE_SIZE,
      url = c8yBase.url(path),
      _filters = c8yBase.todayFilter(
        angular.extend({pageSize: page_size_custom}, filters || {})
      ),
      cfg = {
        params: _filters
      },
      onList = c8yBase.cleanListCallback('measurements',
        list,
        _filters
      );

    // if (_filters && _filters.dateFrom && _filters.dateTo ) {
    //   var days = moment(_filters.dateTo).diff(moment(_filters.dateFrom), 'days');
    //   _filters.pageSize = (days + 1) * PAGE_SIZE;
    // }

    return $http.get(url, cfg).then(onList);
  }

  /**
   * @ngdoc function
   * @name listSeries
   * @methodOf c8y.core.service:c8yMeasurements
   *
   * @description
   * Gets the list of measurements series for given a specific fragmentType
   *
   * @param {object} filters Object containing filters for querying measurements. Supported filters are:
   *
   * - **fragmentType** - `string` - Filter measurements with given fragment type.
   * - **source** - `integer` - Measurements source's id.
   * - **dateFrom** - `string` - Limit measurements to those after given date.
   * - **dateTo** - `string` - Limit measurements to those before given date.
   *
   * @returns {promise} Returns promise with the list of filtered measurements.<!-- See measurement object specification {@link http://docs.cumulocity.com/measurements@TODO here}.-->
   *
   * @example
   * <pre>
   *   c8yMeasurements.listSeries(
   *     angular.extend(c8yBase.timeOrderFilter(), {
   *       fragmentType: 'CustomMeasurement',
   *       source: $routeParams.deviceId
   *     })
   *   ).then(function (measurements) {
   *     $scope.measurements = measurements;
   *   });
   * </pre>
   */
  function listSeries(filters) {
    var page_size_custom = PAGE_SIZE,
      url = c8yBase.url(path + '/series'),
      _filters = c8yBase.todayFilter(
        angular.extend({pageSize: page_size_custom}, filters || {})
      ),
      cfg = {
        params: _filters
      },
      onList = function (res) {
        return res.data;
      },
      requestIndex = _.findIndex(listSeries._cacheFilter, _.partial(_.isEqual, _filters)),
      request = requestIndex >= 0 ? listSeries._cacheRequest[requestIndex] : null;

    if (!request) {
      request = $http.get(url, cfg).then(onList);
      listSeries._cacheFilter.push(angular.copy(_filters));
      listSeries._cacheRequest.push(request);
    }

    return request;
  }
  listSeries._cacheFilter = [];
  listSeries._cacheRequest = [];

  /**
   * @ngdoc function
   * @name listPaged
   * @methodOf c8y.core.service:c8yMeasurements
   *
   * @description
   * Gets the paged list of measurements for given filters.
   *
   * @param {object} filters Object containing filters for querying measurements. Supported filters are:
   *
   * - **fragmentType** - `string` - Filter measurements with given fragment type.
   * - **type** - `string` - Filter measurements with given type.
   * - **source** - `integer` - Measurements source's id.
   * - **dateFrom** - `string` - Limit measurements to those after given date.
   * - **dateTo** - `string` - Limit measurements to those before given date.
   *
   * @returns {promise} Returns promise with the paged list of filtered measurements.<!-- See measurement object specification {@link http://docs.cumulocity.com/measurements@TODO here}.-->
   *
   * @example
   * <pre>
   *   c8yMeasurements.listPaged(
   *     angular.extend(c8yBase.timeOrderFilter(), {
   *       type: 'CustomMeasurement',
   *       source: $routeParams.deviceId
   *     })
   *   ).then(function (measurements) {
   *     $scope.measurements = measurements;
   *   });
   * </pre>
   */
  function listPaged(filters) {
    var defer = $q.defer(),
      _filters = angular.extend(filters || {}, {pageSize: 1000, withTotalPages: true}),
      cancelled = false,
      onList = function (list) {
        var isNext = angular.isDefined(list.paging.next) && !(list.length < _filters.pageSize);
        defer.notify(list);
        
        if (!isNext) {
          defer.resolve(true);
        }

        if (cancelled) {
          return true;
        }

        return isNext ? list.paging.next().then(onList) : true;
      };

    angular.extend(defer.promise, {
      cancel: function () {
        cancelled = true;
        defer.reject('canceled');
      }
    });

    list(_filters).then(onList);

    return defer.promise;
  }

  /**
   * @ngdoc function
   * @name listSeriesPaged
   * @methodOf c8y.core.service:c8yMeasurements
   *
   * @description
   * Gets the paged list of measurements for given series.
   *
   * @param {object} filters Object containing filters for querying measurements. Supported filters are:
   *
   * - **fragmentType** - `string` - Filter measurements with given fragment type.
   * - **source** - `integer` - Measurements source's id.
   * - **dateFrom** - `string` - Limit measurements to those after given date.
   * - **dateTo** - `string` - Limit measurements to those before given date.
   *
   * @returns {promise} Returns promise with the paged list of filtered measurements.<!-- See measurement object specification {@link http://docs.cumulocity.com/measurements@TODO here}.-->
   *
   * @example
   * <pre>
   *   c8yMeasurements.listSeriesPaged(
   *     angular.extend(c8yBase.timeOrderFilter(), {
   *       fragmentType: 'CustomMeasurement',
   *       source: $routeParams.deviceId
   *     })
   *   ).then(function (measurements) {
   *     $scope.measurements = measurements;
   *   });
   * </pre>
   */
  function listSeriesPaged(filters) {
    var defer = $q.defer(),
      _filters = angular.extend(filters || {}, {pageSize: 1000, withTotalPages: true}),
      cancelled = false,
      onList = function (list) {
        defer.notify(list);
        if (!list.paging.next) {
          defer.resolve(true);
        }

        if (cancelled) {
          return true;
        }

        return list.paging.next ? list.paging.next().then(onList) : true;
      };

    angular.extend(defer.promise, {
      cancel: function () {
        cancelled = true;
        defer.reject('canceled');
      }
    });

    listSeries(_filters).then(onList);

    return defer.promise;
  }

  /**
   * @ngdoc function
   * @name detail
   * @methodOf c8y.core.service:c8yMeasurements
   *
   * @description
   * Gets the details of selected measurement.
   *
   * @param {integer|object} measurement Measurement's id or measurement object.
   *
   * @returns {promise} Returns $http's promise with response from server containing measurement details.
   *
   * @example
   * <pre>
   *   var measurementId = 1;
   *   c8yMeasurements.detail(measurementId).then(function (res) {
   *     $scope.measurement = res.data;
   *   });
   * </pre>
   */
  function detail(measurement) {
    var url = buildDetailUrl(measurement);
    return $http.get(url);
  }

  /**
   * @ngdoc function
   * @name create
   * @methodOf c8y.core.service:c8yMeasurements
   *
   * @description
   * Creates a new measurement.
   *
   * @param {object} measurement Measurement object.<!-- See object's specification {@link http://docs.cumulocity.com/measurement@TODO here}.-->
   *
   * @returns {promise} Returns $http's promise after posting new measurement data.
   *
   * @example
   * <pre>
   *   c8yMeasurements.create({
   *     type: 'CustomMeasurement',
   *     time: moment().format(c8yBase.dateFormat),
   *     source: {id: 1},
   *     measuredCount: {
   *       value: 20,
   *       unit: 'pcs'
   *     }
   *   });
   * </pre>
   */
  function create(measurement) {
    var url = c8yBase.url(path),
      data = clean(measurement),
      cfg = angular.copy(defaultConfig);

    if (!data.source) {
      throw (new Error('c8yMeasurement: source must be defined'));
    }

    return $http.post(url, data, cfg);
  }

  /**
   * @ngdoc function
   * @name update
   * @methodOf c8y.core.service:c8yMeasurements
   *
   * @description
   * Updates measurement data.
   *
   * @param {object} measurement Measurement object.<!-- See object's specification {@link http://docs.cumulocity.com/measurement@TODO here}.-->
   *
   * @returns {promise} Returns $http's promise with the response from server.
   *
   * @example
   * <pre>
   *   var moId = 1;
   *   c8yMeasurements.detail(moId).then(function (res) {
   *     var measurement = res.data;
   *     measurement.measuredCount.value = 0;
   *     return measurement;
   *   })
   *   .then(c8yMesurements.update);
   * </pre>
   */
  function update(measurement) {
    var url = buildDetailUrl(measurement),
      data = clean(measurement),
      cfg = angular.copy(defaultConfig);

    return $http.put(url, data, cfg);
  }

  /**
   * @ngdoc function
   * @name save
   * @methodOf c8y.core.service:c8yMeasurements
   *
   * @description
   * Creates measurement if it doesn't exist. Otherwise, updates existing one.
   *
   * @param {object} measurement Measurement object.<!-- See object's specification {@link http://docs.cumulocity.com/measurement@TODO here}.-->
   *
   * @returns {promise} Returns $http's promise with the response from server.
   *
   * @example
   * This will create a new measurement:
   * <pre>
   *   c8yMeasurements.save({
   *     type: 'CustomMeasurement',
   *     time: moment().format(c8yBase.dateFormat),
   *     source: {id: 1},
   *     measuredCount: {
   *       value: 20,
   *       unit: 'pcs'
   *     }
   *   });
   * </pre>
   * This will update existing measurement:
   * <pre>
   *   c8yMeasurements.save({
   *     id: 2,
   *     measuredCount: {
   *       value: 200,
   *       unit: 'pcs'
   *     }
   *   });
   * </pre>
   */
  function save(measurement) {
    return measurement.id ? update(measurement) : create(measurement);
  }

  /**
   * @ngdoc function
   * @name remove
   * @methodOf c8y.core.service:c8yMeasurements
   *
   * @description
   * Removes measurement.
   *
   * @param {integer|object} measurement Measurement object's id or measurement object.
   *
   * @returns {promise} Returns $http's promise with the response from server.
   *
   * @example
   * <pre>
   *   var measurementId = 1;
   *   c8yMeasurements.remove(measurementId);
   * </pre>
   */
  function remove(measurement) {
    var url = buildDetailUrl(measurement);
    return $http['delete'](url);
  }

  /**
   * @ngdoc function
   * @name activateCep
   * @methodOf c8y.core.service:c8yMeasurements
   *
   * @description
   * Creates or redeploys CEP module for measurements.
   *
   * @returns {promise} Returns $http's promise with the response from server.
   *
   * @example
   * <pre>
   *   c8yMeasurements.activateCep();
   * </pre>
   */
  function activateCep() {
    return c8yCepModule.createOrDeploy(cepModule);
  }

  return {
    list: list,
    listPaged: listPaged,
    listSeries: listSeries,
    listSeriesPaged: listSeriesPaged,
    detail: detail,
    create: create,
    update: update,
    save: save,
    remove: remove,
    activateCep: activateCep
  };

}]);
