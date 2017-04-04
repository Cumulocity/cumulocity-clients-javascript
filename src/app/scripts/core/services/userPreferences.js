(function () {
  'use strict';

  angular.module('c8y.core')
    .factory('c8yUserPreferences', ['$q', 'c8yInventory', 'c8yUser', c8yUserPreferences]);

  /**
   * @ngdoc service
   * @name c8y.core.service:c8yUserPreferences
   * @requires $q
   * @requires c8y.core.service:c8yBase
   * @requires c8y.core.service:c8yInventory
   * @requires c8y.core.service:c8yUser
   *
   * @description
   * This service allows for storing user preferences in inventory or local storage.
   */
  function c8yUserPreferences($q, c8yInventory, c8yUser) {

    var localStorageKey = 'userPreferences';

    /**
     * @ngdoc function
     * @name get
     * @methodOf c8y.core.service:c8yUserPreferences
     *
     * @description
     * Gets user preference either from inventory or local storage.
     *
     * @param {string} key User preference key.
     * @returns {promise} Promise resolving to a value of user preference.
     *
     * @example
     * <pre>
     *   function restoreSettings() {
     *     c8yUserPreferences.get('mySettings').then(function (settings) {
     *       $scope.settings = settings;
     *     });
     *   }
     * </pre>
     */
    function get(key) {
      return c8yUser.current()
        .then(_.partial(getPreference, key));
    }

    function getPreference(key, user) {
      var fragmentType = getFragmentType(key, user);
      return getPreferenceMo(user, fragmentType)
        .then(_.partial(getPreferenceValue, fragmentType));
    }

    function getFragmentType(key, user) {
      return key + user.userName.replace(/\./g, '__');
    }

    function getPreferenceMo(user, fragmentType) {
      if (canUseInventoryStorage(user)) {
        return c8yInventory.list({
          fragmentType: fragmentType
        }).then(function (list) {
          return list.length ? list[0] : {
            type: 'c8y_UserPreference'
          };
        });
      } else {
        var storage = getLocalStorage();
        var mo = {};
        mo[fragmentType] = storage[fragmentType];
        return $q.when(mo);
      }
    }

    function getPreferenceValue(fragmentType, preferenceMo) {
      return preferenceMo[fragmentType];
    }

    /**
     * @ngdoc function
     * @name set
     * @methodOf c8y.core.service:c8yUserPreferences
     *
     * @description
     * Gets user preference either from inventory or local storage.
     *
     * @param {string} key User preference key.
     * @param {*} value User preference value.
     *
     * @example
     * <pre>
     *   function saveSettings(settings) {
     *     c8yUserPreferences.set('mySettings', settings);
     *   }
     * </pre>
     */
    function set(key, value) {
      return c8yUser.current()
        .then(_.partial(setPreference, key, value));
    }

    function setPreference(key, value, user) {
      var fragmentType = getFragmentType(key, user);
      return getPreferenceMo(user, fragmentType)
        .then(_.partial(setPreferenceValue, fragmentType, value, user));
    }

    function setPreferenceValue(fragmentType, value, user, preferenceMo) {
      if (canUseInventoryStorage(user)) {
        preferenceMo[fragmentType] = value;
        return c8yInventory.save(preferenceMo);
      } else {
        var storage = getLocalStorage();
        storage[fragmentType] = value;
        setLocalStorage(storage);
      }
    }

    function canUseInventoryStorage(user) {
      return c8yUser.hasRole(user, 'ROLE_INVENTORY_READ') &&
        c8yUser.hasRole(user, 'ROLE_INVENTORY_ADMIN');
    }

    function getLocalStorage() {
      var data = window.localStorage.getItem(localStorageKey);
      try {
        data = JSON.parse(data);
      } catch(e) {
        data = {};
      }
      return data || {};
    }

    function setLocalStorage(data) {
      window.localStorage.setItem(localStorageKey, JSON.stringify(data));
    }

    return {
      get: get,
      set: set
    };
  }
})();
