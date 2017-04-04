(function() {
  'use strict';
  /**
   * @ngdoc service
   * @name c8y.core.service:c8yStorageLimitation
   * @requires $http
   *
   * @description
   * This service handles any requests required by the storage limitation feature
   */
  angular.module('c8y.core')
  .factory('c8yStorageLimitation', ['$routeParams', '$q', 'c8ySettings', factory]);
  
  function factory ($routeParams, $q, c8ySettings) {
    
    /**
     * @ngdoc function
     * @name getStorageLimitationEmailData
     * @methodOf c8y.core.service:c8yStorageLimitation
     *
     * @description
     * Get the details of storage limitation warning email.
     *
     * @returns {promise} Returns $http's promise with response from server. Response data object has the following properties:
     *
     * - **group.name** – `{integer}` – the user group that will receive the email.
     * - **threshold.level** – `{integer}` – The percentage of storage / quota to reach before sending the email.
     *
     * @example
     * <pre>
     *  c8yStorageLimitation.getStorageLimitationEmailData({})
     *    .then(function (res) {
     *      $scope.data = {
     *        userGroup: res.data['group.name'],
     *        threshold: res.data['threshold.level']
     *      };
     *    });
     * </pre>
     */
    function getStorageLimitationEmailData() {
      return c8ySettings.detail({
        category: 'storage.limitation'
      });
    }
    /**
     * @ngdoc function
     * @name saveStorageLimitationEmailData
     * @methodOf c8y.core.service:c8yStorageLimitation
     *
     * @description
     * save the settings of the storage limitation warning email.
     *
     * @returns {promise} Returns $http's promise with response from server. Response is empty.
     *
     * @example
     * <pre>
     *  c8yStorageLimitation.saveStorageLimitationEmailData({
     *    'group.name': 'admins',
     *    'threshold.level': 72
     *  }).then(function () {
     *    c8yAlert.success(gettext('Notification email settings successfully updated!'));
     *  });
     * </pre>
     */
    function saveStorageLimitationEmailData(data) {
      return c8ySettings.updateOption(_.defaults({category: 'storage.limitation'}, data));
    }
    
    /**
     * @ngdoc function
     * @name hasStorageLimitationEnabled
     * @methodOf c8y.core.service:c8yStorageLimitation
     *
     * @description
     * checks whether storage limitation is enabled. It is based on whether storage limitation warning email is set.
     *
     * @returns {promise} Returns $http's promise returning a boolean stating whether storage limitation is enabled or not.
     *
     * @example
     * <pre>
     *  c8yStorageLimitation.hasStorageLimitationEnabled({})
     *    .then(function (isStorageLimitationEnabled) {
     *      ...
     *    });
     * </pre>
     */
    function hasStorageLimitationEnabled() {
      return c8ySettings.detail({
        category: 'storage.limitation'
      }).then(function(response) {
        return !!response.data['group.name'];
      });
    }
    return {
      getStorageLimitationEmailData: getStorageLimitationEmailData,
      saveStorageLimitationEmailData: saveStorageLimitationEmailData,
      hasStorageLimitationEnabled: hasStorageLimitationEnabled
    };

  }
})();
