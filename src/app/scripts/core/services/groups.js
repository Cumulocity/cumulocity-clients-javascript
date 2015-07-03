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
.factory('c8yGroups', ['$q', 'c8yBase', 'c8yInventory', 'c8yGroupTypesConfig',
  function ($q, c8yBase, c8yInventory, c8yGroupTypesConfig) {
    'use strict';

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
      return c8yInventory.detail(group).then(c8yBase.getResData)
        .then(getChildrenIds).then(function (childrenIds) {
          return childrenIds.length > 0 ? c8yInventory.list({ids: childrenIds.join(','), pageSize: childrenIds.length}) : $q.when([]);
        });
    }

    function getChildrenIds(group) {
      var childrenIds = [];
      childrenIds = childrenIds.concat(group.childAssets.references.map(getIdFromManagedObjectReference));
      childrenIds = childrenIds.concat(group.childDevices.references.map(getIdFromManagedObjectReference));
      return $q.when(childrenIds);
    }

    function getIdFromManagedObjectReference(ref) {
      return ref.managedObject.id;
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
        return $q.all(promises).then(_.flatten);
      }
      return $q.when([]);
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
      getGroupTypeItems: getGroupTypeItems,
      getTopLevelGroups: getTopLevelGroups,
      isGroup: isGroup
    };
  }
]);
