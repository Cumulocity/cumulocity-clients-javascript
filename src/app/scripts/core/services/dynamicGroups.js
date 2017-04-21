(function () {
  'use strict';

  angular.module('c8y.core')
    .factory('c8yDynamicGroups', c8yDynamicGroups);

  /**
   * @ngdoc service
   * @name c8y.core.service:c8yDynamicGroups
   *
   * @description
   * Service for managing dynamic groups of devices.
   */
  /* @ngInject */
  function c8yDynamicGroups(
    $q,
    c8yBase,
    c8yModal,
    c8yInventory,
    c8yQueriesUtil,
    c8yFilteringSortingInventoryQueries
  ) {
    var DYNAMIC_GROUP_TYPE = 'c8y_DynamicGroup';
    var DYNAMIC_GROUP_FRAGMENT = 'c8y_IsDynamicGroup';
    var COLUMNS_CONFIG_FRAGMENT = 'c8y_UIDeviceFilterConfig';
    var QUERY_STRING_FRAGMENT = 'c8y_DeviceQueryString';

    var service = {
      spawnEmpty: spawnEmpty,
      createWithUI: createWithUI,
      create: create,
      getGroupList: getGroupList,
      getGroupItems: getGroupItems,
      getColumnsConfig: getColumnsConfig,
      saveColumnsConfig: saveColumnsConfig,
      isDynamicGroup: isDynamicGroup,
      isDynamicGroupForId: isDynamicGroupForId
    };

    /**
     * @ngdoc
     * @name spawnEmpty
     * @methodOf c8y.core.service:c8yDynamicGroups
     * @description Returns an empty dynamic group managed object.
     * @returns {object} Dynamic group managed object.
     */
    function spawnEmpty() {
      var empty = {type: DYNAMIC_GROUP_TYPE};
      empty[DYNAMIC_GROUP_FRAGMENT] = {};
      return empty;
    }

    /**
     * @ngdoc
     * @name createWithUI
     * @methodOf c8y.core.service:c8yDynamicGroups
     * @description Creates a new dynamic group with given columns configuration displaying a modal dialog where a name for new group can be provided.
     * @param {array} columns Columns definitions.
     * @param {object} columnsConfig Columns configuration.
     * @returns {promise} Promise from modal dialog.
     */
    function createWithUI(columns, columnsConfig) {
      return c8yModal({
        templateUrl: '/apps/core/scripts/ui/views/addDynamicGroupModal.html',
        controller: 'addDynamicGroupModalController',
        resolve: {
          columns: _.constant(_.cloneDeep(columns)),
          columnsConfig: _.constant(_.cloneDeep(columnsConfig))
        }
      });
    }

    /**
     * @ngdoc
     * @name create
     * @methodOf c8y.core.service:c8yDynamicGroups
     * @description Creates a new dynamic group from given object and columns definition and configuration.
     * @param {object} dynamicGroup Dynanic group managed object.
     * @param {array} columns Columns definitions.
     * @param {object} columnsConfig Columns configuration.
     * @returns {promise} Promise from modal dialog.
     */
    function create(dynamicGroup, columns, columnsConfig) {
      dynamicGroup[COLUMNS_CONFIG_FRAGMENT] = columnsConfig;
      dynamicGroup[QUERY_STRING_FRAGMENT] = c8yQueriesUtil.buildQuery(c8yFilteringSortingInventoryQueries.getQuery(columns, columnsConfig));
      return c8yInventory.create(dynamicGroup).then(c8yBase.getResData);
    }

    /**
     * @ngdoc function
     * @name getGroupList
     * @methodOf c8y.core.service:c8yDynamicGroups
     *
     * @description Gets the list of dynamic groups.
     *
     * @returns {promise} Returns promise with the list of dynamic groups.
     *
     * @example
     * <pre>
     *   c8yDynamicGroups.getGroupList().then(function (dynamicGroups) {
     *     $scope.dynamicGroups = dynamicGroups;
     *   });
     * </pre>
     */
    function getGroupList() {
      return c8yInventory.list({
        fragmentType: DYNAMIC_GROUP_FRAGMENT
      });
    }

    /**
     * @ngdoc function
     * @name getGroupItems
     * @methodOf c8y.core.service:c8yDynamicGroups
     *
     * @description Gets the list of items in dynamic groups.
     *
     * @param {object|integer} group Dynamic group managed object or its id.
     * @returns {promise} Returns promise with the list of items in dynamic group.
     */
    function getGroupItems(group, filters) {
      var groupPromise = _.isObjectLike(group) ? $q.when(group) : c8yInventory.detail(group).then(c8yBase.getResData);
      return groupPromise.then(function (mo) {
        return c8yInventory.list(_.assign({q: mo[QUERY_STRING_FRAGMENT]}, filters));
      });
    }

    /**
     * @ngdoc function
     * @name getColumnsConfig
     * @methodOf c8y.core.service:c8yDynamicGroups
     *
     * @description Gets columns config for given dynamic group.
     *
     * @param {object|integer} group Dynamic group managed object or its id.
     * @returns {promise} Returns promise with columns config.
     */
    function getColumnsConfig(group) {
      var groupPromise = _.isObjectLike(group) ? $q.when(group) : c8yInventory.detail(group).then(c8yBase.getResData);
      return groupPromise.then(function (mo) {
        return mo[COLUMNS_CONFIG_FRAGMENT];
      });
    }

    /**
     * @ngdoc function
     * @name saveColumnsConfig
     * @methodOf c8y.core.service:c8yDynamicGroups
     *
     * @description Saves columns configuration changes to given dynamic group.
     *
     * @param {object|integer} group Dynamic group managed object or its id.
     * @param {array} columns Columns definitions.
     * @param {array} columnsConfig Columns configuration.
     * @returns {promise} Returns save promise.
     */
    function saveColumnsConfig(group, columns, columnsConfig) {
      var o = {id: group.id || group};
      o[COLUMNS_CONFIG_FRAGMENT] = columnsConfig;
      o[QUERY_STRING_FRAGMENT] = c8yQueriesUtil.buildQuery(c8yFilteringSortingInventoryQueries.getQuery(columns, columnsConfig));
      return c8yInventory.save(o);
    }

    /**
     * @ngdoc function
     * @name isDynamicGroup
     * @methodOf c8y.core.service:c8yDynamicGroups
     *
     * @description
     * Checks if given managed object is a dynamic group.
     *
     * @param {object} managedObject Managed object to check.
     *
     * @returns {boolean} Returns true if managed object is a dynamic group.
     *
     * @example
     * <pre>
     *   var moId = 1;
     *   c8yInventory.detail(moId).then(function (res) {
     *     $scope.isDynamicGroup = c8yDynamicGroups.isDynamicGroup(res.data);
     *   });
     * </pre>
     */
    function isDynamicGroup(managedObject) {
      return Boolean(managedObject[DYNAMIC_GROUP_FRAGMENT] ||
                     managedObject.type === DYNAMIC_GROUP_TYPE);
    }

    /**
     * @ngdoc function
     * @name isDynamicGroupForId
     * @methodOf c8y.core.service:c8yDynamicGroups
     *
     * @description
     * Checks if managed object with given ID is a dynamic group.
     *
     * @param {string} managedObjectId Managed object ID to check.
     *
     * @returns {promise} Returns promise resolving to true if managed object is
     * a dynamic group.
     *
     * @example
     * <pre>
     *   var moId = 1;
     *   c8yDynamicGroups.isDynamicGroupForId(moId).then(function (value) {
     *     $scope.isDynamicGroup = value;
     *   });
     * </pre>
     */
    function isDynamicGroupForId(managedObjectId) {
      return _.isUndefined(managedObjectId) ?
             $q.when(false) :
             c8yInventory
               .detailCached(managedObjectId)
               .then(c8yBase.getResData)
               .then(function (managedObject) {
                 return isDynamicGroup(managedObject);
               });
    }

    return service;
  }
}());
