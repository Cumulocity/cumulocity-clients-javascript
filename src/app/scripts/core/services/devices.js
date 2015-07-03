/**
 * @ngdoc service
 * @name c8y.core.service:c8yDevices
 * @requires c8y.core.service:c8yInventory
 * @requires $cacheFactory
 *
 * @description
 * This service allows for managing devices.
 */
angular.module('c8y.core')
.factory('c8yDevices', ['$cacheFactory', '$filter', 'c8yInventory', 'c8yUser',
function ($cacheFactory, $filter, c8yInventory, c8yUser) {
  'use strict';

  var deviceFragmentType = 'c8y_IsDevice',
    availabilityIconMap = {
    CONNECTED: {
      icon: 'exchange',
      cls: 'statusOk'
    },
    AVAILABLE: {
      icon: 'check-circle',
      cls: 'statusOk'
    },
    MAINTENANCE: {
      icon: 'wrench',
      cls: 'statusAlert'
    },
    UNAVAILABLE: {
      icon: 'exclamation-circle',
      cls: 'statusNok'
    },
    UNKNOWN:  {
      icon: 'circle',
      cls: 'statusUnknown'
    },
    NOT_MONITORED:  {
      icon: 'circle',
      cls: 'statusUnknown'
    }
  },
  lastValidMessageIconMap = {
    true: {
      icon: 'check-circle',
      color: 'green',
      tooltipText: 'Valid'
    },
    false: {
      icon: 'exclamation-circle',
      color: 'red',
      tooltipText: 'Invalid'
    },
    null: {
      icon: 'circle',
      color: '#f3f3f3',
      tooltipText: 'Unknown'
    }
  };


  function buildFilter(filter) {
    return angular.extend({
      skipChildrenNames: true,
      fragmentType: deviceFragmentType
    }, filter || {});
  }

  function filterDevices(managedObjects) {
    var filtered =  managedObjects.filter(function (mo) {
      return mo[deviceFragmentType];
    });
    filtered.statistics = managedObjects.statistics;
    filtered.paging = managedObjects.paging;
    return filtered;
  }

  /**
   * @ngdoc function
   * @name list
   * @methodOf c8y.core.service:c8yDevices
   *
   * @description
   * Gets the list of devices for given filters.
   *
   * @param {object} filter Object containing filters for querying devices.
   * @returns {promise} Returns promise with the list of filtered devices.
   *
   * @example
   * <pre>
   *   c8yDevices.list().then(function (devices) {
   *     $scope.devices = [];
   *     angular.forEach(devices, function (device) {
   *       $scope.devices.push(device);
   *     });
   *   });
   * </pre>
   */
  function list(filter) {
    var _filter = buildFilter(filter),
      http = c8yInventory.list(_filter);

    if (_filter.text) {
      http = http.then(filterDevices);
    }

    return http;
  }

  /**
   * @ngdoc function
   * @name create
   * @methodOf c8y.core.service:c8yDevices
   *
   * @description
   * Creates a new device.
   *
   * @param {object} device Device object<!-- (see specification {@link http://docs.cumulocity.com/device@TODO here})-->.
   *
   * @example
   * <pre>
   *   c8yDevices.create({
   *     type: 'CustomDevice',
   *     name: 'My Device',
   *     customProperty: 'value123'
   *   });
   * </pre>
   */
  function create(device) {
    var mo = angular.copy(device);
    mo[deviceFragmentType] = true;
    c8yInventory.create(mo);
  }

  /**
   * @ngdoc function
   * @name save
   * @methodOf c8y.core.service:c8yDevices
   *
   * @description
   * Creates device if it doesn't exist. Otherwise, updates existing one.
   *
   * @param {object} device Device object<!-- (see specification {@link http://docs.cumulocity.com/device@TODO here})-->.
   *
   * @returns {promise} Returns $http's promise with the response from server.
   *
   * @example
   * This will create a new device:
   * <pre>
   *   c8yDevices.save({
   *     type: 'CustomDeviceType',
   *     name: 'My Device'
   *   });
   * </pre>
   * This will update existing measurement:
   * <pre>
   *   c8yDevices.save({
   *     id: 3,
   *     name: 'My Renamed Device'
   *   });
   * </pre>
   */
  function save(device) {
    return device.id ? update(device) : create(device);
  }

  /**
   * @ngdoc function
   * @name supportsOperation
   * @methodOf c8y.core.service:c8yDevices
   *
   * @description
   * Checks if given operation is supported by the device.
   *
   * @param {object} device Device object<!-- (see specification {@link http://docs.cumulocity.com/device@TODO here})-->.
   * @param {string} operation Operation name to be checked.
   *
   * @returns {boolean} Returns boolean value indicating whether operation is supported or not.
   *
   * @example
   * <pre>
   *   var deviceId = 1;
   *   var operation = 'c8y_Restart';
   *   c8yDevices.detail(deviceId).then(function (res) {
   *     var device = res.data;
   *     $scope.restartSupported = c8yDevices.supportsOperation(device, operation);
   *   });
   * </pre>
   */
  function supportsOperation(device, operation) {
    var ops = device && device.c8y_SupportedOperations,
      supports = (angular.isArray(ops) && (ops.indexOf(operation) > -1));

    return !!supports;
  }

  /**
   * @ngdoc function
   * @name getSupportedOperations
   * @methodOf c8y.core.service:c8yDevices
   *
   * @description
   * Gets the list of supported operations for a device.
   *
   * @param {object} device Device object<!-- (see specification {@link http://docs.cumulocity.com/device@TODO here})-->.
   *
   * @returns {array} Returns the list of supported operations.
   *
   * @example
   * <pre>
   *   var deviceId = 1;
   *   c8yDevices.detail(deviceId).then(function (res) {
   *     var device = res.data;
   *     $scope.supportedOperations = c8yDevices.getSupportedOperations(device);
   *   });
   * </pre>
   */
  function getSupportedOperations(device) {
    var ops = [];
    if (angular.isArray(device.c8y_SupportedOperations)) {
      ops = device.c8y_SupportedOperations;
    }
    return ops;
  }

  /**
   * @ngdoc function
   * @name isVendme
   * @methodOf c8y.core.service:c8yDevices
   *
   * @description
   * Checks if given device is VendMe vending machine.
   *
   * @param {object} device Device object<!-- (see specification {@link http://docs.cumulocity.com/device@TODO here})-->.
   *
   * @returns {boolean} Returns boolean value indicating whether device is a vending machine or not.
   *
   * @example
   * <pre>
   *   var deviceId = 1;
   *   c8yDevices.detail(deviceId).then(function (res) {
   *     var device = res.data;
   *     $scope.isVendme = c8yDevices.isVendme(device);
   *   });
   * </pre>
   */
  function isVendme(device) {
    return device.type === 'com_nsn_startups_vendme_VendingMachine';
  }

  /**
   * @ngdoc function
   * @name parseAvailability
   * @methodOf c8y.core.service:c8yDevices
   *
   * @description
   * Gets availability status for a device taking its required availability setting into account.
   *
   * @param {object} device Device object.<!-- See object's specification {@link http://docs.cumulocity.com/device@TODO here}.-->
   *
   * @returns {string} Returns device availability status.
   *
   * @example
   * Controller:
   * <pre>
   *   $scope.parseAvailability = c8yDevices.parseAvailability;
   *   c8yDevices.list().then(function (devices) {
   *     $scope.devices = devices;
   *   });
   * </pre>
   * Template:
   * <pre>
   *   <div ng-repeat="device in devices">
   *     <span>Availability Status: {{parseAvailability(device)}}</span>
   *   </div>
   * </pre>
   */
  function parseAvailability(device) {
    var requiredAvailability = device && device.c8y_RequiredAvailability,
      availability = device && device.c8y_Availability,
      status = (availability && availability.status) || ((requiredAvailability)?('UNKNOWN'):('NOT_MONITORED'));
    return status;
  }

  /**
   * @ngdoc function
   * @name statusIcon
   * @methodOf c8y.core.service:c8yDevices
   *
   * @description
   * Gets icon name for a device depending on its status.
   *
   * @param {object} device Device object.<!-- See object's specification {@link http://docs.cumulocity.com/device@TODO here}.-->
   *
   * @returns {string} Returns icon name.
   *
   * @example
   * Controller:
   * <pre>
   *   $scope.statusIcon = c8yDevices.statusIcon;
   *   c8yDevices.list().then(function (devices) {
   *     $scope.devices = devices;
   *   });
   * </pre>
   * Template:
   * <pre>
   *   <div ng-repeat="device in devices">
   *     <i c8y-icon="{{statusIcon(device)}}"></i>
   *   </div>
   * </pre>
   */
  function statusIcon(device) {
    return availabilityIconMap[parseAvailability(device)].icon;
  }

  /**
   * @ngdoc function
   * @name statusClass
   * @methodOf c8y.core.service:c8yDevices
   *
   * @description
   * Gets CSS class name for a device depending on its status.
   *
   * @param {object} device Device object.<!-- See object's specification {@link http://docs.cumulocity.com/device@TODO here}.-->
   *
   * @returns {string} Returns CSS class name.
   *
   * @example
   * Controller:
   * <pre>
   *   $scope.statusClass = c8yDevices.statusClass;
   *   c8yDevices.list().then(function (devices) {
   *     $scope.devices = devices;
   *   });
   * </pre>
   * Template:
   * <pre>
   *   <div ng-repeat="device in devices">
   *     <span ng-class="statusClass(device)">{{device.name}}</span>
   *   </div>
   * </pre>
   */
  function statusClass(device) {
    return availabilityIconMap[parseAvailability(device)].cls;
  }

  /**
   * @ngdoc function
   * @name lastValidMessageColor
   * @methodOf c8y.core.service:c8yDevices
   *
   * @description
   * Gets the color of icon for lastValidMessage.
   *
   * @param {object} device Device object.<!-- See object's specification {@link http://docs.cumulocity.com/device@TODO here}.-->
   *
   * @returns {string} Returns color name.
   *
   * @example
   * Controller:
   * <pre>
   *   $scope.lastValidMessageColor = c8yDevices.lastValidMessageColor;
   *   c8yDevices.list().then(function (devices) {
   *     $scope.devices = devices;
   *   });
   * </pre>
   * Template:
   * <pre>
   *   <div ng-repeat="device in devices">
   *     <i data-c8y-icon="{{lastValidMessageIcon(dev)}}" data-ng-style="{'color': lastValidMessageColor(dev)}"></i>
   *   </div>
   * </pre>
   */
  function lastValidMessageColor(device) {
    return lastValidMessageIconMap[isLastValidMessage(device)].color;
  }

  /**
   * @ngdoc function
   * @name lastValidMessageIcon
   * @methodOf c8y.core.service:c8yDevices
   *
   * @description
   * Gets the icon for lastValidMessage.
   *
   * @param {object} device Device object.<!-- See object's specification {@link http://docs.cumulocity.com/device@TODO here}.-->
   *
   * @returns {string} Returns icon name.
   *
   * @example
   * Controller:
   * <pre>
   *   $scope.lastValidMessageColor = c8yDevices.lastValidMessageColor;
   *   c8yDevices.list().then(function (devices) {
   *     $scope.devices = devices;
   *   });
   * </pre>
   * Template:
   * <pre>
   *   <div ng-repeat="device in devices">
   *     <i data-c8y-icon="{{lastValidMessageIcon(dev)}}" data-ng-style="{'color': lastValidMessageColor(dev)}"></i>
   *   </div>
   * </pre>
   */
  function lastValidMessageIcon(device) {
    return lastValidMessageIconMap[isLastValidMessage(device)].icon;
  }

  /**
   * @ngdoc function
   * @name lastValidMessageTooltip
   * @methodOf c8y.core.service:c8yDevices
   *
   * @description
   * Gets the tooltip text for lastValidMessage.
   *
   * @param {object} device Device object.<!-- See object's specification {@link http://docs.cumulocity.com/device@TODO here}.-->
   *
   * @returns {string} Returns tooltip text.
   *
   * @example
   * Controller:
   * <pre>
   *   $scope.lastValidMessageTooltip = c8yDevices.lastValidMessageTooltip;
   *   c8yDevices.list().then(function (devices) {
   *     $scope.devices = devices;
   *   });
   * </pre>
   * Template:
   * <pre>
   *   <div ng-repeat="device in devices">
   *     <span tooltip="{{lastValidMessageTooltip(dev)}}"></i>
   *   </div>
   * </pre>
   */
  function lastValidMessageTooltip(device) {
    return lastValidMessageIconMap[isLastValidMessage(device)].tooltipText;
  }

  /**
   * @ngdoc function
   * @name isLastValidMessage
   * @methodOf c8y.core.service:c8yDevices
   *
   * @description
   * Check if lastMessage is valid.
   *
   * @param {object} device Device object.<!-- See object's specification {@link http://docs.cumulocity.com/device@TODO here}.-->
   *
   * @returns {boolean} Returns true if valid.
   *
   * @example
   * Controller:
   * <pre>
   *   $scope.lastValidMessageColor = c8yDevices.lastValidMessageColor;
   *   c8yDevices.list().then(function (devices) {
   *     $scope.devices = devices;
   *   });
   * </pre>
   */
  function isLastValidMessage(device) {
    if(device.c8y_Availability && device.c8y_Availability.lastMessage && device.c8y_RequiredAvailability && device.c8y_RequiredAvailability.responseInterval) {
      var msInMunute = 60000,
        now = moment().valueOf(),
        lastMessage = moment(device.c8y_Availability.lastMessage).valueOf(),
        responseInterval = device.c8y_RequiredAvailability.responseInterval * msInMunute;
      return now - lastMessage - responseInterval > 0;
    } else {
      return null;
    }
  }

  /**
   * @ngdoc function
   * @name update
   * @methodOf c8y.core.service:c8yDevices
   *
   * @description
   * Updates device data.
   *
   * @param {object} mo Device object.<!-- See object's specification {@link http://docs.cumulocity.com/device@TODO here}.-->
   *
   * @returns {promise} Returns $http's promise with the response from server.
   *
   * @example
   * <pre>
   *   var moId = 1;
   *   c8yDevices.detail(moId).then(function (res) {
   *     var device = res.data;
   *     device.name = 'New Device Name';
   *     return device;
   *   })
   *   .then(c8yDevices.update);
   * </pre>
   */
  function update(mo) {
    removeCache(mo);
    return c8yInventory.update(mo);
  }

  function removeCache(mo) {
    var id = mo && mo.id || mo;
    if (_detailCached.cache) {
      delete _detailCached.cache[id];
    }
  }

  /**
   * @ngdoc function
   * @name detail
   * @methodOf c8y.core.service:c8yDevices
   *
   * @description
   * Gets the details of given device.
   *
   * @param {integer|object} mo Device object's id or device object.
   * @param {object} filters Object containing filters to query devices. Parameter **withParents** is set automatically to `true`.
   *
   * @example
   * <pre>
   *   deviceId = 1;
   *   c8yDevices.detail(deviceId).then(function (res) {
   *     $scope.device = res.data;
   *   });
   * </pre>
   */
  function detail(mo, params) {
    var _params = angular.extend(params || {}, {withParents: true});
    return c8yInventory.detail(mo, _params);
  }

  /**
   * @ngdoc function
   * @name getCount
   * @methodOf c8y.core.service:c8yDevices
   *
   * @description
   * Gets the number of managed object that would be returned by {@link c8y.core.service:c8yDevices#methods_list list} function for given filters.
   *
   * @param {object} filter Filters for counting devices.
   *
   * @returns {promise} Returns promise with item count.
   *
   * @example
   * <pre>
   *   var filters = {
   *     type: 'CustomDeviceType'
   *   };
   *   c8yDevices.getCount(filters).then(function (count) {
   *     $scope.total = count;
   *   });
   * </pre>
   */
  function getCount(filter) {
    var _filter = buildFilter(filter);
    return c8yInventory.getCount(_filter);
  }

  /**
   * @ngdoc function
   * @name detailCached
   * @methodOf c8y.core.service:c8yDevices
   *
   * @description
   * Gets the details of given device using cache.
   *
   * @param {integer|object} device Device object's id or device object.
   *
   * @example
   * <pre>
   *   deviceId = 1;
   *   c8yDevices.detailCached(deviceId).then(function (res) {
   *     $scope.device = res.data;
   *   });
   * </pre>
   */
  var _detailCached = _.memoize(detail, function (moOrId) {
    return moOrId && (moOrId.id || moOrId);
  });

  /**
   * @ngdoc function
   * @name isDevice
   * @methodOf c8y.core.service:c8yDevices
   *
   * @description
   * Checks if given managed object is a device.
   *
   * @param {object} mo Managed object to check.
   *
   * @returns {boolean} Returns true if managed object is a device.
   *
   * @example
   * <pre>
   *   var moId = 1;
   *   c8yInventory.detail(moId).then(function (res) {
   *     $scope.isDevice = c8yDevices.isDevice(res.data);
   *   });
   * </pre>
   */
  function isDevice(mo) {
    return angular.isDefined(mo[deviceFragmentType]);
  }

  /**
   * @ngdoc function
   * @name model
   * @methodOf c8y.core.service:c8yDevices
   *
   * @description
   * Gets the model of a device.
   *
   * @param {object} mo Device object to get model for.
   *
   * @returns {string} Returns the model of a device.
   *
   * @example
   * <pre>
   *   var moId = 1;
   *   c8yInventory.detail(moId).then(function (res) {
   *     $scope.model = c8yDevices.model(res.data);
   *   });
   * </pre>
   */
  function model(mo) {
    var prop = isVendme(mo) ? 'com_nsn_startups_vendme_fragments_VendingMachineTypeInfo' : 'c8y_Hardware',
      hardware = mo && mo[prop];

    return hardware && hardware.model;
  }

  /**
   * @ngdoc function
   * @name serial
   * @methodOf c8y.core.service:c8yDevices
   *
   * @description
   * Gets the serial number of a device.
   *
   * @param {object} mo Device object to get serial number for.
   *
   * @returns {string} Returns the serial number of a device.
   *
   * @example
   * <pre>
   *   var moId = 1;
   *   c8yInventory.detail(moId).then(function (res) {
   *     $scope.serial = c8yDevices.serial(res.data);
   *   });
   * </pre>
   */
  function serial(mo) {
    var prop = isVendme(mo) ? 'com_nsn_startups_vendme_fragments_VendingMachineTypeInfo' : 'c8y_Hardware',
      prop2 = isVendme(mo) ? 'serial' : 'serialNumber',
      hardware = mo && mo[prop];

    return hardware && hardware[prop2];
  }

  /**
   * @ngdoc function
   * @name availabilityTooltip
   * @methodOf c8y.core.service:c8yDevices
   *
   * @description
   * Gets the availability tooltip for a device.
   *
   * @param {object} mo Device object to get availability tooltip for.
   *
   * @returns {string} Returns the availability tooltip for a device.
   *
   * @example
   * <pre>
   *   var moId = 1;
   *   c8yInventory.detail(moId).then(function (res) {
   *     $scope.availabilityTooltip = c8yDevices.availabilityTooltip(res.data);
   *   });
   * </pre>
   */
  function availabilityTooltip(mo) {
    var availability = mo.c8y_Availability,
      lastMessage = availability && $filter('relativeDateShort')(availability.lastMessage);

    return lastMessage ? 'Last Message: ' + lastMessage : 'Connection not monitored';
  }

  /**
   * @ngdoc
   * @name  removeWithUser
   * @methodOf c8y.core.service:c8yDevices
   *
   * @description
   * Removes a device from inventory and checks if the owner is a device user. If it is, delete it too.
   *
   * @params {object|string|number} mo Device object or id to be deleted
   */
  function removeWithUser(device) {
    return  detail(device)
      .then(function (res) {
        var device = res.data,
          owner = device.owner,
          canBeDevice = device.c8y_IsDevice && owner && owner.match(/^device_/);

        //prevent the removal of the user for now.
        canBeDevice = false;

        return canBeDevice ? c8yUser.detail(owner).then(function (res) {
          var user = res.data,
            groups = c8yUser.groups(user),
            isDevice = _.find(groups, {name: 'devices'});

          return  isDevice ? c8yUser.remove(user) : c8yUser;
        }) : device;
      })
      .then(function () {
        c8yInventory.remove(device);
      });
  }

  /**
   * @ngdoc
   * @name  properName
   * @methodOf c8y.core.service:c8yDevices
   *
   * @description
   * Creates a display-friendly string for identifying a device. If name of device is not defined, it
   * falls back to id. If id is not defined either, returns a string specifying that device has no
   * name;
   *
   * @param  {object} mo Device object
   * @return Display-friendly name for the device.
   */
  function properName(device) {
    if(!device) { return; }
    if(device.name) { return device.name; }
    if(device.id) { return '' + device.id; }
    return '<Device has no name>';
  }

  function switchResponseInterval(device) {
    var mo = {id:device.id, c8y_RequiredAvailability: {}};
    if(device.c8y_RequiredAvailability.responseInterval != 0) {
      mo.c8y_RequiredAvailability.responseInterval = -device.c8y_RequiredAvailability.responseInterval;
    }
    return c8yInventory.update(mo);
  }

  return angular.extend(angular.copy(c8yInventory), {
    list: list,
    save: save,
    update: update,
    detail: detail,
    detailCached: _detailCached,
    create: create,
    removeWithUser: removeWithUser,
    supportsOperation: supportsOperation,
    getSupportedOperations: getSupportedOperations,
    isVendme: isVendme,
    statusIcon: statusIcon,
    statusClass: statusClass,
    parseAvailability: parseAvailability,
    getCount: getCount,
    isDevice: isDevice,
    model: model,
    serial: serial,
    availabilityTooltip: availabilityTooltip,
    properName: properName,
    switchResponseInterval: switchResponseInterval,
    isLastValidMessage: isLastValidMessage,
    lastValidMessageColor: lastValidMessageColor,
    lastValidMessageTooltip: lastValidMessageTooltip,
    lastValidMessageIcon: lastValidMessageIcon
  });

}]);
