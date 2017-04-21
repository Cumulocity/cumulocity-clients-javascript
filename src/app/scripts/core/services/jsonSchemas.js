(function () {
  'use strict';

  angular
    .module('c8y.core')
    .factory('c8yJsonSchemas', c8yJsonSchemas);

  /**
   * @ngdoc service
   * @name c8y.core.service:c8yJsonSchemas
   *
   * @description
   * This service allows for managing custom JSON schemas
   * that can be used with entities like: managed objects, alarms, events, measurements or tenants.
   */
  /* @ngInject */
  function c8yJsonSchemas(
    c8yBase,
    c8yInventory
  ) {
    var type = 'c8y_JsonSchema';
    var defaults = {
      type: type,
      name: '',
      appliesTo: {},
      c8y_JsonSchema: {
        type: 'object',
        properties: {}
      }
    };
    var listPageSize = 1000;
    var defaultListFilter = {
      type: type,
      pageSize: listPageSize
    };

    var service = {
      getDefaults: getDefaults,
      list: list,
      detail: detail,
      create: create,
      update: update,
      save: save,
      remove: remove
    };

    return service;

    /**
     * @ngdoc function
     * @name getDefaults
     * @methodOf c8y.core.service:c8yJsonSchemas
     *
     * @description
     * Gets a new object with default values for new c8y_JsonSchema object.
     *
     * @returns {object} Returns a new object with default values.
     *
     * @example
     * <pre>
     *   vm.newJsonSchemaObj = c8yJsonSchemas.getDefaults();
     * </pre>
     */
    function getDefaults() {
      return _.cloneDeep(defaults);
    }

    /**
     * @ngdoc function
     * @name list
     * @methodOf c8y.core.service:c8yJsonSchemas
     *
     * @description
     * Gets the list of defined JSON schemas.
     *
     * @param {object} filter Optional filters object.
     *
     * @returns {promise} Returns a promise which resolves to the list of JSON schemas.
     *
     * @example
     * <pre>
     *   c8yJsonSchemas.list()
     *     .then(function (schemas) {
     *       vm.schemas = schemas;
     *     });
     * </pre>
     */
    function list(filter) {
      return c8yInventory.list(_.defaults(filter, defaultListFilter));
    }

    /**
     * @ngdoc function
     * @name detail
     * @methodOf c8y.core.service:c8yJsonSchemas
     *
     * @description
     * Gets the details of selected JSON schema.
     *
     * @param {integer} schemaId Schema's id.
     *
     * @returns {promise} Returns a promise which resolves to schema object.
     *
     * @example
     * <pre>
     *   var schemaId = 1;
     *   c8yJsonSchemas.detail(schemaId)
     *     .then(function (schema) {
     *       vm.schema = schema;
     *   });
     * </pre>
     */
    function detail(schemaId) {
      return c8yInventory
        .detail(schemaId)
        .then(c8yBase.getResData);
    }

    /**
     * @ngdoc function
     * @name save
     * @methodOf c8y.core.service:c8yJsonSchemas
     *
     * @description
     * Creates new or updates existing JSON schema object.
     *
     * @param {object} schema Schema's object.
     *
     * @returns {promise} Returns $http's promise with the response from server.
     *
     * @example
     * This will create a new schema object:
     * <pre>
     *   c8yJsonSchemas.save({
     *     name: 'My property schema',
     *     c8y_JsonSchema: {
     *       type: 'object',
     *       properties: {
     *         myProperty: {
     *           title: 'My property label',
     *           type: 'string'
     *         }
     *       }
     *     }
     *   });
     * </pre>
     *
     * This will update existing schema object:
     * <pre>
     *   c8yJsonSchemas.save({
     *     id: 1,
     *     name: 'Changed my property schema'
     *   });
     * </pre>
     */
    function save(schema) {
      return _.isUndefined(schema.id) ? create(schema) : update(schema);
    }

    /**
     * @ngdoc function
     * @name create
     * @methodOf c8y.core.service:c8yJsonSchemas
     *
     * @description
     * Creates a new schema object in inventory.
     *
     * @param {object} schema Schema's object to store
     *
     * @returns {promise} Returns promise which resolves to created object.
     *
     * @example
     * <pre>
     *   c8yJsonSchemas.create({
     *     name: 'My property schema',
     *     c8y_JsonSchema: {
     *       type: 'object',
     *       properties: {
     *         myProperty: {
     *           title: 'My property label',
     *           type: 'string'
     *         }
     *       }
     *     }
     *   });
     * </pre>
     */
    function create(schema) {
      return c8yInventory.create(_.defaults(schema, defaults));
    }

    /**
     * @ngdoc function
     * @name update
     * @methodOf c8y.core.service:c8yJsonSchemas
     *
     * @description
     * Updates schema object.
     *
     * @param {object} schema Schema object.
     *
     * @returns {promise} Returns promise which resolves to updated object.
     *
     * @example
     * <pre>
     *   var schemaId = 1;
     *   c8yJsonSchemas
     *     .detail(schemaId)
     *     .then(function (schema) {
     *       schema.name = 'New name';
     *       return schema;
     *     })
     *     .then(c8yJsonSchemas.update);
     * </pre>
     */
    function update(schema) {
      return c8yInventory.update(schema);
    }

    /**
     * @ngdoc function
     * @name remove
     * @methodOf c8y.core.service:c8yJsonSchema
     *
     * @description
     * Removes schema.
     *
     * @param {integer|object} schema Schema's id or object.
     *
     * @returns {promise} Returns $http's promise.
     *
     * @example
     * <pre>
     *   var schemaId = 1;
     *   c8yJsonSchema.remove(schemaId);
     * </pre>
     */
    function remove(schema) {
      return c8yInventory.remove(schema);
    }
  }
})();

