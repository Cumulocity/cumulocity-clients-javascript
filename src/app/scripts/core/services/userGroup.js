(function () {
  'use strict';

  /**
   * @ngdoc service
   * @name c8y.core.service:c8yUserGroup
   * @requires c8y.core.service:c8yBase
   * @requires c8y.core.service:c8yUser
   * @requires $http
   * @requires $q
   *
   * @description
   * This service allows for managing user groups.
   */
  angular.module('c8y.core')
    .factory('c8yUserGroup', c8yUserGroup);

  /* @ngInject */
  function c8yUserGroup(
    $http,
    $q,
    c8yBase,
    c8yUser
  ) {

    var basePath = 'user/';

    function buildGroupsUrl() {
      return c8yUser.current().then(function (user) {
        var tenant = user.tenant;
        return c8yBase.url(basePath + tenant + '/groups');
      });
    }

    function buildRolesUrl() {
      return $q.when(c8yBase.url(basePath + 'roles'));
    }

    function buildGroupUrl(group) {
      var groupId = group.id || group;
      return c8yUser.current().then(function (user) {
        var tenant = user.tenant;
        return c8yBase.url(basePath + tenant + '/groups/' + groupId);
      });
    }

    function buildGroupUsersUrl(group, user) {
      return buildGroupUrl(group).then(function (url) {
        return url + '/users' + (user ? ('/' + (encodeURIComponent(user.id || user))) : '');
      });
    }

    function buildGroupRolesUrl(group) {
      return buildGroupUrl(group).then(function (url) {
        return url + '/roles';
      });
    }

    function buildGroupRoleUrl(group, role) {
      var roleId = role.id || role;
      return buildGroupRolesUrl(group).then(function (url) {
        return url + '/' + roleId;
      });
    }

    /**
     * @ngdoc function
     * @name list
     * @methodOf c8y.core.service:c8yUserGroup
     *
     * @description
     * Gets the list of user groups.
     *
     * @param {object} filters Filters object.
     *
     * @returns {promise} Returns $http's promise with the list of user groups<!-- (see user group object specification {@link http://docs.cumulocity.com/userGroup@TODO here})-->.
     *
     * @example
     * <pre>
     *   c8yUserGroup.list().then(function (userGroups) {
     *     $scope.userGroups = userGroups;
     *   });
     * </pre>
     */
    function list(filters) {
      var _filter = c8yBase.pageSizeFilter(filters);
      var cfg = {
        params: _filter
      };
      var onList = c8yBase.cleanListCallback('groups', list, _filter);

      return buildGroupsUrl().then(function (url) {
        return $http.get(url, cfg).then(onList);
      });
    }

    /**
     * @ngdoc function
     * @name detail
     * @methodOf c8y.core.service:c8yUserGroup
     *
     * @description
     * Gets the details of given user group.
     *
     * @param {integer|object} group User group's id or user group object.
     *
     * @returns {promise} Returns $http's promise with user group object<!-- (see user group object specification {@link http://docs.cumulocity.com/user@TODO here})-->.
     *
     * @example
     * <pre>
     *   var userGroupId = 1;
     *   c8yUserGroup.detail(userGroupId).then(function (res) {
     *     $scope.userGroup = res.data;
     *   });
     * </pre>
     */
    function detail(group) {
      return buildGroupUrl(group).then(function (url) {
        return $http.get(url);
      });
    }

    /**
     * @ngdoc function
     * @name remove
     * @methodOf c8y.core.service:c8yUserGroup
     *
     * @description
     * Removes user group.
     *
     * @param {integer|object} group User group's id or user group object.
     *
     * @returns {promise} Returns $http's promise.
     *
     * @example
     * <pre>
     *   var userGroupId = 1;
     *   c8yUserGroup.remove(userGroupId);
     * </pre>
     */
    function remove(group) {
      return buildGroupUrl(group).then(function (url) {
        return $http.delete(url);
      });
    }

    /**
     * @ngdoc function
     * @name update
     * @methodOf c8y.core.service:c8yUserGroup
     *
     * @description
     * Updates user group data.
     *
     * @param {object} group User group object<!-- (see object specification {@link http://docs.cumulocity.com/userGroup@TODO here})-->.
     *
     * @returns {promise} Returns promise with the saved user group object.
     *
     * @example
     * <pre>
     *   var userGroupId = 1;
     *   c8yUserGroup.detail(userGroupId).then(function (res) {
     *     var userGroup = res.data;
     *     userGroup.name = 'New Name';
     *     return userGroup;
     *   }).then(c8yUserGroup.update);
     * </pre>
     */
    function update(group) {
      var cfg = {
        headers: c8yBase.contentHeaders('group')
      };
      return buildGroupUrl(group).then(function (url) {
        return $http.put(url, group, cfg).then(function () {
          return group;
        });
      });
    }

    /**
     * @ngdoc function
     * @name create
     * @methodOf c8y.core.service:c8yUserGroup
     *
     * @description
     * Creates a new user group.
     *
     * @param {object} group User group object<!-- (see object specification {@link http://docs.cumulocity.com/userGroup@TODO here})-->.
     *
     * @returns {promise} Returns a promise with the details of newly created user group.
     *
     * @example
     * <pre>
     *   var userGroup = {
     *     name: 'Test group'
     *   };
     *   c8yUserGroup.create(userGroup);
     * </pre>
     */
    function create(group) {
      var cfg = {
        headers: c8yBase.contentHeaders('group')
      };
      return buildGroupsUrl().then(function (url) {
        return $http.post(url, group, cfg).then(function (res) {
          var location = res.headers('location');
          var id = location.match(/\d+$/)[0];

          return detail(id).then(function (res) {
            return res.data;
          });
        });
      });
    }

    /**
     * @ngdoc function
     * @name save
     * @methodOf c8y.core.service:c8yUserGroup
     *
     * @description
     * Saves user group object by either creating new one or updating existing one.
     *
     * @param {object} group User group object<!-- (see object specification {@link http://docs.cumulocity.com/userGroup@TODO here})-->.
     *
     * @returns {promise} Returns the result of either {@link c8y.core.service:c8yUserGroup#functions_create c8yUserGroup.create} or {@link c8y.core.service:c8yUserGroup#functions_create c8yUserGroup.create} depending on whether user group already existed.
     *
     * @example
     * <pre>
     *   var userGroup = {
     *     name: 'Test group'
     *   };
     *   c8yUserGroup.save(userGroup);
     * </pre>
     */
    function save(group) {
      return group.id ? update(group) : create(group);
    }

    /**
     * @ngdoc function
     * @name listRoles
     * @methodOf c8y.core.service:c8yUserGroup
     *
     * @description
     * Gets the list of user group roles.
     *
     * @param {object} filters Filters object.
     *
     * @returns {promise} Returns promise with the list of roles<!-- (see specification {@link http://docs.cumulocity.com/userGroupRoles@TODO here})-->.
     *
     * @example
     * <pre>
     *   function getRole(roleId) {
     *    return c8yUserGroup.listRoles().then(function (roles) {
     *      return _.find(roles, {id: roleId});
     *    });
     *  }
     *  var roleId = 'ROLE_OWN_USER_MANAGEMENT_ADMIN';
     *  getRole(roleId).then(function (role) {
     *    vm.role = role;
     *  });
     * </pre>
     */
    function listRoles(filters) {
      var _filter = c8yBase.pageSizeFilter(filters);
      var cfg =  {
        params: _filter,
        cache: true
      };
      var onList = c8yBase.cleanListCallback('roles', listRoles, _filter);

      return buildRolesUrl().then(function (url) {
        return $http.get(url, cfg).then(onList);
      });
    }

    function findRole(roleId) {
      return listRoles().then(function (roles) {
        var selRole;
        roles.forEach(function (role) {
          if (role.id === roleId) {
            selRole = role;
            return false;
          }
        });
        return selRole;
      });
    }

    function addUserToGroup(group, user) {
      var data = {
        user: _.pick(user, ['id', 'self'])
      };
      return buildGroupUsersUrl(group).then(function (url) {
        return $http.post(url, data);
      });
    }

    function removeUserFromGroup(group, user) {
      return buildGroupUsersUrl(group, user).then(function (url) {
        return $http.delete(url);
      });
    }

    function updateGroups(user, groupIds) {
      var references = _.get(user, 'groups.references', []);
      var userGroupsIds = references.map(function (ref) {
        return ref.group.id;
      });
      var actions = [];

      groupIds.forEach(function (groupId) {
        if (userGroupsIds.indexOf(groupId) === -1) {
          actions.push(addUserToGroup(groupId, user));
        }
      });

      userGroupsIds.forEach(function (groupId) {
        if (groupIds.indexOf(groupId) === -1) {
          actions.push(removeUserFromGroup(groupId, user));
        }
      });

      return $q.all(actions);
    }

    function addRoleToGroup(group, role) {
      var cfg = {
        headers: c8yBase.contentHeaders('roleReference')
      };
      return buildGroupRolesUrl(group).then(function (url) {
        return $http.post(url, {role: role}, cfg);
      });
    }

    function removeRoleFromGroup(group, role) {
      return buildGroupRoleUrl(group, role).then(function (url) {
        return $http.delete(url);
      });
    }

    function updateRoles(group, roleIds) {
      var groupRoleIds = group.roles.references.map(function (ref) {
        return ref.role.id;
      });
      var actions = [];

      roleIds.forEach(function (roleId) {
        if (groupRoleIds.indexOf(roleId) === -1) {
          actions.push(findRole(roleId).then(function (role) {
            return addRoleToGroup(group, role);
          }));
        }
      });

      groupRoleIds.forEach(function (roleId) {
        if (roleIds.indexOf(roleId) === -1) {
          actions.push(removeRoleFromGroup(group, roleId));
        }
      });

      return $q.all(actions);
    }

    return {
      list: list,
      detail: detail,
      remove: remove,
      create: create,
      update: update,
      save: save,
      listRoles: listRoles,
      updateGroups: updateGroups,
      updateRoles: updateRoles
    };
  }
}());
