/**
 * @ngdoc service
 * @name c8y.core.service:c8ySettings
 * @requires c8y.core.service:c8yBase
 * @requires $http
 *
 * @description
 * This service allows for managing tenant settings.
 */
angular.module('c8y.core')
.factory('c8ySettings', ['$http', 'c8yBase',
function ($http, c8yBase) {
  'use strict';

  var path = 'tenant/options',
    pathReadOnly = 'tenant/security-options',
    pathSystem = 'tenant/system/options',
    config = {
      headers: c8yBase.contentHeaders('option')
    };

  function buildDetailUrl(option) {
    return c8yBase.url(path + '/' + option.category + (option.key ? '/' + option.key : ''));
  }

  function buildDetailUrlForReadOnly (option) {
    return c8yBase.url(pathReadOnly + '/' + option.category + (option.key ? '/' + option.key : ''));
  }
  
  function buildDetailUrlForSystem(option) {
    return c8yBase.url(pathSystem + '/' + option.category + (option.key ? '/' + option.key : ''));
  }

  /**
   * @ngdoc function
   * @name list
   * @methodOf c8y.core.service:c8ySettings
   *
   * @description
   * Gets the list of tenant settings.
   *
   * @param {object} filters Object containing filters for querying tenant settings. Filters specific for c8ySettings are:
   *
   * - **category** - Filter settings categorized under specified category.
   *
   * @returns {promise} Returns promise with the list of tenant settings.<!-- See tenant setting object specification {@link http://docs.cumulocity.com/tenantOptions@TODO here}.-->
   *
   * @example
   * <pre>
   *   c8ySettings.list({
   *     category: 'mycategory'
   *   }).then(function (settings) {
   *     $scope.settings = settings;
   *   });
   * </pre>
   */
  function list(filters) {
    var url = c8yBase.url(path),
      _filters = c8yBase.pageSizeFilter(filters),
      cfg = {
        params: _filters
      },
      onList = c8yBase.cleanListCallback('options', list, _filters),
      promise = $http.get(url, cfg).then(onList);

    if (filters && filters.category) {
      promise = promise.then(function (options) {
        var filtered = options.filter(function (opt) {
          return opt.category === filters.category;
        });

        filtered.paging = options.paging;

        return filtered;
      });
    }

    return promise;
  }

  /**
   * @ngdoc function
   * @name updateOption
   * @methodOf c8y.core.service:c8ySettings
   *
   * @description
   * Updates tenant option's value.
   *
   * @param {object} option Tenant option object<!-- (see specification {@link http://docs.cumulocity.com/tenantOption@TODO here})-->.
   *
   * @returns {promise} Returns $http's promise after putting updated tenant option data.
   *
   * @example
   * <pre>
   *
   *   c8ySettings.updateOption({
   *     category: 'mycategory',
   *     key: 'myoption',
   *     value: 'mymodifiedvalue'
   *   });
   * </pre>
   */
  function updateOption(option) {
    var url = buildDetailUrl(option),
      data = angular.copy(option),
      cfg = angular.copy(config);

    return $http.put(url, data, cfg);
  }

  /**
   * @ngdoc function
   * @name createOption
   * @methodOf c8y.core.service:c8ySettings
   *
   * @description
   * Creates a new tenant option.
   *
   * @param {object} option Tenant option object<!-- (see specification {@link http://docs.cumulocity.com/tenantOption@TODO here})-->.
   *
   * @returns {promise} Returns $http's promise after posting new tenant option data.
   *
   * @example
   * <pre>
   *   c8ySettings.createOption({
   *     category: 'mycategory',
   *     key: 'myoption',
   *     value: 'myvalue'
   *   });
   * </pre>
   */
  function createOption(option) {
    var url = c8yBase.url(path),
      data = angular.copy(option),
      cfg = angular.copy(config);

    return $http.post(url, data, cfg);
  }

  /**
   * @ngdoc function
   * @name deleteOption
   * @methodOf c8y.core.service:c8ySettings
   *
   * @description
   * Removes tenant option.
   *
   * @param {object} option Tenant option object<!-- (see specification {@link http://docs.cumulocity.com/tenantOption@TODO here})-->.
   *
   * @returns {promise} Returns $http's promise with the response from server.
   *
   * @example
   * <pre>
   *   var option = {
   *     category: 'mycategory',
   *     key: 'myoption'
   *   };
   *   c8ySettings.deleteOption(option);
   * </pre>
   */
  function deleteOption(option) {
    var url = buildDetailUrl(option);
    return $http.delete(url);
  }

  /**
   * @ngdoc function
   * @name detail
   * @methodOf c8y.core.service:c8ySettings
   *
   * @description
   * Gets the details of selected tenant option.
   *
   * @param {object} option Tenant option object<!-- (see specification {@link http://docs.cumulocity.com/tenantOption@TODO here})-->.
   *
   * @returns {promise} Returns $http's promise with response from server containing tenant option details.
   *
   * @example
   * <pre>
   *   var option = {
   *     category: 'mycategory',
   *     key: 'myoption'
   *   };
   *   c8ySettings.detail(option).then(function (res) {
   *     $scope.option = res.data;
   *   });
   * </pre>
   */
  function detail(option) {
    var url = option.category === 'password' ? buildDetailUrlForReadOnly(option) : buildDetailUrl(option);
    return $http.get(url);
  }
  
  /**
   * @ngdoc function
   * @name getSystemOption
   * @methodOf c8y.core.service:c8ySettings
   *
   * @description
   * Gets the details of selected system option.
   *
   * @param {object} option Object defining option to get. It can define:
   *
   * - **category** - system option category.
   * - **key** - system option id.
   *
   * @returns {promise} Returns $http's promise with response from server containing system option details.
   *
   * @example
   * <pre>
   *   var option = {
   *     category: 'systemcategory',
   *     key: 'systemoption'
   *   };
   *   c8ySettings.getSystemOption(option).then(function (res) {
   *     $scope.option = res.data;
   *   });
   * </pre>
   */
  function getSystemOption(option) {
    var url = buildDetailUrlForSystem(option);
    return $http.get(url);
  }

  return {
    list: list,
    detail: detail,
    updateOption: updateOption,
    createOption: createOption,
    deleteOption: deleteOption,
    getSystemOption: getSystemOption
  };

}]);
