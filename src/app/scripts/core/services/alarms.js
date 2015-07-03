/**
 * @ngdoc service
 * @name c8y.core.service:c8yAlarms
 * @requires c8y.core.service:c8yBase
 * @requires c8y.core.service:c8yCounter
 * @requires $http
 *
 * @description
 * This service allows for managing alarms.
 */
angular.module('c8y.core')
.factory('c8yAlarms', ['$http', 'c8yBase', 'c8yCounter', '$q',
function ($http, c8yBase, c8yCounter, $q) {
  'use strict';

  var clean = c8yBase.cleanFields,
    path = 'alarm/alarms',
    pathReports = path + '/reports',
    defaultConfig = {
      headers: c8yBase.contentHeaders('alarm')
    },
    /**
     * @ngdoc property
     * @name severity
     * @propertyOf c8y.core.service:c8yAlarms
     * @returns {object} Alarm severities map. Available values are:
     *
     * - **WARNING** – Alarm is just a warning.
     * - **MINOR** - Alarm has got minor priority.
     * - **MAJOR** - Alarm has got major priority.
     * - **CRITICAL** - Alarm is critical.
     *
     * @example
     * <pre>
     *   $scope.selectedSeverity = c8yAlarms.severity.MINOR;
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
    /**
     * @ngdoc property
     * @name status
     * @propertyOf c8y.core.service:c8yAlarms
     * @returns {object} Alarm statuses map. Available values are:
     *
     * - **ACTIVE** – Alarm is just a warning.
     * - **ACKNOWLEDGED** - Alarm has got minor severity.
     * - **CLEARED** - Alarm has got major severity.
     *
     * @example
     * <pre>
     *   $scope.selectedStatus = c8yAlarms.status.ACTIVE;
     * </pre>
     */
    status = {
      ACTIVE: 'ACTIVE',
      ACKNOWLEDGED: 'ACKNOWLEDGED',
      CLEARED: 'CLEARED'
    },
    /**
     * @ngdoc property
     * @name statusList
     * @propertyOf c8y.core.service:c8yAlarms
     * @returns {object} The list of available alarm statuses.
     *
     * @example
     * <pre>
     *   $scope.alarmStatuses = c8yAlarms.statusList;
     * </pre>
     */
    statusList = Object.keys(status),
    _reservedKeys = [
      'history',
      'id',
      'severity',
      'self',
      'source',
      'creationTime',
      'time',
      'text',
      'firstOccurrence',
      'count',
      'firstOccurrenceTime'
    ],
    /**
     * @ngdoc property
     * @name reservedKeys
     * @propertyOf c8y.core.service:c8yAlarms
     * @returns {array} The list of reserved keys for alarm fields.
     *
     * @example
     * <pre>
     *   $scope.reservedKeys = c8yAlarms.reservedKeys;
     * </pre>
     */
    reservedKeys = ['status'].concat(_reservedKeys),
    removeKeys = ['id'],
    removeKeysOnUpdate = ['id', 'self', 'creationTime', 'type', 'time', 'count', 'history', 'firstOccurence', 'firstOccurrenceTime'],
    icons = {},
    statusAttribute = 'status';

  icons[severity.WARNING] = 'circle';
  icons[severity.MINOR] = 'exclamation-circle';
  icons[severity.MAJOR] = 'exclamation-circle';
  icons[severity.CRITICAL] = 'warning';
  icons[status.CLEARED] = 'check-circle';
  icons[status.ACKNOWLEDGED] = 'eye';
  icons[status.ACTIVE] = 'bell';


  function buildDetailUrl(alarm) {
    var id = alarm.id || alarm;
    return c8yBase.url(path + '/' + id);
  }

  /**
   * @ngdoc function
   * @name list
   * @methodOf c8y.core.service:c8yAlarms
   *
   * @description
   * Gets the list of alarms filtered by parameters.
   *
   * @param {object} filters Object containing filters for querying alarms. Supported filters specific for alarms are:
   *
   * - **source** – `integer` – Alarm's source device's id.
   * - **severity** - `string` - Alarm's severity level ({@link c8y.core.service:c8yAlarms#severity c8yAlarms.severity}).
   * - **status** - `string` - Alarm's status ({@link c8y.core.service:c8yAlarms#status c8yAlarms.status}).
   * - **resolved** - `boolean` - Alarm's resolved status.
   *
   * @returns {array} Returns the list of alarms. Each alarm has the following properties:
   *
   * - **id** - `integer` - Alarm's id.
   * - **type** - `string` - Type of alarm.
   * - **text** - `string` - Alarm's text message.
   * - **time** - `string` - Alarm's date provided by device.
   * - **creationTime** - `string` - Date and time when alarm was created on the platform.
   * - **source** - `object` - Source device's object with the following properties:
   *     - **id** - source device id,
   *     - **name** - source device name.
   * - **count** - `integer` - Alarm's count.
   * - **firstOccurrence** - `boolean` - Indicates that this is the first occurrence of the alarm.
   * - **history** - `object` - Contains the list of history items in  **auditRecords** property.
   * - **severity** - `string` - Alarm's severity level ({@link c8y.core.service:c8yAlarms#severity c8yAlarms.severity}).
   * - **status** - `string` - Alarm's status ({@link c8y.core.service:c8yAlarms#status c8yAlarms.status}}.
   * - **self** - `string` - Alarm's self URL.
   *
   * @example
   * <pre>
   *   c8yAlarms.list({
   *     source: deviceId,
   *     severity: c8yAlarms.severity.MAJOR,
   *     status: c8yAlarms.status.ACTIVE,
   *     resolved: false,
   *     pageSize: 100
   *   }).then(function (alarms) {
   *     $scope.alarms = [];
   *     angular.forEach(alarms, function(alarm) {
   *       $scope.alarms.push(alarm);
   *     });
   *   });
   * </pre>
   */
  function list(filters) {
    // Filters: status, source, dateFrom, dateTo
    var url = c8yBase.url(path),
      _filters = c8yBase.timeOrderFilter(
        c8yBase.pageSizeNoTotalFilter(filters)
      ),
      cfg = {
        params: _filters
      },
      onList = c8yBase.cleanListCallback('alarms', list, _filters);

    return $http.get(url, cfg).then(onList);
  }

  /**
   * @ngdoc function
   * @name detail
   * @methodOf c8y.core.service:c8yAlarms
   *
   * @description
   * Gets the details of selected alarms.
   *
   * @param {object|integer} alarm Alarm object or alarm's id.
   *
   * @returns {object} Alarm object with alarm details:
   *
   * - **count** - `integer` - Alarm's count.
   * - **creationTime** - `string` - Date and time when alarm was created on the platform.
   * - **firstOccurrence** - `boolean` - Indicates that this is the first occurrence of the alarm.
   * - **history** - `object` - Contains the list of history items in  **auditRecords** property.
   * - **id** - `integer` - Alarms' id.
   * - **self** - `string` - Alarm's self URL.
   * - **severity** - `string` - Alarm's severity level ({@link c8y.core.service:c8yAlarms#severity c8yAlarms.severity}).
   * - **source** - `object` - Source device's object with the following properties:
   *     - **id** - source device id,
   *     - **name** - source device name.
   * - **status** - `string` - Alarm's status ({@link c8y.core.service:c8yAlarms#status c8yAlarms.status}}.
   * - **text** - `string` - Alarm's text message.
   * - **time** - `string` - Alarm's date provided by device.
   * - **type** - `string` - Type of alarm.
   *
   * @example
   * <pre>
   *   var alarmId = 1;
   *   c8yAlarms.detail(alarmId).then(function (alarm) {
   *     $scope.alarm = alarm;
   *   });
   * </pre>
   */
  function detail(alarm) {
    var url = buildDetailUrl(alarm);
    return $http.get(url);
  }

  /**
   * @ngdoc function
   * @name create
   * @methodOf c8y.core.service:c8yAlarms
   *
   * @description
   * Creates a new alarm.
   *
   * @param {object} alarm Alarm object to create. Supported properties are:
   *
   * - **type** - `string` - Type of alarm.
   * - **severity** - `string` - Alarm's severity level ({@link c8y.core.service:c8yAlarms#severity c8yAlarms.severity}).
   * - **status** - `string` - Alarm's status ({@link c8y.core.service:c8yAlarms#status c8yAlarms.status}}.
   * - **text** - `string` - Alarm's text message.
   * - **time** - `string` - Alarm's date provided by device.
   * - **source** - `object` - Source device's object with the following properties:
   *     - **id** - device id.
   *
   * @returns {promise} $http's promise after posting new alarm data.
   *
   * @example
   * <pre>
   *   c8yAlarms.create({
   *     type: 'Custom alarm',
   *     severity: c8yAlarms.severity.MAJOR,
   *     status: c8yAlarms.status.ACTIVE,
   *     text: 'My Custom alarm',
   *     time: moment().format(c8yBase.dateFormat),
   *     source: {
   *       id: 1
   *     }
   *   });
   * </pre>
   */
  function create(alarm) {
    var url = c8yBase.url(path),
      data = clean(alarm, removeKeys);
    return $http.post(url, data, defaultConfig);
  }

  /**
   * @ngdoc function
   * @name update
   * @methodOf c8y.core.service:c8yAlarms
   *
   * @description
   * Updates alarm data.
   *
   * @param {object} alarm Alarm object.
   *
   * @returns {promise} Returns $http's promise with the response from server.
   *
   * @example
   * <pre>
   *   var alarmId = 1;
   *   c8yAlarms.detail(alarmId).then(function (alarm) {
   *     return alarm.status = c8yAlarms.status.CLEARED;
   *   }).then(c8yAlarms.update);
   * </pre>
   */
  function update(alarm) {
    var url = buildDetailUrl(alarm),
      data = clean(alarm, removeKeysOnUpdate);
    return $http.put(url, data, defaultConfig);
  }

  /**
   * @ngdoc function
   * @name save
   * @methodOf c8y.core.service:c8yAlarms
   *
   * @description
   * Creates alarm if it doesn't exist. Otherwise, updates existing one.
   *
   * @param {object} alarm Alarm object.
   *
   * @returns {promise} Returns $http's promise with the response from server.
   *
   * @example
   * This will create a new alarm:
   * <pre>
   *   c8yAlarms.save({
   *     type: 'Custom alarm',
   *     severity: c8yAlarms.severity.MAJOR,
   *     status: c8yAlarms.status.ACTIVE,
   *     text: 'My Custom alarm',
   *     time: moment().format(c8yBase.dateFormat),
   *     source: {
   *       id: 1
   *     }
   *   });
   * </pre>
   * This will update existing alarm:
   * <pre>
   *   c8yAlarms.save({
   *     id: 1,
   *     status: c8yAlarms.status.CLEARED
   *   });
   * </pre>
   */
  function save(alarm) {
    return alarm.id ? update(alarm) : create(alarm);
  }

  /**
   * @ngdoc function
   * @name acknowledgedBy
   * @methodOf c8y.core.service:c8yAlarms
   *
   * @description
   * Gets username of user who acknowledged alarm.
   *
   * @param {object} alarm Alarm object.
   *
   * @returns {string} Returns username.
   *
   * @example
   * <pre>
   *   var alarmId = 1;
   *   c8yAlarms.detail(alarmId).then(function (alarm) {
   *     $scope.alarmAcknowledgedBy = c8yAlarms.acknowledgedBy(alarm);
   *   });
   * </pre>
   */
  function acknowledgedBy(alarm) {
    var history = (alarm.history && alarm.history.auditRecords) || [],
      ackBy = '--';

    //Assume it's the last user who changed the alarm
    if (alarm.status === status.ACKNOWLEDGED) {
      ackBy = history[history.length - 1].user;
    }

    //Run through the history to see who change the status to ack
    history.forEach(function (historyItem) {
      var changes = historyItem.changes || [],
        acknowledged = false;

      changes.forEach(function (change) {
        if (change.attribute === statusAttribute && change.newValue === status.ACKNOWLEDGED) {
          acknowledged = true;
          return false;
        }
      });

      if (acknowledged) {
        ackBy = historyItem.user || ackBy;
        return false;
      }
    });

    return ackBy;
  }

  /**
   * @ngdoc function
   * @name ackTime
   * @methodOf c8y.core.service:c8yAlarms
   *
   * @description
   * Gets the time when alarm was acknowledged.
   *
   * @param {object} alarm Alarm object.
   *
   * @returns {string} Returns a string with acknowledge time for alarm.
   *
   * @example
   * <pre>
   *   var alarmId = 1;
   *   c8yAlarms.detail(alarmId).then(function (alarm) {
   *     $scope.alarmAckTime = c8yAlarms.ackTime(alarm);
   *   });
   * </pre>
   */
  function ackTime(alarm) {
    var history = (alarm.history && alarm.history.auditRecords) || [],
      //get the last audit record time by default. some don't have 'changes'
      time = history.length ? history[history.length-1].creationTime : undefined;

    history.forEach(function (historyItem) {
      var changes = historyItem.changes || [],
        found = false;

      changes.forEach(function (change) {

        if (change.attribute === statusAttribute && change.newValue === status.ACKNOWLEDGED) {
          time = historyItem.creationTime;
          found = true;
          return false;
        }

      });

      if (found) {
        return false;
      }
    });

    return time;
  }

  /**
   * @ngdoc function
   * @name alarmDuration
   * @methodOf c8y.core.service:c8yAlarms
   *
   * @description
   * Gets calculated alarm's duration time.
   *
   * @param {object} alarm Alarm object.
   *
   * @returns {string} Returns alarm duration as {@link http://momentjs.com/docs/#/durations/humanize/ humanized} string.
   *
   * @example
   * <pre>
   *   var alarmId = 1;
   *   c8yAlarms.detail(alarmId).then(function (alarm) {
   *     $scope.duration = c8yAlarms.alarmDuration(alarm);
   *   });
   * </pre>
   */
  function alarmDuration(alarm) {
    var history = (alarm.history && alarm.history.auditRecords) || [],
      time = alarm.creationTime,
      endTime = history.length ? history[history.length-1].creationTime : undefined,
      diff = '';

    _.forEach(history, function (historyItem) {
      var changes = historyItem.changes || [],
        found = false;

      changes.forEach(function (change) {
        if (change.attribute === statusAttribute && change.newValue === status.CLEARED) {
          endTime = historyItem.creationTime;
          found = true;
          return false;
        }
      });

      if (found) {
        return false;
      }
    });

    if (time && endTime) {
      var _time = moment(time),
        _endTime = moment(endTime);
      diff = moment.duration(_time.diff(_endTime)).humanize();
    }

    return diff;
  }

  /**
   * @ngdoc function
   * @name parseChanges
   * @methodOf c8y.core.service:c8yAlarms
   *
   * @description
   * Parses list of alarm changes into human-readable list.
   *
   * @param {array} changes List of alarm changes (from `history.auditRecords[i].changes`).
   *
   * @returns {string} String with a list of changed attributes with previous and new values.
   *
   * @example
   * <pre>
   *   var alarmId = 1;
   *   c8yAlarms.detail(alarmId).then(function (alarm) {
   *     $scope.changes = [];
   *     alarm.history.auditRecords.forEach(function (auditRecord) {
   *       $scope.changes = c8yAlarms.parseChanges(auditRecord.changes);
   *     });
   *   });
   * </pre>
   */
  function parseChanges(changes) {
    var _changes = changes || [],
      outList = [];

    _changes.forEach(function (change) {
      if (change.attribute === 'revision') {
        return true;
      }
      outList.push(change.attribute + ': ' + change.previousValue + ' > ' + change.newValue);
    });

    return outList.join(' ; ');
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
   * @methodOf c8y.core.service:c8yAlarms
   *
   * @description
   * Gets the list of property names for an alarm.
   *
   * @param {object} alarm Alarm object.
   *
   * @returns {array} Returns the list of alarm properties.
   *
   * @example
   * <pre>
   *   var alarmId = 1;
   *   c8yAlarms.detail(alarmId).then(function (alarm) {
   *     $scope.keys = c8yAlarms.getKeys(alarm);
   *   });
   * </pre>
   */
  function getKeys(alarm) {
    var _alarm = angular.copy(alarm),
      props = Object.keys(_alarm);

    return props.filter(isNotReservedKey);
  }

  /**
   * @ngdoc function
   * @name icon
   * @methodOf c8y.core.service:c8yAlarms
   *
   * @description
   * Gets the severity icon for alarm.
   *
   * @param {object} alarm Alarm object.
   *
   * @returns {string} Returns icon name for alarm's severity.
   *
   * @example
   * <pre>
   *   var alarmId = 1;
   *   c8yAlarms.detail(alarmId).then(function (alarm) {
   *     $scope.icon = c8yAlarms.icon(alarm);
   *   });
   * </pre>
   */
  function icon(alarm) {
    var severity = (angular.isObject(alarm) ? alarm.severity : alarm).toUpperCase();
    return icons[severity];
  }

  function buildReportUrl(report, filters) {
    var parts = [pathReports, report];

    if (filters.id) {
      parts.push(filters.id);
    }

    return c8yBase.url(parts.join('/'));
  }

  /**
   * @ngdoc function
   * @name downtimeDuration
   * @methodOf c8y.core.service:c8yAlarms
   *
   * @description
   * Gets Downtime Duration Report.
   *
   * @param {object} filters Object containing filters for querying report.
   *
   * @returns {promise} Returns $http's promise with response from server. The data property contains `availabilityStats` field which contains a list of devices and their downtime in the following form:
   *
   * <pre>
   *   {downtimeDuration: 10, source: '1'}
   * </pre>
   *
   * @example
   * <pre>
   *   var alarmId = 1;
   *   c8yAlarms.reports.downtimeDuration().then(function (res) {
   *     return res.data;
   *   }).then(function (report) {
   *     return report.availabilityStats;
   *   }).then(function (availabilityStats) {
   *     var totalDowntimeDuration =  0;
   *     availabilityStats.forEach(function (availabilityStat) {
   *       totalDowntimeDuration += availabilityStats.downtimeDuration;
   *     });
   *     $scope.totalDowntime = totalDowntimeDuration;
   *   });
   * </pre>
   */
  function reportDownTimeDuration(filters) {
    var report = 'downtimeDuration',
      _filters = c8yBase.timeOrderFilter(filters),
      url =  buildReportUrl(report, _filters),
      cfg = {
        params: _filters
      };

    return $http.get(url, cfg);
  }


  /**
   * @ngdoc function
   * @name createCounter
   * @methodOf c8y.core.service:c8yAlarms
   *
   * @description
   * Creates a counter instance. Supported filters are source, type and date.
   *
   * @param  {object} filter Object that is used to filter alarms to be counted.
   * @return {Counter} Returns a c8yCounter.Counter instance.
   */
  function createCounter(filter) {
    var counter = new c8yCounter.Counter(list, '/alarms/*');
    if(filter) {
      var filterConfig = [
        c8yCounter.defaultPropertyMaps.date,
        c8yCounter.defaultPropertyMaps.source
      ];
      if (filter.type) {
        var type = filter.type;
        filterConfig.push([function (obj) {
          return type === obj.type;
        }]);
      }

      // delete from filter because it will be used as queryParam
      // and querying by date, source, type is not supported.
      delete filter.type;
      counter.filter(filter, filterConfig);
    }
    return counter;
  }

  function listByStatus(status, filters) {
    return $q.all(
      _.map(status, function(value, key) {
        if(value) {
          filters.status = key;
          return list(filters);
        }
      })
    ).then(onAlarms);
  }

  function listByDevices(ids, filters) {
    return $q.all(
      _.map(ids, function(id) {
        filters.source = id;
        return list(filters);
      })
    ).then(onAlarms);
  }

  function getSeverityCount(alarms, severity) {
    var result = _.where(alarms, {severity: severity});
    return result.length;
  }

  function onAlarms(alarms) {
    return _.filter(alarms, function(alarm) {
      return angular.isDefined(alarm);
    });
  }

  return {
    list: list,
    listByStatus: listByStatus,
    listByDevices: listByDevices,
    getSeverityCount: getSeverityCount,
    detail: detail,
    update: update,
    create: create,
    save: save,
    acknowledgedBy: acknowledgedBy,
    ackTime: ackTime,
    alarmDuration: _.memoize(alarmDuration, function (a) { return a.id; }),
    parseChanges: parseChanges,
    severity: severity,
    severityList: severityList,
    status: status,
    statusList: statusList,
    reservedKeys: reservedKeys,
    icon: icon,
    getKeys: getKeys,
    reports: {
      downtimeDuration: reportDownTimeDuration
    },
    createCounter: createCounter
  };

}]);
