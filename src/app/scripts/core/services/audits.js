(function () {
  'use strict';

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
    .service('c8yAudits', C8yAudits);

  /* @ngInject */
  function C8yAudits(
    $http,
    c8yBase,
    KeysMixin,
    gettext
  ) {
    var clean = c8yBase.cleanFields;
    var path = 'audit/auditRecords';
    var defaultConfig = {
      headers: c8yBase.contentHeaders('auditRecord')
    };
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
    var severity = {
      WARNING: 'WARNING',
      MINOR: 'MINOR',
      MAJOR: 'MAJOR',
      CRITICAL: 'CRITICAL'
    };
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
    var severityList = _.keys(severity);
    var _reservedKeys = [
      'id',
      'self',
      'creationTime'
    ];

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
    var removeKeys = _reservedKeys;

    this.types = {
      'User': gettext('User'),
      'Group': gettext('Group'),
      'Alarm': gettext('Alarm'),
      'Operation': gettext('Operation'),
      'SmartRule': gettext('Smart Rule'),
      'CepModule': gettext('Event processing'),
      'Tenant': gettext('Tenant')
    };

    this.reservedKeys = _reservedKeys;
    this.standardKeys = {};

    _.assign(this, {
      list: list,
      detail: detail,
      create: create,
      severity: severity,
      severityList: severityList
    });

    _.assign(this, KeysMixin);
    _.bindAll(this, _.keys(KeysMixin));

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
    * - **revert** - `boolean` - Reverts sort order based on time field.
    * - **user** - `string` - Audit's user.
    * - **dateFrom** - `string` - Limit audits to those after given date based on time field.
    * - **dateTo** - `string` - Limit audits to those before given date based on time field.
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
    *     _.forEach(audits, function(audit) {
    *       $scope.audits.push(audit);
    *     });
    *   });
    * </pre>
    */
    function list(filters) {
      // Filters: status, source, dateFrom, dateTo, revert
      var url = c8yBase.url(path);
      var _filters = c8yBase.pageSizeNoTotalFilter(filters);
      if (_filters.revert) {
        var minMaxDates = c8yBase.timeOrderFilter({});
        _filters.dateFrom = _filters.dateFrom || minMaxDates.dateFrom;
        _filters.dateTo = _filters.dateTo || minMaxDates.dateTo;
      }
      var cfg = {
        params: _filters
      };
      var onList = c8yBase.cleanListCallback('auditRecords', list, _filters);

      return $http.get(url, cfg).then(onList);
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
      var url = c8yBase.url(path);
      var data = clean(audit, removeKeys);
      return $http.post(url, data, defaultConfig);
    }
  }
}());
