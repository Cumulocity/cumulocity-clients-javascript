/**
 * @ngdoc service
 * @name c8y.core.service:c8yDeviceStatus
 *
 * @description
 * This service handles the new behaviour of the statuses, both for data sending and push mechanisms.
 */
 angular.module('c8y.core')
 .factory('c8yDeviceStatus', [
   '$filter',
   'c8yBase',
   'gettext',
   'gettextCatalog',
   function (
     $filter,
     c8yBase,
     gettext,
     gettextCatalog
   ) {
   'use strict';
   var availabilityIconMap = {
     sendData: {
       AVAILABLE: {
         icon: 'long-arrow-right',
         class: 'statusOk'
       },
       UNAVAILABLE: {
         icon: 'long-arrow-right',
         class: 'statusNok'
       },
       UNKNOWN:  {
         icon: 'long-arrow-right',
         class: 'statusUnknown'
       },
       NOT_MONITORED:  {
         icon: 'long-arrow-right',
         class: 'statusUnknown'
       }
     },
     push: {
       CONNECTED: {
         icon: 'long-arrow-left',
         class: 'statusOk'
       },
       DISCONNECTED: {
         icon: 'long-arrow-left',
         class: 'statusUnknown'
       },
       UNKNOWN: {
         icon: 'long-arrow-left',
         class: 'statusUnknown'
       }
     },
     device: {
       MAINTENANCE: {
         icon: 'wrench',
         class: 'statusAlert'
       }
     }
   };

   /**
    * @ngdoc function
    * @name status
    * @methodOf c8y.core.service:c8yDeviceStatus
    *
    * @description
    * provides the send data, push and maintenance status of the device.
    *
    * @param {Object} device Device object.<!-- See object's specification {@link http://docs.cumulocity.com/device@TODO here}.-->
    *
    * @returns {Object} Returns an object with the following format:
    *                   if the device is under maitenance:
    *                   {
    *                      sendStatus: false,
    *                      pushStatus: false,
    *                      maintenanceStatus: {
    *                        icon: iconName,
    *                        class: className,
    *                        tooltip: tooltipText
    *                      },
    *                    }
    *
    *                   if the device is no under maitenance:
    *                   {
    *                      sendStatus: {
    *                        icon: iconName,
    *                        class: className,
    *                        tooltip: tooltipText
    *                      },
    *                      pushStatus: {
    *                        icon: iconName,
    *                        class: className,
    *                        tooltip: tooltipText
    *                      },
    *                      maintenanceStatus: false
    *                    }
    */
   function status(device) {
     var requiredAvailability = device && device.c8y_RequiredAvailability,
         availabilityStatus = availabilityFor(device);

     if (availabilityStatus === 'MAINTENANCE' ) {
       var statuses = {
         sendStatus: false,
         pushStatus: false,
         maintenanceStatus: {
           icon: availabilityIconMap.device.MAINTENANCE.icon,
           class: availabilityIconMap.device.MAINTENANCE.class,
           tooltip: getMaintenanceTooltip(device)
         }
       };
     } else {
       var sendStatus = availabilityStatus || (requiredAvailability?('UNKNOWN'):('NOT_MONITORED'));
       var pushStatus =  device && device.c8y_Connection && device.c8y_Connection.status || 'UNKNOWN';
       var statuses = {
         sendStatus: {
           icon: availabilityIconMap.sendData[sendStatus].icon,
           class: availabilityIconMap.sendData[sendStatus].class,
           status: sendStatus,
           tooltip: getSendStatusTooltip(device)
         },
         pushStatus: {
           icon: availabilityIconMap.push[pushStatus].icon,
           class: availabilityIconMap.push[pushStatus].class,
           status: pushStatus,
           tooltip: getPushStatusTooltip(device, pushStatus === 'CONNECTED')
         },
         maintenanceStatus: false
       };
     }
     return statuses;
   }

   /**
    * @ngdoc function
    * @name getSendStatusTooltip
    * @methodOf c8y.core.service:c8yDeviceStatus
    *
    * @description
    * Gets the send message availability tooltip for a device.
    *
    * @param {Object} device Device object.<!-- See object's specification {@link http://docs.cumulocity.com/device@TODO here}.-->
    *
    * @returns {string} Returns the availability tooltip for a device.
    */
   function getSendStatusTooltip(device) {
     var availability = device && device.c8y_Availability;
     var lastMessage = availability && availability.lastMessage;
     if (lastMessage) {
        return gettextCatalog.getString('Last request from device to server:<br>{{date}}', {date: $filter('absoluteDate')(lastMessage)});
     } else {
       return gettext('Connection not monitored');
     }
   }


  /**
   * @ngdoc function
   * @name getPushStatusTooltip
   * @methodOf c8y.core.service:c8yDeviceStatus
   *
   * @description
   * Gets the push mechanism tooltip for a device.
   *
   * @param {Object} device Device object.<!-- See object's specification {@link http://docs.cumulocity.com/device@TODO here}.-->
   * @param {boolean} isActive is true if the push mechanism is currently active, false otherwise.
   *
   * @returns {string} Returns the push mechanism tooltip for a device.
   */
  function getPushStatusTooltip(device, isActive) {
    return isActive ? gettext('Push connection: active') : gettext('Push connection: inactive');
  }


  /**
   * @ngdoc function
   * @name getMaintenanceTooltip
   * @methodOf c8y.core.service:c8yDeviceStatus
   *
   * @description
   * Gets the maintenance tooltip for a device.
   *
   * @param {Object} device Device object.<!-- See object's specification {@link http://docs.cumulocity.com/device@TODO here}.-->
   *
   * @returns {string} Returns the maintenance tooltip for a device.
   */
  function getMaintenanceTooltip(device) {
    return gettext('Under maintenance');
  }


    /**
     * @ngdoc function
     * @name isDeviceAvailable
     * @methodOf c8y.core.service:c8yDeviceStatus
     *
     * @description
     * Returns whether a given is currently available or not.
     *
     * @param {Object} device Device object.<!-- See object's specification {@link http://docs.cumulocity.com/device@TODO here}.-->
     *
     * @returns {boolean} Returns true if the device is available, false otherwise.
     */
    function isDeviceAvailable(device) {
      return availabilityFor(device) === 'AVAILABLE';
    }
    /**
     * @ngdoc function
     * @name isDeviceMaintenance
     * @methodOf c8y.core.service:c8yDeviceStatus
     *
     * @description
     * Returns whether a given is currently under maintenance or not.
     *
     * @param {Object} device Device object.<!-- See object's specification {@link http://docs.cumulocity.com/device@TODO here}.-->
     *
     * @returns {boolean} Returns true if the device is under maintenance, false otherwise.
     */
    function isDeviceMaintenance(device) {
      return availabilityFor(device) === 'MAINTENANCE';
    }

    /**
     * @ngdoc function
     * @name availabilityFor
     * @methodOf c8y.core.service:c8yDeviceStatus
     *
     * @description
     * Returns availability status for given device .
     *
     * @param {Object} device Device object.<!-- See object's specification {@link http://docs.cumulocity.com/device@TODO here}.-->
     *
     * @returns {boolean} Returns status string or undefined.
     */
    function availabilityFor(device){
      return device && device.c8y_Availability && device.c8y_Availability.status;
    }

  return {
    status: status,
    isDeviceAvailable: isDeviceAvailable,
    isDeviceMaintenance: isDeviceMaintenance
  }
}]);
