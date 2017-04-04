(function () {
  /**
   * @ngdoc service
   * @name c8y.core.service:c8yRetentions
   * @requires c8y.core.service:c8yBase
   * @requires $http
   * @requires $q
   *
   * @description
   * This service allows for managing retention rules.
   */
  angular.module('c8y.core').factory('c8yRetentions', [
    '$http',
    '$q',
    'c8yBase',
    c8yRetentions
  ]);

  function c8yRetentions(
    $http,
    $q,
    c8yBase
  ) {
    var path = 'retention/retentions',
      defaultConfig = {
        headers: c8yBase.contentHeaders('retentionRule', 'retentionRule')
      };

    /**
     * @ngdoc property
     * @name dataTypes
     * @propertyOf c8y.core.service:c8yRetentions
     * @returns {array} List of allowed data types. Available values are:
     *
     * - **ALARM** –
     * - **EVENT** -
     * - **MEASUREMENT** -
     * - **OPERATION** -
     * - **AUDIT** -
     *
     */
    var dataTypes = [
      'ALARM',
      'EVENT',
      'MEASUREMENT',
      'OPERATION',
      'AUDIT',
      '*'
    ];

    var unsupportedFieldsForDataTypes = {
      'ALARM': ['fragmentType'],
      'EVENT': [],
      'MEASUREMENT': [],
      'OPERATION': ['type'],
      'AUDIT': ['fragmentType'],
      '*': []
    };

    /**
     * @ngdoc function
     * @name list
     * @methodOf c8y.core.service:c8yRetentions
     *
     * @description
     * Gets the list of retention rules.
     *
     * @param {object} filters Object containing filters for querying retention rules. Supported filters are:
     *
     * - **pageSize** - `integer` - Limit the number of items returned on a single page.
     *
     * <!--For other available filters see specification {@link http://docs.cumulocity.com/retentionsFilters@TODO here}.-->
     *
     * @returns {array} Returns the list of retention rule objects. Each retention rule object has at least the following common properties:
     *
     * - **id** - `integer` - Retention rule id.
     * - **dataType** - `string` - Data type that retention rule applies to.
     * - **fragmentType** - `string` - Fragment type that retention rule applies to.
     * - **type** - `string` - Type that retention rule applies to, where applicable.
     * - **source** - `string` - Source that retention rule applies to, where applicable.
     * - **maximumAge** - `integer` - Maximum age that retention rule allows corresponding data to reach.
     *
     * <!--For more details about retention rules see specification {@link http://docs.cumulocity.com/retentions@TODO here}.-->
     *
     * @example
     * <pre>
     *   var filters = {pageSize: 100};
     *   c8yRetentions.list(filters).then(function (retentions) {
     *     $scope.retentions = [];
     *     _.forEach(retentions, function(retention) {
     *       $scope.retentions.push(retention);
     *     });
     *   });
     * </pre>
     */
    function list(filters) {
      var url = c8yBase.url(path);
      filters = c8yBase.pageSizeFilter(filters);
      var cfg = {
        params: filters,
        silentError: true
      };
      var onList = c8yBase.cleanListCallback('retentionRules', list, filters);
      return $http.get(url, cfg).then(onList, $q.reject);
    }

    /**
     * @ngdoc function
     * @name detail
     * @methodOf c8y.core.service:c8yRetentions
     *
     * @description
     * Gets the details of selected retention rule object.
     *
     * @param {integer|object} ro Retention rule object's id or object.
     *
     * @returns {promise} Returns $http's promise with response containing data property with retention rule object's details.<!-- See object's specification {@link http://docs.cumulocity.com/retentions@TODO here}.-->
     *
     * @example
     * <pre>
     *   var roId = 1;
     *   c8yRetentions.detail(roId).then(function (res) {
     *     $scope.retention = res.data;
     *   });
     * </pre>
     */
    function detail(ro) {
      var url = buildDetailUrl(ro);
      if (!url) {
        return $q.reject('Retention rule object is not valid');
      }
      return $http.get(url);
    }

    /**
     * @ngdoc function
     * @name create
     * @methodOf c8y.core.service:c8yRetentions
     *
     * @description
     * Creates a new retention rule object. If a property value is not provided,
     * it is replaced by the wildcard character '*' that makes it apply to all
     * possible values.
     *
     * @param {object} ro Retention rule object to create.<!-- See object's specification {@link http://docs.cumulocity.com/retentions@TODO here}.-->
     *
     * @returns {promise} Returns $http's promise after posting new retention rule object's data.
     *
     * @example
     * <pre>
     *   // This retention rule applies to alarms of any fragment type,
     *   // of 'anAlarmType' type, coming from any device.
     *   // Data will be retented for 12 days.
     *   c8yRetentions.create({
     *    dataType: 'ALARM',
     *    fragmentType: '*',
     *    type: 'anAlarmType',
     *    source: '*',
     *    maximumAge:12
     *   });
     * </pre>
     */
    function create(ro) {
      var url = c8yBase.url(path);
      return $http.post(url, ro, defaultConfig);
    }

    /**
     * @ngdoc function
     * @name update
     * @methodOf c8y.core.service:c8yRetentions
     *
     * @description
     * Updates retention rule object's data.
     *
     * @param {object} ro Retention rule object.
     *
     * @returns {promise} Returns $http's promise with the response from server.
     *
     * @example
     * <pre>
     *   var roId = 1;
     *   c8yRetentions.detail(roId).then(function (ro) {
     *     return ro.maximumAge = 24;
     *   }).then(c8yRetentions.update);
     * </pre>
     */
    function update(ro) {
      var url = buildDetailUrl(ro);
      return $http.put(url, ro, defaultConfig);
    }

    /**
     * @ngdoc function
     * @name save
     * @methodOf c8y.core.service:c8yRetentions
     *
     * @description
     * Creates retention rule object if it doesn't exist. Otherwise, updates existing one.
     *
     * @param {object} ro Retention rule object.
     *
     * @returns {promise} Returns $http's promise with the response from server.
     *
     * @example
     * This will create a new retention rule object:
     * <pre>
     *   c8yRetentions.save({
     *     dataType: 'EVENT',
     *     source: 'aDeviceId'
     *   });
     * </pre>
     * This will update existing managed object:
     * <pre>
     *   c8yRetentions.save({
     *     id: 1,
     *     maximumAge: 24
     *   });
     * </pre>
     */
    function save(ro) {
      return ro.id ? update(ro) : create(ro);
    }

    /**
     * @ngdoc function
     * @name remove
     * @methodOf c8y.core.service:c8yRetentions
     *
     * @description
     * Removes retention rule object from inventory.
     *
     * @param {integer|object} ro Retention rule object's id or object.
     *
     * @returns {promise} Returns $http's promise with response from server.
     *
     * @example
     * <pre>
     *   var roId = 1;
     *   c8yRetentions.remove(roId);
     * </pre>
     */
    function remove(ro) {
      var url = buildDetailUrl(ro);
      if (!url) {
        return $q.reject('Retention rule object is not valid');
      }
      return $http.delete(url);
    }

    function buildDetailUrl(ro) {
      var id = ro && ro.id || ro;
      if (!id) {
        return;
      }
      return c8yBase.url(path + '/' + id);
    }

    /**
     * @ngdoc function
     * @name isFieldSupportedByRule
     * @methodOf c8y.core.service:c8yRetentions
     *
     * @description
     * Checks if given rule supports specific field.
     *
     * @param {object} rule Retention rule object.
     * @param {string} fieldName Field name to check.
     *
     * @returns {boolean} Returns true if field is supported by the rule or false otherwise.
     *
     * @example
     * <pre>
     *   var rule = {dataType: 'ALARM'};
     *   var fragmentTypeSupported = c8yRetentions.isFieldSupportedByRule(rule, 'fragmentType');
     * </pre>
     */
    function isFieldSupportedByRule(rule, fieldName) {
      return !_.includes(unsupportedFieldsForDataTypes[rule.dataType || '*'] || [], fieldName);
    }

    return {
      list: list,
      detail: detail,
      create: create,
      update: update,
      save: save,
      remove: remove,
      dataTypes: dataTypes,
      isFieldSupportedByRule: isFieldSupportedByRule
    };
  }
})();
