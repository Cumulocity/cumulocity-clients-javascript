(function () {
  'use strict';

  /**
   * @ngdoc service
   * @name c8y.core.service:c8ySmartRestTemplates
   *
   * @description
   * This service allows for managing SmartREST 2.0 templates.
   */
  angular.module('c8y.core')
    .factory('c8ySmartRestTemplates', c8ySmartRestTemplates);

  function c8ySmartRestTemplates(
    $q,
    c8yBase,
    c8yInventory,
    c8yIdentity,
    gettext,
    gettextCatalog
  ) {
    var type = 'c8y_SmartRest2Template';
    var fragmentType = 'com_cumulocity_model_smartrest_csv_CsvSmartRestTemplate';
    var externalIdType = 'c8y_SmartRest2DeviceIdentifier';
    var listPageSize = 1000;
    var APIs = c8yBase.createEnum([
      'INVENTORY',
      'MEASUREMENT',
      'ALARM',
      'EVENT',
      'OPERATION'
    ]);
    var Methods = c8yBase.createEnum([
      'GET',
      'PUT',
      'POST'
    ]);
    var Types = c8yBase.createEnum([
      {name: 'STRING', value: 'STRING', label: gettext('STRING')},
      {name: 'DATE', value: 'DATE', label: gettext('DATE')},
      {name: 'NUMBER', value: 'NUMBER', label: gettext('NUMBER'), numeric: true},
      {name: 'INTEGER', value: 'INTEGER', label: gettext('INTEGER'), numeric: true},
      {name: 'UNSIGNED', value: 'UNSIGNED', label: gettext('UNSIGNED'), numeric: true},
      {name: 'FLAG', value: 'FLAG', label: gettext('FLAG')},
      {name: 'SEVERITY', value: 'SEVERITY', label: gettext('SEVERITY')},
      {name: 'ALARMSTATUS', value: 'ALARMSTATUS', label: gettext('ALARM STATUS')},
      {name: 'OPERATIONSTATUS', value: 'OPERATIONSTATUS', label: gettext('OPERATION STATUS')},
      {name: 'ARRAY', value: 'ARRAY', label: gettext('ARRAY')},
      {name: 'OBJECTARRAY', value: 'OBJECTARRAY', label: gettext('OBJECT ARRAY')}
    ]);
    var TYPES_HIDDEN_IN_UI = [
      Types.OBJECTARRAY.value,
      Types.ARRAY.value
    ];
    var defaultTemplate = {
      name: '',
      type: type,
      com_cumulocity_model_smartrest_csv_CsvSmartRestTemplate: {
        requestTemplates: [],
        responseTemplates: []
      }
    };
    var defaultRequestTemplate = {
      name: '',
      msgId: '',
      api: APIs.INVENTORY.name,
      method: Methods.GET.name,
      response: true,
      byId: true,
      mandatoryValues: [],
      customValues: []
    };
    var defaultCustomValue = {
      path: '',
      type: Types.STRING.name,
      value: ''
    };
    var defaultResponseTemplate = {
      name: '',
      msgId: '',
      base: '',
      condition: '',
      patterns: []
    };
    var defaultResponseTemplatePattern = {
      path: ''
    };
    var mandatoryFields = {
      MEASUREMENT: {
        POST: [
          {
            path: '$.type',
            type: Types.STRING.name
          },
          {
            path: '$.time',
            type: Types.DATE.name
          }
        ]
      },
      EVENT: {
        POST: [
          {
            path: '$.type',
            type: Types.STRING.name
          },
          {
            path: '$.text',
            type: Types.STRING.name
          },
          {
            path: '$.time',
            type: Types.DATE.name
          }
        ]
      },
      ALARM: {
        POST: [
          {
            path: '$.type',
            type: Types.STRING.name
          },
          {
            path: '$.text',
            type: Types.STRING.name
          },
          {
            path: '$.status',
            type: Types.ALARMSTATUS.name
          },
          {
            path: '$.severity',
            type: Types.SEVERITY.name
          },
          {
            path: '$.time',
            type: Types.DATE.name
          }
        ],
        PUT: [
          {
            path: '$.type',
            type: Types.STRING.name
          }
        ]
      },
      OPERATION: {
        PUT: [
          {
            path: '$.type',
            type: Types.STRING.name
          }
        ]
      },
      INVENTORY: {
        POST: [
          {
            path: '$.type',
            type: Types.STRING.name
          }
        ],
        PUT: [],
        GET: []
      }
    };
    var BUILTIN_PUBLISH_MESSAGES = [
      {
        msgId: '100',
        name: gettext('Device creation'),
        values: [
          {
            label: gettext('device name'),
            type: Types.STRING.name,
            default: 'MQTT Device <serialNumber>'
          },
          {
            label: gettext('device type'),
            type: Types.STRING.name,
            default: 'c8y_MQTTDevice'
          }
        ],
        hideInSimulators: true
      },
      {
        msgId: '101',
        name: gettext('Child device creation'),
        values: [
          {
            label: gettext('unique child ID'),
            type: Types.STRING.name,
            mandatory: true
          },
          {
            label: gettext('device name'),
            type: Types.STRING.name,
            default: 'MQTT Device <serialNumber>'
          },
          {
            label: gettext('device type'),
            type: Types.STRING.name,
            default: 'c8y_MQTTChildDevice'
          }
        ],
        hideInSimulators: true
      },
      {
        msgId: '105',
        name: gettext('Get child device'),
        hideInSimulators: true
      },
      {
        msgId: '110',
        name: gettext('Configure hardware'),
        values: [
          {
            label: gettext('serialNumber'),
            type: Types.STRING.name
          },
          {
            label: gettext('model'),
            type: Types.STRING.name
          },
          {
            label: gettext('revision'),
            type: Types.STRING.name
          }
        ]
      },
      {
        msgId: '111',
        name: gettext('Configure mobile'),
        values: [
          {label: gettext('imei'), type: Types.STRING.name},
          {label: gettext('iccid'), type: Types.STRING.name},
          {label: gettext('imsi'), type: Types.STRING.name},
          {label: gettext('mcc'), type: Types.STRING.name},
          {label: gettext('mnc'), type: Types.STRING.name},
          {label: gettext('lac'), type: Types.STRING.name},
          {label: gettext('cellId'), type: Types.STRING.name}
        ]
      },
      {
        msgId: '112',
        name: gettext('Configure position'),
        values: [
          {label: gettext('latitude'), type: Types.STRING.name},
          {label: gettext('longitude'), type: Types.STRING.name},
          {label: gettext('altitude'), type: Types.STRING.name},
          {label: gettext('accuracy'), type: Types.STRING.name}
        ]
      },
      {
        msgId: '113',
        name: gettext('Set configuration'),
        values: [
          {label: gettext('configuration'), type: Types.STRING.name}
        ]
      },
      {
        msgId: '114',
        name: gettext('Set supported operations'),
        values: [
          {label: gettext('List of supported operations'), type: Types.ARRAY.name}
        ],
        hideInSimulators: true
      },
      {
        msgId: '115',
        name: gettext('Set firmware'),
        values: [
          {label: gettext('name'), type: Types.STRING.name},
          {label: gettext('version'), type: Types.STRING.name},
          {label: gettext('url'), type: Types.STRING.name}
        ]
      },
      {
        msgId: '116',
        name: gettext('Set software list'),
        values: [
          {label: gettext('List of 3 values per software'), type: Types.OBJECTARRAY.name, values: [
            {label: gettext('name'), type: Types.STRING.name},
            {label: gettext('version'), type: Types.STRING.name},
            {label: gettext('url'), type: Types.STRING.name}
          ]}
        ]
      },
      {
        msgId: '117',
        name: gettext('Set required availability'),
        values: [
          {label: gettext('required interval'), type: Types.NUMBER.name}
        ]
      },
      {
        msgId: '200',
        name: gettext('Create custom measurement'),
        values: [
          {label: gettext('fragment'), type: Types.STRING.name, mandatory: true},
          {label: gettext('series'), type: Types.STRING.name, mandatory: true},
          {label: gettext('value'), type: Types.NUMBER.name, mandatory: true},
          {label: gettext('unit'), type: Types.STRING.name},
          {label: gettext('time'), type: Types.DATE.name}
        ]
      },
      {
        msgId: '210',
        name: gettext('Create signal strength measurement'),
        values: [
          {label: gettext('rssi value'), type: Types.NUMBER.name, mandatory: true},
          {label: gettext('ber value'), type: Types.NUMBER.name, mandatory: true},
          {label: gettext('time'), type: Types.DATE.name}
        ]
      },
      {
        msgId: '211',
        name: gettext('Create temperature measurement'),
        values: [
          {label: gettext('temperature value'), type: Types.NUMBER.name, mandatory: true},
          {label: gettext('time'), type: Types.DATE.name}
        ]
      },
      {
        msgId: '212',
        name: gettext('Create battery measurement'),
        values: [
          {label: gettext('battery value'), type: Types.NUMBER.name, mandatory: true},
          {label: gettext('time'), type: Types.DATE.name}
        ]
      },
      {
        msgId: '301',
        name: gettext('Create CRITICAL alarm'),
        values: [
          {label: gettext('type'), type: Types.STRING.name, mandatory: true},
          {label: gettext('text'), type: Types.STRING.name, default: 'Alarm of type <alarmType> raised'},
          {label: gettext('time'), type: Types.DATE.name}
        ]
      },
      {
        msgId: '302',
        name: gettext('Create MAJOR alarm'),
        values: [
          {label: gettext('type'), type: Types.STRING.name, mandatory: true},
          {label: gettext('text'), type: Types.STRING.name, default: 'Alarm of type <alarmType> raised'},
          {label: gettext('time'), type: Types.DATE.name}
        ]
      },
      {
        msgId: '303',
        name: gettext('Create MINOR alarm'),
        values: [
          {label: gettext('type'), type: Types.STRING.name, mandatory: true},
          {label: gettext('text'), type: Types.STRING.name, default: 'Alarm of type <alarmType> raised'},
          {label: gettext('time'), type: Types.DATE.name}
        ]
      },
      {
        msgId: '304',
        name: gettext('Create WARNING alarm'),
        values: [
          {label: gettext('type'), type: Types.STRING.name, mandatory: true},
          {label: gettext('text'), type: Types.STRING.name, default: 'Alarm of type <alarmType> raised'},
          {label: gettext('time'), type: Types.DATE.name}
        ]
      },
      {
        msgId: '305',
        name: gettext('Update severity of existing alarm'),
        values: [
          {label: gettext('type'), type: Types.STRING.name, mandatory: true},
          {label: gettext('severity'), type: Types.SEVERITY.name, mandatory: true}
        ]
      },
      {
        msgId: '306',
        name: gettext('Clear existing alarm'),
        values: [
          {label: gettext('type'), type: Types.STRING.name, mandatory: true},
          {label: gettext('severity'), type: Types.SEVERITY.name, mandatory: true}
        ]
      },
      {
        msgId: '400',
        name: gettext('Create basic event'),
        values: [
          {label: gettext('type'), type: Types.STRING.name, mandatory: true},
          {label: gettext('text'), type: Types.STRING.name, mandatory: true},
          {label: gettext('time'), type: Types.DATE.name}
        ]
      },
      {
        msgId: '401',
        name: gettext('Create location update event'),
        values: [
          {label: gettext('latitude'), type: Types.STRING.name},
          {label: gettext('longitude'), type: Types.STRING.name},
          {label: gettext('altitude'), type: Types.STRING.name},
          {label: gettext('accuracy'), type: Types.STRING.name}
        ]
      },
      {
        msgId: '402',
        name: gettext('Create location update event with device update'),
        values: [
          {label: gettext('latitude'), type: Types.STRING.name},
          {label: gettext('longitude'), type: Types.STRING.name},
          {label: gettext('altitude'), type: Types.STRING.name},
          {label: gettext('accuracy'), type: Types.STRING.name}
        ]
      },
      {
        msgId: '500',
        name: gettext('Get PENDING operations'),
        hideInSimulators: true
      },
      {
        msgId: '501',
        name: gettext('Set operation to EXECUTING'),
        values: [
          {label: gettext('fragment'), type: Types.STRING.name, mandatory: true}
        ],
        hideInSimulators: true
      },
      {
        msgId: '502',
        name: gettext('Set operation to FAILED'),
        values: [
          {label: gettext('fragment'), type: Types.STRING.name, mandatory: true},
          {label: gettext('failureReason'), type: Types.STRING.name}
        ],
        hideInSimulators: true
      },
      {
        msgId: '503',
        name: gettext('Set operation to SUCCESSFUL'),
        values: [
          {label: gettext('fragment'), type: Types.STRING.name, mandatory: true},
          {label: gettext('parameters'), type: Types.ARRAY.name}
        ],
        hideInSimulators: true
      }
    ];

    var service = {
      APIs: APIs,
      Methods: Methods,
      Types: Types,
      fragmentType: fragmentType,
      externalIdType: externalIdType,
      newTemplate: newTemplate,
      create: create,
      save: save,
      list: list,
      detail: detail,
      remove: remove,
      download: download,
      getAllMsgIds: getAllMsgIds,
      countRequestTemplates: countRequestTemplates,
      newRequestTemplate: newRequestTemplate,
      addRequestTemplate: addRequestTemplate,
      removeRequestTemplate: removeRequestTemplate,
      setupRequestTemplateDefaults: setupRequestTemplateDefaults,
      doesRequestTemplateRequireByIdOrByExternalId: doesRequestTemplateRequireByIdOrByExternalId,
      addRequestTemplateCustomValue: addRequestTemplateCustomValue,
      removeRequestTemplateCustomValue: removeRequestTemplateCustomValue,
      getRequestTemplatePreview: getRequestTemplatePreview,
      countResponseTemplates: countResponseTemplates,
      newResponseTemplate: newResponseTemplate,
      addResponseTemplate: addResponseTemplate,
      removeResponseTemplate: removeResponseTemplate,
      addResponseTemplatePattern: addResponseTemplatePattern,
      removeResponseTemplatePattern: removeResponseTemplatePattern,
      getResponseTemplatePreview: getResponseTemplatePreview,
      getPreviewsCsvData: getPreviewsCsvData,
      getPreviews: getPreviews,
      getMethodsForAPI: getMethodsForAPI,
      listAllPublishMessages: listAllPublishMessages,
      typesForUI: typesForUI
    };

    return service;

    // -------------------------------------------------------------------------

    /**
     * @ngdoc function
     * @name newTemplate
     * @methodOf c8y.core.service:c8ySmartRestTemplates
     *
     * @description
     * Gets new template object with default structure and values.
     *
     * @example
     * <pre>
     *   var template = c8ySmartRestTemplates.newTemplate();
     * </pre>
     */
    function newTemplate() {
      return _.defaults({}, defaultTemplate);
    }

    /**
     * @ngdoc function
     * @name create
     * @methodOf c8y.core.service:c8ySmartRestTemplates
     *
     * @description
     * Creates a new template with given structure and external ID.
     *
     * @param {object} mo Managed object to save.
     * @param {string} externalId External ID to assign to the created template.
     *
     * @returns {promise} Returns a promise which resolves to the created template.
     *
     * @example
     * <pre>
     *   var template = {name: 'My new template'};
     *   var externalId = 'myNewTemplateExternalId';
     *   c8ySmartRestTemplates.create(template, externalId)
     *     .then(function (createdTemplate) {
     *       $ctrl.createdTemplate = createdTemplate;
     *     });
     * </pre>
     */
    function create(mo, externalId) {
      return save(_.defaults({}, mo, defaultTemplate))
        .then(function (createdMo) {
          return createExternalIdentity(createdMo, externalId)
            .then(_.partial(_.identity, createdMo))
            .then(convertFromServer);
        });
    }

    function createExternalIdentity(mo, externalId) {
      var identity = {
        type: externalIdType,
        externalId: externalId
      };
      return c8yIdentity.createIdentity(mo, identity);
    }

    /**
     * @ngdoc function
     * @name save
     * @methodOf c8y.core.service:c8ySmartRestTemplates
     *
     * @description
     * Saves template object to server.
     *
     * @param {object} mo Managed object to save. Can be partial managed object.
     *
     * @returns {promise} Returns a promise which resolves to the saved template.
     *
     * @example
     * <pre>
     *   c8ySmartRestTemplates.detail($ctrl.templateId)
     *     .then(function (template) {
     *       template.name = 'Name modified';
     *       return template;
     *     })
     *     .then(c8ySmartRestTemplates.save);
     * </pre>
     */
    function save(mo) {
      return c8yInventory.save(convertToServer(mo))
        .then(c8yBase.getResData)
        .then(convertFromServer);
    }

    /**
     * @ngdoc function
     * @name list
     * @methodOf c8y.core.service:c8ySmartRestTemplates
     *
     * @description
     * Gets the list of templates.
     *
     * @returns {promise} Returns a promise which resolves to the list of templates.
     *
     * @example
     * <pre>
     *   c8ySmartRestTemplates.list()
     *     .then(function (templates) {
     *       $ctrl.templates = templates;
     *     });
     * </pre>
     */
    function list() {
      return c8yInventory.list({
        type: type,
        pageSize: listPageSize
      })
      .then(function (templates) {
        return $q.all(_.map(templates, convertFromServer));
      });
    }

    /**
     * @ngdoc function
     * @name detail
     * @methodOf c8y.core.service:c8ySmartRestTemplates
     *
     * @description
     * Gets the details of template with given managed object id.
     *
     * @param {string|int} moId Managed object id.
     *
     * @returns {promise} Returns a promise which resolves to the template.
     *
     * @example
     * <pre>
     *   var moId = 10300;
     *   c8ySmartRestTemplates.detail(moId)
     *     .then(function (template) {
     *       $ctrl.template = template;
     *     });
     * </pre>
     */
    function detail(moId) {
      return c8yInventory.detail(moId)
        .then(c8yBase.getResData)
        .then(convertFromServer);
    }

    function getTemplateExternalId(template) {
      return c8yIdentity.listExternalIds(template)
        .then(function (identities) {
          var identity = _.find(identities, {type: externalIdType});
          return identity && identity.externalId;
        });
    }

    /**
     * @ngdoc function
     * @name remove
     * @methodOf c8y.core.service:c8ySmartRestTemplates
     *
     * @description
     * Removes given template from server.
     *
     * @param {object} mo Managed object to remove.
     *
     * @returns {promise} Returns a promise which resolves when template removed.
     *
     * @example
     * <pre>
     *   c8ySmartRestTemplates.remove($ctrl.template);
     * </pre>
     */
    function remove(mo) {
      return c8yInventory.remove(mo);
    }

    /**
     * @ngdoc function
     * @name download
     * @methodOf c8y.core.service:c8ySmartRestTemplates
     *
     * @description
     * Exports given template to JSON file and allows a user to save it.
     *
     * @param {object} template Template to download.
     *
     * @example
     * <pre>
     *   c8ySmartRestTemplates.download($ctrl.template);
     * </pre>
     */
    function download(template) {
      var filename = template.name + '.json',
        contentType = 'application/json',
        content = JSON.stringify(cleanTemplateForDownload(template), null, 2),
        blob = new Blob([content], {type: contentType});

      saveAs(blob, filename);
    }

    function cleanTemplateForDownload(template) {
      return _(convertToServer(template))
        .pick(['name', 'type', fragmentType])
        .assign(_.pick(template, ['__externalId']))
        .value();
    }

    function countRequestTemplates(template) {
      return template[fragmentType].requestTemplates.length;
    }

    /**
     * @ngdoc function
     * @name getAllMsgIds
     * @methodOf c8y.core.service:c8ySmartRestTemplates
     *
     * @description
     * Gets the list of all msgIds used in given template.
     *
     * @param {object} template Template to get msgIds list for.
     *
     * @returns {array} Returns an array of msgIds.
     *
     * @example
     * <pre>
     *   var msgIds = c8ySmartRestTemplates.getAllMsgIds($ctrl.template);
     * </pre>
     */
    function getAllMsgIds(template) {
      return _.map(_.flatten([
        template[fragmentType].requestTemplates,
        template[fragmentType].responseTemplates
      ]), 'msgId');
    }

    /**
     * @ngdoc function
     * @name newRequestTemplate
     * @methodOf c8y.core.service:c8ySmartRestTemplates
     *
     * @description
     * Gets new request template object with default structure and values.
     *
     * @example
     * <pre>
     *   var requestTemplate = c8ySmartRestTemplates.newRequestTemplate();
     * </pre>
     */
    function newRequestTemplate() {
      return _.defaults({}, defaultRequestTemplate);
    }

    /**
     * @ngdoc function
     * @name addRequestTemplate
     * @methodOf c8y.core.service:c8ySmartRestTemplates
     *
     * @description
     * Adds request template to SmartREST template.
     *
     * @param {object} template Template managed object.
     * @param {object} requestTemplate Stub for request template. Will be extended with default values if they are not provided.
     *
     * @returns {object} Returns added request template.
     *
     * @example
     * <pre>
     *   var requestTemplate = c8ySmartRestTemplates.newRequestTemplate();
     *   requestTemplate.msgId = 2;
     *   requestTemplate.name = 'New request template';
     *   c8ySmartRestTemplates.addRequestTemplate($ctrl.template, requestTemplate);
     * </pre>
     */
    function addRequestTemplate(template, requestTemplate) {
      var reqTpl = _.defaults({}, requestTemplate, defaultRequestTemplate);
      template[fragmentType].requestTemplates.push(reqTpl);
      return reqTpl;
    }

    /**
     * @ngdoc function
     * @name removeRequestTemplate
     * @methodOf c8y.core.service:c8ySmartRestTemplates
     *
     * @description
     * Removes request template from SmartREST template.
     *
     * @param {object} template Template managed object.
     * @param {object} requestTemplate Request template object to remove.
     *
     * @example
     * <pre>
     *   var requestTemplate = $ctrl.template[c8ySmartRestTemplates.fragmentType].requestTemplates[2];
     *   c8ySmartRestTemplates.removeRequestTemplate($ctrl.template, requestTemplate);
     * </pre>
     */
    function removeRequestTemplate(template, requestTemplate) {
      _.pull(template[fragmentType].requestTemplates, requestTemplate);
    }

    /**
     * @ngdoc function
     * @name setupRequestTemplateDefaults
     * @methodOf c8y.core.service:c8ySmartRestTemplates
     *
     * @description
     * Sets default values for current API and method chosen in request template.
     *
     * @param {object} requestTemplate Request template to setup.
     *
     * @example
     * <pre>
     *   var requestTemplate = c8ySmartRestTemplates.newRequestTemplate();
     *   requestTemplate.api = c8ySmartRestTemplates.APIs.INVENTORY.name;
     *   requestTemplate.method = c8ySmartRestTemplates.Methods.GET.name;
     *   c8ySmartRestTemplates.setupRequestTemplateDefaults(requestTemplate);
     * </pre>
     */
    function setupRequestTemplateDefaults(requestTemplate) {
      if (!requestTemplate.api || !requestTemplate.method) {
        return;
      }

      var mfs = mandatoryFields[requestTemplate.api][requestTemplate.method] || [];
      requestTemplate.mandatoryValues = _.map(mfs, function (mf) {
        var previousValue = (_.find(requestTemplate.mandatoryValues, {path: mf.path, type: mf.type}) || {}).value;
        return _.assign({}, mf, {value: previousValue});
      });
      requestTemplate.response = requestTemplate.method === Methods.GET.name ? true : false;
    }

    /**
     * @ngdoc function
     * @name doesRequestTemplateRequireByIdOrByExternalId
     * @methodOf c8y.core.service:c8ySmartRestTemplates
     *
     * @description
     * Checks if request template require providing byId or externalId.
     *
     * @param {object} requestTemplate Request template to check.
     *
     * @returns {boolean} Returns true or false.
     *
     * @example
     * <pre>
     *   var requiresByIdOrExternalId = c8ySmartRestTemplates.doesRequestTemplateRequireByIdOrByExternalId($ctrl.template);
     * </pre>
     */
    function doesRequestTemplateRequireByIdOrByExternalId(requestTemplate) {
      var isInventory = requestTemplate.api === APIs.INVENTORY.name;
      var isGet = requestTemplate.method === Methods.GET.name;
      var isPut = requestTemplate.method === Methods.PUT.name;
      return isInventory && (isGet || isPut);
    }

    /**
     * @ngdoc function
     * @name addRequestTemplateCustomValue
     * @methodOf c8y.core.service:c8ySmartRestTemplates
     *
     * @description
     * Adds new custom value to request template.
     *
     * @param {object} requestTemplate Request template to add to.
     * @param {object} customValue Custom value to add.
     *
     * @returns {object} Returns added custom value.
     *
     * @example
     * <pre>
     *   var customValue = {
     *     path: '$.customField',
     *     type: c8ySmartRestTemplates.Types.STRING.name,
     *     value: null
     *   };
     *   c8ySmartRestTemplates.addRequestTemplateCustomValue($ctrl.requestTemplate, customValue);
     * </pre>
     */
    function addRequestTemplateCustomValue(requestTemplate, customValue) {
      var cv = _.defaults({}, customValue, defaultCustomValue);
      requestTemplate.customValues.push(cv);
      return cv;
    }

    /**
     * @ngdoc function
     * @name removeRequestTemplateCustomValue
     * @methodOf c8y.core.service:c8ySmartRestTemplates
     *
     * @description
     * Removes custom value from request template.
     *
     * @param {object} requestTemplate Request template to remove from.
     * @param {object} customValue Custom value to remove.
     *
     * @example
     * <pre>
     *   var customValue = $ctrl.requestTemplate.customValues[1];
     *   c8ySmartRestTemplates.removeRequestTemplateCustomValue($ctrl.requestTemplate, customValue);
     * </pre>
     */
    function removeRequestTemplateCustomValue(requestTemplate, customValue) {
      _.pull(requestTemplate.customValues, customValue);
    }

    function countResponseTemplates(template) {
      return template[fragmentType].responseTemplates.length;
    }

    /**
     * @ngdoc function
     * @name newResponseTemplate
     * @methodOf c8y.core.service:c8ySmartRestTemplates
     *
     * @description
     * Gets new response template object with default structure and values.
     *
     * @example
     * <pre>
     *   var responseTemplate = c8ySmartRestTemplates.newResponseTemplate();
     * </pre>
     */
    function newResponseTemplate() {
      return _.defaults({}, defaultResponseTemplate);
    }

    /**
     * @ngdoc function
     * @name addResponseTemplate
     * @methodOf c8y.core.service:c8ySmartRestTemplates
     *
     * @description
     * Adds response template to SmartREST template.
     *
     * @param {object} template Template managed object.
     * @param {object} responseTemplate Stub for response template. Will be extended with default values if they are not provided.
     *
     * @returns {object} Returns added response template.
     *
     * @example
     * <pre>
     *   var responseTemplate = c8ySmartRestTemplates.newResponseTemplate();
     *   responseTemplate.msgId = 2;
     *   responseTemplate.name = 'New response template';
     *   c8ySmartRestTemplates.addResponseTemplate($ctrl.template, responseTemplate);
     * </pre>
     */
    function addResponseTemplate(template, responseTemplate) {
      var resTpl = _.defaults({}, responseTemplate, defaultResponseTemplate);
      template[fragmentType].responseTemplates.push(resTpl);
      return resTpl;
    }

    /**
     * @ngdoc function
     * @name removeResponseTemplate
     * @methodOf c8y.core.service:c8ySmartRestTemplates
     *
     * @description
     * Removes response template from SmartREST template.
     *
     * @param {object} template Template managed object.
     * @param {object} responseTemplate Response template object to remove.
     *
     * @example
     * <pre>
     *   var responseTemplate = $ctrl.template[c8ySmartRestTemplates.fragmentType].responseTemplates[2];
     *   c8ySmartRestTemplates.removeResponseTemplate($ctrl.template, responseTemplate);
     * </pre>
     */
    function removeResponseTemplate(template, responseTemplate) {
      _.pull(template[fragmentType].responseTemplates, responseTemplate);
    }

    /**
     * @ngdoc function
     * @name addResponseTemplatePattern
     * @methodOf c8y.core.service:c8ySmartRestTemplates
     *
     * @description
     * Adds new pattern to response template.
     *
     * @param {object} responseTemplate Response template to add to.
     * @param {object} pattern Pattern to add.
     *
     * @returns {object} Returns added pattern.
     *
     * @example
     * <pre>
     *   var pattern = {
     *     pattern: '$.someField'
     *   };
     *   c8ySmartRestTemplates.addResponseTemplatePattern($ctrl.responseTemplate, pattern);
     * </pre>
     */
    function addResponseTemplatePattern(responseTemplate, pattern) {
      var p = _.defaults({}, pattern, defaultResponseTemplatePattern);
      responseTemplate.patterns.push(p);
      return p;
    }

    /**
     * @ngdoc function
     * @name removeResponseTemplatePattern
     * @methodOf c8y.core.service:c8ySmartRestTemplates
     *
     * @description
     * Removes pattern from response template.
     *
     * @param {object} responseTemplate Request template to remove from.
     * @param {object} pattern Pattern to remove.
     *
     * @example
     * <pre>
     *   var pattern = $ctrl.responseTemplate.patterns[1];
     *   c8ySmartRestTemplates.removeResponseTemplatePattern($ctrl.responseTemplate, pattern);
     * </pre>
     */
    function removeResponseTemplatePattern(responseTemplate, pattern) {
      _.pull(responseTemplate.patterns, pattern);
    }

    /**
     * @ngdoc function
     * @name getMethodsForAPI
     * @methodOf c8y.core.service:c8ySmartRestTemplates
     *
     * @description
     * Gets the list of methods available for given API.
     *
     * @param {string} api Name of API.
     *
     * @returns {array} Returns an array of c8ySmartRestTemplates.Methods available for given API.
     *
     * @example
     * <pre>
     *   var methods = c8ySmartRestTemplates.getMethodsForAPI($ctrl.requestTemplate.api);
     * </pre>
     */
    function getMethodsForAPI(api) {
      var methodNames = _.keys(mandatoryFields[api] || {});
      return _.filter(Methods.values(), function (m) {
        return _.includes(methodNames, m.name);
      });
    }

    /**
     * @ngdoc function
     * @name getPreviewsCsvData
     * @methodOf c8y.core.service:c8ySmartRestTemplates
     *
     * @description
     * Gets CSV preview data for template.
     *
     * @param {object} template Managed object for template.
     * @param {object} options Options object. Options available:
     * - **skipRequestTemplates** – skips request templates in preview (default: false).
     * - **skipResponseTemplates** – skips response templates in preview (default: false).
     *
     * @returns {array} Returns an array of arrays representing CSV preview data for the template.
     *
     * @example
     * <pre>
     *   var options = {skipResponseTemplates: true};
     *   var csvData = c8ySmartRestTemplates.getPreviewsCsvData($ctrl.template, options);
     * </pre>
     */
    function getPreviewsCsvData(template, options) {
      options = options || {};
      var rows = [];
      var previews = getPreviews(template);
      if (!options.skipRequestTemplates) {
        rows.push([gettextCatalog.getString('Messages')]);
        rows.push([
          gettextCatalog.getString('Name'),
          gettextCatalog.getString('API'),
          gettextCatalog.getString('Method'),
          gettextCatalog.getString('Preview')
        ]);
        _.each(previews.requestTemplates, function (reqTpl) {
          rows.push([reqTpl.name, reqTpl.api, reqTpl.method, reqTpl.csv]);
        });
      }
      if (!options.skipRequestTemplates && !options.skipResponseTemplates) {
        rows.push([]);
      }
      if (!options.skipResponseTemplates) {
        rows.push([gettextCatalog.getString('Responses')]);
        rows.push([
          gettextCatalog.getString('Name'),
          gettextCatalog.getString('Preview')
        ]);
        _.each(previews.responseTemplates, function (resTpl) {
          rows.push([resTpl.name, resTpl.csv]);
        });
      }
      return rows;
    }

    /**
     * @ngdoc function
     * @name getPreviews
     * @methodOf c8y.core.service:c8ySmartRestTemplates
     *
     * @description
     * Gets previews for template.
     *
     * @param {object} template Managed object for template.
     *
     * @returns {object} Returns previews object:
     * - **requestTemplates** – an array of objects with **name**, **api**, **method**, **csv**.
     * - **responseTemplates** – an array of objects with **name**, **csv**.
     *
     * @example
     * <pre>
     *   var previews = c8ySmartRestTemplates.getPreviews($ctrl.template);
     * </pre>
     */
    function getPreviews(template) {
      return {
        requestTemplates: _.map(template[fragmentType].requestTemplates, getRequestTemplatePreview),
        responseTemplates: _.map(template[fragmentType].responseTemplates, getResponseTemplatePreview)
      };
    }

    /**
     * @ngdoc function
     * @name listAllMessages
     *
     * @description
     * Gets all the messages from all the templates in a single flat array.
     * Adds one non enumerable properties to each message:
     * - **_template** the managed object of the template the message belongs to
     * @return {promise} A promise that resolves with the array of all the
     * available messages
     */
    function listAllPublishMessages() {
      return list()
        .then(flattenRequestMessages)
        .then(function (msgs) {
          return _.union(msgs, _.cloneDeep(BUILTIN_PUBLISH_MESSAGES));
        });
    }

    function flattenRequestMessages(templates) {
      return _(templates).reduce(requestMessageReducer, []);
    }

    function requestMessageReducer(messages, templateMo) {
      var tpl = templateMo[fragmentType];
      var requests = tpl.requestTemplates;
      _.forEach(requests, function (r) {
        Object.defineProperties(r, {
          _template: {value: templateMo}
        });
        messages.push(r);
      });
      return messages;
    }

    function getRequestTemplatePreview(requestTemplate) {
      return {
        name: requestTemplate.name,
        api: requestTemplate.api,
        method: requestTemplate.method,
        csv: getRequestTemplateCsv(requestTemplate)
      };
    }

    function getResponseTemplatePreview(responseTemplate) {
      return {
        name: responseTemplate.name,
        csv: getResponseTemplateCsv(responseTemplate)
      };
    }

    function getRequestTemplateCsv(requestTemplate) {
      return _.compact(
        _.flatten([
          requestTemplate.msgId,
          requestTemplate.api === APIs.INVENTORY.name && requestTemplate.method === Methods.GET.name ?
            (requestTemplate.byId ? '<deviceId>' : (requestTemplate.externalIdType ? '<externalId>' : '<externalIdType>,<externalId>')) :
            undefined,
          _.map(requestTemplate.mandatoryValues || [], function (v) {
            if (v.type !== Types.FLAG.name && !v.value) {
              return ['<', v.path, '>'].join('');
            }
          }),
          _.map(requestTemplate.customValues || [], function (v) {
            if (v.type !== Types.FLAG.name && !v.value) {
              return ['<', v.path, '>'].join('');
            }
          })
        ])
      ).join(',');
    }

    function getResponseTemplateCsv(responseTemplate) {
      return _.compact(
        _.flatten([
          responseTemplate.msgId,
          _.map(responseTemplate.patterns || [], function (p) {
            return ['<', p.path, '>'].join('');
          })
        ])
      ).join(',');
    }

    function convertFromServer(template) {
      return getTemplateExternalId(template)
        .then(function (externalId) {
          var tpl = _.cloneDeep(template);
          tpl.__externalId = externalId;
          _.forEach(tpl[fragmentType].responseTemplates, function (resTpl) {
            if (resTpl.pattern) {
              resTpl.patterns = _.map(resTpl.pattern, function (path) {
                return {
                  path: path
                };
              });
              delete resTpl.pattern;
            }
          });
          return tpl;
        });
    }

    function convertToServer(template) {
      var tpl = _.cloneDeep(template);
      tpl.__externalId = undefined;
      _.forEach((tpl[fragmentType] || {}).responseTemplates, function (resTpl) {
        if (resTpl.patterns) {
          resTpl.pattern = _.map(resTpl.patterns, function (pattern) {
            return pattern.path;
          });
          delete resTpl.patterns;
        }
      });
      return tpl;
    }

    function typesForUI() {
      return _.filter(Types.values(), function (type) {
        return TYPES_HIDDEN_IN_UI.indexOf(type.value) === -1;
      });
    }
  }
}());
