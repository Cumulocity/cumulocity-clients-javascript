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
     * @returns {array} The list of available alarm severity levels.
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

//  function buildDetailUrl(audit) {
//    var id = audit.id || audit;
//    return c8yBase.url(path + '/' + id);
//  }

//  /**
//   * @ngdoc function
//   * @name list
//   * @methodOf c8y.core.service:c8yAudits
//   * 
//   * @description
//   * Gets the list of alarms filtered by parameters.
//   * 
//   * @param {object} filters Object containing filters for querying alarms. Supported filters specific for alarms are:
//   * 
//   * - **source** – `integer` – Alarm's source device's id.
//   * - **severity** - `string` - Alarm's severity level ({@link c8y.core.service:c8yAlarms#severity c8yAlarms.severity}).
//   * - **status** - `string` - Alarm's status ({@link c8y.core.service:c8yAlarms#status c8yAlarms.status}).
//   * - **resolved** - `boolean` - Alarm's resolved status.
//   * 
//   * @returns {array} Returns the list of alarms. Each alarm has the following properties:
//   * 
//   * - **id** - `integer` - Alarm's id.
//   * - **type** - `string` - Type of alarm.
//   * - **text** - `string` - Alarm's text message.
//   * - **time** - `string` - Alarm's date provided by device.
//   * - **creationTime** - `string` - Date and time when alarm was created on the platform.
//   * - **source** - `object` - Source device's object with the following properties:
//   *     - **id** - source device id,
//   *     - **name** - source device name.
//   * - **count** - `integer` - Alarm's count.
//   * - **firstOccurrence** - `boolean` - Indicates that this is the first occurrence of the alarm.
//   * - **history** - `object` - Contains the list of history items in  **auditRecords** property.
//   * - **severity** - `string` - Alarm's severity level ({@link c8y.core.service:c8yAlarms#severity c8yAlarms.severity}).
//   * - **status** - `string` - Alarm's status ({@link c8y.core.service:c8yAlarms#status c8yAlarms.status}}.
//   * - **self** - `string` - Alarm's self URL.
//   * 
//   * @example
//   * <pre>
//   *   c8yAlarms.list({
//   *     source: deviceId,
//   *     severity: c8yAlarms.severity.MAJOR,
//   *     status: c8yAlarms.status.ACTIVE,
//   *     resolved: false,
//   *     pageSize: 100
//   *   }).then(function (alarms) {
//   *     $scope.alarms = [];
//   *     angular.forEach(alarms, function(alarm) {
//   *       $scope.alarms.push(alarm);
//   *     });
//   *   });
//   * </pre>
//   */
//  function list(filters) {
//    // Filters: status, source, dateFrom, dateTo
//    var url = c8yBase.url(path),
//      _filters = c8yBase.timeOrderFilter(
//        c8yBase.pageSizeNoTotalFilter(filters)
//      ),
//      cfg = {
//        params: _filters
//      },
//      onList = c8yBase.cleanListCallback('alarms', list, _filters);
//
//    return $http.get(url, cfg).then(onList);
//  }

//  /**
//   * @ngdoc function
//   * @name detail
//   * @methodOf c8y.core.service:c8yAudits
//   * 
//   * @description
//   * Gets the details of selected alarms.
//   * 
//   * @param {object|integer} alarm Alarm object or alarm's id.
//   * 
//   * @returns {object} Alarm object with alarm details:
//   * 
//   * - **count** - `integer` - Alarm's count.
//   * - **creationTime** - `string` - Date and time when alarm was created on the platform.
//   * - **firstOccurrence** - `boolean` - Indicates that this is the first occurrence of the alarm.
//   * - **history** - `object` - Contains the list of history items in  **auditRecords** property.
//   * - **id** - `integer` - Alarms' id.
//   * - **self** - `string` - Alarm's self URL.
//   * - **severity** - `string` - Alarm's severity level ({@link c8y.core.service:c8yAlarms#severity c8yAlarms.severity}).
//   * - **source** - `object` - Source device's object with the following properties:
//   *     - **id** - source device id,
//   *     - **name** - source device name.
//   * - **status** - `string` - Alarm's status ({@link c8y.core.service:c8yAlarms#status c8yAlarms.status}}.
//   * - **text** - `string` - Alarm's text message.
//   * - **time** - `string` - Alarm's date provided by device.
//   * - **type** - `string` - Type of alarm.
//   * 
//   * @example
//   * <pre>
//   *   var alarmId = 1;
//   *   c8yAlarms.detail(alarmId).then(function (alarm) {
//   *     $scope.alarm = alarm;
//   *   });
//   * </pre>
//   */
//  function detail(alarm) {
//    var url = buildDetailUrl(alarm);
//    return $http.get(url);
//  }

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

//  /**
//   * @ngdoc function
//   * @name update
//   * @methodOf c8y.core.service:c8yAudits
//   * 
//   * @description
//   * Updates alarm data.
//   * 
//   * @param {object} alarm Alarm object.
//   * 
//   * @returns {promise} Returns $http's promise with the response from server.
//   * 
//   * @example
//   * <pre>
//   *   var alarmId = 1;
//   *   c8yAlarms.detail(alarmId).then(function (alarm) {
//   *     return alarm.status = c8yAlarms.status.CLEARED;
//   *   }).then(c8yAlarms.update);
//   * </pre>
//   */
//  function update(alarm) {
//    var url = buildDetailUrl(alarm),
//      data = clean(alarm, removeKeys);
//    return $http.put(url, data, defaultConfig);
//  }

//  /**
//   * @ngdoc function
//   * @name save
//   * @methodOf c8y.core.service:c8yAudits
//   * 
//   * @description
//   * Creates alarm if it doesn't exist. Otherwise, updates existing one.
//   * 
//   * @param {object} alarm Alarm object.
//   * 
//   * @returns {promise} Returns $http's promise with the response from server.
//   * 
//   * @example
//   * This will create a new alarm:
//   * <pre>
//   *   c8yAlarms.save({
//   *     type: 'Custom alarm',
//   *     severity: c8yAlarms.severity.MAJOR,
//   *     status: c8yAlarms.status.ACTIVE,
//   *     text: 'My Custom alarm',
//   *     time: moment().format(c8yBase.dateFormat),
//   *     source: {
//   *       id: 1
//   *     }
//   *   });
//   * </pre>
//   * This will update exsting alarm:
//   * <pre>
//   *   c8yAlarms.save({
//   *     id: 1,
//   *     status: c8yAlarms.status.CLEARED
//   *   });
//   * </pre>
//   */
//  function save(alarm) {
//    return alarm.id ? update(alarm) : create(alarm);
//  }

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
  function getKeys(alarm) {
    var _alarm = angular.copy(alarm),
      props = Object.keys(_alarm);

    return props.filter(isNotReservedKey);
  }

  return {
//    list: list,
//    detail: detail,
//    update: update,
    create: create,
//    save: save,
    severity: severity,
    severityList: severityList,
    reservedKeys: reservedKeys,
    getKeys: getKeys
  };

}]);
