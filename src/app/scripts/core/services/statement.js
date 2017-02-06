angular.module('c8y.core')
.factory('c8yStatement', ['$http', '$q', '$timeout', 'c8yBase',
  function($http, $q, $timeout, c8yBase) {
    'use strict';
    var exports = {},
            path = 'cep/modules',
            moduleConfig = function() {
      return c8yBase.requestConfig('cepModule', 'cepModule');
    },
            statementConfig = function() {
      return c8yBase.requestConfig('cepStatement', 'cepStatement');
    },
            defaultModule;

    function clean(statement) {
      statement = _.cloneDeep(statement);
      delete statement.id;
      delete statement.module;
      return statement;
    }

    function isDefaultModule(module) {
      return module.name === 'default';
    }

    var examples = [
      {
        name: 'select temperate readings over 100 degree',
        value: 'select * from MeasurementCreated e\n' +
               'where getNumber(e, "c8y_TemperatureMeasurement.T.value") > 100'
      },
      {
        name: 'create alarm when temperature over 100 degree',
        value: 'insert into CreateAlarm \n'+
               '  select\n'+
               '    e.measurement.time as time,\n'+
               '    e.measurement.source.value as source,\n'+
               '    "com_cumulocity_TemperatureAlert" as type,\n'+
               '    "Temperature too high" as text,\n'+
               '    "ACTIVE" as status,\n'+
               '    "CRITICAL" as severity\n'+
               '  from MeasurementCreated e\n'+
               '  where getNumber(e, "c8y_TemperatureMeasurement.T.value") > 100'
      },
      {
        name: 'create alarm when temperature below 0 degree',
        value: 'insert into CreateAlarm \n'+
               '  select\n'+
               '    e.measurement.time as time,\n'+
               '    e.measurement.source.value as source,\n'+
               '    "com_cumulocity_TemperatureAlert" as type,\n'+
               '    "Temperature too low" as text,\n'+
               '    "ACTIVE" as status,\n'+
               '    "CRITICAL" as severity\n'+
               '  from MeasurementCreated e\n'+
               '  where getNumber(e, "c8y_TemperatureMeasurement.T.value") > 100'
      },
      {
        name: 'create close replay operation when temperature readings over 100 degree',
        value:  'insert into CreateOperation\n' +
                '  select\n' +
                '    "PENDING" as status,\n' +
                '    «heating ID» as deviceId\n' +
                '    {\n' +
                '      "c8y_Relay.relayState", "CLOSED"\n' +
                '    } as fragments\n' +
                '  from MeasurementCreated e\n' +
                '  where getNumber(e, "c8y_TemperatureMeasurement.T.value") > 100'
      },
      {
        name: 'select location change event once for 60 seconds',
        value:  'select * from EventCreated e\n' +
                'where getObject(e, "c8y_LocationMeasurement") is not null\n' +
                'output first every 60 seconds'
      },
      {
        name: 'send email notification with current temperature',
        value: 'expression string js:prepareEmailText(temp, state) [\n' +
                '    function format(text, params){\n' +
                '            for(param in params) {\n' +
                '                text = text.replace("{" + param + "}", params[param])\n' +
                '            }\n' +
                '        return text\n' +
                '    }\n' +
                '    format("Hello,\\n current temperature is {0} (state = {1}). Regards.", [temp, state])\n' +
                ']\n' +
                'insert into SendEmail\n' +
                'select\n' +
                '  "sender@sender" as sender,\n' +
                '  "receiver@receiver" as receiver,\n' +
                '  "Temperature critical!" as subject,\n' +
                '  prepareEmailText(\n' +
                '    getNumber(e, "c8y_TemperatureMeasurement.T.value"),\n' +
                '    getString(e, "c8y_TemperatureMeasurement.T.state")\n' +
                '   ) as text\n' +
                'from MeasurementCreated e'
      },
      {
        name: 'change the severities of alarms based on activity time',
        value:  '/* Create \"context\" - definition of a group of events to be processed separately.\n' +
                ' * Context \"Alarms\" consists of AlarmCreated and AlarmUpdated: \n' +
                ' * with the same source and type = \"power off\". */\n' +
                'create context Alarms partition by \n' +
                'alarm.source from AlarmCreated(alarm.type = "power off"),\n' +
                'alarm.source from AlarmUpdated(alarm.type = "power off");\n' +
                '\n' +
                '/* Update severity for all active AlarmCreated \n' +
                ' * after which there is no change to other status in 15 minutes. */\n' +
                'context Alarms \n' +
                'insert into UpdateAlarm \n' +
                'select \n' +
                '   a.alarm.id as id,\n' +
                '   "MAJOR" as severity\n' +
                'from pattern [\n' +
                '   every a = AlarmCreated(alarm.status = CumulocityAlarmStatuses.ACTIVE) \n' +
                '   -> (timer:interval(15 minutes) \n' +
                '      and not AlarmUpdated(alarm.status != CumulocityAlarmStatuses.ACTIVE))\n'+
                '];'
      }



    ];

    function toId(id) {
      return _.isObjectLike(id) ? id.id : id;
    }

    function buildStatementUrl(id) {
      return c8yBase.url(path + '/' + defaultModule.id + '/statements' + (id ? '/' + toId(id) : ''));
    }

    function ensureDefaultModule(callback) {
      return function(param) {
        var deferred = $q.defer(), success, fail;
        deferred.promise.then(function() {
          callback(param).success(success).error(fail);
        });

        if (defaultModule) {
          deferred.resolve();
        } else {
          $http.get(c8yBase.url(path))
                  .success(function(modules) {
            for (var idx in  modules.modules) {
              var module = modules.modules[idx];
              if (isDefaultModule(module)) {
                defaultModule = module;
                deferred.resolve();
                return;
              }
            }

            $http.post(c8yBase.url(path), {name: 'default'}, moduleConfig())
                    .success(function(module) {
              defaultModule = module;
              deferred.resolve();
            });
          });
        }
        return {then: function(s, e) {
            success = s;
            fail = e;
          }, success: function(s) {
            success = s;
            return this;
          }, error: function(e) {
            fail = e;
            return this;
          }
        };
      };
    }

    exports.list = ensureDefaultModule(function(filters) {
      return $http.get(c8yBase.url(path + '/' + defaultModule.id + '/statements'), filters);
    });

    exports.detail = ensureDefaultModule(function(id) {
      return $http.get(buildStatementUrl(id));
    });

    exports.remove = ensureDefaultModule(function(statement) {
      return $http['delete'](buildStatementUrl(statement.id));
    });

    exports.save = ensureDefaultModule(function(statement) {
      var id = statement.id;
      var request;
      if (id) {
        request = $http.put(buildStatementUrl(id), clean(statement), statementConfig());
      } else {
        request = $http.post(buildStatementUrl(), clean(statement), statementConfig());
      }
      return request;
    });

    exports.examples = function() {
      return {
        success: function(callback) {
          $timeout(function() {
            callback(examples);
          });
        }
      };
    };

    return exports;

  }]);
