(function () {
  'use strict';

  angular.module('c8y.core')
    .factory('c8yPermissions', ['$routeParams', '$q', '$http', 'c8yBase', 'c8yUser', c8yPermissions]);

  /**
   * @ngdoc service
   * @name c8y.core.service:c8yPermissions
   * @requires $q
   * @requires c8y.core.service:c8yUser
   *
   * @description
   * This service handles permissions checking.
   */
  function c8yPermissions($routeParams, $q, $http, c8yBase, c8yUser) {
    var moPermissionsPath = 'user/devicePermissions';

    /**
     * @ngdoc function
     * @name hasRole
     * @methodOf c8y.core.service:c8yPermissions
     *
     * @description
     * Checks if user has given role (either defined for him or for one of his groups).
     *
     * @param {object} user User object.
     * @param {object} roleId Role's identification string.
     *
     * @returns {bool} Returns boolean value indicating if user has given role.
     *
     * @example
     * <pre>
     *   c8yUser.current().then(function (currentUser) {
     *     $scope.canManageUsers = c8yUser.hasRole(currentUser, 'ROLE_USER_MANAGEMENT_ADMIN');
     *   });
     * </pre>
     */
    function hasRole(user, roleId) {
      var result = hasRoleInUser(user, roleId);
      if (!result) {
        result = hasRoleInGroups(user, roleId);
      }
      return result;
    }

    function hasRoleInUser(user, roleId) {
      var result = false;
      if (user.roles && user.roles.references) {
        _.forEach(user.roles.references, function (ref) {
          if (ref.role.id === roleId) {
            result = true;
          }
        });
      }
      return result;
    }

    function hasRoleInGroups(user, roleId) {
      var result = false;
      if (user.groups && user.groups.references) {
        _.forEach(user.groups.references, function (groupRef) {
          _.forEach(groupRef.group.roles.references, function (roleRef) {
            if (roleRef.role.id === roleId) {
              result = true;
            }
          });
        });
      }
      return result;
    }

    /**
     * @ngdoc function
     * @name hasDevicePermission
     * @methodOf c8y.core.service:c8yUser
     *
     * @description
     * Checks if user has given device permission (either defined for him or for one of his groups).
     *
     * @param {object} user User object.
     * @param {integer} moId Managed object's id.
     * @param {string} scope Permission's scope.
     * @param {string} type Permission's type.
     * @param {string} permission Permission's kind.
     *
     * @returns {bool} Returns boolean value indicating if user has given device permission.
     *
     * @example
     * <pre>
     *   function hasManagedObjectReadPermission(user, moId) {
     *     return c8yUser.hasDevicePermission(user, moId, 'MANAGED_OBJECT', '*', 'READ');
     *   }
     * </pre>
     */
    function hasDevicePermission(user, moId, scope, type, permission) {
      var result = hasDevicePermissionInUser(user, moId, scope, type, permission);
      if (!result) {
        result = hasDevicePermissionInGroups(user, moId, scope, type, permission);
      }
      return result;
    }

    function hasDevicePermissionInUser(user, moId, scope, type, permission) {
      var result = false;
      if (user.devicePermissions && user.devicePermissions[moId]) {
        result = doesAnyDevicePermissionMatch(user.devicePermissions[moId], scope, type, permission);
      }
      return result;
    }

    function hasDevicePermissionInGroups(user, moId, scope, type, permission) {
      var result = false;
      if (user.groups && user.groups.references) {
        _.forEach(user.groups.references, function (groupRef) {
          if (groupRef.group.devicePermissions && groupRef.group.devicePermissions[moId]) {
            result = doesAnyDevicePermissionMatch(groupRef.group.devicePermissions[moId], scope, type, permission);
          }
        });
      }
      return result;
    }

    function doesAnyDevicePermissionMatch(devicePermissions, scope, type, permission) {
      return _.some(devicePermissions, _.partial(doesSingleDevicePermissionMatch, scope, type, permission));
    }

    function doesSingleDevicePermissionMatch(scope, type, permission, devicePermission) {
      var result = false,
        parts = devicePermission.split(':'),
        scopePart = parts[0],
        typePart = parts[1],
        permissionPart = parts[2];

      if (doesDevicePermissionPartMatch(scopePart, scope) &&
          doesDevicePermissionPartMatch(typePart, type) &&
          doesDevicePermissionPartMatch(permissionPart, permission)) {
        result = true;
      }

      return result;
    }

    function doesDevicePermissionPartMatch(devicePermissionPart, value) {
      return devicePermissionPart === '*' || devicePermissionPart === value;
    }

    /**
     * @ngdoc function
     * @name hasAnyRole
     * @methodOf c8y.core.service:c8yPermissions
     *
     * @description
     * Checks if given user has any of given roles.
     *
     * @param {array} roles Array of role ids.
     * @param {object} user User to check (defaults to current user).
     *
     * @returns {promise} Returns promise with boolean value indicating whether user has any of given roles or not.
     *
     * @example
     * <pre>
     *   c8yPermissions.hasAnyRole(['ROLE_INVENTORY_ADMIN', 'ROLE_USER_ADMIN'], c8yUser.current()).
     *     .then(function (result) {
     *       $scope.allowed = result;
     *     }):
     * </pre>
     */
    function hasAnyRole(roles, user) {
      var userPromise = user ? $q.when(user) : c8yUser.current();
      return userPromise.then(function (user) {
        return _.some(roles, _.partial(hasRole, user));
      });
    }

    /**
     * @ngdoc function
     * @name mustHaveAnyRole
     * @methodOf c8y.core.service:c8yPermissions
     *
     * @description
     * Checks if given user has any of given roles.
     *
     * @param {array} roles Array of role ids.
     * @param {object} user User to check (defaults to current user).
     *
     * @returns {promise} Returns promise which resolves if user has any of given roles or rejects otherwise.
     *
     * @example
     * <pre>
     *   function example() {
     *     return c8yPermissions.mustHaveAnyRole(['ROLE_INVENTORY_ADMIN', 'ROLE_USER_ADMIN'])
     *       .then(executeAction, handleHavingUnsufficientRoles);
     *   }
     * </pre>
     */
    function mustHaveAnyRole(roles, user) {
      return booleanPromiseToRejectablePromise(hasAnyRole(roles, user));
    }

    /**
     * @ngdoc function
     * @name hasAllRoles
     * @methodOf c8y.core.service:c8yPermissions
     *
     * @description
     * Checks if given user has all of given roles.
     *
     * @param {array} roles Array of role ids.
     * @param {object} user User to check (defaults to current user).
     *
     * @returns {promise} Returns promise with boolean value indicating whether user has all of given roles or not.
     *
     * @example
     * <pre>
     *   c8yPermissions.hasAllRoles(['ROLE_INVENTORY_ADMIN', 'ROLE_USER_ADMIN'], c8yUser.current()).
     *     .then(function (result) {
     *       $scope.allowed = result;
     *     });
     * </pre>
     */
    function hasAllRoles(roles, user) {
      var userPromise = user ? $q.when(user) : c8yUser.current();
      return userPromise.then(function (user) {
        return _.every(roles, _.partial(hasRole, user));
      });
    }

    /**
     * @ngdoc function
     * @name mustHaveAllRoles
     * @methodOf c8y.core.service:c8yPermissions
     *
     * @description
     * Checks if given user has all of given roles.
     *
     * @param {array} roles Array of role ids.
     * @param {object} user User to check (defaults to current user).
     *
     * @returns {promise} Returns promise which resolves if user has all given roles or rejects otherwise.
     *
     * @example
     * <pre>
     *   function example() {
     *     return c8yPermissions.mustHaveAllRoles(['ROLE_INVENTORY_ADMIN', 'ROLE_USER_ADMIN'])
     *       .then(executeAction, handleMissingRoles);
     *   }
     * </pre>
     */
    function mustHaveAllRoles(roles, user) {
      return booleanPromiseToRejectablePromise(hasAllRoles(roles, user));
    }

    /**
     * @ngdoc function
     * @name canReadMOs
     * @methodOf c8y.core.service:c8yPermissions
     *
     * @description
     * Checks if given user can read given MOs (either through role or indivudual device permissions).
     *
     * @param {array} mos Array of managed objects (ids or objects with id property).
     * @param {object} user User to check permissions for (defaults to current user).
     *
     * @returns {promise} Returns promise with boolean value indicating whether user can read MOs or not.
     *
     * @example
     * <pre>
     *   var moId = 123;
     *   c8yPermissions.canReadMOs([moId], c8yUser.current()).
     *     .then(function (result) {
     *       $scope.readAllowed = result;
     *     });
     * </pre>
     */
    function canReadMOs(mos, user) {
      return $q.all(_.map(_.filter(mos, _.identity), _.partialRight(canReadMO, user)))
        .then(allTrue);
    }

    function canReadMO(mo, user) {
      var moId = mo.id || mo,
        userPromise = user ? $q.when(user) : c8yUser.current();

      return userPromise.then(function (user) {
        return hasAnyRole(['ROLE_INVENTORY_READ'], user)
          .then(function (result) {
            if (!result) {
              return hasDevicePermission(user, moId, 'MANAGED_OBJECT', '*', 'READ');
            } else {
              return result;
            }
          });
      });
    }

    /**
     * @ngdoc function
     * @name mustHaveReadMOs
     * @methodOf c8y.core.service:c8yPermissions
     *
     * @description
     * Checks if given user can read given MOs (either through role or indivudual device permissions).
     *
     * @param {array} mos Array of managed objects (ids or objects with id property).
     * @param {object} user User to check permissions for (defaults to current user).
     *
     * @returns {promise} Returns promise which resolves if user can read MOs or rejects otherwise.
     *
     * @example
     * <pre>
     *   function readMO(moId) {
     *     return c8yPermissions.mustHaveReadMOs([moId])
     *       .then(
     *         angular.bind(c8yInventory, c8yInventory.detail, moId),
     *         angular.bind(c8yAlert, c8yAlert.danger, 'You are not allowed to read this MO!'
     *       );
     *   }
     * </pre>
     */
    function mustHaveReadMOs(mos, user) {
      return booleanPromiseToRejectablePromise(canReadMOs(mos, user));
    }

    /**
     * @ngdoc function
     * @name canAdminMOs
     * @methodOf c8y.core.service:c8yPermissions
     *
     * @description
     * Checks if given user can read and write given MOs (either through role or indivudual device permissions).
     *
     * @param {array} mos Array of managed objects (ids or objects with id property).
     * @param {object} user User to check permissions for (defaults to current user).
     *
     * @returns {promise} Returns promise with boolean value indicating whether user can read and write MOs or not.
     *
     * @example
     * <pre>
     *   var moId = 123;
     *   c8yPermissions.canAdminMOs([moId], c8yUser.current()).
     *     .then(function (result) {
     *       $scope.adminAllowed = result;
     *     });
     * </pre>
     */
    function canAdminMOs(mos, user) {
      return $q.all(_.map(_.filter(mos, _.identity), _.partialRight(canAdminMO, user)))
        .then(allTrue);
    }

    function canAdminMO(mo, user) {
      var moId = mo.id || mo,
        userPromise = user ? $q.when(user) : c8yUser.current();

      return userPromise.then(function (user) {
        return hasAnyRole(['ROLE_INVENTORY_ADMIN'], user)
          .then(function (result) {
            if (!result) {
              return hasDevicePermission(user, moId, 'MANAGED_OBJECT', '*', 'ADMIN');
            } else {
              return result;
            }
          });
      });
    }

    /**
     * @ngdoc function
     * @name mustHaveAdminMOs
     * @methodOf c8y.core.service:c8yPermissions
     *
     * @description
     * Checks if given user can read and write given MOs (either through role or indivudual device permissions).
     *
     * @param {array} mos Array of managed objects (ids or objects with id property).
     * @param {object} user User to check permissions for (defaults to current user).
     *
     * @returns {promise} Returns promise which resolves if user can read and write MOs or rejects otherwise.
     *
     * @example
     * <pre>
     *   function writeMO(mo) {
     *     return c8yPermissions.mustHaveAdminMOs([mo])
     *       .then(
     *         angular.bind(c8yInventory, c8yInventory.save, mo),
     *         angular.bind(c8yAlert, c8yAlert.danger, 'You are not allowed to write this MO!'
     *       );
     *   }
     * </pre>
     */
    function mustHaveAdminMOs(mos, user) {
      return booleanPromiseToRejectablePromise(canAdminMOs(mos, user));
    }

    /**
     * @ngdoc function
     * @name isAllowed
     * @methodOf c8y.core.service:c8yPermissions
     *
     * @description
     * Checks if given user has specified permissions.
     *
     * @param {object} cfg Permission configuration to check.
     * @param {object} user User to check permissions for (defaults to current user).
     *
     * @returns {promise} Returns promise with boolean value indicating whether user is allowed against given configuration or not.
     *
     * @example
     * <pre>
     *   var cfg = {
     *     anyRole: ['ROLE_INVENTORY_ADMIN'],
     *     allRoles: ['ROLE_INVENTORY_READ', 'ROLE_USER_READ'],
     *     readMOs: [':deviceId', 123],
     *     adminMOs: [':deviceId', 321]
     *   };
     *   c8yPermissions.isAllowed(cfg, c8yUser.current()).
     *     .then(function (result) {
     *       $scope.allowed = result;
     *     });
     * </pre>
     */
    function isAllowed(cfg, user) {
      var promises = [];
      if (cfg.anyRole) {
        promises.push(hasAnyRole(cfg.anyRole, user));
      }
      if (cfg.allRoles) {
        promises.push(hasAllRoles(cfg.allRoles, user));
      }
      if (cfg.readMOs) {
        promises.push(canReadMOs(resolveMOs(cfg.readMOs), user));
      }
      if (cfg.adminMOs) {
        promises.push(canAdminMOs(resolveMOs(cfg.adminMOs), user));
      }
      return $q.all(promises)
        .then(allTrue);
    }

    function resolveMOs(mos) {
      return _.filter(_.map(mos, function (mo) {
        if (_.isString(mo) && /^:/.test(mo)) {
          mo = $routeParams[mo.substr(1, mo.length - 1)];
        }
        return mo;
      }), _.identity);
    }

    /**
     * @ngdoc function
     * @name mustBeAllowed
     * @methodOf c8y.core.service:c8yPermissions
     *
     * @description
     * Checks if given user has specified permissions and resolves or rejects promise.
     *
     * @param {object} cfg Permission configuration to check.
     * @param {object} user User to check permissions for (defaults to current user).
     *
     * @returns {promise} Returns promise which resolves if user is allowed against given configuration or rejects otherwise.
     *
     * @example
     * <pre>
     *   var cfg = {
     *     anyRole: ['ROLE_INVENTORY_ADMIN'],
     *     allRoles: ['ROLE_INVENTORY_READ', 'ROLE_USER_READ'],
     *     readMOs: [':deviceId', 123],
     *     adminMOs: [':deviceId', 321]
     *   };
     *   function tryExecuteAction() {
     *     return c8yPermissions.mustBeAllowed(cfg)
     *       .then(
     *         exectueAction,
     *         angular.bind(c8yAlert, c8yAlert.danger, 'You are not allowed to write this MO!'
     *       );
     *   }
     * </pre>
     */
    function mustBeAllowed(cfg, user) {
      return booleanPromiseToRejectablePromise(isAllowed(cfg, user));
    }

    function booleanPromiseToRejectablePromise(promise) {
      return promise.then(function (result) {
        if (result) {
          return $q.when(result);
        } else {
          return $q.reject(result);
        }
      });
    }

    function allTrue(arr) {
      return _.every(arr, function (a) {
        return !!a;
      });
    }

    /**
     * @ngdoc function
     * @name getMOPermissions
     * @methodOf c8y.core.service:c8yPermissions
     *
     * @description
     * Gets users and groups specific permissions for given managed object.
     *
     * @param {integer|object} mo Managed object or id.
     *
     * @returns {promise} Returns promise with the list of users and groups with permissions.
     * {
     *   groups: [
     *     {
     *       group: {
     *         id: 4,
     *         name: 'devices'
     *       },
     *       scope: 'MANAGED_OBJECT',
     *       type: '*',
     *       access: 'READ'
     *     }
     *   ],
     *   users: [
     *     {
     *       username: 'user',
     *       scope: 'AUDIT',
     *       type: '*',
     *       permission: 'READ'
     *     }
     *  ]
     * }
     *
     * @example
     * <pre>
     *
     * </pre>
     */
    function getMOPermissions(mo) {
      var moId = mo.id || mo,
        url = c8yBase.url(moPermissionsPath + '/' + moId);

      if (_.isObjectLike(moId)) {
        return $q.when({
          groups: [],
          users: []
        });
      }
      return $http.get(url)
        .then(c8yBase.getResData)
        .then(_.partial(parsePermissionsData, moId));
    }

    function parsePermissionsData(moId, data) {
      var permissions = {
        groups: [],
        users: []
      };
      _.forEach(data.groups, _.partial(parseGroupPermissions, permissions, moId));
      _.forEach(data.users, _.partial(parseUserPermissions, permissions, moId));
      return permissions;
    }

    function parseGroupPermissions(permissions, moId, group) {
      _.forEach(group.devicePermissions[moId], function (devPerm) {
        var parsedDevPerm = parseDevPerm(devPerm);
        var p = {
          group: {
            id: group.id,
            name: group.name
          },
          scope: parsedDevPerm.scope,
          type: parsedDevPerm.type,
          access: parsedDevPerm.access
        };
        permissions.groups.push(p);
      });
    }

    function parseUserPermissions(permissions, moId, user) {
      _.forEach(user.devicePermissions[moId], function (devPerm) {
        var parsedDevPerm = parseDevPerm(devPerm);
        var p = {
          username: user.userName,
          scope: parsedDevPerm.scope,
          type: parsedDevPerm.type,
          access: parsedDevPerm.access
        };
        permissions.users.push(p);
      });
    }

    function parseDevPerm(devPerm) {
      var permissionParts = devPerm.split(':');
      return {scope: permissionParts[0], type: permissionParts[1], access: permissionParts[2]};
    }

    /**
     * @ngdoc function
     * @name getMOPermissions
     * @methodOf c8y.core.service:c8yPermissions
     *
     * @description
     * Gets users and groups that have specific permissions for given managed object.
     *
     * @param {integer|object} mo Managed object or id.
     *
     * @returns {promise} Returns $http promise with the list of users and groups with permissions.
     *
     * @example
     * <pre>
     *   var moId = 1;
     *   $scope.permissions = c8yPermissions.getMOPermissions(moId);
     * </pre>
     */
    function setMOPermissions(mo, permissions) {
      var moId = mo.id || mo,
        url = c8yBase.url(moPermissionsPath + '/' + moId),
        data = parsePermissions(moId, permissions);

      return $http.put(url, data);
    }

    function parsePermissions(moId, permissions) {
      var data = {
        groups: [],
        users: []
      };
      parseGroupsPermissions(data.groups, moId, permissions.groups);
      parseUsersPermissions(data.users, moId, permissions.users);
      return data;
    }

    function parseGroupsPermissions(groupsData, moId, groupsPermissions) {
      var permissionsByGroupId = _.groupBy(groupsPermissions, function (groupPermission) {
        return groupPermission.group.id;
      });
      _.forEach(permissionsByGroupId, function (groupPermissions, groupId) {
        var g = {
          id: groupId,
          devicePermissions: {}
        };
        g.devicePermissions[moId] = _.map(groupPermissions, function (gp) {
          return parsePermissionObjToString(gp);
        });
        groupsData.push(g);
      });
    }

    function parseUsersPermissions(usersData, moId, usersPermissions) {
      var permissionsByUserName = _.groupBy(usersPermissions, function (userPermission) {
        return userPermission.userName;
      });
      _.forEach(permissionsByUserName, function (userPermissions, userName) {
        var u = {
          userName: userName,
          devicePermissions: {}
        };
        u.devicePermissions[moId] = _.map(userPermissions, function (up) {
          return parsePermissionObjToString(up);
        });
        usersData.push(u);
      });
    }

    function parsePermissionObjToString(permissionObj) {
      return [
        permissionObj.scope,
        permissionObj.type,
        permissionObj.access
      ].join(':');
    }

    function getAccessTypes() {
      return ['READ', 'ADMIN', '*'];
    }

    return {
      hasRole: hasRole,
      hasDevicePermission: hasDevicePermission,
      hasAnyRole: hasAnyRole,
      mustHaveAnyRole: mustHaveAnyRole,
      hasAllRoles: hasAllRoles,
      mustHaveAllRoles: mustHaveAllRoles,
      canReadMOs: canReadMOs,
      mustHaveReadMOs: mustHaveReadMOs,
      canAdminMOs: canAdminMOs,
      mustHaveAdminMOs: mustHaveAdminMOs,
      isAllowed: isAllowed,
      mustBeAllowed: mustBeAllowed,
      getMOPermissions: getMOPermissions,
      setMOPermissions: setMOPermissions,
      getAccessTypes: getAccessTypes
    };
  }
})();
