(function () {
  'use strict';

  angular.module('c8y.core')
    .factory('c8yRoles', c8yRoles);

  /**
   * @ngdoc service
   * @name c8y.core.services:c8yRoles
   * @description Service that communicates with the backend to read, create, update and delete roles for access control
   *
   */
  /* @ngInject */
  function c8yRoles(
    $q,
    $http,
    c8yBase,
    c8yUserGroup
  ) {
    var GLOBAL_SELF_MATCH = /groups\/\d+$/;
    var INVENTORY_ROLES_PATH = 'user/inventoryroles';
    var CONTENT_HEADERS = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    function urlList() {
      return c8yBase.url(INVENTORY_ROLES_PATH);
    }

    function urlDetail(obj) {
      var id = c8yBase.getId(obj);
      return c8yBase.url(INVENTORY_ROLES_PATH + '/' + id);
    }

    /**
     * @ngdoc function
     * @name list
     * @methodOf c8y.core.services:c8yRoles
     * @description List the inventory roles defined on this tenant
     * @param  {object} filter Object filtering
     * @returns {promise} A promise that when resolved returns the list of roles with the defined filter applied
     */
    function list(filter) {
      var _filters = c8yBase.pageSizeFilter(filter);
      var cfg = {params: _filters};
      var onList = c8yBase.cleanListCallback('roles', list, _filters);

      return $http.get(urlList(), cfg).then(onList);
    }

    /**
     * @ngdoc function
     * @name detail
     * @methodOf c8y.core.services:c8yRoles
     * @description
     * @param  {number|string|object} objId Role's ID or object with id property.
     * @returns {promise} A promise that when resolved returns the  $http response with the detail of the role requested
     */
    function detail(objId) {
      var url = urlDetail(objId);
      return $http.get(url);
    }

    /**
     * @ngdoc function
     * @name remove
     * @methodOf c8y.core.services:c8yRoles
     * @description
     * @param  {number|string|object} objId Role's ID or object with id property.
     * @returns {promise} A promise that when resolved returns the $http response
     */
    function remove(objId) {
      var url = urlDetail(objId);
      return $http.delete(url, {silentError: true});
    }

    /**
     * @ngdoc function
     * @name update
     * @methodOf c8y.core.services:c8yRoles
     * @description
     * @param  {object} role Role object. Must contain an id property
     * @returns {promise} A promise that when resolved returns the  $http response
     */
    function update(role) {
      var url = urlDetail(role);
      var config = {headers: CONTENT_HEADERS};
      return $http.put(url, role, config);
    }

    /**
     * @ngdoc function
     * @name create
     * @methodOf c8y.core.services:c8yRoles
     * @description
     * @param  {object} role Role object.
     * @returns {promise} A promise that when resolved returns the  $http response
     */
    function create(role) {
      var url = urlList();
      var config = {headers: CONTENT_HEADERS};
      delete role.id;
      return $http.post(url, role, config);
    }

    /**
     * @ngdoc function
     * @name save
     * @methodOf c8y.core.services:c8yRoles
     * @description Will either call update or create based on the presence of an id property
     * @param  {object} role Role object.
     * @returns {promise} A promise that when resolved returns the  $http response
     */
    function save(role) {
      return role.id ? update(role) : create(role);
    }

    /**
     *
     * @ngdoc function
     * @name isGLobal
     * @methodOf c8y.core.services:c8yRoles
     * @description Checks if its a global role, previously named user groups,
     * by inspecting the self property of the object.
     *
     * @param {object} roleObj the object returned from the server
     * @returns {boolean} True if it is a global role object
     */
    function isGlobal(roleObj) {
      var _isGlobal = false;
      if (roleObj && roleObj.self) {
        _isGlobal = GLOBAL_SELF_MATCH.test(roleObj.self);
      }
      return _isGlobal;
    }

    return {
      list: list,
      detail: detail,
      remove: remove,
      create: create,
      update: update,
      save: save,
      global: c8yUserGroup,
      isGlobal: isGlobal
    };
  }
}());
