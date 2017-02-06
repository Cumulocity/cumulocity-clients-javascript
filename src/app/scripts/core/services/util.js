(function () {
  'use strict';

  /**
   * @ngdoc service
   * @name c8y.core.service:c8yUtil
   * @requires c8y.core.service:$window
   * @requires c8y.core.service:c8yBase
   *
   * @description
   * Small utilities
   */

  angular.module('c8y.core')
  .service('c8yUtil',
    [
      '$window',
      'c8yBase',
      C8yUtil
    ]);

  function C8yUtil(
    $window,
    c8yBase
  ) {
    this.dateToString = function (date) {
      return date && moment(date).format(c8yBase.dateFormat);
    };

    this.stringToDate = function (date) {
      return date && moment(date).toDate();
    };

    /**
     * @ngdoc function
     * @name setLocal
     * @methodOf c8y.core.service:c8yUtil
     *
     * @description
     * Stores an object in browser's local storage for given key, converting
     * object to a string.
     * @param  {string} key Key for local storage entry
     * @param  {object} obj Object to store
     */
    this.setLocal = function (key, obj) {
      $window.localStorage.setItem(key, JSON.stringify(obj));
    };

    /**
     * @ngdoc function
     * @name getLocal
     * @methodOf c8y.core.service:c8yUtil
     *
     * @description
     * Loads an object from browser's local storage for given key.
     *
     * @param  {string} key Key for local storage entry
     * @return {object} Object that is loaded from local storage.
     *                  If there is no such object or string in local storage
     *                  is an invalid JSON, returns undefined.
     */
    this.getLocal = function (key) {
      try {
        return JSON.parse($window.localStorage.getItem(key));
      } catch(e) {
        if (e instanceof SyntaxError) {
          return undefined;
        }
        throw e;
      }
    };
  }
})();
