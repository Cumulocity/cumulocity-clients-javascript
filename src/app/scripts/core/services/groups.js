(function() {
  'use strict';

  /**
   * @ngdoc service
   * @name c8y.core.service:c8yGroups
   * @requires c8y.core.service:c8yInventory
   * @requires c8y.core.service:c8yGroupTypesConfig
   * @requires $q
   *
   * @description
   * This service allows for managing device and asset groups.
   */
  angular.module('c8y.core')
    .factory('c8yGroups', c8yGroups);

  function c8yGroups(
    $q,
    c8yBase,
    c8yInventory,
    c8yGroupTypesConfig,
    c8yPermissions
  ) {

    /**
     * @ngdoc function
     * @name getGroupItems
     * @methodOf c8y.core.service:c8yGroups
     *
     * @description
     * Gets group items.
     *
     * @param {object} group Group managed object.
     *
     * @returns {promise} Returns promise with array of group items.
     *
     * @example
     * <pre>
     *   var groupId = 1;
     *   c8yInventory.detail(groupId).then(function (res) {
     *     return res.data;
     *   }).then(function (group) {
     *     return c8yGroups.getGroupItems(group).then(function (groupItems) {
     *       $scope.items = groupItems;
     *     });
     *   });
     * </pre>
     */
    function getGroupItems(group) {
      return c8yInventory.listQuery(getGroupItemsQuery(group), {withParents: true}, true);
    }

    /**
     * @ngdoc function
     * @name getGroupAssetsAndDevices
     * @methodOf c8y.core.service:c8yGroups
     *
     * @description
     * Gets group items excluding childAdditions
     *
     * @param {object} group Group managed object.
     *
     * @returns {promise} Returns promise with array of group items childAdditions
     *
     * @example
     * <pre>
     *   var groupId = 1;
     *   c8yInventory.detail(groupId).then(function (res) {
     *     return res.data;
     *   }).then(function (group) {
     *     return c8yGroups.getGroupAssetsAndDevices(group).then(function (groupItems) {
     *       $scope.itemsNoAdditions = groupItems;
     *     });
     *   });
     * </pre>
     */
    function getGroupAssetsAndDevices(group) {
      var groupId = String(c8yBase.getId(group));
      var rejectAddition = function (item) {
        var additionParentsIds = _.map(
          _.get(item, 'additionParents.references'),
          _.property('managedObject.id')
        );
        return _.includes(additionParentsIds, groupId);
      };
      var rejectAdditions = function (items) {
        return _.reject(items, rejectAddition);
      };
      return getGroupItems(group)
        .then(rejectAdditions);
    }

    function getGroupItemsQuery(group) {
      return {
        __bygroupid: c8yBase.getId(group)
      };
    }

    /**
     * @ngdoc function
     * @name getGroupTypeItems
     * @methodOf c8y.core.service:c8yGroups
     *
     * @description
     * Gets groups of given group type.
     *
     * @param {string} groupTypeName The name of group type to get items.
     *
     * @returns {promise} Returns promise with array of groups.
     *
     * @example
     * <pre>
     *   var groupTypeName = 'groupTypeName';
     *   c8yGroups.getGroupTypeItems(groupTypeName).then(function (groups) {
     *     $scope.groups = groups;
     *   });
     * </pre>
     */
    function getGroupTypeItems(groupTypeName) {
      return c8yGroupTypesConfig.getLookup().then(function (lookup) {
        return [lookup[groupTypeName]];
      }).then(getGroupsByGroupTypes);
    }

    /**
     * @ngdoc function
     * @name getTopLevelGroups
     * @methodOf c8y.core.service:c8yGroups
     *
     * @description
     * Gets the list of top level groups.
     *
     * @returns {promise} Returns promise with array of groups.
     *
     * @example
     * <pre>
     *   c8yGroups.getTopLevelGroups().then(function (groups) {
     *     $scope.topLevelGroups = groups;
     *   });
     * </pre>
     */
    function getTopLevelGroups() {
      return c8yPermissions
        .mustHaveAllRoles(['ROLE_INVENTORY_READ'])
        .then(_getTopLevelGroups, loadRootDeviceGroups);
    }

    function _getTopLevelGroups() {
      return getTopLevelGroupTypes().then(getGroupsByGroupTypes);
    }

    function getTopLevelGroupTypes() {
      return c8yGroupTypesConfig.get().then(function (config) {
        return config.groups;
      });
    }

    function getGroupsByGroupTypes(groupTypesList) {
      if (groupTypesList.length > 0) {
        var promises = [];
        _.forEach(groupTypesList, function (groupType) {
          promises.push(c8yInventory.list({type: groupType.type}));
        });
        return $q.all(promises).then(_.flattenDeep);
      }
      return $q.when([]);
    }

    function loadRootDeviceGroups() {
      var filter = {
        fragmentType: 'c8y_IsDeviceGroup',
        pageSize: 1000,
        withParents: true
      };
      var rootGroupsOnly = function (groups) {
        return _.reject(groups, hasParents(groups));
      };
      return c8yInventory.list(filter)
        .then(rootGroupsOnly);
    }

    function hasParents(groups) {
      var groupsMap = _.keyBy(groups, 'id');
      return function (group) {
        var parentsIds = _.map(
          _.get(group, 'assetParents.references'),
          _.property('managedObject.id')
        );
        return _.some(parentsIds, function (id) {
          return _.get(groupsMap, id);
        });
      };
    }

    /**
     * @ngdoc function
     * @name isGroup
     * @methodOf c8y.core.service:c8yGroups
     *
     * @description
     * Checks if given managed object is a group.
     *
     * @param {object} mo Managed object to check.
     *
     * @returns {boolean} Returns true if managed object is a group.
     *
     * @example
     * <pre>
     *   var moId = 1;
     *   c8yInventory.detail(moId).then(function (res) {
     *     $scope.isGroup = c8yGroups.isGroup(res.data);
     *   });
     * </pre>
     */
    function isGroup(mo) {
      return !!mo.c8y_IsDeviceGroup || mo.type === 'c8y_DeviceGroup';
    }

    return {
      getGroupItems: getGroupItems,
      getGroupAssetsAndDevices: getGroupAssetsAndDevices,
      getGroupTypeItems: getGroupTypeItems,
      getTopLevelGroups: getTopLevelGroups,
      isGroup: isGroup
    };
  }
}());
