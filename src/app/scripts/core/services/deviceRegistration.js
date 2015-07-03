/**
 * @ngdoc service
 * @name c8y.core.service:c8yDeviceRegistration
 * @requires c8y.core.service:c8yBase
 * @requires $http
 *
 * @description
 * This service allows for managing device registrations.
 */
angular.module('c8y.core')
.factory('c8yDeviceRegistration', ['$http', 'c8yBase',
function ($http, c8yBase) {
  'use strict';

  var clean = c8yBase.cleanFields,
    path = 'devicecontrol/newDeviceRequests',
    defaultConfig = {
      headers: c8yBase.contentHeaders('newDeviceRequest')
    },
    /**
     * @ngdoc property
     * @name status
     * @propertyOf c8y.core.service:c8yDeviceRegistration
     * @returns {object} Device registration statuses map. Available values are:
     * 
     * - **WAITING_FOR_CONNECTION** – Device registration is waiting for a device to connect.
     * - **PENDING_ACCEPTANCE** - Device registration is waiting for a user to accept registration.
     * - **ACCEPTED** - Device registration has been accepted.
     * 
     * @example
     * <pre>
     *   $scope.selectedStatus = c8yDeviceRegistration.status.PENDING_ACCEPTANCE;
     * </pre>
     */
    status = {
      WAITING_FOR_CONNECTION: 'WAITING_FOR_CONNECTION',
      PENDING_ACCEPTANCE: 'PENDING_ACCEPTANCE',
      ACCEPTED: 'ACCEPTED'
    },
    /**
     * @ngdoc property
     * @name statusList
     * @propertyOf c8y.core.service:c8yDeviceRegistration
     * @returns {object} The list of available device registration statuses.
     * 
     * @example
     * <pre>
     *   $scope.deviceRegistrationStatuses = c8yDeviceRegistration.statusList;
     * </pre>
     */
    statusList = Object.keys(status),
    cleanKeys = [],
    reservedKeys = [],
    style = {};

  style[status.WAITING_FOR_CONNECTION] = {
    icon: 'unlink',
    cls: 'text-danger'
  };
  style[status.PENDING_ACCEPTANCE] = {
    icon: 'circle',
    cls: 'text-info'
  };
  style[status.ACCEPTED] = {
    icon: 'check-circle',
    cls: 'text-success'
  };

  function buildDetailUrl(device) {
    var id = device.id || device;
    return c8yBase.url(path + '/' + id);
  }

  /**
   * @ngdoc function
   * @name list
   * @methodOf c8y.core.service:c8yDeviceRegistration
   * 
   * @description
   * Gets the list of current device registrations.
   * 
   * @param {object} filters Object containing filters for querying registrations.
   * 
   * @returns {promise} Returns promise with the list of registrations. <!--See device registration object's specification {@link http://docs.cumulocity.com/newDeviceRequests@TODO here}.-->
   * 
   * @example
   * <pre>
   *   c8yDeviceRegistration.list().then(function (deviceRegistrations) {
   *     $scope.deviceRegistrations = deviceRegistrations;
   *   });
   * </pre>
   */
  function list(filters) {
    var url = c8yBase.url(path),
       _filters = c8yBase.pageSizeFilter(filters),
      cfg = {
        params: _filters
      },
      onList = c8yBase.cleanListCallback('newDeviceRequests', list, _filters);
    return $http.get(url, cfg).then(onList);
  }

  /**
   * @ngdoc function
   * @name detail
   * @methodOf c8y.core.service:c8yDeviceRegistration
   * 
   * @description
   * Gets the details of selected device registration.
   * 
   * @param {integer|object} devReg Device registration's id or device registration object.
   * 
   * @returns {promise} Returns $http's promise with response from server containing device registration details.
   * 
   * @example
   * <pre>
   *   var devRegId = 1;
   *   c8yDeviceRegistration.detail(devRegId).then(function (res) {
   *     $scope.deviceRegistration = res.data;
   *   });
   * </pre>
   */
  function detail(devReg) {
    var url = buildDetailUrl(devReg);
    return $http.get(url);
  }

  /**
   * @ngdoc function
   * @name create
   * @methodOf c8y.core.service:c8yDeviceRegistration
   * 
   * @description
   * Creates a new device registration.
   * 
   * @param {object} device New device object with id property.
   * 
   * @returns {promise} Returns $http's promise after posting new device registration data.
   * 
   * @example
   * <pre>
   *   var newDevice = {
   *     id: 'NEW-DEVICE-IMEI'
   *   };
   *   c8yDeviceRegistration.create(newDevice);
   * </pre>
   */
  function create(device) {
    var url = c8yBase.url(path),
      data = clean(device, cleanKeys),
      cfg = angular.copy(defaultConfig);


    if (!data.id) {
      throw new Error('c8yDeviceRegistration: data must have an id property');
    }

    return $http.post(url, data, cfg);
  }

  /**
   * @ngdoc function
   * @name accept
   * @methodOf c8y.core.service:c8yDeviceRegistration
   * 
   * @description
   * Accepts pending device registration request.
   * 
   * @param {object} device Device registration object.<!-- See object's specification {@link http://docs.cumulocity.com/newDeviceRequest@TODO here}.-->
   * 
   * @returns {promise} Returns $http's promise after updating device registration data.
   * 
   * @example
   * This example will accept all pending device registrations:
   * <pre>
   *   c8yDeviceRegistration.list().then(function (deviceRegistrations) {
   *     angular.forEach(deviceRegistrations.filter(function (devReg) {
   *       return (devReg.status === c8yDeviceRegistration.status.PENDING_ACCEPTANCE);
   *     }), function (devReg) {
   *       c8yDeviceRegistration.accept(devReg);
   *     });
   *   });
   * </pre>
   */
  function accept(device) {
    var url = buildDetailUrl(device),
      data = {status: status.ACCEPTED},
      cfg = angular.copy(defaultConfig);

    return $http.put(url, data, cfg);
  }

  /**
   * @ngdoc function
   * @name cancel
   * @methodOf c8y.core.service:c8yDeviceRegistration
   * 
   * @description
   * Cancels device registration.
   * 
   * @param {object} devReg Device registration object.<!-- See object's specification {@link http://docs.cumulocity.com/newDeviceRequest@TODO here}.-->
   * 
   * @returns {promise} Returns $http's promise after deleting device registration.
   * 
   * @example
   * This example will cancel all pending device registrations:
   * <pre>
   *   c8yDeviceRegistration.list().then(function (deviceRegistrations) {
   *     angular.forEach(deviceRegistrations.filter(function (devReg) {
   *       return (devReg.status === c8yDeviceRegistration.status.PENDING_ACCEPTANCE);
   *     }), function (devReg) {
   *       c8yDeviceRegistration.cancel(devReg);
   *     });
   *   });
   * </pre>
   */
  function cancel(devReg) {
    var url = buildDetailUrl(devReg);
    return $http.delete(url);
  }

  /**
   * @ngdoc function
   * @name getStyle
   * @methodOf c8y.core.service:c8yDeviceRegistration
   * 
   * @description
   * Gets styling settings for device registration depending on its status.
   * 
   * @param {object} devReg Device registration object<!-- (see specification {@link http://docs.cumulocity.com/newDeviceRequest@TODO here})-->.
   * 
   * @returns {object} Returns object with the following properties:
   * 
   * - **icon** - `string` - icon name,
   * - **cls** - `string` - CSS class name.
   * 
   * @example
   * Controller:
   * <pre>
   *   $scope.ico = function (devReg) {
   *     return c8yDeviceRegistration.getStyle(devReg).icon;
   *   };
   *   $scope.cls = function (devReg) {
   *     return c8yDeviceRegistration.getStyle(devReg).cls;
   *   };
   * </pre>
   * Template:
   * <pre>
   *   <i c8y-icon="{{ico(devReg)}}" ng-class="cls(devReg)"></i>
   * </pre>
   */
  function getStyle(devReg) {
    var status = (devReg.status || 'UNKNOWN');
    return style[status.toUpperCase()];
  }

  /**
   * @ngdoc function
   * @name newDeviceRequestsStatusIcon
   * @methodOf c8y.core.service:c8yDeviceRegistration
   * 
   * @description
   * Gets icon for device registration object depending on its status.
   * 
   * @param {object} devReg Device registration object<!-- (see specification {@link http://docs.cumulocity.com/newDeviceRequest@TODO here})-->.
   * 
   * @returns {object} Returns icon name.
   * 
   * @example
   * Controller:
   * <pre>
   *   $scope.ico = c8yDeviceRegistration.newDeviceRequestsStatusIcon(devReg);
   * </pre>
   * Template:
   * <pre>
   *   <i c8y-icon="{{ico}}" ng-class="cls(devReg)"></i>
   * </pre>
   */
  function newDeviceRequestsStatusIcon(device) {
    return getStyle(device).icon;
  }

  /**
   * @ngdoc function
   * @name newDeviceRequestsStatusClass
   * @methodOf c8y.core.service:c8yDeviceRegistration
   * 
   * @description
   * Gets CSS class name for device registration object depending on its status.
   * 
   * @param {object} devReg Device registration object<!-- (see specification {@link http://docs.cumulocity.com/newDeviceRequest@TODO here})-->.
   * 
   * @returns {object} Returns CSS class name.
   * 
   * @example
   * Controller:
   * <pre>
   *   $scope.cls = c8yDeviceRegistration.newDeviceRequestsStatusClass(devReg);
   * </pre>
   * Template:
   * <pre>
   *   <span ng-class="cls">(...)</span>
   * </pre>
   */
  function newDeviceRequestsStatusClass(device) {
    return getStyle(device).cls;
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
   * @methodOf c8y.core.service:c8yDeviceRegistration
   * 
   * @description
   * Gets the list of keys from device registration which are not reserved keys.
   * 
   * @param {object} devReg Device registration object.<!-- See object's specification {@link http://docs.cumulocity.com/newDeviceRequest@TODO here}-->.
   * 
   * @returns {array} Returns the array of not reserved keys from device registration object.
   * 
   * @example
   * <pre>
   *   var devRegId = 1;
   *   c8yDeviceRegistration.detail(devRegId).then(function (res) {
   *     var devReg = res.data;
   *     $scope.customKeys = c8yDeviceRegistration.getKeys(devReg);
   *   });
   * </pre>
   */
  function getKeys(devReg) {
    var _devReg = angular.copy(devReg),
      props = Object.keys(_devReg);

    return props.filter(isNotReservedKey);
  }

  return {
    list: list,
    detail: detail,
    create: create,
    accept: accept,
    cancel: cancel,
    status: status,
    statusList: statusList,
    getStyle: getStyle,
    getKeys: getKeys,
    statusIcon: newDeviceRequestsStatusIcon,
    statusClass: newDeviceRequestsStatusClass
  };

}]);
