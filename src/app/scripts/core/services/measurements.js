(function() {
  'use strict';


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
    .factory('c8yMeasurements', [
      '$http',
      '$q',
      '$timeout',
      'c8yBase',
      'c8yCepModule',
      'c8yRealtime',
      c8yMeasurements
    ]);

  function c8yMeasurements(
    $http,
    $q,
    $timeout,
    c8yBase,
    c8yCepModule,
    c8yRealtime) {

    var clean = c8yBase.clean;
    var path = 'measurement/measurements';
    var defaultConfig = {
      headers: c8yBase.contentHeaders('measurement')
    };
    var cepModule = {
      status: 'DEPLOYED',
      name: 'c8yui_measurements',
      body: 'insert into SendNotification select measurement as payload, "c8yui/measurements" as channelName ' +
        'from MeasurementCreated;'
    };
    var PAGE_SIZE = 1440;

    function buildDetailUrl(measurement) {
      var id = measurement.id || measurement;
      return c8yBase.url(path) + '/' + id;
    }

    /**
     * @ngdoc property
     * @name accept
     * @propertyOf c8y.core.service:c8yMeasurements
     * @returns {integer} Enum-like object that has possible accept headers for listing measurements.
     *
     * @example
     * <pre>
     *   c8yMeasurements.list({}, c8yMeasurements.accept.csv);
     *   c8yMeasurements.list({}, c8yMeasurements.accept.xslx);
     * </pre>
     */
    var format = c8yBase.createEnum([
      {name: 'csv', value: 'text/csv'},
      {name: 'xlsx', value: 'application/vnd.ms-excel'}
    ]);

    function acceptHeader(_format) {
      var isValid = _format && _(format).map('value').includes(_format.value);
      return isValid ? _format.value : 'application/json';
    }

    /**
     * @ngdoc function
     * @name list
     * @methodOf c8y.core.service:c8yMeasurements
     *
     * @description
     * Gets the list of measurements for given filters, optionally as a file.
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
     * @param {object} format Enum-like object for specifying response format.
     * See c8yBase.createEnum and c8yMeasurements.format for more details.
     * @returns {promise} Returns promise with the list of filtered measurements.<!-- See measurement object specification {@link http://docs.cumulocity.com/measurements@TODO here}.-->
     *
     * @example
     * <pre>
     *   c8yMeasurements.list(
     *     _.assign(c8yBase.timeOrderFilter(), {
     *       type: 'CustomMeasurement',
     *       source: $routeParams.deviceId
     *     })
     *   ).then(function (measurements) {
     *     $scope.measurements = measurements;
     *   });
     * </pre>
     */
    function list(filters, format) {
      var url = c8yBase.url(path);
      var _filters = _.assign({}, c8yBase.todayFilter({}), {pageSize: PAGE_SIZE}, filters);
      var cfg = {
        params: _filters
      };
      var onList;
      if(format) {
        cfg.responseType = 'blob';
        onList = function (res) {
          return res.data;
        };
      } else {
        onList = c8yBase.cleanListCallback('measurements',
         list,
         _filters
       );
      }

      cfg.headers = {Accept: acceptHeader(format)};
      return $http.get(url, cfg).then(function (res) {
        if (res.status === 202) {
          return $q.reject({async: true, data: res.data});
        }
        return res;
      }).then(onList);
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
     * - **revert** - `boolean` - Get measurements order in reverse order.
     *
     * @returns {promise} Returns promise with the list of filtered measurements.<!-- See measurement object specification {@link http://docs.cumulocity.com/measurements@TODO here}.-->
     *
     * @example
     * <pre>
     *   c8yMeasurements.listSeries(
     *     _.assign(c8yBase.timeOrderFilter(), {
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
          _.assign({pageSize: page_size_custom, revert: true}, filters || {})
        );

      function cleanCachequest(filter, request) {
        _.remove(listSeries._cacheFilter, filter);
        _.remove(listSeries._cacheRequest, request);
      }

      if (_filters.dateFrom) {
        _filters.dateFrom = moment(_filters.dateFrom).format(c8yBase.dateFullFormat);
      }

      if (_filters.dateTo) {
        _filters.dateTo = moment(_filters.dateTo).format(c8yBase.dateFullFormat);
      }

      var cfg = {
          params: _filters
        },
        onList = function (res) {
          return res.data;
        },
        requestIndex = _.findIndex(listSeries._cacheFilter, _.partial(_.isEqual, _filters)),
        request = requestIndex >= 0 ? listSeries._cacheRequest[requestIndex] : null;

      if (_filters.dateFrom) {
        _filters.dateFrom = moment(_filters.dateFrom).format(c8yBase.dateFullFormat);
      }

      if (_filters.dateTo) {
        _filters.dateTo = moment(_filters.dateTo).format(c8yBase.dateFullFormat);
      }

      if (!request) {
        request = $http.get(url, cfg).then(onList);
        var filtersRef = _.cloneDeep(_filters);
        var cacheDuration = 3000;
        listSeries._cacheFilter.push(_.cloneDeep(filtersRef));
        listSeries._cacheRequest.push(request);

        if (moment(_filters.dateTo).isAfter(moment())) {
          setTimeout(function () {
            cleanCachequest(filtersRef, request);
          }, cacheDuration);
        }

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
     *     _.assign(c8yBase.timeOrderFilter(), {
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
        _filters = _.assign(filters || {}, {pageSize: 1000, withTotalPages: true}),
        cancelled = false,
        onList = function (list) {
          var isNext = !_.isUndefined(list.paging.next) && (list.length >= _filters.pageSize);
          defer.notify(list);

          if (!isNext) {
            defer.resolve(true);
          }

          if (cancelled) {
            return true;
          }

          return isNext ? list.paging.next().then(onList) : true;
        };

      _.assign(defer.promise, {
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
     * - **revert** - `boolean` - Get measurements in reverse order.
     *
     * @returns {promise} Returns promise with the paged list of filtered measurements.<!-- See measurement object specification {@link http://docs.cumulocity.com/measurements@TODO here}.-->
     *
     * @example
     * <pre>
     *   c8yMeasurements.listSeriesPaged(
     *     _.assign(c8yBase.timeOrderFilter(), {
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
        _filters = _.assign({revert: true}, filters || {}, {pageSize: 1000, withTotalPages: true}),
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

      _.assign(defer.promise, {
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
        data = measurement,
        cfg = _.cloneDeep(defaultConfig);

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
        cfg = _.cloneDeep(defaultConfig);

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

    /**
     * @ngdoc function
     * @name latest
     * @methodOf c8y.core.service:c8yMeasurements
     *
     * @description
     * Gets the latest measurement for a certain filter
     *
     * @param {object} filter The filter for latest measurement. Must define:
     *
     * - **device** - `integer` - id of source device
     * - **fragment** - `string` - measurement's fragment name
     * - **series** - `string` - measurement's series name
     *
     * @param {boolean} realtime Set to true if returned object should be updated in realtime.
     *
     * @returns {promise} Returns a promise which resolves to an object with
     * latest measurement data for specified filter. Optionally, this object is updated in realtime.
     *
     * @example
     * <pre>
     *   var filter = {
     *     device: 10300,
     *     fragment: 'c8y_Temperature',
     *     series: 'T'
     *   };
     *   var realtime = true;
     *   c8yMeasurements.latest(filter, realtime)
     *     .then(function (latestMeasurement) {
     *       $ctrl.latestMeasurement = latestMeasurement;
     *     });
     *   // $ctrl.latestMeasurement will be updated whenever a newer measurement matching filter is received.
     * </pre>
     */
    function latest(filter, realtime) {
      var _filter = filter || {},
        output = {};

      if (!_filter.device) {
        throw new Error('filter.device must be defined');
      }

      if (!_filter.fragment) {
        throw new Error('filter.fragment must be defined');
      }

      if (!_filter.series) {
        throw new Error('filter.series must be defined');
      }

      var cfg = _.assign(c8yBase.timeOrderFilter(), {
        revert: true,
        fragmentType: _filter.fragment,
        source: _filter.device,
        pageSize:  10
      });

      var promise = list(cfg)
        .then(function (measurements) {
          return _.find(measurements, function (m) {
            var frag = m[_filter.fragment];
            return frag && !_.isUndefined(frag[_filter.series]);
          });
        })
        .then(function (val) {
          _.assign(output, val || {});
          return output;
        });

      if (realtime) {
        var rt_cfg = {
            ops: 'CREATE',
            channel: '/measurements/' + _filter.device,
            onUpdate: function (e, data) {
              var f = data[_filter.fragment],
                s = f && f[_filter.series];
              if (s) {
                _.assign(output, data);
              }
            }
          },
          rt_obj = c8yRealtime.watch(rt_cfg);
        promise.stop = _.bind(rt_obj.stop, rt_obj);
      }

      return promise;
    }

    /**
     * @ngdoc function
     * @name listForDataPoint
     * @methodOf c8y.core.service:c8yMeasurements
     *
     * @param {object} dataPoint Datapoint object for which to list the
     * measurements
     * @param {date|moment|string} dateFrom Date from to list the measurements
     * @param {date|moment|string} dateTo Date to to list the measurements
     * @param {string} [aggregation=undefined] The aggregation for data 'HOURLY', 'DAILY' or undefined
     * @return {promise} A promise than when resolved will return an object
     * with properties: 'dataPoint', 'aggregation', 'dateFrom', 'dateTo' and
     * 'values' which is an array of object with the properties time, min, max
     * and 'truncated' if the data on this list is truncated
     */
    function listForDataPoint(dataPoint, dateFrom, dateTo, aggregation) {
      listForDataPoint._cachedRequests = listForDataPoint._cachedRequests || [];
      var cachedRequests = listForDataPoint._cachedRequests;
      var deviceId = dataPoint.__target.id;
      var aggregationType = (aggregation !== 'NONE' ? aggregation : 0) || undefined;

      if (dateFrom) {
        dateFrom = moment(dateFrom);
        switch (aggregation) {
        case 'HOURLY':
          dateFrom.subtract(1, 'hour').startOf('hour');
          break;
        case 'DAILY':
          dateFrom.subtract(1, 'day').startOf('day');
          break;
        default:
          dateFrom.subtract(1, 'minute').startOf('minute');
        }
        dateFrom = dateFrom.format(c8yBase.dateFullFormat);
      }

      if (dateTo) {
        dateTo = moment(dateTo);
        switch (aggregation) {
        case 'HOURLY':
          dateTo.add(1, 'hour').startOf('hour');
          break;
        case 'DAILY':
          dateTo.add(1, 'days').startOf('day');
          break;
        default:
          dateTo.add(1, 'minute').startOf('minute');
        }
        dateTo = dateTo.format(c8yBase.dateFullFormat);
      }

      var filters = {
        dateFrom: dateFrom,
        dateTo: dateTo,
        source: deviceId,
        aggregationType: aggregationType
      };
      var request = _.find(cachedRequests, function (cr) {
        return _.isMatch(cr.filters, filters);
      });

      if (!request) {
        request = {
          deferred: $q.defer(),
          sendThrottled: function () {
            request._sendThrottled();
            return request.deferred.promise;
          },
          _sendThrottled: _.throttle(function () {
            listSeries(request.filters)
              .then(_.unary(request.deferred.resolve));
          }, 500),
          filters: filters
        };
        cachedRequests.push(request);
      }
      var seriesName = [dataPoint.fragment, dataPoint.series].join('.');
      request.filters.series = _.uniq((request.filters.series || []).concat([seriesName]));

      return $timeout(function () {
        return request.sendThrottled()
          .then(callbackForListDataPoint(dataPoint))
          .then(function (obj) {
            obj.aggregation = aggregation;
            obj.dateFrom = dateFrom;
            obj.dateTo = dateTo;
            return obj;
          })
          .finally(function () {
            _.remove(cachedRequests, request);
          });
      }, 5);
    }

    function callbackForListDataPoint(dataPoint) {
      return function (data) {
        var ix = _.findIndex(data.series, function (s) {
            return (s.name === dataPoint.series && s.type === dataPoint.fragment);
          }),
          list = [];

        if (ix > -1) {
          _.forEach(data.values, function (obj, key) {
            if (_.isObjectLike(obj[ix])) {
              list.push({
                time: key,
                min: Number(obj[ix].min),
                max: Number(obj[ix].max)
              });
            }
          });
        }

        return {
          dataPoint: dataPoint,
          values: list,
          truncated: data.truncated
        };
      };
    }

    /**
     * @ngdoc function
     * @name rtMeasurementForDatapoint
     * @methodOf c8y.core.service:c8yMeasurements
     *
     * @description Return a function to filter incoming realtime measurements to fit a specific datapoint
     * @param  {Object} datapoint The data point to create the filter function
     * for
     * @return {function} callback A function that when passed a measurement
     * will check if it fits the specific datapoint and return an object
     * formatted as listForDataPoint
     */
    function rtMeasurementForDatapoint(datapoint) {
      return function (m) {
        var id = datapoint.__target.id,
          frag = datapoint.fragment,
          series = datapoint.series,
          fits = m.source.id === id &&
            m[frag] &&
            m[frag][series];

        return fits && {
          dataPoint: datapoint,
          values: [{
            time: m.time,
            min: m[frag][series].value,
            max: m[frag][series].value
          }]
        };
      };
    }

    return {
      format: format,
      list: list,
      listPaged: listPaged,
      listSeries: listSeries,
      listSeriesPaged: listSeriesPaged,
      detail: detail,
      create: create,
      update: update,
      save: save,
      remove: remove,
      activateCep: activateCep,
      latest: latest,
      listForDataPoint: listForDataPoint,
      rtMeasurementForDatapoint: rtMeasurementForDatapoint
    };

  }

}());
