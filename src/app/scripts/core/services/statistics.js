/**
 * @ngdoc service
 * @name c8y.core.service:c8yStatistics
 * @requires c8y.core.service:c8yBase
 * @requires $http
 *
 * @description
 * This service allows for getting summary statistics for current user's tenant.
 */
angular.module('c8y.core')
.factory('c8yStatistics', ['c8yBase', '$http',
  function (c8yBase, $http) {
    'use strict';

    var path = 'tenant/statistics';

    /**
     * @ngdoc function
     * @name getSummary
     * @methodOf c8y.core.service:c8yStatistics
     *
     * @description
     * Gets summary statistics for current user's tenant.
     *
     * @param {object} params Object containing params for querying statistics. Supported parameters are:
     *
     * - **dateFrom** – `{date string}` – The start date for retrieving statistics.
     *
     * @returns {promise} Returns $http's promise with response from server. Response data object has the following properties:
     *
     * - **requestCount** – `{integer}` – Request count for given period.
     * - **storageSize** – `{integer}` – The amount of storage size in use in bytes.
     *
     * @example
     * <pre>
     *   c8yStatistics.getSummary({
     *     dateFrom: '2014-05-26'
     *   }).then(function (res) {
     *     $scope.summary = {
     *       requestCount: res.data.requestCount,
     *       storageSize: res.data.storageSize
     *     };
     *   });
     * </pre>
     */
    function getSummary(params) {
      var url = c8yBase.url(path + '/summary');
      var cfg = {params: params};
      return $http.get(url, cfg);
    }

    /**
     * @ngdoc function
     * @name list
     * @methodOf c8y.core.service:c8yStatistics
     *
     * @description
     * Gets the list of tenant usage statistics.
     *
     * @param {object} params Object containing params for querying statistics. Supported parameters are:
     *
     * - **dateFrom** - `string` - Limit tenant usage statistics to those that are relevant after given date.
     * - **dateTo** - `string` - Limit tenant usage statistics to those that are relevant before given date.
     *
     * @returns {promise} Returns promise with the list of filtered tenant usage statistics.
     *
     * @example
     * <pre>
     *   c8yStatistics.list({
     *     dateFrom: '2014-05-26',
     *     dateTo: '2015-05-26'
     *   }).then(function (res) {
     *     $scope.list = res;
     *     _.forEach(res, function (st) {
     *       console.log(st.tenantId);
     *       console.log(st.deviceCount);
     *       console.log(st.storageSize);
     *       console.log(st.requestCount);
     *     })
     *   });
     * </pre>
     */
    function list(filters) {
      var url = c8yBase.url(path + '/allTenantsSummary'),
        cfg = {
          params: c8yBase.timeOrderFilter(c8yBase.pageSizeNoTotalFilter(filters))
        };

      return $http.get(url, cfg).then(c8yBase.getResData);
    }

    return {
      getSummary: getSummary,
      list: list
    };
  }
]);
