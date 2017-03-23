(function () {
'use strict';

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
angular.module('c8y.core').service('c8yAlarms', [
  '$http',
  'c8yBase',
  'c8yCounter',
  '$q',
  'c8yAudits',
  'gettext',
  'gettextCatalog',
  'KeysMixin',
  C8yAlarms
]);

function C8yAlarms(
  $http,
  c8yBase,
  c8yCounter,
  $q,
  c8yAudits,
  gettext,
  gettextCatalog,
  KeysMixin
) {
  var self = this;

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
      WARNING: gettext('WARNING'),
      MINOR: gettext('MINOR'),
      MAJOR: gettext('MAJOR'),
      CRITICAL: gettext('CRITICAL')
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
    severityList = _.keys(severity),
    /**
     * @ngdoc property
     * @name status
     * @propertyOf c8y.core.service:c8yAlarms
     * @returns {object} Alarm statuses map. Available values are:
     *
     * - **ACTIVE** – Alarm is still active.
     * - **ACKNOWLEDGED** - Alarm has already been acknowledged.
     * - **CLEARED** - Alarm has been cleared.
     *
     * @example
     * <pre>
     *   $scope.selectedStatus = c8yAlarms.status.ACTIVE;
     * </pre>
     */
    status = {
      ACTIVE: gettext('ACTIVE'),
      ACKNOWLEDGED: gettext('ACKNOWLEDGED'),
      CLEARED: gettext('CLEARED')
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
    statusList = _.keys(status),
    removeKeys = ['id'],
    removeKeysOnUpdate = ['id', 'self', 'creationTime', 'type', 'time', 'count', 'history', 'firstOccurence', 'firstOccurrenceTime'],
    icons = {},
    statusAttribute = 'status';

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
  this.reservedKeys = [
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
    'firstOccurrenceTime',
    'status'
  ];

  this.standardKeys = {
    type: gettext('Type')
  };

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
   *     _.forEach(alarms, function(alarm) {
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
   *     c8yAlarms.acknowledgedBy(alarm).then(function (ackBy) {
   *       $scope.alarmAcknowledgedBy = ackBy;
   *     })
   *   });
   * </pre>
   */
  function acknowledgedBy(alarm, audits) {
    var username;

    if (audits) {
      username = fn(audits);
    } else {
      username = c8yAudits
        .list({
          source: alarm.id,
          pageSize: 1000
        })
        .then(fn);
    }

    return username;

    ////////////

    function fn(audits) {
      var ackBy = '--';

      // Assume it's the last user who changed the alarm
      if (alarm.status === status.ACKNOWLEDGED && !_.isEmpty(audits)) {
        ackBy = _.last(audits).user;
      }

      // Run through the history to see who change the status to ack
      audits.forEach(function (audit) {
        var changes = audit.changes || [];
        var acknowledged = false;

        changes.forEach(function (change) {
          if (change.attribute === statusAttribute && change.newValue === status.ACKNOWLEDGED) {
            acknowledged = true;
            return false;
          }
        });

        if (acknowledged) {
          ackBy = audit.user || ackBy;
          return false;
        }
      });

      return ackBy;
    }
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
  function ackTime(alarm, audits) {
    function fn(audits) {
      var history = audits || [],
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

    if (audits) {
      return fn(audits);
    } else {
      return c8yAudits.list({
        source: alarm.id,
        pageSize: 1000
      }).then(fn);
    }
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
  function alarmDuration(alarm, audits) {
    var diff = alarmDurationDiff(alarm, audits);
    if (diff.humanize) {
      return diff.humanize();
    } else {
      return diff.then(function (d) {
        return d.humanize ? d.humanize() : '';
      });
    }
  }

  function alarmDurationDiff(alarm, audits) {
    function fn(audits) {
      var history = (audits) || [],
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
        diff = moment.duration(_time.diff(_endTime));
      }

      return diff;
    }

    if (audits) {
      return fn(audits);
    } else {
      return c8yAudits.list({
        source: alarm.id,
        pageSize: 1000
      }).then(fn);
    }
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
    var severity = (_.isObjectLike(alarm) ? alarm.severity : alarm).toUpperCase();
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
    var result = _.filter(alarms, {severity: severity});
    return result.length;
  }

  function onAlarms(alarms) {
    return _.filter(alarms, function(alarm) {
      return !_.isUndefined(alarm);
    });
  }

  function memoize(fn) {
    var memoizedFn =  _.memoize(fn, function (alarm) {
      return [alarm.id, alarm.status, alarm.count].join(':');
    });

    return function (alarm, auditList) {
      return memoizedFn(alarm, auditList);
    };
  }

  function statusText(alarm, audits) {
    var statusFn;
    var alarmStatus = (alarm.status || '').toUpperCase();
    switch (alarmStatus) {
    case status.ACKNOWLEDGED:
      statusFn = getStatusMessageAcknowledged;
      break;
    case status.CLEARED:
      statusFn = getStatusMessageCleared;
      break;
    case status.ACTIVE:
      statusFn = getStatusMessageActive;
      break;
    }

    return (statusFn && statusFn(alarm, audits));
  }

  function getStatusMessageAcknowledged(alarm, audits) {
    var ackBy = $q.when(self.acknowledgedBy(alarm, audits));
    var ackTime = $q.when(self.ackTime(alarm, audits));
    return $q.all([ackBy, ackTime])
      .then(function (results) {
        return gettextCatalog.getString('ACKNOWLEDGED by: {{ackBy}} {{ackTimeFromNow}}', {
          ackBy: results[0],
          ackTimeFromNow: moment(results[1]).fromNow()
        });
      });
  }

  function getStatusMessageCleared(alarm, audits) {
    return $q.when(self.alarmDuration(alarm, audits))
      .then(function (alarmDuration) {
        return gettextCatalog.getString('CLEARED: was active for {{alarmDuration}}', {
          alarmDuration: alarmDuration
        });
      });
  }

  function getStatusMessageActive(alarm) {
    return $q.when(gettextCatalog.getString('ACTIVE: triggered {{alarmTimeFromNow}}', {
      alarmTimeFromNow: moment(alarm.time).fromNow()
    }));
  }

  _.assign(this, {
    list: list,
    listByStatus: listByStatus,
    listByDevices: listByDevices,
    getSeverityCount: getSeverityCount,
    detail: detail,
    update: update,
    create: create,
    save: save,
    acknowledgedBy: memoize(acknowledgedBy),
    ackTime: memoize(ackTime),
    alarmDuration: memoize(alarmDuration),
    alarmDurationDiff: memoize(alarmDurationDiff),
    severity: severity,
    severityList: severityList,
    status: status,
    statusList: statusList,
    statusText: memoize(statusText),
    icon: icon,
    reports: {
      downtimeDuration: reportDownTimeDuration
    },
    createCounter: createCounter
  });

  _.assign(this, KeysMixin);
  _.bindAll(this, _.keys(KeysMixin));
}
})();
