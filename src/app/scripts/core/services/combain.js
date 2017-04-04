/**
 * @ngdoc service
 * @name c8y.core.service:c8yCombain
 * @requires c8y.core.service:c8yApplication
 *
 * @description
 * This service handles interaction with the Combain service (GSM tower info to GPS data).
 */
(function () {
  'use strict';

  angular.module('c8y.core')
    .factory('c8yCombain', c8yCombain);
    
  /* @ngInject */
  function c8yCombain(
    c8yApplication
  ) {
    var service = {
      gsmTrackingAvailable: gsmTrackingAvailable
    };
    return service;
    
    /**
     * @ngdoc function
     * @name gsmTrackingAvailable
     * @methodOf c8y.core.service:c8yCombain
     *
     * @description
     * Checks if the GSM tracking functionality is available for this device.
     * It checks for 2 things:
     * * is the Combain functionality activated
     * * is this device providing GSM data (so if it has the c8y_CellInfo or c8y_Mobile fragment).
     *
     * @param {object} device device managed object
     *
     * @returns {promise} Returns promise that, once resolves, returns the status (boolean).
     *
     * @example
     * <pre>
     *   c8yCombain.gsmTrackingAvailable(device)
     *     .then(function(status) {
     *       showTrackingOptions = status;
     *     });
     * </pre>
     */
    function gsmTrackingAvailable(device) {
      return c8yApplication.listByUser()
      .then(function (apps) {
        if (!_.find(apps, {key: 'combain-application-key'})) {
          return false;
        }
        return !!(device.c8y_CellInfo || device.c8y_Mobile);
      });
    }
  }
}());
