(function () {
  'use strict';

  angular.module('c8y.core')
    .factory('c8yDevices', c8yDevices);

  /* @ngInject */
  /**
   * @ngdoc service
   * @name c8y.core.service:c8yDevices
   * @requires c8y.core.service:c8yInventory
   * @requires $cacheFactory
   *
   * @description
   * This service allows for managing devices.
   */
  function c8yDevices(
    $q,
    $filter,
    $cacheFactory,
    c8yBase,
    c8yUser,
    c8yGroups,
    c8yInventory,
    gettextCatalog
  ) {
    var deviceFragmentType = 'c8y_IsDevice';
    var KEYS_FOR_NODEVICE = [
      'c8y_Dashboard',
      'c8y_Report',
      'c8y_Kpi',
      'c8y_ExportConfiguration',
      'c8y_IsBinary',
      'c8y_NoDevice',
      'c8y_IsDeviceGroup',
      'c8y_Group',
      'com_cumulocity_model_smartrest_SmartRestTemplate',
      'com_cumulocity_model_devicesimulator_SensorTemplate',
      '_attachments'
    ];
    var TYPES_FOR_NO_DEVICE = [
      'c8y_ConfigurationDump',
      'c8y_Firmware',
      'c8y_SmartRule',
      'c8y_Software'
    ];
    var FRAGMENTS_FOR_IP_ADDRESS = [
      'c8y_Network.c8y_LAN.ip',
      'c8y_ModbusDevice.ipAddress'
    ];
    var breadcrumbsCache = {};
    var availabilityIconMap = {
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
      UNKNOWN: {
        icon: 'circle',
        cls: 'statusUnknown'
      },
      NOT_MONITORED: {
        icon: 'circle',
        cls: 'statusUnknown'
      }
    };
    var lastValidMessageIconMap = {
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
      return _.assign({
        skipChildrenNames: true,
        fragmentType: deviceFragmentType
      }, filter || {});
    }

    function createfilter(filterFn) {
      var fn = function (managedObjects) {
        var paging = managedObjects.paging;
        var propertiesToFilter = ['refresh', 'next'];

        _.forEach(propertiesToFilter, function (p) {
          var _p = '__' + p;
          if (!paging[_p] && paging[p]) {
            paging[_p] = paging[p];
            paging[p] = function () {
              return paging[_p]().then(fn);
            };
          }
        });

        var filtered =  managedObjects.filter(filterFn);
        filtered.statistics = managedObjects.statistics;
        filtered.paging = managedObjects.paging;
        return filtered;
      };
      return fn;
    }


    var filterDevices = createfilter(filterDeviceFragment);
    function filterDeviceFragment(mo) {
      return !!mo[deviceFragmentType];
    }

    var filterAllDevices = createfilter(filterNoDevices);
    function filterNoDevices(mo) {
      var keys = KEYS_FOR_NODEVICE;
      var ownerReg = /^device_/;
      var isdevice = filterDeviceFragment(mo) ||
        // ownerReg.test(mo.owner || '') ||
        ((TYPES_FOR_NO_DEVICE.indexOf(mo.type) === -1) &&
        !_.find(keys, function (k) { return !_.isUndefined(mo[k]); }));
      return isdevice;
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
     *     _.forEach(devices, function (device) {
     *       $scope.devices.push(device);
     *     });
     *   });
     * </pre>
     */
    function list(filter) {
      var _filter = buildFilter(filter);
      var http = c8yInventory.list(_filter);

      if (_filter.text) {
        http = http.then(filterDevices);
      }

      return http;
    }

    /**
     * @ngdoc function
     * @name searchIncludingChildDevices
     * @methodOf c8y.core.service:c8yDevices
     *
     * @description
     * Gets a list of all objects that can be a device (include subdevices) and try to exclude any object that's marked as non device
     *
     * @param {filter} object Object filter to send to Server
     * @returns {promise} Returns promise with the list of filtered devices.
     *
     * @example
     * <pre>
     *   c8yDevices.searchIncludingChildDevices('mydevice').then(function (devices) {
     *     $scope.devices = [];
     *     _.forEach(devices, function (device) {
     *       $scope.devices.push(device);
     *     });
     *   });
     * </pre>
     */
    function searchIncludingChildDevices(opt) {
      opt = opt || {};
      var filter = _.omit(buildFilter(opt), ['fragmentType', 'query']);
      var serverCall = opt.query ? c8yInventory.listQuery(opt.query, filter) :
        c8yInventory.list(filter);

      return serverCall.then(filterAllDevices);
    }

    /**
     * @ngdoc function
     * @name create
     * @methodOf c8y.core.service:c8yDevices
     *
     * @description
     * Creates a new device.
     *
     * @param {object} device Device object.
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
      var mo = _.cloneDeep(device);
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
     * @param {object} device Device object.
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
     * @param {object} device Device object.
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
      var ops = device && device.c8y_SupportedOperations;
      var supports = (_.isArray(ops) && (ops.indexOf(operation) > -1));

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
     * @param {object} device Device object.
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
      if (_.isArray(device.c8y_SupportedOperations)) {
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
     * @param {object} device Device object.
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
     * @param {object} device Device object.
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
      var requiredAvailability = device && device.c8y_RequiredAvailability;
      var availability = device && device.c8y_Availability;
      var status = (availability && availability.status) || ((requiredAvailability) ? ('UNKNOWN') : ('NOT_MONITORED'));
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
     * @param {object} device Device object.
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
     * @param {object} device Device object.
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
     * @param {object} device Device object.
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
     * @param {object} device Device object.
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
     * @param {object} device Device object.
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
     * @param {object} device Device object.
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
      if (device.c8y_Availability && device.c8y_Availability.lastMessage && device.c8y_RequiredAvailability && device.c8y_RequiredAvailability.responseInterval) {
        var msInMunute = 60000;
        var now = moment().valueOf();
        var lastMessage = moment(device.c8y_Availability.lastMessage).valueOf();
        var responseInterval = device.c8y_RequiredAvailability.responseInterval * msInMunute;
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
     * @param {object} mo Device object.
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
     * @returns {promise} Returns a promise with server response containing device details.
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
      var _params = _.assign(params || {}, {withParents: true});
      var detailPromise = c8yInventory.detail(mo, _params);
      if (_detailCached.cache) {
        _detailCached.cache.set(mo && (mo.id || mo), detailPromise);
      }
      return detailPromise;
    }

    /**
     * @ngdoc function
     * @name listChildren
     * @methodOf c8y.core.service:c8yDevices
     *
     * @description
     * Gets details of all children for a given device.
     *
     * @param {integer|object} mo Device object's id or device object.
     *
     * @returns {promise} Returns a promise with the array of child devices and assets.
     *
     * @example
     * <pre>
     *   deviceId = 1;
     *   c8yDevices.listChildren(deviceId).then(function (children) {
     *     $scope.childrenNames = _.map(children, 'name');
     *   });
     * </pre>
     */
    function listChildren(mo) {
      var id = mo && mo.id || mo;
      return $q.all([
        c8yInventory.childDevices(id),
        c8yInventory.childAssets(id)
      ]).then(_.flattenDeep);
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
      // Caution: Just have to be careful because this approch will break in future versions of lodash. Leave a comment about this for future reference.
      var moId = moOrId && (moOrId.id || moOrId);
      detail(moId); // updates _detailCached.cache
      return moId;
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
      return !_.isUndefined(mo[deviceFragmentType]);
    }

    function isChildDevice(mo) {
      return mo.deviceParents.references.length > 0;
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
      var prop = isVendme(mo) ? 'com_nsn_startups_vendme_fragments_VendingMachineTypeInfo' : 'c8y_Hardware';
      var hardware = mo && mo[prop];

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
      var prop = isVendme(mo) ? 'com_nsn_startups_vendme_fragments_VendingMachineTypeInfo' : 'c8y_Hardware';
      var prop2 = isVendme(mo) ? 'serial' : 'serialNumber';
      var hardware = mo && mo[prop];

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
      var availability = mo.c8y_Availability;
      var lastMessage = availability && availability.lastMessage &&
          $filter('absoluteDate')(availability.lastMessage);

      return lastMessage ?
        gettextCatalog.getString('Last message: {{date}}', {date: lastMessage}) :
        gettextCatalog.getString('Connection not monitored');
    }

    /**
     * @ngdoc function
     * @name  removeWithUser
     * @methodOf c8y.core.service:c8yDevices
     *
     * @description
     * Removes a device from inventory and checks if the owner is a device user. If it is, delete it too.
     *
     * @param {object|string|number} device Device object or id to be deleted
     *
     * @returns {promise} Returns $http promise.
     */
    function removeWithUser(device) {
      return  detail(device)
        .then(function (res) {
          var device = res.data;
          var owner = device.owner;
          var canBeDevice = device.c8y_IsDevice && owner && owner.match(/^device_/);

          // prevent the removal of the user for now.
          canBeDevice = false;

          return canBeDevice ? c8yUser.detail(owner).then(function (res) {
            var user = res.data;
            var groups = c8yUser.groups(user);
            var isDevice = _.find(groups, {name: 'devices'});

            return  isDevice ? c8yUser.remove(user) : c8yUser;
          }) : device;
        })
        .then(function () {
          return c8yInventory.remove(device);
        });
    }

    /**
     * @ngdoc function
     * @name properName
     * @methodOf c8y.core.service:c8yDevices
     *
     * @description
     * Creates a display-friendly string for identifying a device. If name of device is not defined, it
     * falls back to id. If id is not defined either, returns a string specifying that device has no
     * name;
     *
     * @param  {object} device Device object
     * @returns {string} Display-friendly name for the device.
     */
    function properName(device) {
      var paths = ['name', 'id'];
      return (_.find(_.at(device, paths)) ||
        gettextCatalog.getString('<no name>')) + '';
    }

    /**
     * @ngdoc function
     * @name getIPAddress
     * @methodOf c8y.core.service:c8yDevices
     *
     * @description
     * Gets device's IP address from one of the known fragments:
     * - c8y_Network.c8y_LAN.ip
     * - c8y_ModbusDevice.ipAddress
     *
     * @param  {object} device Device object
     * @returns {string} Display-friendly name for the device.
     */
    function getIPAddress(device) {
      return _.find(_.at(device, FRAGMENTS_FOR_IP_ADDRESS));
    }

    function getChildren(device) {
      var childAssets = device.childAssets ? device.childAssets.references : [];
      var childDevices = device.childDevices ? device.childDevices.references : [];
      var promiseArray = _.map(
        _.uniqBy(
          _.union(
            childAssets,
            childDevices
          ), 'id'
        ), function (child) {
          return detail(child.managedObject.id);
        }
      );
      return $q.all(promiseArray)
        .then(function (responses) {
          return _.map(responses, function (response) {
            return response.data;
          });
        });
    }

    function canSwitchResponseInterval(device) {
      return device &&
        device.c8y_RequiredAvailability &&
        device.c8y_RequiredAvailability.responseInterval &&
        parseInt(device.c8y_RequiredAvailability.responseInterval, 10) !== 0;
    }

    function switchResponseInterval(device) {
      var mo = {id: device.id, c8y_RequiredAvailability: {}};
      if (canSwitchResponseInterval(device)) {
        mo.c8y_RequiredAvailability.responseInterval = -device.c8y_RequiredAvailability.responseInterval;
      }
      return c8yInventory.update(mo);
    }

    function getBreadcrumbsData(device) {

      function collectBreadcrumbs(breadcrumbs, path, item) {
        if (item) {
          path.unshift(getBreadcrumb(item));
          return $q.all([
            c8yInventory.directParentDevices(item),
            c8yInventory.directParentAssets(item)
          ]).then(function (results) {
            var parents = [].concat(results[0]).concat(results[1]);
            if (parents.length === 0) {
              breadcrumbs.push(path);
              return $q.when(breadcrumbs);
            } else {
              var promises = [];
              _.forEach(parents, function (parent) {
                promises.push(c8yInventory.detail(parent.id, {withParents: true}).then(c8yBase.getResData).then(function (p) {
                  return $q.when(collectBreadcrumbs(breadcrumbs, _.cloneDeep(path), p));
                }));
              });
              return $q.all(promises).then(function () {
                return breadcrumbs;
              });
            }
          });
        } else {
          return $q.when(breadcrumbs);
        }
      }

      function getBreadcrumb(item) {
        return {
          label: item.name || 'Device ' + item.id,
          path: getBreadcrumbPath(item),
          icon: getBreadcrumbIcon(item),
          isDevice: isDevice(item),
          isGroup: c8yGroups.isGroup(item),
          id: item.id
        };
      }

      function getBreadcrumbPath(item) {
        var path = '#/';
        path += isDevice(item) ? 'device' : 'group';
        return path + '/' + item.id;
      }

      function getBreadcrumbIcon(item) {
        return isDevice(item) ? 'hdd-o' : 'folder-open';
      }

      function filterBreadcrumbPaths(breadcrumbPaths) {
        return _.filter(breadcrumbPaths, function (path) {
          return _.some(_.without(path, path[path.length - 1]), function (breadcrumb) {
            return breadcrumb.isDevice || breadcrumb.isGroup;
          });
        });
      }

      function orderBreadcrumbPaths(breadcrumbPaths) {
        return _.sortBy(breadcrumbPaths, function (item) {
          return -1 * item.length;
        });
      }

      var deviceId = device ? (device.id || device) : undefined;
      var breadcrumbsPromise = null;

      if (deviceId) {
        if (breadcrumbsCache[deviceId]) {
          breadcrumbsPromise = $q.when(breadcrumbsCache[deviceId]);
        }
        var refreshedBreadcrumbsPromise = _detailCached(deviceId)
          .then(c8yBase.getResData)
          .then(function (currentDevice) {
            return collectBreadcrumbs([], [], currentDevice)
              .then(function (breadcrumbs) {
                breadcrumbs = filterBreadcrumbPaths(breadcrumbs);
                breadcrumbs = orderBreadcrumbPaths(breadcrumbs);
                breadcrumbsCache[deviceId] = breadcrumbs;
                return breadcrumbs;
              });
          });
        breadcrumbsPromise = breadcrumbsPromise || refreshedBreadcrumbsPromise;
      }

      return breadcrumbsPromise || $q.when([]);
    }

    return _.assign(_.cloneDeep(c8yInventory), {
      list: list,
      searchIncludingChildDevices: searchIncludingChildDevices,
      save: save,
      update: update,
      detail: detail,
      listChildren: listChildren,
      detailCached: _detailCached,
      create: create,
      removeWithUser: removeWithUser,
      supportsOperation: supportsOperation,
      getSupportedOperations: getSupportedOperations,
      getChildren: getChildren,
      isVendme: isVendme,
      statusIcon: statusIcon,
      statusClass: statusClass,
      parseAvailability: parseAvailability,
      getCount: getCount,
      isDevice: isDevice,
      isChildDevice: isChildDevice,
      model: model,
      serial: serial,
      availabilityTooltip: availabilityTooltip,
      properName: properName,
      getIPAddress: getIPAddress,
      canSwitchResponseInterval: canSwitchResponseInterval,
      switchResponseInterval: switchResponseInterval,
      isLastValidMessage: isLastValidMessage,
      lastValidMessageColor: lastValidMessageColor,
      lastValidMessageTooltip: lastValidMessageTooltip,
      lastValidMessageIcon: lastValidMessageIcon,
      getBreadcrumbsData: getBreadcrumbsData,
      isProbablyDevice: filterNoDevices
    });
  }
})();
