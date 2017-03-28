/**
 * @ngdoc service
 * @name c8y.core.service:c8yUser
 * @requires c8y.core.service:c8yBase
 * @requires $http
 * @requires $q
 * @requires $timeout
 *
 * @description
 * This service allows for managing users.
 */
(function () {
  'use strict';

  angular.module('c8y.core')
    .factory('c8yUser', c8yUser);

  /* @ngInject */
  function c8yUser(
    $http,
    $q,
    $timeout,
    $rootScope,
    $routeParams,
    c8yBase,
    c8yAuth,
    c8ySettings
  ) {
    var path = 'user/{tenant}/users';
    var currentUserPath = 'user/currentUser';
    var currentUser = null;
    var config = {
      headers: c8yBase.contentHeaders('user', true)
    };
    var configCurrentUser = {
      headers: c8yBase.contentHeaders('user', true)
    };

    function applyTenant(url, tenant) {
      return url.replace(/\{tenant\}/g, tenant);
    }

    function clean(user) {
      user = _.cloneDeep(user);
      if (user.id) {
        delete user.userName;
      }
      delete user.id;
      delete user.self;
      delete user.effectiveRoles;
      return user;
    }

    function buildUserUrl(user) {
      var _id = user.id || user;
      return buildUsersUrl().then(function (url) {
        return url + '/' + encodeURIComponent(_id);
      });
    }

    function buildCurrentUserUrl() {
      return $q.when(c8yBase.url(currentUserPath));
    }

    function buildUsersUrl() {
      return current().then(function (user) {
        return c8yBase.url(applyTenant(path, user.tenant));
      });
    }

    function getTenantFromSelf(url) {
      var FIND_TENANT = /\/user\/(\w+)\//;
      var match = url.match(FIND_TENANT);

      if (match.length < 2) {
        throw(new Error('Cannot find tenant on user self URL'));
      }
      return match[1];
    }

    /**
     * @ngdoc function
     * @name current
     * @methodOf c8y.core.service:c8yUser
     *
     * @description
     * Gets user that is currently logged in.
     *
     * @param {bool} forceUpdate Forces refreshing current user data from server.
     *
     * @returns {promise} Returns promise with user object that contains user id, roles list, groups list and other user data.
     *
     * @example
     * <pre>
     *   c8yUser.current()
     *     .then(function (currentUser) {
     *       $scope.currentUser = currentUser;
     *     });
     * </pre>
     */
    function current(forceUpdate) {
      var url = currentUserPath,
        cfg = _.cloneDeep(configCurrentUser),
        output;

      if (forceUpdate) {
        currentUser = null;
      }

      if (currentUser && !_.isFunction(currentUser.then)) {
        output = $q.when(currentUser);
      } else {
        output = currentUser = currentUser || $http.get(c8yBase.url(url), cfg).then(function (res) {
          currentUser = res.data;
          currentUser.tenant = getTenantFromSelf(currentUser.self);
          return currentUser;
        }, function () {
          currentUser = null;
          return $q.reject();
        });
      }

      return output;
    }

    /**
     * @ngdoc function
     * @name list
     * @methodOf c8y.core.service:c8yUser
     *
     * @description
     * Gets the list of users.
     *
     * @param {object} filter Filters object.
     *
     * @returns {promise} Returns promise with the list of users<!-- (see user object specification {@link http://docs.cumulocity.com/user@TODO here}).-->
     *
     * @example
     * <pre>
     *   c8yUser.list().then(function (users) {
     *     $scope.users = users;
     *   });
     * </pre>
     */
    function list(filter) {
      var _filter = c8yBase.pageSizeFilter(filter),
        cfg = {
          params: _filter
        },
        onList = c8yBase.cleanListCallback('users', list, _filter);

      return buildUsersUrl().then(function (url) {
        return $http.get(url, cfg).then(onList);
      });
    }

    /**
     * @ngdoc function
     * @name detail
     * @methodOf c8y.core.service:c8yUser
     *
     * @description
     * Gets the details of given user.
     *
     * @param {object|integer} user User object or user's id.
     * @param {boolean} silentError Prevent from display c8yAlert when request reject.
     *
     * @returns {promise} Returns $http's promise with user object<!-- (see user object specification {@link http://docs.cumulocity.com/user@TODO here})-->.
     *
     * @example
     * <pre>
     *   var userId = 'admin';
     *   c8yUser.detail(userId).then(function (res) {
     *     $scope.user = res.data;
     *   });
     * </pre>
     */
    function detail(user, silentError) {
      var cfg = {silentError: !!silentError};
      return buildUserUrl(user).then(function (url) {
        return $http.get(url, cfg);
      });
    }

    /**
     * @ngdoc function
     * @name detailCurrent
     * @methodOf c8y.core.service:c8yUser
     *
     * @description
     * Gets the details of current user.
     *
     * @returns {promise} Returns $http's promise with current user details object.
     *
     * @example
     * <pre>
     *   c8yUser.detailCurrent().then(function (res) {
     *     $scope.currentUserDetails = res.data;
     *   });
     * </pre>
     */
    function detailCurrent() {
      var url = c8yBase.url(currentUserPath),
        cfg = _.cloneDeep(configCurrentUser);
      return $http.get(url, cfg);
    }

    /**
     * @ngdoc function
     * @name remove
     * @methodOf c8y.core.service:c8yUser
     *
     * @description
     * Removes user.
     *
     * @param {object|integer} user User object or user's id.
     *
     * @returns {promise} Returns $http's promise.
     *
     * @example
     * <pre>
     *   var userId = 'test';
     *   c8yUser.remove(userId);
     * </pre>
     */
    function remove(user) {
      return buildUserUrl(user).then(function (url) {
        return $http['delete'](url);
      });
    }

    /**
     * @ngdoc function
     * @name create
     * @methodOf c8y.core.service:c8yUser
     *
     * @description
     * Creates a new user.
     *
     * @param {object} user User object.
     *
     * @returns {promise} Returns $http's promise.
     *
     * @example
     * <pre>
     *   var user = {
     *     enabled: true,
     *     devicePermissions: {},
     *     applications: [{id: 6, type: 'HOSTED'}],
     *     userName: 'test',
     *     firstName: 'Test',
     *     lastName: 'Test',
     *     email: 'test@example.com',
     *     phone: '543432321',
     *     password: 'password',
     *     passwordStrength: 'RED'
     *   };
     *   c8yUser.create(user);
     * </pre>
     */
    function create(user) {
      var data = clean(user);
      var cfg = _.cloneDeep(config);
      return buildUsersUrl().then(function (url) {
        return $http.post(url, data, cfg);
      });
    }

    /**
     * @ngdoc function
     * @name enable
     * @methodOf c8y.core.service:c8yUser
     *
     * @description
     * Enables user.
     *
     * @param {object} user User object or id.
     *
     * @returns {promise} Returns $http's promise.
     *
     * @example
     * <pre>
     *   var user = {
     *     id: 5345
     *   };
     *   c8yUser.enable(user);
     * </pre>
     */
    function enable(user) {
      var userId = user.id || user;
      return save({id: userId, enabled: true});
    }

    /**
     * @ngdoc function
     * @name disable
     * @methodOf c8y.core.service:c8yUser
     *
     * @description
     * Disables user.
     *
     * @param {object} user User object or id.
     *
     * @returns {promise} Returns $http's promise.
     *
     * @example
     * <pre>
     *   var user = {
     *     id: 5345
     *   };
     *   c8yUser.disable(user);
     * </pre>
     */
    function disable(user) {
      var userId = user.id || user;
      return save({id: userId, enabled: false});
    }

    function update(user, isCurrent) {
      var data = clean(user);
      var cfg = _.cloneDeep(config);
      var urlPromise = isCurrent ? buildCurrentUserUrl() : buildUserUrl(user);
      return urlPromise
        .then(function (url) {
          return $http.put(url, data, cfg);
        })
        .then(function (res) {
          var output = res;
          var _user = res.data;
          var promises = [];

          if (!_.isUndefined(user.owner) && user.owner !== _user.owner) {
            promises.push(
              user.owner === null ?
                removeOwner(_user) :
                updateOwner(user, urlPromise)
            );
          }

          if (!_.isUndefined(user.delegatedBy) && user.delegatedBy !== _user.delegatedBy) {
            promises.push(
              user.delegatedBy === null ?
                removeDelegatedBy(_user) :
                updateDelegatedBy(user, urlPromise)
            );
          }

          if (promises.length) {
            output = $q.all(promises)
              .then(_.partial(detail, user));
          }

          return output;
        });
    }

    function updateOwner(user, urlPromise) {
      var data = {owner: user.owner};
      var _headers = {
        'Content-Type': c8yBase.mimeType('userOwnerReference')
      };
      return urlPromise
        .then(function (url) {
          return url + '/owner';
        })
        .then(function (url) {
          return $http.put(url, data, {headers: _headers});
        });
    }

    function updateDelegatedBy(user, urlPromise) {
      var data = {delegatedBy: user.delegatedBy};
      var _headers = {
        'Content-Type': c8yBase.mimeType('userDelegatedByReference')
      };
      return urlPromise
        .then(function (url) {
          return url + '/delegatedby';
        })
        .then(function (url) {
          return $http.put(url, data, {headers: _headers});
        });
    }

    /**
     * @ngdoc function
     * @name save
     * @methodOf c8y.core.service:c8yUser
     *
     * @description
     * Saves user data.
     *
     * @param {object} user User object to save.
     *
     * @returns {promise} Returns $http's promise with result.
     *
     * @example
     * <pre>
     *   var user = {
     *     id: 'myuser',
     *     email: 'test@example.com'
     *   };
     *   c8yUser.save(user)
     *     .then(function () {
     *       console.log('User saved!');
     *     });
     * </pre>
     */
    function save(user) {
      var action = user.id ? update(user) : create(user);
      action.then(function (res) {
        updateToken(user);
        return res;
      });
      return action;
    }

    function removeOwner(user) {
      return buildUserUrl(user)
        .then(function (_url) {
          var url = _url + '/owner';
          return $http.delete(url);
        })
        .then(_.partial(detail, user));
    }

    function removeDelegatedBy(user) {
      return buildUserUrl(user)
        .then(function (_url) {
          var url = _url + '/delegatedby';
          return $http.delete(url);
        })
        .then(_.partial(detail, user));
    }

    function saveCurrent(user) {
      return update(user, true)
        .then(function () {
          updateToken(user);
        });
    }

    function updateToken(user) {
      checkIfCurrent(user).then(function (isCurrent) {
        if (isCurrent) {
          c8yAuth.updatePassword(getPassword(user));
        }
      });
    }

    function checkIfCurrent(user) {
      var userId = user.id || user;
      return current().then(function (currentUser) {
        return $q.when(currentUser.id === userId);
      });
    }

    function getPassword(user) {
      return user.password || c8yAuth.getPassword();
    }

    function isCurrentPassword(password) {
      return c8yAuth.getPassword() === password;
    }

    function groups(user) {
      var _groups = (user.groups && user.groups.references) || [];
      return _groups.map(function (ref) {
        return ref.group;
      });
    }

    function isDeviceUser(user) {
      return user.id.match(/^device_/);
    }

    /**
     * @ngdoc function
     * @name hasRole
     * @methodOf c8y.core.service:c8yUser
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

    function getDevicePermissions(user, deviceId) {
      var _filter = c8yBase.pageSizeFilter({moId: deviceId});
      var cfg = {
        params: _filter
      };

      return buildUserUrl(user).then(function (url) {
        return $http.get(url + '/devicePermissions', cfg);
      });
    }

    function login(tenant, username, password, remember) {
      var token = c8yAuth.encodeToken(username, password, tenant);
      return c8yAuth.setAuthToken(token)
        .then(_.partial(c8yAuth.saveAuthToken, remember));
    }

    function logout() {
      return c8yAuth.logout();
    }

    function isAdmin(user) {
      var admin = _.some(user.groups.references, function (ref) {
        return ref.group.name === 'admins';
      });
      return admin;
    }

    function getHeaders(token) {
      var headers = c8yAuth.headers();
      if (token) {
        headers.Authorization = 'Basic ' + token;
      }
      return _.assign(headers, c8yBase.contentHeaders('user', true));
    }

    function isTfaActive(user) {
      var newUser = _.isUndefined(user.id);

      return newUser ?
             isTfaAvailable() :
             $q.when(user)
              .then(function (userDetails) {
                var tfaActive = userDetails.twoFactorAuthenticationEnabled;

                return isTfaReadonly(user)
                  .then(function (enforced) {
                    if (enforced) {
                      tfaActive = true;
                    }
                    return tfaActive;
                  });
              });
    }

    /*
     * TFA feature is available if any of these following conditions is true:
     * - Enabled in tenant options.
     * - Enabled in system options.
     * - TFA is enforced (either in tenant or group level).
     */
    function isTfaAvailable() {
      var tfaEnabledOption = {
        category: 'two-factor-authentication',
        key: 'enabled'
      };

      return $q
        .all([
          c8ySettings.detailValue(tfaEnabledOption),
          c8ySettings.getSystemOptionValue(tfaEnabledOption),
          isTfaEnforced()
        ])
        .then(function (values) {
          return _.reduce(values, function (available, value) {
            return available || value;
          }, false);
        });
    }

    /*
     * TFA is "readonly" when it is enforced (in either tenant or group level).
     * After clarification from Wojciech: Enforced means enforced. Even user with
     * admins role should not be able to change the TFA state when enforced.
     */
    function isTfaReadonly(user) {
      return isTfaEnforced({ user: user });
    }

    function isTfaEnforced(options) {
      var opts = options || {};
      var user = opts.user;
      var userPromise = user ? $q.when(user) : current();

      return userPromise
        .then(function (user) {
          return $q
            .all([
              isTfaTenantEnforcedForUser(user),
              isTfaGroupEnforcedForUser(user)
            ])
            .then(function (values) {
              return Boolean(values[0] || values[1]);
            });
        });
    }

    function c8ySettings2TFAEnforced() {
      if (!c8ySettings2TFAEnforced._calling) {
        var calling = c8ySettings2TFAEnforced._calling = c8ySettings.getSystemOptionValue({
          category: 'two-factor-authentication',
          key: 'enforced'
        });
        calling.finally(function () {
          c8ySettings2TFAEnforced._calling = undefined;
        });
      }
      return c8ySettings2TFAEnforced._calling;
    }

    function c8ySettings2TFAEnforcedGroup() {
      if (!c8ySettings2TFAEnforcedGroup._calling) {
        var calling = c8ySettings2TFAEnforcedGroup._calling = c8ySettings.getSystemOptionValue({
          category: 'two-factor-authentication',
          key: 'enforced.group'
        });
        calling.finally(function () {
          c8ySettings2TFAEnforcedGroup._calling = undefined;
        });
      }
      return c8ySettings2TFAEnforcedGroup._calling;
    }

    function isTfaTenantEnforcedForUser(user) {
      return c8ySettings2TFAEnforced()
        .then(function (enforcedTfaTenantsCsv) {
          var enforcedTfaTenants = [];

          if (enforcedTfaTenantsCsv) {
            enforcedTfaTenants = enforcedTfaTenantsCsv.split(',');
          }

          return _.some(enforcedTfaTenants, function (enforcedTfaTenant) {
            return enforcedTfaTenant === user.tenant;
          });
        });
    }

    function isTfaGroupEnforcedForUser(user) {
      return c8ySettings2TFAEnforcedGroup()
        .then(function (enforcedTfaGroupName) {
          return _.some(groups(user), function (userGroup) {
            return userGroup.name === enforcedTfaGroupName;
          });
        });
    }

    /**
     * @ngdoc function
     * @name savePhoneNumber
     * @methodOf c8y.core.service:c8yUser
     *
     * @description Saves provided phone number for given user.
     *
     * @param {object} user User object
     * @param {string} phoneNumber Phone number (international phone number format)
     *
     * @returns {promise} promise Returns $http promise
     *
     */
    function savePhoneNumber(user, phoneNumber) {
      var url = c8yBase.url('user/currentUserPhone'),
        token = c8yAuth.encodeToken(user.name, user.password, user.tenant),
        config = {
          headers: getHeaders(token),
          method: 'PUT',
          url: url,
          data: {
            phone: phoneNumber
          },
          silentError: true
        };
      return $http(config);
    }

    /**
     * @ngdoc function
     * @name activateSupportUser
     * @methodOf c8y.core.service:c8yUser
     *
     * @description Activates support user access on behalf of the current user or on
     * behalf of a supplied user.
     *
     * @param {object|string} user User reference
     *
     * @returns {promise} promise Returns a promise that resolves when the request is successful
     *
     */
    function activateSupportUser(user) {
      var promise = user ? $q.when(user) : current();
      var METHOD = 'PUT';
      var URL = c8yBase.url('tenant/support-user/enable');

      return promise
        .then(function () {
          return $http({
            method: METHOD,
            url: URL
          });
        });
    }

    function inventoryRolesUrl(userUrl) {
      return userUrl + '/roles/inventory';
    }

    /**
     * @ngdoc function
     * @name listInventoryRoles
     * @methodOf c8y.core.service:c8yUser
     *
     * @description List the inventory roles applied to a specific user
     * @param {object} user User object. If omitted the current user is used
     * @returns {promise} A promise that when resolved returns the array of inventory roles
     */
    function listInventoryRoles(user) {
      var userPromise = user ? $q.when(user) : current();
      var doCall = function (url) {
        return $http.get(url);
      };
      return userPromise
        .then(buildUserUrl)
        .then(inventoryRolesUrl)
        .then(doCall);
    }

    /**
     * @ngdoc function
     * @name assignInventoryRoles
     * @methodOf c8y.core.service:c8yUser
     *
     * @description List the inventory roles applied to a specific user in the context of a specific managed object.
     * @param {object} user User object. If omitted the current user is used
     * @param {string} manageObjectId The ID of managed object to which assign the roles to.
     * @param {array} roleIds An array of objects with id property defined corresponding to each role.
     * @returns {promise} A promise that when resolved returns the $http response object
     */
    function assignInventoryRoles(user, manageObjectId, roleIds) {
      var userPromise = user ? $q.when(user) : current();
      var data = {
        managedObject: manageObjectId,
        roles: _.map(roleIds, function (r) {
          return _.pick(r, 'id');
        })
      };
      var doCall = function (url) {
        return $http.post(url, data);
      };
      return userPromise
        .then(buildUserUrl)
        .then(inventoryRolesUrl)
        .then(doCall);
    }

    /**
     * @ngdoc function
     * @name updateInventoryRoles
     * @methodOf c8y.core.service:c8yUser
     *
     * @description Update the roles in a specific existing assignment
     * @param {object} user User object. If omitted the current user is used
     * @param {string} assignmentId The id of the assignment object
     * @param {array} roleIds An array of objects with id property defined corresponding to each role.
     * @returns {promise} Returns a $http promise
     */
    function updateInventoryRoles(user, assignmentId, roleIds) {
      var userPromise = user ? $q.when(user) : current();
      var data = {
        roles: _.map(roleIds, function (r) {
          return _.pick(r, 'id');
        })
      };
      var doCall = function (url) {
        var detailUrl = url + '/' + assignmentId;
        return $http.put(detailUrl, data);
      };
      return userPromise
        .then(buildUserUrl)
        .then(inventoryRolesUrl)
        .then(doCall);
    }

    /**
     * @ngdoc function
     * @name removeInventoryRoles
     * @methodOf c8y.core.service:c8yUser
     *
     * @description Removes the inventory role assignment from the user
     * @param {object} user User object. If omitted the current user is used
     * @param {string} assignmentId The id of the assignment object
     * @returns {promise} A promise that when resolved the $http response
     */
    function removeInventoryRoles(user, assignmentId) {
      var userPromise = user ? $q.when(user) : current();
      var doCall = function (url) {
        var detailUrl = url + '/' + assignmentId;
        return $http.delete(detailUrl);
      };
      return userPromise
        .then(buildUserUrl)
        .then(inventoryRolesUrl)
        .then(doCall);
    }

    function delegateTo(_user) {
      var user = {id: _user.id};
      return current()
        .then(function (_currentUser) {
          user.delegatedBy = _currentUser.id;
          return update(user);
        });
    }

    $rootScope.$on('authStateChange', function (evt, data) {
      if (!data.hasAuth) {
        currentUser = null;
      }
    });

    return {
      current: current,
      checkIfCurrent: checkIfCurrent,
      list: list,
      detail: detail,
      detailCurrent: detailCurrent,
      remove: remove,
      enable: enable,
      disable: disable,
      save: save,
      saveCurrent: saveCurrent,
      savePhoneNumber: savePhoneNumber,
      groups: groups,
      isDeviceUser: isDeviceUser,
      hasRole: hasRole,
      getDevicePermissions: getDevicePermissions,
      login: login,
      logout: logout,
      isAdmin: isAdmin,
      isCurrentPassword: isCurrentPassword,
      isTfaAvailable: isTfaAvailable,
      isTfaActive: isTfaActive,
      isTfaReadonly: isTfaReadonly,
      getHeaders: getHeaders,
      activateSupportUser: activateSupportUser,
      delegateTo: delegateTo,

      listInventoryRoles: listInventoryRoles,
      assignInventoryRoles: assignInventoryRoles,
      updateInventoryRoles: updateInventoryRoles,
      removeInventoryRoles: removeInventoryRoles
    };
  }
}());
