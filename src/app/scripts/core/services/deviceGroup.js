/**
 * @ngdoc service
 * @name c8y.core.service:c8yDeviceGroup
 * @requires c8y.core.service:c8yManagedObject
 *
 * @description
 * This service allows for managing device groups.
 */
angular.module('c8y.core')
  .factory('c8yDeviceGroup', ['c8yManagedObject',
  function (c8yManagedObject) {
    'use strict';

    var exports = {},
      deviceGroupType = 'c8y_DeviceGroup';


    function hasDevices (group) {
      return !!group.childAssets.references.length;
    }

    /**
     * @ngdoc function
     * @name list
     * @methodOf c8y.core.service:c8yDeviceGroup
     * 
     * @description
     * Gets the list of device groups.
     * 
     * @param {object} filter Filters object.
     * 
     * @returns {promise} Returns $http's promise with the list of device groups<!-- (see device group object specification {@link http://docs.cumulocity.com/deviceGroup@TODO here})-->.
     * 
     * @example
     * <pre>
     *   c8yDeviceGroup.list().then(function (res) {
     *     $scope.groups = res.data.managedObjects;
     *   });
     * </pre>
     */
    exports.list = function list(filter) {
      var _filter = {
        type: deviceGroupType,
        pageSize: 10000
      };

      if (angular.isObject(filter)) {
        _filter = angular.extend(_filter, filter);
      }
      return c8yManagedObject.list(_filter);
    };

    /**
     * @ngdoc function
     * @name detail
     * @methodOf c8y.core.service:c8yDeviceGroup
     * 
     * @description
     * Gets details of a device group.
     * 
     * @param {integer} id Device group's id.
     * 
     * @returns {promise} Returns $http's promise.<!-- See response's `data` object specification {@link http://docs.cumulocity.com/deviceGroup@TODO here}.-->
     * 
     * @example
     * <pre>
     *   var groupId = 1;
     *   c8yDeviceGroup.detail(groupId).then(function (res) {
     *     $scope.group = res.data;
     *   });
     * </pre>
     */
    exports.detail = function detail(id) {
      return c8yManagedObject.detail(id);
    };

    /**
     * @ngdoc function
     * @name create
     * @methodOf c8y.core.service:c8yDeviceGroup
     * 
     * @description
     * Creates a new device group.
     * 
     * @param {object} data Device group object<!-- (see specification {@link http://docs.cumulocity.com/deviceGroup@TODO here})-->.
     * 
     * @returns {promise} Returns $http's promise.
     * 
     * @example
     * <pre>
     *   var group = {
     *     name: 'Test Group',
     *     owner: 'admin',
     *     type: 'c8y_DeviceGroup'
     *   };
     *   c8yDeviceGroup.create(group);
     * </pre>
     */
    exports.create = function create(data) {
      data.type = deviceGroupType;
      return c8yManagedObject.create(data);
    };

    /**
     * @ngdoc function
     * @name remove
     * @methodOf c8y.core.service:c8yDeviceGroup
     * 
     * @description
     * Removes device group.
     * 
     * @param {object} data Device group object<!-- (see specification {@link http://docs.cumulocity.com/deviceGroup@TODO here})-->.
     * 
     * @returns {promise|boolean} Returns $http's promise or false if group has got devices.
     * 
     * @example
     * <pre>
     *   var deviceGroupId = 1;
     *   c8yDeviceGroup.detail(deviceGroupId).then(function (res) {
     *     var deviceGroup = res.data;
     *     c8yDeviceGroup.remove(deviceGroup);
     *   });
     * </pre>
     */
    exports.remove = function remove(data) {
      if (hasDevices(data)) {
        return false;
      }
      return c8yManagedObject.remove(data);
    };

    /**
     * @ngdoc function
     * @name addDevice
     * @methodOf c8y.core.service:c8yDeviceGroup
     * 
     * @description
     * Adds a device to device group.
     * 
     * @param {object} group Device group object<!-- (see specification {@link http://docs.cumulocity.com/deviceGroup@TODO here})-->.
     * @param {object} device Device object<!-- (see specification {@link http://docs.cumulocity.com/device@TODO here})-->.
     * 
     * @returns {promise} Returns $http's promise.
     * 
     * @example
     * <pre>
     *   var deviceGroupId = 1;
     *   var deviceId = 1;
     *   c8yDeviceGroup.detail(deviceGroupId).then(function (res) {
     *     var deviceGroup = res.data;
     *     c8yDevices.detail(deviceId).then(function (res) {
     *       var device = res.data;
     *       c8yDeviceGroup.addDevice(deviceGroup, device);
     *     });
     *   });
     * </pre>
     */
    exports.addDevice = function addDevice(group, device) {
      device.c8y_Groups = angular.isArray(device.c8y_Groups) ? device.c8y_Groups : [];
      device.c8y_Groups.push({
        name: group.name,
        id: group.id
      });
      c8yManagedObject.update(device.id, {c8y_Groups: device.c8y_Groups});
      return c8yManagedObject.addChildAsset(group, device);
    };

    /**
     * @ngdoc function
     * @name removeDevice
     * @methodOf c8y.core.service:c8yDeviceGroup
     * 
     * @description
     * Removes a device from device group.
     * 
     * @param {object} group Device group object<!-- (see specification {@link http://docs.cumulocity.com/deviceGroup@TODO here})-->.
     * @param {object} device Device object<!-- (see specification {@link http://docs.cumulocity.com/device@TODO here})-->.
     * 
     * @returns {promise} Returns $http's promise.
     * 
     * @example
     * <pre>
     *   var deviceGroupId = 1;
     *   var deviceId = 1;
     *   c8yDeviceGroup.detail(deviceGroupId).then(function (res) {
     *     var deviceGroup = res.data;
     *     c8yDevices.detail(deviceId).then(function (res) {
     *       var device = res.data;
     *       c8yDeviceGroup.removeDevice(device);
     *     });
     *   });
     * </pre>
     */
    exports.removeDevice = function removeDevice(group, device) {
      device.c8y_Groups = device.c8y_Groups.filter(function (g) {
        return g.id !== group.id;
      });
      c8yManagedObject.update(device.id, {c8y_Groups: device.c8y_Groups});
      return c8yManagedObject.removeChildAsset(group, device);
    };

    return exports;

  }]);
