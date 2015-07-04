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
angular.module('c8y.core')
.factory('c8yUser', ['$http', '$q', '$timeout', 'c8yBase', 'info', 'c8yAuth',
function ($http, $q, $timeout, c8yBase, info, c8yAuth) {
  'use strict';
  var path = 'user/{tenant}/users',
    currentUserPath = 'user/currentUser',
    // userContentType = c8yBase.mimeType('user'),
    // usersContentType = c8yBase.mimeType('userCollection'),
    currentUser = null,
    config = {
      headers: c8yBase.contentHeaders('user', true)
    },
    configCurrentUser = {
      headers: c8yBase.contentHeaders('user', true)
    };

  function applyTenant(url, tenant) {
    return url.replace(/{tenant}/g, tenant);
  }

  function clean(user) {
    user = angular.copy(user);
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
      return url + '/' + _id;
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
    var FIND_TENANT = /\/user\/(\w+)\//,
      match = url.match(FIND_TENANT);

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
   * @returns {promise} Returns promise with user object that contains user id, roles list, groups list.
   *
   * @example
   * <pre>
   *   c8yUser.current(function (user) {
   *     $scope.user = user;
   *   });
   * </pre>
   */
  function current(forceUpdate) {
    var url = currentUserPath,
      cfg = angular.copy(configCurrentUser),
      output;

    if (forceUpdate) {
      currentUser = null;
    }

    if (currentUser && !angular.isFunction(currentUser.then)) {
      output = $q.when(currentUser);
    } else {
      output = currentUser = currentUser || $http.get(c8yBase.url(url), cfg).then(function (res) {
        currentUser = res.data;
        currentUser.tenant = getTenantFromSelf(currentUser.self);
        return currentUser;
      }).catch(function () {
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
      cfg = angular.copy(configCurrentUser);
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
    var data = clean(user),
      cfg = angular.copy(config);
    return buildUsersUrl().then(function (url) {
      return $http.post(url, data, cfg);
    });
  }

  function update(user, isCurrent) {
    var data = clean(user),
      cfg = angular.copy(config),
      url = isCurrent ? buildCurrentUserUrl() : buildUserUrl(user);
      return url.then(function(url) {
        return $http.put(url, data, cfg);
      });
  }

  function save(user) {
    var action = user.id ? update(user) : create(user);
    action.then(function() {
      updateToken(user);
    });
    return action;
  }

  function saveCurrent(user) {
    return update(user, true)
      .then(function() {
        updateToken(user);
      });
  }

  function updateToken(user) {
    checkIfCurrent(user).then(function(isCurrent) {
      if(isCurrent) {
        c8yAuth.updatePassword(getPassword(user));
      }
    });
  }

  function checkIfCurrent(user) {
    var userId = user.id || user;
    return current().then(function(currentUser) {
      return $q.when(currentUser.id === userId);
    });
  }

  function getPassword(user) {
    var token = c8yAuth.decodeToken(info.token);
    return user.password || token.password
  }

  function isCurrentPassword(password) {
    var token = c8yAuth.decodeToken(info.token);
    return token.password === password;
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
      angular.forEach(user.roles.references, function (ref) {
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
      angular.forEach(user.groups.references, function (groupRef) {
        angular.forEach(groupRef.group.roles.references, function (roleRef) {
          if (roleRef.role.id === roleId) {
            result = true;
          }
        });
      });
    }
    return result;
  }

  function getDevicePermissions(user, deviceId) {
    var _filter = c8yBase.pageSizeFilter({moId: deviceId}),
    cfg = {
      params: _filter
    };

    return buildUserUrl(user).then(function (url) {
      return $http.get(url+"/devicePermissions", cfg);
    });
  }

  function login(tenant, username, password, remember) {
    return $q.when(getToken(tenant, username, password))
      .then(_.partial(confirmToken, remember));
  }

  function logout() {
    currentUser = null;
  }

  function getToken(tenant, username, password) {
    return btoa(
      (tenant ? tenant + '/' : '') +
      username + ':' +
      password
    );
  }

  function confirmToken(remember, _token) {
    info.token = _token;
    var user;
    return $http.get(c8yBase.url(currentUserPath), {
      headers: getHeaders(_token)
    }).then(function (res) {
      info.token = _token;
      setToken(_token, remember);
      user = res.data;
    })
    .then(
      angular.noop,
      function () {
        if (getToken()) {
          deleteToken();
        }
      }
    ).then(function () {
      return user;
    });
  }

  function setToken(_token, remember) {
    if (remember) {
      window.localStorage.setItem('_tcy8', _token);
    } else {
      window.sessionStorage.setItem('_tcy8', _token);
    }
  }

  function deleteToken() {
    return window.localStorage.removeItem('_tcy8');
  }

  function isAdmin(user) {
    var admin = _.some(user.groups.references, function (ref) {
      return ref.group.name === 'admins';
    });
    return admin;
  }

  function getHeaders(_token) {
    var t = _token || TOKEN;
    return {
      Authorization: 'Basic ' + t,
      UseXBasic: true,
      // 'X-Cumulocity-Application-Key': 'devicemanagement-application-key',
      Accept: 'application/vnd.com.nsn.cumulocity.user+json;'
    };
  }

  return {
    current: current,
    checkIfCurrent: checkIfCurrent,
    list: list,
    detail: detail,
    detailCurrent: detailCurrent,
    remove: remove,
    save: save,
    saveCurrent: saveCurrent,
    groups: groups,
    isDeviceUser: isDeviceUser,
    hasRole: hasRole,
    getDevicePermissions: getDevicePermissions,
    login: login,
    logout: logout,
    isAdmin: isAdmin,
    isCurrentPassword: isCurrentPassword
  };

}]);
