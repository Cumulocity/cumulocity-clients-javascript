(function() {
  'use strict';
  /**
   * @ngdoc service
   * @name c8y.core.service:c8ySMSGateway
   * @requires $http
   *
   * @description
   * This service handles SMS gateway settings.
   */
  angular.module('c8y.core')
  .factory('c8ySMSGateway', ['$http', '$q', 'c8yAlert', 'c8ySettings', factory]);
  
  function factory ($http, $q, c8yAlert, c8ySettings) {

    /**
     * @ngdoc function
     * @name updateSMSGatewayInfo
     * @methodOf c8y.core.service:c8ySMSGateway
     *
     * @description
     * Creates or updates the SMS gateway settings information.
     *
     * @param {string} username Username.
     * @param {string} password Password
     *
     * @returns {promise} Returns $http's promise with response.
     *
     * @example
     * <pre>
     *   c8ySMSGateway.updateSMSGatewayInfo('username', 'password');
     * </pre>
     */
    function updateSMSGatewayInfo(username, password) {
      return $http.put(
        '/service/register/messaging',
        {
          provider: 'openit',
          'openit.baseUrl': 'https://sms.openit.de/put.php',
          'sms.senderAddress': 'cumulocity',
          'sms.senderName': 'cumulocity',
          'openit.username': username,
          'credentials.openit.password': password
        } 
      );
    }
    
    function getSMSGatewayUsername() {
      return c8ySettings.detail({
          category: 'messaging',
          key: 'openit.username'
        });
    }
    
    function deleteSMSGatewayCredentials() {
      return $q.all([
        c8ySettings.deleteOption({
          category: 'messaging',
          key: 'openit.username'
        }),
        c8ySettings.deleteOption({
          category: 'messaging',
          key: 'credentials.openit.password'
        })
      ]).then(function(response){
        return response;
      });
    }
    return {
      updateSMSGatewayInfo: updateSMSGatewayInfo,
      getSMSGatewayUsername: getSMSGatewayUsername,
      deleteSMSGatewayCredentials: deleteSMSGatewayCredentials
    };

  }
})();
