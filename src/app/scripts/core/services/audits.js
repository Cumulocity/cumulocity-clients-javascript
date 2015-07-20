/**
 * @ngdoc service
 * @name c8y.core.service:c8yAudits
 * @requires c8y.core.service:c8yBase
 * @requires $http
 *
 * @description
 * This service allows for managing audits.
 */
angular.module('c8y.core')
.factory('c8yAudits', ['$http', 'c8yBase',
function ($http, c8yBase) {
  'use strict';

  var clean = c8yBase.cleanFields,
    path = 'audit/auditRecords',
    defaultConfig = {
      headers: c8yBase.contentHeaders('auditRecord')
    },
    /**
     * @ngdoc property
     * @name severity
     * @propertyOf c8y.core.service:c8yAudits
     * @returns {object} Audit severities map. Available values are:
     *
     * - **WARNING** – Audit is just a warning.
     * - **MINOR** - Audit has got minor priority.
     * - **MAJOR** - Audit has got major priority.
     * - **CRITICAL** - Audit is critical.
     *
     * @example
     * <pre>
     *   $scope.selectedSeverity = c8yAudits.severity.MINOR;
     * </pre>
     */
    severity = {
      WARNING: 'WARNING',
      MINOR: 'MINOR',
      MAJOR: 'MAJOR',
      CRITICAL: 'CRITICAL'
    },
    /**
     * @ngdoc property
     * @name severityList
     * @propertyOf c8y.core.service:c8yAlarms
     * @returns {array} The list of available alarm severity levels
     *
     * @example
     * <pre>
     *   $scope.alarmSeverities = c8yAlarms.severityList;
     * </pre>
     */
    severityList = Object.keys(severity),
    _reservedKeys = [
      'id',
      'self',
      'creationTime'
    ],
    /**
     * @ngdoc property
     * @name reservedKeys
     * @propertyOf c8y.core.service:c8yAudits
     * @returns {array} The list of reserved keys for audit fields.
     *
     * @example
     * <pre>
     *   $scope.reservedKeys = c8yAlarms.reservedKeys;
     * </pre>
     */
    reservedKeys = _reservedKeys,
    removeKeys = _reservedKeys;

 function buildDetailUrl(audit) {
   var id = audit.id || audit;
   return c8yBase.url(path + '/' + id);
 }

 /**
  * @ngdoc function
  * @name list
  * @methodOf c8y.core.service:c8yAudits
  *
  * @description
  * Gets the list of audits filtered by parameters.
  *
  * @param {object} filters Object containing filters for querying audits. Supported filters specific for audits are:
  *
  * - **source** – `integer` – Audit's source object's id.
  * - **type** - `string` - Audit's type.
  *
  * @returns {array} Returns the list of alarms. Each alarm has the following properties:
  *
  * - **activity** - `string` - Type of activity.
  * - **severity** - `string` - Audit's severity level ({@link c8y.core.service:c8yAudits#severity c8yAudits.severity}).
  * - **type** - `string` - Type of audit.
  * - **time** - `string` - Audit's date and time provided by device.
  * - **text** - `string` - Audit's text message.
  *
  * @example
  * <pre>
  *   c8yAudits.list({
  *     source: objectId,
  *     pageSize: 100
  *   }).then(function (audits) {
  *     $scope.audits = [];
  *     angular.forEach(audits, function(audit) {
  *       $scope.audits.push(audit);
  *     });
  *   });
  * </pre>
  */
  function list(filters) {
   // Filters: status, source, dateFrom, dateTo
   var url = c8yBase.url(path),
     _filters = c8yBase.pageSizeNoTotalFilter(filters),
     cfg = {
       params: _filters
     },
     onList = c8yBase.cleanListCallback('auditRecords', list, _filters);

   return $http.get(url, cfg).then(onList).then(filterSystemAudits);
 }

 /**
  * @ngdoc function
  * @name detail
  * @methodOf c8y.core.service:c8yAudits
  *
  * @description
  * Gets the details of selected audit.
  *
  * @param {object|integer} audit Audit object or audit's id.
  *
  * @returns {object} Audit object with audit details:
  *
  * - **id** - `integer` - Audit id.
  * - **self** - `string` - Audit's self URL.
  * - **source** - `object` - Source object with the following properties:
  *     - **id** - source object id
  * - **text** - `string` - Audit's text message.
  * - **time** - `string` - Audit's timestamp.
  * - **type** - `string` - Type of audit.
  *
  * @example
  * <pre>
  *   var auditId = 1;
  *   c8yAudits.detail(auditId).then(function (audit) {
  *     $scope.audit = audit;
  *   });
  * </pre>
  */
 function detail(audit) {
   var url = buildDetailUrl(audit);
   return $http.get(url);
 }

  /**
   * @ngdoc function
   * @name create
   * @methodOf c8y.core.service:c8yAudits
   *
   * @description
   * Creates a new audit record.
   *
   * @param {object} audit Audit object to create. Supported properties are:
   *
   * - **activity** - `string` - Type of activity.
   * - **severity** - `string` - Audit's severity level ({@link c8y.core.service:c8yAudits#severity c8yAudits.severity}).
   * - **type** - `string` - Type of audit.
   * - **time** - `string` - Audit's date and time provided by device.
   * - **text** - `string` - Audit's text message.
   *
   * @returns {promise} $http's promise after posting new audit data.
   *
   * @example
   * <pre>
   *   c8yAudit.create({
   *     actiity: '',
   *     severity: c8yAlarms.severity.MAJOR,
   *     type: 'Custom audit',
   *     time: moment().format(c8yBase.dateFormat),
   *     text: 'My Custom alarm'
   *   });
   * </pre>
   */
  function create(audit) {
    var url = c8yBase.url(path),
      data = clean(audit, removeKeys);
    return $http.post(url, data, defaultConfig);
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
   * @methodOf c8y.core.service:c8yAudits
   *
   * @description
   * Gets the list of property names for an audit.
   *
   * @param {object} audit Audit object.
   *
   * @returns {array} Returns the list of audit properties.
   *
   * @example
   * <pre>
   *   var auditId = 1;
   *   c8yAudits.detail(auditId).then(function (audit) {
   *     $scope.keys = c8yAudits.getKeys(audit);
   *   });
   * </pre>
   */
  function getKeys(audit) {
    var _audit = angular.copy(audit),
      props = Object.keys(_audit);

    return props.filter(isNotReservedKey);
  }

  function filterSystemAudits(audits) {
    _.remove(audits, {
      activity: 'Availability monitoring record'
    });
    return audits;
  }

  return {
    list: list,
    detail: detail,
    create: create,
    severity: severity,
    severityList: severityList,
    reservedKeys: reservedKeys,
    getKeys: getKeys
  };

}]);
