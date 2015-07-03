/**
 * @ngdoc service
 * @name c8y.core.service:c8yApplication
 * @requires c8y.core.service:c8yBase
 * @requires c8y.core.service:c8yUser
 * @requires c8y.core.service:c8yInventory
 * @requires $http
 * @requires $location
 * @requires $q
 * @requires $window
 * @requires $interval
 *
 * @description
 * This service allows for managing applications.
 */
angular.module('c8y.core')
.factory('c8yApplication', ['$http', '$location','$q', '$window', '$interval', 'c8yBase', 'c8yUser', 'c8yInventory',
function($http, $location, $q, $window, $interval, c8yBase, c8yUser, c8yInventory) {
  'use strict';

  var basePath = 'application/',
    basePath2 = basePath + 'applications',
    defaultConfig = {
      headers: c8yBase.contentHeaders('application', true)
    },
    self = this,
    iconMap = {
      HOSTED: 'cloud',
      EXTERNAL: 'external-link-square',
      SMARTAPP: 'puzzle-piece'
    };


  function clean(app) {
    var _app = angular.copy(app);
    delete _app.type;
    delete _app.key;
    return _app;
  }

  function _list(path, filters) {
    return c8yUser.current().then(function (user) {
      var tenant = user.tenant,
        _filters = c8yBase.pageSizeFilter(filters),
        cfg = {
          params: _filters,
          cache: true
        },
        url = c8yBase.url(path) + '/' + tenant,
        onList = c8yBase.cleanListCallback('applications',
          angular.bind(self, _list, path),
          _filters);

      return $http.get(url, cfg).then(onList);
    });
  }

  /**
   * @ngdoc function
   * @name listByUser
   * @methodOf c8y.core.service:c8yApplication
   *
   * @description
   * Gets the list of applications for user.
   *
   * @param {object} user User object to query applications for.
   * @param {object} filters Object containing filters for querying applications.
   *
   * @returns {promise} Returns the promise with the array of applications. Each application has the following properties:
   *
   * - **id** - `integer` - Application's id.
   * - **name** - `string` - Application's name.
   * - **key** - `string` - Application's key.
   * - **type** - `string` - Application's type. Available values:
   *     - **HOSTED** -  Application is hosted by Cumulocity.
   *     - **EXTERNAL** - Application is hosted by external provider.
   * - **resourcesUrl** - `string` - Application's resources URL (repository URL).
   * - **resourcesUsername** - `string` - Username needed to access application's resources.
   * - **contextPath** - `string` - Application's context path.
   * - **externalUrl** - `string` - External URL with application.
   * - **availability** - `string` - Indicates the level of availability.
   *     - **PRIVATE** - Application is available privately.
   *     - **MARKET** - Application is available publicly.
   * - **owner** - `object` - Owner object with the following properties:
   *     - **tenant** - `object` - Tenant object with the following properties:
   *         - **id** - `string` - Tenant's id.
   *
   * @example
   * <pre>
   *   c8yUser.current().then(function (user) {
   *     c8yApplication.listByUser(user).then(function (applications) {
   *       $scope.applications = [];
   *       applications.forEach(function (app) {
   *         $scope.applications.push(app);
   *       });
   *     });
   *   });
   * </pre>
   */
  function listByUser(user, filters) {
    return c8yUser.current().then(function (currentUser) {
      user = user || currentUser;
      var _filters = c8yBase.pageSizeFilter(filters),
        cfg = {
          params: _filters,
          cache: true
        },
        url = c8yBase.url(basePath + 'applicationsByUser/' + user.id),
        onList = c8yBase.cleanListCallback('applications',
          angular.bind(self, listByUser, user),
          _filters);

      return $http.get(url, cfg).then(onList);
    });
  }

  /**
   * @ngdoc function
   * @name listByOwner
   * @methodOf c8y.core.service:c8yApplication
   *
   * @description
   * Gets the list of applications by owner.
   *
   * @param {object} filters Object containing filters for querying applications.
   *
   * @returns {promise} Returns the promise with the array of applications. Each application has the following properties:
   *
   * - **id** - `integer` - Application's id.
   * - **name** - `string` - Application's name.
   * - **key** - `string` - Application's key.
   * - **type** - `string` - Application's type. Available values:
   *     - **HOSTED** -  Application is hosted by Cumulocity.
   *     - **EXTERNAL** - Application is hosted by external provider.
   * - **resourcesUrl** - `string` - Application's resources URL (repository URL).
   * - **resourcesUsername** - `string` - Username needed to access application's resources.
   * - **contextPath** - `string` - Application's context path.
   * - **externalUrl** - `string` - External URL with application.
   * - **availability** - `string` - Indicates the level of availability.
   *     - **PRIVATE** - Application is available privately.
   *     - **MARKET** - Application is available publicly.
   * - **owner** - `object` - Owner object with the following properties:
   *     - **tenant** - `object` - Tenant object with the following properties:
   *         - **id** - `string` - Tenant's id.
   *
   * @example
   * <pre>
   *   c8yApplication.listByOwner().then(function (applications) {
   *     $scope.applications = [];
   *     applications.forEach(function (app) {
   *       $scope.applications.push(app);
   *     });
   *   });
   * </pre>
   */
  function listByOwner(filters) {
    return _list(basePath + 'applicationsByOwner', filters);
  }

  /**
   * @ngdoc function
   * @name listByTenant
   * @methodOf c8y.core.service:c8yApplication
   *
   * @description
   * Gets the list of applications for tenant.
   *
   * @param {object} filters Object containing filters for querying applications.
   *
   * @returns {promise} Returns the promise with the array of applications. Each application has the following properties:
   *
   * - **id** - `integer` - Application's id.
   * - **name** - `string` - Application's name.
   * - **key** - `string` - Application's key.
   * - **type** - `string` - Application's type. Available values:
   *     - **HOSTED** -  Application is hosted by Cumulocity.
   *     - **EXTERNAL** - Application is hosted by external provider.
   * - **resourcesUrl** - `string` - Application's resources URL (repository URL).
   * - **resourcesUsername** - `string` - Username needed to access application's resources.
   * - **contextPath** - `string` - Application's context path.
   * - **externalUrl** - `string` - External URL with application.
   * - **availability** - `string` - Indicates the level of availability.
   *     - **PRIVATE** - Application is available privately.
   *     - **MARKET** - Application is available publicly.
   * - **owner** - `object` - Owner object with the following properties:
   *     - **tenant** - `object` - Tenant object with the following properties:
   *         - **id** - `string` - Tenant's id.
   *
   * @example
   * <pre>
   *   c8yApplication.listByTenant().then(function (applications) {
   *     $scope.applications = [];
   *     applications.forEach(function (app) {
   *       $scope.applications.push(app);
   *     });
   *   });
   * </pre>
   */
  function listByTenant(filters) {
    return _list(basePath + 'applicationsByTenant', filters);
  }

  /**
   * @ngdoc function
   * @name listPlugins
   * @methodOf c8y.core.service:c8yApplication
   *
   * @description
   * Gets the list of all available plugins
   *
   * @return {promise} Returns the promise that resolves with an array of plugins
   *
   */
  function listPlugins() {
    var url = c8yBase.url(basePath + 'plugins'),
      cfg = {params: c8yBase.pageSizeNoTotalFilter()};

    return $http.get(url, cfg).then(function (res) {
      return _.unique(res.data.plugins, 'id');
    });
  }

  /**
   * @ngdoc function
   * @name listPluginsByTenant
   * @methodOf c8y.core.service:c8yApplication
   *
   * @description
   * Gets the list of plugins available for tenant
   *
   * @return {promise} Returns the promise that resolves with an array of plugins
   *
   */
  function listPluginsByTenant() {
    return listByTenant().then(function (apps) {
      apps = _.uniq(apps, 'id');
      var pluginPromises = [];
      angular.forEach(apps, function (app) {
        if (isHostedApp(app)) {
          pluginPromises.push(listPluginsByApplication(app));
        }
      });
      return $q.all(pluginPromises)
        .then(_.flatten)
        .then(_.partialRight(_.unique, function (p) { return p.id; }));
    });
  }

  function listPluginsByApplication(app) {
    var url = c8yBase.url(basePath2 + '/' + app.contextPath + '/manifest'),
      cfg = {params: c8yBase.pageSizeNoTotalFilter()};

    return $http.get(url, cfg).then(function (res) {
      return _.map(res.data.imports, getPluginFromImportedManifest);
    });
  }

  function getPluginFromImportedManifest(manifest) {
    return {
      id: manifest.id,
      contextPath: manifest.rootContextPath,
      directoryName: manifest.directoryName,
      manifest: manifest
    };
  }

  function buildDetailUrl(app) {
    var id = app.id || app;
    return c8yBase.url(basePath2 + '/' + id);
  }

   /**
   * @ngdoc function
   * @name detail
   * @methodOf c8y.core.service:c8yApplication
   *
   * @description
   * Gets the details of application.
   *
   * @param {object} app Application object or application id.
   *
   * @returns {promise} Returns $http's promise with the response from server. The data has got the following properties:
   *
   * - **id** - `integer` - Application's id.
   * - **name** - `string` - Application's name.
   * - **key** - `string` - Application's key.
   * - **type** - `string` - Application's type. Available values:
   *     - **HOSTED** -  Application is hosted by Cumulocity.
   *     - **EXTERNAL** - Application is hosted by external provider.
   * - **resourcesUrl** - `string` - Application's resources URL (repository URL).
   * - **resourcesUsername** - `string` - Username needed to access application's resources.
   * - **contextPath** - `string` - Application's context path.
   * - **externalUrl** - `string` - External URL with application.
   * - **availability** - `string` - Indicates the level of availability.
   *     - **PRIVATE** - Application is available privately.
   *     - **MARKET** - Application is available publicly.
   * - **owner** - `object` - Owner object with the following properties:
   *     - **tenant** - `object` - Tenant object with the following properties:
   *         - **id** - `string` - Tenant's id.
   *
   * @example
   * <pre>
   *   var applicationId = 1;
   *   c8yApplication.detail(applicationId).then(function (res) {
   *     $scope.application = res.data;
   *   });
   * </pre>
   */
  function detail(app) {
    var url = buildDetailUrl(app);
    return $http.get(url);
  }

  /**
   * @ngdoc function
   * @name remove
   * @methodOf c8y.core.service:c8yApplication
   *
   * @description
   * Removes application.
   *
   * @param {object} app Application object or application id.
   *
   * @returns {promise} Returns $http's promise with the response from server.
   *
   * @example
   * <pre>
   *   var applicationId = 1;
   *   c8yApplication.remove(applicationId);
   * </pre>
   */
  function remove(app) {
    var url = buildDetailUrl(app),
      _app = angular.isObject(app) ? app : {id: app},
      actions = [];

    var configPromise = getConfig(_app).then(function (app) {
      if (app.config && app.config.id) {
        return c8yInventory.remove(app.config);
      }
      return true;
    });

    actions.push(configPromise);
    actions.push($http.delete(url));
    return $q.all(actions);
  }

  /**
   * @ngdoc function
   * @name update
   * @methodOf c8y.core.service:c8yApplication
   *
   * @description
   * Updates application.
   *
   * @param {object} app Application object.
   *
   * @returns {promise} Returns promise wich will be resolved after application is updated.
   *
   * @example
   * <pre>
   *   var applicationId = 1;
   *   c8yApplication.detail(applicationId).then(function (res) {
   *     return res.data;
   *   }).then(function (application) {
   *     application.name = 'New Application Name';
   *     return application;
   *   }).then(c8yApplication.update);
   * </pre>
   */
  function update(app) {
    var url = buildDetailUrl(app),
      cleanData = clean(app),
      cfg = angular.copy(defaultConfig);

    return $http.put(url, cleanData, cfg).finally(function () {
      $window.localStorage.setItem('refresh', app.contextPath);
    });
  }

  /**
   * @ngdoc function
   * @name create
   * @methodOf c8y.core.service:c8yApplication
   *
   * @description
   * Creates a new application.
   *
   * @param {object} app Application object.
   *
   * @returns {promise} Returns promise with the saved application object.
   *
   * @example
   * <pre>
   *   c8yApplication.create({
   *     name: 'My Application',
   *     availability: 'MARKET',
   *     type: 'HOSTED',
   *     resourcesUrl: 'https://bitbucket.org/test/test/raw/default/build',
   *     resourcesUsername: 'username'
   *   });
   * </pre>
   */
  function create(app) {
    var url = c8yBase.url(basePath2),
      cfg = angular.copy(defaultConfig);

    return $http.post(url, app, cfg);
  }

  /**
   * @ngdoc function
   * @name updateManifest
   * @methodOf c8y.core.service:c8yApplication
   *
   * @description
   * Updates an application manifest
   *
   * @param {string|number} Application id.
   * @param {object} Application manifest.
   *
   * @returns {promise} Returns promise for the post request.
   *
   */
  function updateManifest(appId, manifest) {
    return detail(appId)
      .then(function (res) {
        var app = res.data;
        app.manifest = manifest;
        return app;
      })
      .then(update);
  }

  /**
   * @ngdoc function
   * @name save
   * @methodOf c8y.core.service:c8yApplication
   *
   * @description
   * Creates a new application or updates the existing one.
   *
   * @param {object} app Application object.
   *
   * @returns {promise} Returns promise when application is saved.
   *
   * @example
   * <pre>
   *   c8yApplication.detail(applicationId).then(function (res) {
   *     return res.data;
   *   }).then(function (application) {
   *     application.name = 'Changed Application Name';
   *     return application;
   *   }).then(c8yApplication.save);
   * </pre>
   */
  function save(app) {
    return app.id ? update(app) : create(app);
  }

  function createUrl(app) {
    var port = $location.port();
    if (port === 80 || port === 443) {
      port = '';
    } else {
      port = ':' + port;
    }

    return $location.protocol() + '://' +
      $location.host() +
      port +
      '/apps/' + app.contextPath;
  }

  /**
   * @ngdoc function
   * @name getCurrentContextPath
   * @methodOf c8y.core.service:c8yApplication
   *
   * @description
   * Gets current context path from window's location.
   *
   * @returns {string} Returns current context path from window's location.
   *
   * @example
   * <pre>
   *   var contextPath = c8yApplication.getCurrentContextPath();
   * </pre>
   */
  function getCurrentContextPath() {
    var match = $window.location.pathname.match(/\/apps\/(\w+)\/?/);
    return match && match[1];
  }

  /**
   * @ngdoc function
   * @name getCurrent
   * @methodOf c8y.core.service:c8yApplication
   *
   * @description
   * Gets current application's object.
   *
   * @returns {promise} Returns a promise with current application's object.
   *
   * @example
   * <pre>
   *   c8yApplication.getCurrent().then(function (currentApplication) {
   *     $scope.currentAppName =  currentApplication.name;
   *   });
   * </pre>
   */
  function getCurrent() {
    var currentContextPath = getCurrentContextPath();
    return listByUser().then(function (applications) {
      var currentApp = {};
      applications.forEach(function (app) {
        if (app.contextPath === currentContextPath) {
          currentApp = app;
          return false;
        }
      });
      return currentApp;
    });
  }

  function getAppConfig(_app) {
    return c8yInventory.list({type: 'c8y_SmartAppApplication'}).then(function (apps) {
      var config = null;
      apps.forEach(function (app) {
        if (app.appId === _app.id) {
          config = app;
          return false;
        }
      });
      return config;
    });
  }

  /**
   * @ngdoc function
   * @name getConfig
   * @methodOf c8y.core.service:c8yApplication
   *
   * @description
   * Gets the configuration details for application.
   *
   * @param {object} app Application object. Defaults to current application.
   *
   * @returns {promise} Returns a promise with application with config.
   *
   * @example
   * <pre>
   *   c8yApplication.getConfig().then(function (config) {
   *     $scope.appConfig = config;
   *   });
   * </pre>
   */
  function getConfig(app) {
    var outputApp,
      promise = app ? $q.when(app) : getCurrent();

    return promise
      .then(function (app) {
        outputApp = app;
        return app;
      })
      .then(getAppConfig)
      .then(function (config) {
        outputApp.config = config;
        return outputApp;
      });
  }

  function getRefreshMessage(ignore) {
    var contextPath = $window.localStorage.getItem('refresh');

    if (contextPath === getCurrentContextPath()) {
      $window.localStorage.setItem('refresh', undefined);

      if (!ignore) {
        $window.location.reload();
      }
    }
  }

  /**
   * @ngdoc function
   * @name getHref
   * @methodOf c8y.core.service:c8yApplication
   *
   * @description
   * Gets application's URL.
   *
   * @param {object} app Application object.
   *
   * @returns {string} Returns application's URL.
   *
   * @example
   * <pre>
   *   var applicationId = 1;
   *   c8yApplication.detail(applicationId).then(function (res) {
   *     $scope.application = res.data;
   *     $scope.url = c8yApplication.getHref($scope.application);
   *   });
   * </pre>
   */
  function getHref(app) {
    return (isHostedApp(app)) ? createUrl(app) : app.externalUrl;
  }

  /**
   * @ngdoc function
   * @name icon
   * @methodOf c8y.core.service:c8yApplication
   *
   * @description
   * Gets application's icon.
   *
   * @param {object} app Application object.
   *
   * @returns {string} Returns application's icon name.
   *
   * @example
   * <pre>
   *   var applicationId = 1;
   *   c8yApplication.detail(applicationId).then(function (res) {
   *     $scope.appIcon = c8yApplication.icon(res.data);
   *   });
   * </pre>
   */
  function icon(application) {
    var type = angular.isString(application) ? application : application.type;
    if (application.manifest) {
      type = 'SMARTAPP';
    }
    return iconMap[type];
  }

  /**
   * @ngdoc function
   * @name pollRefreshMessages
   * @methodOf c8y.core.service:c8yApplication
   *
   * @description
   * Starts polling refresh messages.
   *
   * @example
   * <pre>
   *   c8yApplication.pollRefreshMessages();
   * </pre>
   */
  function pollRefreshMessages() {
    $interval(function () {
      getRefreshMessage();
    }, 1000, 0, false);
  }

  /**
   * @ngdoc function
   * @name filterApplications
   * @methodOf c8y.core.service:c8yApplication
   *
   * @description
   * Filter the list of applications that are visible to appSwitcher
   *
   */
  function filterApplications(apps) {
    var unique = _.uniq(apps, function (app) { return app.id; }),
      hidden = _.filter(unique, function (app) {
        var noAppSwitcher = app.manifest && app.manifest.noAppSwitcher;
        return noAppSwitcher !== true;
      });

    return hidden;
  }

  /**
   * @ngdoc function
   * @name listByVisibleLinks
   * @methodOf c8y.core.service:c8yApplication
   *
   * @description
   * Return the list of applications that are visible to appSwitcher
   *
   * @example
   * <pre>
   *   c8yApplication.listByVisibleLinks();
   * </pre>
   */

  function listByVisibleLinks() {
    return listByUser()
      .then(filterApplications).then(function (applications) {
        return $q.when(applications);
      });
  }

  function isHostedApp(app) {
    return (app.type === 'HOSTED');
  }

  getRefreshMessage(true);

  return {
    list: listByTenant,
    listByUser: listByUser,
    listByTenant: listByTenant,
    listByOwner: listByOwner,
    listPlugins: listPlugins,
    listPluginsByTenant: listPluginsByTenant,
    listPluginsByApplication: listPluginsByApplication,
    listByVisibleLinks: listByVisibleLinks,
    detail: detail,
    update: update,
    create: create,
    remove: remove,
    save: save,
    getHref: getHref,
    icon: icon,
    getCurrent: getCurrent,
    getConfig: getConfig,
    pollRefreshMessages: pollRefreshMessages,
    getCurrentContextPath: getCurrentContextPath,
    updateManifest: updateManifest
  };

}]);
