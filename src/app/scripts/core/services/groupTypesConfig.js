/**
 * @ngdoc service
 * @name c8y.core.service:c8yGroupTypesConfig
 * @requires c8y.core.service:c8yInventory
 * @requires $q
 *
 * @description
 * This service allows for managing configuration for group types hierarchy.
 */
(function () {
  'use strict';

  angular.module('c8y.core')
   .factory('c8yGroupTypesConfig', c8yGroupTypesConfig);

  /* @ngInject */
  function c8yGroupTypesConfig(c8yInventory, $q) {

    var type = 'c8y_GroupTypesConfig';
    var filtersGet = {type: type, pageSize: 1};

    return {
      save: save,
      get: get,
      getLookup: getLookup,
      getDeviceGroupType: getDeviceGroupType,
      getDeviceSubgroupType: getDeviceSubgroupType,
      getEmptyGroupType: getEmptyGroupType
    };

    /**
    * @ngdoc function
    * @name save
    * @methodOf c8y.core.service:c8yGroupTypesConfig
    *
    * @description
    * Saves configuration object in the inventory in the managed object of type `c8y_GroupTypesConfig`.
    *
    * @param {object} config Configuration object. It contains nested group type configuration objects as in the example below:
    * <pre>
    * {
    *   type: 'c8y_GroupTypesConfig',
    *   groups: [{
    *     name: 'Device Group',
    *     namePlural: 'Device Groups',
    *     type: 'c8y_DeviceGroup',
    *     showInNavigator: true,
    *     groups: []
    *   }, {
    *     name: 'Building',
    *     namePlural: 'Buildings',
    *     type: 'management_Building',
    *     showInNavigator: true,
    *     groups: [{
    *       namePlural: 'Floors',
    *       name: 'Floor',
    *       type: 'management_Floor',
    *       showInNavigator: false,
    *       groups: [
    *         ...
    *       ]
    *     }]
    *   }]
    * }
    * </pre>
    *
    * - **name** - `string` - Group type name (singular form).
    * - **namePlural** - `string` - Group type name (plural form).
    * - **type** - `string` - Type of managed objects that should be included in the group type.
    * - **showInNavigator** - `boolean` - Show menu item in navigatoor for exploring given group type.
    * - **groups** - `array` - An array of children groups.
    *
    * @returns {promise} Returns $http's promise.
    *
    * @example
    * <pre>
    *   var groupTypesConfig = {
    *     groups: [{
    *       name: 'Device Group',
    *       namePlural: 'Device Groups',
    *       type: 'c8y_DeviceGroup',
    *       showInNavigator: true,
    *       groups: []
    *     }, {
    *       name: 'Building',
    *       namePlural: 'Buildings',
    *       type: 'management_Building',
    *       showInNavigator: true,
    *       groups: [{
    *         namePlural: 'Floors',
    *         name: 'Floor',
    *         type: 'management_Floor',
    *         showInNavigator: false,
    *         groups: [
    *           ...
    *         ]
    *       }]
    *     }]
    *   };
    *   c8yGroupTypesConfig.save(groupTypesConfig);
    * </pre>
    */
    function save(config) {
      config.type = type;
      return c8yInventory.save(config);
    }

    /**
    * @ngdoc function
    * @name get
    * @methodOf c8y.core.service:c8yGroupTypesConfig
    *
    * @description
    * Gets group types configuration object.
    *
    * @returns {promise} Returns promise with existing configuration object or object with default configuration.
    *
    * @example
    * <pre>
    *   c8yGroupTypesConfig.save().then(function (config) {
    *     $scope.config = config;
    *   });
    * </pre>
    */
    function get() {
      return c8yInventory.list(filtersGet).then(getFirstOrDefault);
    }

    function getFirstOrDefault(configs) {
      return (configs.length > 0) ? (configs[0]) : (getDefault());
    }

    function getDefault() {
      return {
        type: type,
        groups: getDefaultGroupTypes()
      };
    }

    function getDefaultGroupTypes() {
      return [getDeviceGroupType()];
    }

    /**
    * @ngdoc function
    * @name getLookup
    * @methodOf c8y.core.service:c8yGroupTypesConfig
    *
    * @description
    * Gets lookup object with group type as a key and configruation as a value.
    *
    * @param {object} config with the configuration to lookup
    *
    * @returns {promise} Returns promise with lookup object.
    *
    * @example
    * <pre>
    *   c8yGroupTypesConfig.getLookup().then(function (lookup) {
    *     $scope.lookup = lookup;
    *   });
    * </pre>
    */
    function getLookup(config) {
      var configPromise = config ? $q.when(config) : get();
      return configPromise.then(_.partial(getGroupTypesConfigLookup, {}));
    }

    function getGroupTypesConfigLookup(_lookup, config) {
      var lookup = _lookup || {};
      _.forEach(config.groups || {}, function (groupConfig) {
        lookup[groupConfig.type] = groupConfig;
        lookup = getGroupTypesConfigLookup(lookup, groupConfig);
      });
      return lookup;
    }

    /**
    * @ngdoc function
    * @name getDeviceGroupType
    * @methodOf c8y.core.service:c8yGroupTypesConfig
    *
    * @description
    * Gets device group type configuration object.
    *
    * @returns {object} Returns device group type configuration object.
    *
    * @example
    * <pre>
    *   $scope.newGroupTypeObj = c8yGroupTypesConfig.getDeviceGroupType();
    * </pre>
    */
    function getDeviceGroupType() {
      return {
        type: 'c8y_DeviceGroup',
        name: 'Default Group',
        namePlural: 'Default Groups',
        showInNavigator: true,
        groups: []
      };
    }

    /**
    * @ngdoc function
    * @name getDeviceSubgroupType
    * @methodOf c8y.core.service:c8yGroupTypesConfig
    *
    * @description
    * Gets device subgroup type configuration object.
    *
    * @returns {object} Returns device subgroup type configuration object.
    *
    * @example
    * <pre>
    *   $scope.newGroupTypeObj = c8yGroupTypesConfig.getDeviceSubgroupType();
    * </pre>
    */
    function getDeviceSubgroupType() {
      return {
        type: 'c8y_DeviceSubgroup',
        name: 'Default Subgroup',
        namePlural: 'Default Subgroups',
        showInNavigator: false,
        groups: []
      };
    }

    /**
    * @ngdoc function
    * @name getEmptyGroupType
    * @methodOf c8y.core.service:c8yGroupTypesConfig
    *
    * @description
    * Gets empty group type configuration object.
    *
    * @returns {object} Returns empty group type configuration object.
    *
    * @example
    * <pre>
    *   $scope.newGroupTypeObj = c8yGroupTypesConfig.getEmptyGroupType();
    * </pre>
    */
    function getEmptyGroupType() {
      return {
        name: '',
        namePlural: '',
        type: '',
        showInNavigator: false,
        groups: []
      };
    }
  }
}());
