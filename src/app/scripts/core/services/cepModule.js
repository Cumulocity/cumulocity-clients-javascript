/**
 * @ngdoc service
 * @name c8y.core.service:c8yCepModule
 * @requires c8y.core.service:c8yCepModuleExamples
 * @requires c8y.core.service:c8yBase
 * @requires $http
 * @requires $q
 * @requires $timeout
 *
 * @description
 * This service allows for managing CEP <!--{@link http://docs.cumulocity.com/CEP@TODO CEP}--> modules.
 */
angular.module('c8y.core')
.factory('c8yCepModule', ['$http', '$q', '$timeout', 'c8yBase', 'c8yCepModuleExamples',
function($http, $q, $timeout, c8yBase, c8yCepModuleExamples) {
  'use strict';

  var path = 'cep/modules',
    contentType = 'cepModule',
    cacheCreateOrDeploy = {};

  function updateStatus(module) {
    var url = c8yBase.url(path + '/' + module.id),
      cfg = {
        headers: c8yBase.contentHeaders(contentType, true)
      },
      data = {
        status: module.status
      };

    if (!module.id) {
      throw new Error('Module id no defined');
    }

    return $http.put(url, data, cfg);
  }

  function updateModule(module) {
    var id = module.id,
      url = c8yBase.url(path + (id ? '/' + id : '')),
      method = (id ? 'put' : 'post'),
      headers = _.assign(c8yBase.contentHeaders(contentType, true), {
        'Content-Type': 'text/plain'
      }),
      cfg = {headers: headers};

    return $http[method](url, module.body, cfg);
  }

  /**
   * @ngdoc function
   * @name list
   * @methodOf c8y.core.service:c8yCepModule
   *
   * @description
   * Gets the list of existing CEP modules (excluding Smart Rules).
   *
   * @param {object} filters Object containing filters for querying CEP modules.
   *
   * @returns {array} Returns the list of CEP modules. <!--See CEP module object specification {@link http://docs.cumulocity.com/CepModule@TODO here}.-->
   *
   * @example
   * <pre>
   *   c8yCepModule.list(filters).then(function (modules) {
   *     $scope.modules = [];
   *     modules.forEach(function (module) {
   *       $scope.modules.push(module);
   *     });
   *   });
   * </pre>
   */
  function list(filters) {
    var url = c8yBase.url(path),
      _filters = c8yBase.pageSizeFilter(filters),
      cfg = {params: _filters},
      onList = c8yBase.cleanListCallback('modules', list, _filters);

    return $http.get(url, cfg)
      .then(filterSmartRulesFromRes)
      .then(onList);
  }

  function filterSmartRulesFromRes(res) {
    res.data.modules = _.filter(res.data.modules, function (module) {
      return !isSmartRuleModule(module);
    });
    return res;
  }

  /**
   * @ngdoc function
   * @name isSmartRuleModule
   * @methodOf c8y.core.service:c8yCepModule
   *
   * @description
   * Checks if given module is Smart Rule module.
   *
   * @param {object} module Module object.
   *
   * @returns {boolean} Returns true if given module is Smart Rule module.
   *
   * @example
   * <pre>
   *   var thisIsSmartRuleModule = c8yCepModule.isSmartRuleModule(module);
   * </pre>
   */
  function isSmartRuleModule(module) {
    return module && /^smartRule\d+$/.test(module.name);
  }

  /**
   * @ngdoc function
   * @name listWithSmartRules
   * @methodOf c8y.core.service:c8yCepModule
   *
   * @description
   * Gets the list of existing CEP modules (including Smart Rules).
   *
   * @param {object} filters Object containing filters for querying CEP modules.
   *
   * @returns {array} Returns the list of CEP modules. <!--See CEP module object specification {@link http://docs.cumulocity.com/CepModule@TODO here}.-->
   *
   * @example
   * <pre>
   *   c8yCepModule.listWithSmartRules(filters).then(function (modules) {
   *     $scope.modules = [];
   *     modules.forEach(function (module) {
   *       $scope.modules.push(module);
   *     });
   *   });
   * </pre>
   */
  function listWithSmartRules(filters) {
    var url = c8yBase.url(path),
      _filters = c8yBase.pageSizeFilter(filters),
      cfg = {params: _filters},
      onList = c8yBase.cleanListCallback('modules', listWithSmartRules, _filters);

    return $http.get(url, cfg).then(onList);
  }

  /**
   * @ngdoc function
   * @name detail
   * @methodOf c8y.core.service:c8yCepModule
   *
   * @description
   * Gets CEP module's details.
   *
   * @param {integer|object} _module CEP module's id or module object.
   *
   * @returns {promise} Returns promise with CEP module object. <!--See CEP module object specification {@link http://docs.cumulocity.com/CepModule@TODO here}.-->
   *
   * @example
   * <pre>
   *   var moduleId = 1;
   *   c8yCepModule.detail(moduleId).then(function (module) {
   *     $scope.module = module;
   *   });
   * </pre>
   */
  function detail(_module) {
    var id = _module.id || _module,
      url = c8yBase.url(path + '/' + id),
      def = $q.defer(),
      body = null,
      module = null,
      fileConfig = {
        headers : {
          'Content-Type': 'text/plain',
          'Accept': 'text/plain'
        }
      },
      dataConfig = {
        headers: {
          Accept: c8yBase.mimeType(contentType)
        }
      },
      checkFinal = function () {
        if (body && module) {
          var nameMatch = /module (\w*);\s*\n*/;
          module.name = body.match(nameMatch)[1];
          module.body = body.replace(nameMatch, '');
          def.resolve(module);
        }
      };

    $http.get(url, dataConfig)
      .then(function (res) {
        module = res.data;
        //preventing the request with the text/plain to return the value from cache
        $http.get(url + '?text', fileConfig).success(function(data) {
          body = data;
          checkFinal();
        });
      });

    return def.promise;
  }

  /**
   * @ngdoc function
   * @name remove
   * @methodOf c8y.core.service:c8yCepModule
   *
   * @description
   * Removes CEP module.
   *
   * @param {integer|object} module CEP module's id or CEP module object.
   *
   * @returns {promise} Returns $http's promise.
   *
   * @example
   * <pre>
   *   var cepModuleId = 1;
   *   c8yCepModule.remove(cepModuleId);
   * </pre>
   */
  function remove(module) {
    var id = module.id || module,
      url = c8yBase.url(path + '/' + id);
    return $http['delete'](url);
  }

  /**
   * @ngdoc function
   * @name save
   * @methodOf c8y.core.service:c8yCepModule
   *
   * @description
   * Saves CEP module.
   *
   * @param {object} _module CEP module object.
   *
   * @returns {promise} Returns promise with saved CEP module object with its current status. <!--See CEP module object specification {@link http://docs.cumulocity.com/CepModule@TODO here}.-->
   *
   * @example
   * <pre>
   *   $scope.cepModule = {
   *     name: 'Select_location_change_event_once_for_60_seconds',
   *     body: 'select * from EventCreated e\n' +
   *            'where getObject(e, "c8y_LocationMeasurement") is not null\n' +
   *            'output first every 60 seconds'
   *   };
   *   c8yCepModule.save(cepModule).then(function (mod) {
   *     $scope.cepModule = mod;
   *   });
   * </pre>
   */
  function save(_module) {
    var def = $q.defer(),
     module = _.cloneDeep(_module),
     firstStep;

    if (module.body) {
      if (module.name) {
        module.body = 'module ' + module.name + ';\n' + module.body;
      }

      firstStep = updateModule(module).then(null, function (data) {
        def.reject(data);
        return $q.reject();
      });
    } else {
      firstStep = detail(module);
    }

    firstStep.then(function (res) {
       var _module = res.body ? res : res.data;

      if (module.status && _module.status !== module.status) {
        _module.status = module.status;
        updateStatus(_module).then(
          function (res) {
            def.resolve(res.data);
          },
          function (res) {
            def.reject(res.data);
          });
      } else {
        def.resolve(_module);
      }
    });

    return def.promise;
  }

  /**
   * @ngdoc function
   * @name detailByName
   * @methodOf c8y.core.service:c8yCepModule
   *
   * @description
   * Gets CEP module's details.
   *
   * @param {string} name CEP module's name.
   *
   * @returns {promise} Returns promise with CEP module object. <!--See CEP module object specification {@link http://docs.cumulocity.com/CepModule@TODO here}.-->
   *
   * @example
   * <pre>
   *   var moduleName = 'my_module';
   *   c8yCepModule.detailByName(moduleName).then(function (module) {
   *     $scope.module = module;
   *   });
   * </pre>
   */
  function detailByName(name) {
    return listWithSmartRules()
      .then(function (modules) {
        var _module;
        modules.forEach(function (m) {
          if (m.name === name) {
            _module = m;
            return false;
          }
        });
        return _module || $q.reject('not found');
      });
  }

  /**
   * @ngdoc function
   * @name createOrDeploy
   * @methodOf c8y.core.service:c8yCepModule
   *
   * @description
   * When given module does not exist then it is saved.
   * If module exists but its status is not `DEPLOYED` then status is changed.
   * Otherwise CEP module is just returned.
   *
   * @param {object} module CEP module.
   *
   * @returns {promise} Returns promise with CEP module object. <!--See CEP module object specification {@link http://docs.cumulocity.com/CepModule@TODO here}.-->
   *
   * @example
   * <pre>
   *   var moduleName = 'my_module';
   *   c8yCepModule.detailByName(moduleName).then(function (module) {
   *     c8yCepModule.createOrDeploy(module);
   *   });
   * </pre>
   */
  function createOrDeploy(module) {
    var name = module.name;
    if (!cacheCreateOrDeploy[name]) {
      cacheCreateOrDeploy[name] = detailByName(name).then(
        function (module) {
          if (module.status !== 'DEPLOYED') {
            module.status = 'DEPLOYED';
            return save(module);
          } else {
            return module;
          }
        },
        function () {
          return save(module);
        });
    }
    return cacheCreateOrDeploy[name];
  }

  /**
   * @ngdoc function
   * @name deploy
   * @methodOf c8y.core.service:c8yCepModule
   *
   * @description
   * Deploys given module.
   *
   * @param {object} module CEP module.
   *
   *  @returns {promise} Returns promise with CEP module object.
   *
   * @example
   * <pre>
   *   var moduleName = 'my_module';
   *   c8yCepModule.detailByName(moduleName).then(function (module) {
   *     c8yCepModule.deploy(module);
   *   });
   * </pre>
   */
  function deploy(module) {
    module.status = 'DEPLOYED';
    return save(module);
  }

  /**
   * @ngdoc function
   * @name redeploy
   * @methodOf c8y.core.service:c8yCepModule
   *
   * @description
   * Redeploys given module.
   *
   * @param {object} module CEP module.
   *
   *  @returns {promise} Returns promise with CEP module object.
   *
   * @example
   * <pre>
   *   var moduleName = 'my_module';
   *   c8yCepModule.detailByName(moduleName).then(function (module) {
   *     c8yCepModule.redeploy(module);
   *   });
   * </pre>
   */
  function redeploy(module) {
    return undeploy(module).then(deploy);
  }

  /**
   * @ngdoc function
   * @name undeploy
   * @methodOf c8y.core.service:c8yCepModule
   *
   * @description
   * Undeploys given module.
   *
   * @param {object} module CEP module.
   *
   * @returns {promise} Returns promise with saved CEP module object with its current status.
   *
   * @example
   * <pre>
   *   var moduleName = 'my_module';
   *   c8yCepModule.detailByName(moduleName).then(function (module) {
   *     c8yCepModule.undeploy(module);
   *   });
   * </pre>
   */
  function undeploy(module) {
    module.status = 'NOT_DEPLOYED';
    return save(module);
  }

  /**
   * @ngdoc function
   * @name examples
   * @methodOf c8y.core.service:c8yCepModule
   *
   * @description
   * Gets the list of sample CEP modules.
   *
   * @returns {promise} Returns promise with the list of sample CEP modules defined in {@link c8y.core.service:c8yCepModuleExamples c8yCepModuleExamples}.
   *
   * @example
   * Controller:
   * <pre>
   *   c8yCepModule.examples().then(function (examples) {
   *     $scope.examples = [];
   *     _.forEach(examples, function (example) {
   *       $scope.examples.push(example);
   *     });
   *   }):
   * </pre>
   * View:
   * <pre>
   *   <div class="form-group">
   *     <label>Examples</label>
   *     <div class="input-group">
   *       <select class="form-control" ng-options="ex.name for ex in examples" ng-model="selExample">
   *       </select>
   *     </div>
   *   </div>
   * </pre>
   */
  function examples() {
    return $q.when(c8yCepModuleExamples);
  }

  return {
    list: list,
    listWithSmartRules: listWithSmartRules,
    isSmartRuleModule: isSmartRuleModule,
    detail: detail,
    save: save,
    remove: remove,
    examples: examples,
    detailByName: detailByName,
    createOrDeploy: createOrDeploy,
    deploy: deploy,
    redeploy: redeploy,
    undeploy: undeploy
  };

}])

/**
 * @ngdoc service
 * @name c8y.core.service:c8yCepModuleExamples
 *
 * @description
 * Provides a list of example CEP modules. The examples include:
 *
 * - *Change the severities of alarms based on activity time*.
 * - *Create alarm if temperature was to low for 15 minutes*.
 * - *Create alarm on not processed operation*
 * - *Create alarm when temperature below 0 degree*.
 * - *Create alarm when temperature over 100 degree*.
 * - *Create close relay operation when temperature readings over 100 degree*.
 * - *Display current temperature on device*
 * - *Schedule device restart every day at 1am*
 * - *Select location change event once for 60 seconds*.
 * - *Select temperature readings over 100 degree*
 * - *Send alarms that are active since 30 minutes to email*.
 * - *Send sales to Zapier*.
 * - *Send simulator temperature to Zapier*.
 *
 * Returns array with example CEP modules as objects with the following properties:
 *
 * - **name** - `string` - example's name,
 * - **value** - `string` - CEP rule.
 *
 * @example
 * Controller:
 * <pre>
 *   $q.when(c8yCepModuleExamples).then(function (examples) {
 *     $scope.examples = [];
 *     _.forEach(examples, function (example) {
 *       $scope.examples.push(example);
 *     });
 *   }):
 * </pre>
 * View:
 * <pre>
 *   <div class="form-group">
 *     <label>Examples</label>
 *     <div class="input-group">
 *       <select class="form-control" ng-options="ex.name for ex in examples" ng-model="selExample">
 *       </select>
 *     </div>
 *   </div>
 * </pre>
 */
.factory('c8yCepModuleExamples', ['gettext', function (gettext) {
  return [
    {
      name: gettext('Change the severities of alarms based on activity time'),
      value:
        '/* Create \"context\" - definition of a group of events to be processed separately.\n' +
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
    },
    {
      name: gettext('Create alarm if temperature was to low for 15 minutes'),
      value:
        'create schema NotZeroMeasurementCreated (\n'+
        '  measurement Measurement\n'+
        ');\n'+
        'create schema ZeroMeasurementCreated (\n'+
        '  measurement Measurement\n'+
        ');\n'+
        'create schema CheckTimeDifference (\n'+
        '  firstMeasurement Measurement,\n'+
        '  lastMeasurement Measurement\n'+
        ');\n'+
        'insert into CreateAlarm\n'+
        '  select\n'+
        '    check.lastMeasurement.source as source,\n'+
        '    check.lastMeasurement.time as time,\n'+
        '    "c8y_LowTemperatureAlarm" as type,\n'+
        '    CumulocitySeverities.WARNING as severity,\n'+
        '    CumulocityAlarmStatuses.ACTIVE as status,\n'+
        '    "Temperature was too low for more than 15 minutes" as text\n'+
        '  from CheckTimeDifference check\n'+
        '  where check.lastMeasurement.time.after(check.firstMeasurement.time, 15min);\n'+
        'insert into CheckTimeDifference\n'+
        '  select\n'+
        '    firstZero.measurement as firstMeasurement,\n'+
        '    firstNotZeroAgain.measurement as lastMeasurement\n'+
        '  from pattern [\n'+
        '    every (lastNotZero = NotZeroMeasurementCreated ->\n'+
        '    firstZero = ZeroMeasurementCreated(measurement.source.value = lastNotZero.measurement.source.value)) ->\n'+
        '    ZeroMeasurementCreated until firstNotZeroAgain = NotZeroMeasurementCreated(measurement.source.value = lastNotZero.measurement.source.value)\n'+
        '  ];\n'+
        'insert into NotZeroMeasurementCreated\n'+
        '  select\n'+
        '    m.measurement as measurement\n'+
        '  from\n'+
        '    MeasurementCreated m\n'+
        '  where getNumber(m, "c8y_TemperatureMeasurement.T.value") > 0\n'+
        '  AND m.measurement.type = "c8y_TemperatureMeasurement";\n'+
        'insert into ZeroMeasurementCreated\n'+
        '  select\n'+
        '    m.measurement as measurement\n'+
        '  from\n'+
        '    MeasurementCreated m\n'+
        '  where getNumber(m, "c8y_TemperatureMeasurement.T.value") <= 0\n'+
        '  AND m.measurement.type = "c8y_TemperatureMeasurement";'
      },
      {
        name: gettext('Create alarm on not processed operation'),
        value:
          'create constant variable int operation_timeout_in_seconds = 300; \n' +
          'create constant variable string alarm_severity = "MAJOR"; \n' +
          'create constant variable string alarm_text = "Operation with id=#{id.value} haven\'t been finished!"; \n' +
          'create constant variable string alarm_type = "c8y_OperationNotFinished"; \n'+
          'create schema OperationNotFinished ( operation com.cumulocity.model.operation.Operation ); \n' +
          'create schema OperationFinished ( operation com.cumulocity.model.operation.Operation, alarm Alarm); \n'+
          '@Name("create_alarm_from_not_finished_operation")\n' +
          'insert into CreateAlarm\n' +
          '  select \n' +
          '    operation.deviceId as source,\n' +
          '    "ACTIVE" as status,\n' +
          '    alarm_severity as severity,\n' +
          '    alarm_type as type,\n' +
          '    current_timestamp().toDate() as time,\n' +
          '    replaceAllPlaceholders(alarm_text, operation) as text,\n' +
          '    { "operationId", operation.id.value } as fragments \n' +
          '  from OperationNotFinished;\n' +
          '@Name("handle_not_finished_operation")\n' +
          'insert into OperationNotFinished\n' +
          '  select\n' +
          '    prevOp.operation as operation\n' +
          '  from pattern [ \n' +
          '    every prevOp = OperationCreated \n' +
          '    -> (timer:interval(operation_timeout_in_seconds second)\n' +
          '    and not OperationUpdated(\n' +
          '    operation.id.value = prevOp.operation.id.value\n' +
          '    and (operation.status in (OperationStatus.SUCCESSFUL, OperationStatus.FAILED))\n' +
          '    ))' +
          '  ];\n'
      },
      {
        name: gettext('Create alarm when temperature below 0 degree'),
        value:
          'insert into CreateAlarm \n'+
          '  select\n'+
          '    e.measurement.time as time,\n'+
          '    e.measurement.source.value as source,\n'+
          '    "com_cumulocity_TemperatureAlert" as type,\n'+
          '    "Temperature too low" as text,\n'+
          '    "ACTIVE" as status,\n'+
          '    "CRITICAL" as severity\n'+
          '  from MeasurementCreated e\n'+
          '  where getNumber(e, "c8y_TemperatureMeasurement.T.value") < 0'
      },
      {
        name: gettext('Create alarm when temperature over 100 degree'),
        value:
          'insert into CreateAlarm \n'+
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
        name: gettext('Create close relay operation when temperature readings over 100 degree'),
        value:
          'insert into CreateOperation\n' +
          '  select\n' +
          '    "PENDING" as status,\n' +
          '    «heating ID» as deviceId,\n' +
          '    {\n' +
          '      "c8y_Relay.relayState", "CLOSED"\n' +
          '    } as fragments\n' +
          '  from MeasurementCreated e\n' +
          '  where getNumber(e, "c8y_TemperatureMeasurement.T.value") > 100'
      },
      {
        name: gettext('Display current temperature on device'),
        value:
          'expression string js:prepareText(temp) [\n' +
          '  function format(text, params){\n' +
          '    for(param in params) {\n' +
          '        text = text.replace("{" + param + "}", params[param])\n' +
          '    }\n' +
          '    return text\n' +
          '  }\n' +
          '  format("Current temperature is {0}", [temp])\n' +
          ']\n' +
          'insert into CreateOperation\n' +
          '	select\n' +
          '      "PENDING" as status,\n' +
          '      e.measurement.source.value as deviceId,\n' +
          '      { "c8y_Message.text", prepareText(\n' +
          '        getNumber(e, "c8y_TemperatureMeasurement.T.value")\n' +
          '	   ) } as fragments\n' +
          '    from MeasurementCreated e\n' +
          '    where e.measurement.type = "c8y_TemperatureMeasurement";'
      },
      {
        name: gettext('Schedule device restart every day at 1am'),
        value:
          'insert into CreateOperation\n' +
          'select\n' +
          '  "PENDING" as status,\n' +
          '  «device ID» as deviceId,\n' +
          '  { "c8y_Restart", {} } as fragments\n' +
          'from pattern [every timer:at(*, 1, *, *, *, *)];'
      },
      {
        name: gettext('Select location change event once for 60 seconds'),
        value:
          'select * from EventCreated e\n' +
          'where getObject(e, "c8y_LocationMeasurement") is not null\n' +
          'output first every 60 seconds'
      },
      {
        name: gettext('Select temperature readings over 100 degree'),
        value:
          'select * from MeasurementCreated e\n' +
          'where getNumber(e, "c8y_TemperatureMeasurement.T.value") > 100'
      },
      {
        name: gettext('Send alarms that are active since 30 minutes to email'),
        value:
          'insert into SendEmail\n' +
          'select\n' +
          '  "<RECEIVER@COMPANY.COM>" as receiver,\n' +
          '  "Alarm active since 30 mins: " || e.alarm.text as subject,\n' +
          '  "Time: " || e.alarm.time.format() || \n' +
          '  " Severity: " || e.alarm.severity.name() || \n' +
          '  " Source: " || findManagedObjectById(e.alarm.source.value).getName() as text,\n' +
          '  "<REPLY_TO@COMPANY.COM>" as replyTo\n' +
          'from pattern [\n' +
          '   every e = AlarmCreated(alarm.status = CumulocityAlarmStatuses.ACTIVE, alarm.severity = CumulocitySeverities.CRITICAL) \n' +
          '   -> (timer:interval(30 minutes) \n' +
          '      and not AlarmUpdated(alarm.status != CumulocityAlarmStatuses.ACTIVE, alarm.id.value = e.alarm.id.value))\n' +
          '];'
      },
      {
        name: gettext('Send sales to Zapier'),
        value:
          '@Name("sales")\n' +
          'select\n' +
          '  getString(e, "com_nsn_startups_vendme_fragments_SalesReportInfo.vendingMachine_name") as id,\n' +
          '  getString(e, "com_nsn_startups_vendme_fragments_SalesReportInfo.product_name") as name,\n' +
          '  e.event.time.format() as time,\n' +
          '  getNumber(e, "com_nsn_startups_vendme_fragments_SalesReportInfo.totalPaid") as value,\n' +
          '  getString(e, "com_nsn_startups_vendme_fragments_SalesReportInfo.payment_type") as text\n' +
          'from EventCreated e\n' +
          '  where e.event.type = "com_nsn_startups_vendme_LiveSalesReport"\n'
      },
      {
        name: gettext('Send simulator temperature to Zapier'),
        value:
          '@Name("simulatortemperature")\n' +
          'select\n' +
          '  e.measurement.source.value as id,\n' +
          '  findManagedObjectById(e.measurement.source.value).getName() as name,\n' +
          '  e.measurement.time.format() as time,\n' +
          '  getNumber(e, "c8y_TemperatureMeasurement.T.value") as value,\n' +
          'from MeasurementCreated e\n' +
          '  where e.measurement.type = "TemperatureMeasurement"\n'
      }
  ];
}]);
