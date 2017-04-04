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
  .factory('c8ySettings', [
    '$http',
    'c8yBase',
    'gettextCatalog',
    function ($http,
      c8yBase,
      gettextCatalog) {
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

      function buildDetailUrlForReadOnly(option) {
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
          data = _.cloneDeep(option),
          cfg = _.cloneDeep(config);

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
          data = _.cloneDeep(option),
          cfg = _.cloneDeep(config);

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
       * @param {object} config configuration of the request to be sent
       *
       *  <pre>
       *    {
       *      headers:
       *      {
       *        Accept: 'application/vnd.com.nsn.cumulocity.user+json;'
       *      }
       *    }
       *  </pre>
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
      function detail(option, config) {
        var url = option.category === 'password' ? buildDetailUrlForReadOnly(option) : buildDetailUrl(option);
        var conf = _.merge({
          silentError: true
        }, config);
        return $http.get(url, conf);
      }

      /**
       * @ngdoc function
       * @name detailValue
       * @methodOf c8y.core.service:c8ySettings
       *
       * @description
       * Gets the value of requested tenant option.
       *
       * @param {object} option Object defining option to get. It can define:
       *
       * - **category** - tenant option category.
       * - **key** - tenant option id.
       *
       * @param {*} defaultValue Default value for the option in case it's not defined.
       *
       * @param {object} config configuration of the request to be sent
       *
       *  <pre>
       *    {
       *      headers:
       *      {
       *        Accept: 'application/vnd.com.nsn.cumulocity.user+json;'
       *      }
       *    }
       *  </pre>
       *
       * @returns {promise} Returns tenant option's value.
       *
       * @example
       * <pre>
       *   var option = {
       *     category: 'mycategory',
       *     key: 'myoption'
       *   };
       *   c8ySettings.detailValue(option).then(function (value) {
       *     $scope.optionValue = value;
       *   });
       * </pre>
       */
      function detailValue(option, defaultValue, config) {
        defaultValue = !_.isUndefined(defaultValue) ? defaultValue : false;
        return detail(option, config)
          .then(
            _.partialRight(parseSettingsResponse, defaultValue),
            _.partial(_.identity, defaultValue)
          );
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
       * @param {object} config configuration of the request to be sent
       *
       *  <pre>
       *    {
       *      headers:
       *      {
       *        Accept: 'application/vnd.com.nsn.cumulocity.user+json;'
       *      }
       *    }
       *  </pre>
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
      function getSystemOption(option, config) {
        var url = buildDetailUrlForSystem(option);
        var conf = _.merge({
          silentError: true
        }, config);
        return $http.get(url, conf);
      }

      /**
       * @ngdoc function
       * @name getSystemOptionValue
       * @methodOf c8y.core.service:c8ySettings
       *
       * @description
       * Gets the value of requested system option.
       *
       * @param {object} option Object defining system option to get. It should have the following properties:
       *
       * - **category** - system option category.
       * - **key** - system option id.
       *
       * @param {*} defaultValue Default value for the option in case it's not defined.
       *
       * @param {object} config configuration of the request to be sent
       *
       *  <pre>
       *    {
       *      headers:
       *      {
       *        Accept: 'application/vnd.com.nsn.cumulocity.user+json;'
       *      }
       *    }
       *  </pre>
       *
       * @returns {promise} Returns system option's value.
       *
       * @example
       * <pre>
       *   var option = {
       *     category: 'systemcategory',
       *     key: 'systemoption'
       *   };
       *   c8ySettings.getSystemOptionValue(option).then(function (value) {
       *     $scope.optionValue = value;
       *   });
       * </pre>
       */
      function getSystemOptionValue(option, defaultValue, config) {
        defaultValue = !_.isUndefined(defaultValue) ? defaultValue : false;
        return getSystemOption(option, config)
          .then(
            _.partialRight(parseSettingsResponse, defaultValue),
            _.partial(_.identity, defaultValue)
          );
      }

      function parseSettingsResponse(res, defaultValue) {
        var result;
        try {
          result = JSON.parse(res.data.value);
        } catch (e) {
          result = !_.isUndefined(res.data.value) ? res.data.value : defaultValue;
        }
        return result;
      }

      var cache = {};

      function setUserPasswordValidationParams(min, max) {
        var defaultMin = 8;
        var defaultMax = 32;
        var min = min || defaultMin;
        var max = max || defaultMax;
        Object.defineProperty(window.c8yConfig.validation.password, 'message', {
          get: function () {
            return gettextCatalog.getString('Password must have at least {{min}} characters and no more than {{max}} and can only contain letters, numbers and following symbols: `~!@#$%^&*()_|+-=?;:\'",.<>{}[]\\/', {
              min: min,
              max: max
            });
          }
        });
        Object.defineProperty(window.c8yConfig.validation.password, 'pattern', {
          get: function () {
            var cacheKey = min + '_' + max;
            if (!cache[cacheKey]) {
              cache[cacheKey] = new RegExp('^[a-zA-Z0-9`~!@#$%^&*()_|+\\-=?;:\'",.<>\\{\\}\\[\\]\\\\\/]{' + min + ',' + max + '}$');
            }
            return cache[cacheKey];
          }
        });
      }

      return {
        list: list,
        detail: detail,
        detailValue: detailValue,
        updateOption: updateOption,
        createOption: createOption,
        deleteOption: deleteOption,
        getSystemOption: getSystemOption,
        getSystemOptionValue: getSystemOptionValue,
        setUserPasswordValidationParams: setUserPasswordValidationParams
      };

    }
  ]);
