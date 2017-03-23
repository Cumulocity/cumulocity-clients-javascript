(function() {
  'use strict';

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
    .factory('c8yApplication', [
      '$http',
      '$location',
      '$q',
      '$window',
      '$interval',
      '$timeout',
      '$log',
      '$injector',
      'c8yBase',
      'c8yUser',
      'c8yInventory',
      '$upload',
      'gettext',
      c8yApplication
    ]);

  function c8yApplication(
    $http,
    $location,
    $q,
    $window,
    $interval,
    $timeout,
    $log,
    $injector,
    c8yBase,
    c8yUser,
    c8yInventory,
    $upload,
    gettext
  ) {
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
      },
      typeLabelMap = {
        HOSTED: gettext('Hosted application'),
        REPOSITORY: gettext('Repository'),
        EXTERNAL: gettext('External application')
      },
      c8yLocales,
      PLUGINS_LIST_PAGE_SIZE = 1000;

    try {
      c8yLocales = $injector.get('c8yLocales');
    } catch (e) {
      c8yLocales = {
        getTranslatedServerMessage: _.identity
      };
    }

    gettext('Administration');
    gettext('Cockpit');
    gettext('Device management');
    gettext('Fieldbus4');

    function clean(app) {
      var _app = _.cloneDeep(app);
      delete _app.type;
      return _app;
    }

    function cleanFileName(name) {
      return name.replace(/\s+/g, '_');
    }

    function _list(path, filters) {
      return c8yUser.current().then(function(user) {
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

        return $http.get(url, cfg)
          .then(onList)
          .then(rejectBackendApplications);
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
      return c8yUser.current().then(function(currentUser) {
        user = user || currentUser;
        var _filters = c8yBase.pageSizeFilter(filters),
          cfg = {
            params: _.defaults(_filters, {
              noPaging: true,
              dropOverwrittenApps: true
            }),
            cache: true
          },
          url = c8yBase.url(basePath + 'applicationsByUser/' + encodeURIComponent(user.id)),
          onList = c8yBase.cleanListCallback('applications',
            angular.bind(self, listByUser, user),
            _filters);

        return $http.get(url, cfg)
          .then(onList)
          .then(rejectBackendApplications);
      });
    }

    function convertType(app) {
      app = _.cloneDeep(app);
      if (app.type === undefined) {
        return app;
      }
      app.type = isTypeRepository(app) ? 'REPOSITORY' : app.type;
      return app;
    }

    function isTypeRepository(app) {
      return app.type === 'HOSTED' &&
        app.resourcesUrl &&
        app.resourcesUrl.charAt(0) !== '/';
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
        cfg = {
          params: {
            pageSize: PLUGINS_LIST_PAGE_SIZE
          }
        };

      return $http.get(url, cfg).then(function(res) {
        return _.uniqBy(res.data.plugins, 'id');
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
      return listByTenant().then(function(apps) {
        apps = _.uniqBy(apps, 'id');
        var pluginPromises = [];
        _.forEach(apps, function(app) {
          if (isHostedOrRepositoryApp(app)) {
            pluginPromises.push(listPluginsByApplication(app));
          }
        });
        return $q.all(pluginPromises)
          .then(_.flattenDeep)
          .then(_.partialRight(_.uniqBy, function(p) {
            return p.id;
          }));
      });
    }

    /**
     * @ngdoc function
     * @name listPluginsByApplication
     * @methodOf c8y.core.service:c8yApplication
     *
     * @description
     * Gets the list of plugins imported by given application.
     *
     * @return {promise} Returns the promise that resolves with an array of plugin manifests.
     */
    function listPluginsByApplication(app) {
      var url = c8yBase.url(basePath2 + '/' + app.contextPath + '/manifest'),
        cfg = {
          params: c8yBase.pageSizeNoTotalFilter()
        };

      return $http.get(url, cfg).then(function(res) {
        return _.map(res.data.imports, getPluginFromImportedManifest);
      });
    }

    /**
     * @ngdoc function
     * @name listPluginsByPaasApp
     * @methodOf c8y.core.service:c8yApplication
     *
     * @description
     * Gets the list of plugins contained in given PaaS application.
     *
     * @return {promise} Returns the promise that resolves with an array of plugin infos containing: pluginName and pluginPackage.
     */
    listPluginsByPaasApp._cache = {};

    function listPluginsByPaasApp(app) {
      var cache = listPluginsByPaasApp._cache;
      var delay = 2000;
      var appId = app.id || app,
        url = c8yBase.url(basePath2 + '/' + appId + '/binaries/plugins'),
        cfg = {
          params: c8yBase.pageSizeNoTotalFilter()
        },
        cleanCache = function() {
          delete cache[appId];
        },
        request = function() {
          return $http.get(url, cfg)
            .then(c8yBase.getResData)
            .finally(cleanCache);
        };

      if (!cache[appId]) {
        cache[appId] = $timeout(_.noop, delay).then(request);
      }

      return cache[appId];
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
        _app = _.isObjectLike(app) ? app : {
          id: app
        },
        actions = [];

      var configPromise = getConfig(_app).then(function(app) {
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
     * @param {object} cfg Configuration for request.
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
    function update(app, cfg) {
      var url = buildDetailUrl(app),
        cleanData = clean(app),
        _cfg = _.defaults(cfg || {}, defaultConfig);
      return $http.put(url, cleanData, _cfg).finally(function() {
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
     * @param {object} cfg Configuration for request.
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
    function create(app, cfg) {
      var url = c8yBase.url(basePath2),
        _cfg = _.defaults(cfg || {}, defaultConfig);
      return $http.post(url, app, _cfg);
    }

    function revertType(app) {
      app = _.cloneDeep(app);
      // default resourcesUrl for hosted apps
      if (app.type === 'HOSTED') {
        app.resourcesUrl = '/';
      }
      // backend doesn't support REPOSITORY type, so change it to HOSTED
      if (app.type === 'REPOSITORY') {
        app.type = 'HOSTED';
      }
      return app;
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
        .then(function(res) {
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
     * @param {object} cfg Configuration for request.
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
    function save(app, cfg) {
      return app.id ? update(app, cfg) : create(app, cfg);
    }

    function trySave(app, cfg, retryNo, deferred) {
      var maxSaveRetries = 10;
      var _app = _.cloneDeep(app);
      retryNo = retryNo || 0;
      deferred = deferred || $q.defer();

      _app.name = retryNo === 0 ? app.name : [app.name, retryNo].join('-');
      _app.key = retryNo === 0 ? app.key : [app.key, retryNo].join('-');
      _app.contextPath = retryNo === 0 ? app.contextPath : [app.contextPath, retryNo].join('-');

      save(_app, {
          silentError: true
        })
        .then(function(res) {
          deferred.resolve(c8yBase.getResData(res));
        }, function(res) {
          if (res.status === 409 && retryNo < maxSaveRetries) {
            trySave(app, cfg, retryNo + 1, deferred);
          } else {
            var svrMsg = res && res.data &&
              (res.data.message || res.data.details && res.data.details.exceptionMessage);
            var msg = (svrMsg && c8yLocales.getTranslatedServerMessage(svrMsg)) ||
              gettext('Could not create application due to an error! Click "More" for details.');
            deferred.reject({
              errorMessage: msg,
              errorDetails: res
            });
          }
        });

      return deferred.promise;
    }

    /**
     * @ngdoc function
     * @name clone
     * @methodOf c8y.core.service:c8yApplication
     *
     * @description
     * Clones an exeisting app and alters its properties if needed.
     *
     * @param {object} srcApp Original application object.
     * @param {object} newAppProps Object containing new values for application object.
     *
     * @returns {promise} Returns promise which resolves when application is cloned.
     *
     * @example
     * <pre>
     *   c8yApplication.detail(applicationId).then(function (res) {
     *     return res.data;
     *   }).then(function (originalApp) {
     *     var newProps = {
     *       name: 'New name',
     *       key: 'New key',
     *       contextPath: 'New contextPath'
     *     };
     *     return c8yApplication.clone(originalApp, newProps);
     *   });
     * </pre>
     */
    function clone(srcApp, newAppProps) {
      var url = buildDetailUrl(srcApp) + '/clone';
      return $http.post(url)
        .then(c8yBase.getResData)
        .then(function(clonedApp) {
          if (_.isObjectLike(newAppProps)) {
            _.assign(clonedApp, newAppProps);
            return trySave(clonedApp).then(c8yBase.getResData);
          }
          return clonedApp;
        });
    }

    function listArchives(app, filter) {
      var url = buildDetailUrl(app) + '/binaries';
      filter = c8yBase.pageSizeNoTotalFilter(filter);
      var cfg = {
        params: filter
      };
      return $http.get(url, cfg).then(c8yBase.getResData);
    }

    function uploadArchive(app, file) {
      var url = buildDetailUrl(app) + '/binaries';
      return $upload.upload({
        url: url,
        method: 'POST',
        headers: {
          Content: 'multipart/form-data',
          Accept: 'application/json'
        },
        file: file,
        fileName: cleanFileName(file.name)
      });
    }

    function deleteArchive(app, archive) {
      var id = archive.id || archive;
      var url = [buildDetailUrl(app), 'binaries', id].join('/');
      return $http.delete(url);
    }

    function setActiveArchive(app, archive) {
      return save({
        id: app.id,
        activeVersionId: archive.id
      });
    }

    /**
     * @ngdoc function
     * @name addPaasAppPlugin
     * @methodOf c8y.core.service:c8yApplication
     *
     * @description
     * Uploads a plugin from archive and updates PaaS application.
     *
     * @param {object} app Application object.
     * @param {File} archive Plugin archive file.
     *
     * @returns {promise} Returns promise when changes are applied.
     *
     * @example
     * <pre>
     *   c8yApplication.addPaasAppPlugin(applicationId, pluginArchive);
     * </pre>
     */
    function addPaasAppPlugin(app, archive) {
      var pluginName = getPluginNameFromArchive(archive);
      var url = buildDetailUrl(app) + '/binaries/plugins/' + pluginName;
      var uploadPromise = $upload.upload({
        url: url,
        method: 'POST',
        headers: {
          Content: 'multipart/form-data',
          Accept: 'application/json'
        },
        file: archive
      });
      var finalPromise = uploadPromise.then(_.partial(refreshPaasApp, app));
      finalPromise.progress = uploadPromise.progress;
      return finalPromise;
    }

    function getPluginNameFromArchive(archive) {
      var name = archive.name.split('.');
      name.pop();
      return name.join('.');
    }

    function refreshPaasApp(app) {
      var appDetails = detail(app).then(c8yBase.getResData);
      var appPlugins = appDetails.then(listPluginsByPaasApp);
      var appManifest = appDetails.then(getPaasAppManifest);
      var appIndex = appDetails.then(getPaasAppIndex);
      return $q.all([appDetails, appPlugins, appManifest, appIndex])
        .then(function(promises) {
          var appDetails = promises[0];
          var appPlugins = sortPaasAppPlugins(promises[1]);
          var appManifest = promises[2];
          var appIndex = promises[3];
          return $q.all([
            getUpdatedPaasAppManifest(appDetails, appPlugins, appManifest),
            getUpdatedPaasAppIndex(appDetails, appPlugins, appIndex)
          ])
            .then(function(promises) {
              var newAppManifest = promises[0];
              var newAppIndex = promises[1];
              return uploadPaasAppFiles(app, [{
                  path: 'cumulocity.json',
                file: new Blob([JSON.stringify(newAppManifest)], {
                  type: 'application/json'
                })
              }, {
                  path: 'index.html',
                file: new Blob([newAppIndex], {
                  type: 'text/html'
                })
              }]);
            });
        });
    }

    function sortPaasAppPlugins(appPlugins) {
      var sortedPlugins = [];
      appPlugins = _.sortBy(appPlugins, function(p) {
        return (p && p.pluginPackage && -p.pluginPackage.priority) || 0;
      });
      _.forEach(appPlugins, function(appPlugin) {
        addPluginToList(appPlugin, sortedPlugins, appPlugins);
      });
      return sortedPlugins;
    }

    function addPluginToList(plugin, sortedPlugins, appPlugins) {
      var alreadyAdded = findPlugin(sortedPlugins, plugin && plugin.pluginPackage && plugin.pluginPackage.contextPath);
      if (alreadyAdded) {
        return;
      }
      var importedPluginsContextPaths = (plugin && plugin.pluginPackage && plugin.pluginPackage.imports) || [];
      _.forEach(importedPluginsContextPaths, function(ctxPath) {
        var depPlugin = findPlugin(appPlugins, ctxPath);
        if (depPlugin) {
          addPluginToList(depPlugin, sortedPlugins, appPlugins);
        } else {
          $log.error('Plugin with context path ' + ctxPath + ' is missing.');
        }
      });
      sortedPlugins.push(plugin);
    }

    function findPlugin(list, contextPath) {
      var ctxPath = getPluginPaasContextPath(contextPath);
      return _.find(list, function(p) {
        return p && p.pluginPackage && p.pluginPackage.contextPath === ctxPath;
      });
    }

    function getPluginPaasContextPath(contextPath) {
      var ctx = contextPath;
      if (replacePluginPath(ctx)) {
        ctx = ctx.replace(/\//g, '_');
      }
      return ctx;
    }

    function replacePluginPath(context) {
      return /^core\//.test(context) ||
        /^administration\//.test(context) ||
        /^devicemanagement\//.test(context) ||
        /^cockpit\//.test(context) ||
        /^platformadmin\//.test(context) ||
        /^fieldbus4\//.test(context) ||
        /^fieldbus3\//.test(context) ||
        /^fieldbus2\//.test(context) ||
        /^fieldbus\//.test(context) ||
        /^demoboard\//.test(context) ||
        /^vendme_plugins\//.test(context);
    }

    function getPaasAppManifest(appDetails) {
      var url = buildWebUrl(appDetails) + '/cumulocity.json';
      return $http.get(url).then(c8yBase.getResData);
    }

    function getPaasAppIndex(appDetails) {
      var url = buildWebUrl(appDetails) + '/index.html';
      return $http.get(url).then(c8yBase.getResData);
    }

    function buildWebUrl(appDetails) {
      return c8yBase.url('apps/' + appDetails.contextPath);
    }

    function getUpdatedPaasAppManifest(appDetails, appPlugins, appManifest) {
      var newAppManifest = _.cloneDeep(appManifest);
      newAppManifest.imports.length = 0;
      _.forEach(appPlugins, function(appPlugin) {
        newAppManifest.imports.push(appPlugin.pluginName);
      });
      return newAppManifest;
    }

    function getUpdatedPaasAppIndex(appDetails, appPlugins, appIndex) {
      appIndex = replacePaasAppIndexCSS(appDetails, appPlugins, appIndex);
      appIndex = replacePaasAppIndexJS(appDetails, appPlugins, appIndex);
      appIndex = replacePaasAppIndexNgModules(appDetails, appPlugins, appIndex);
      return appIndex;
    }

    function replacePaasAppIndexCSS(appDetails, appPlugins, appIndex) {
      var cssFiles = _(appPlugins)
        .map(function(appPlugin) {
          var flist = appPlugin.pluginPackage && appPlugin.pluginPackage.css || [];
          flist = !flist.length ? (appPlugin.pluginPackage && appPlugin.pluginPackage.less || []) : flist;
          return flist.length ? (appPlugin.pluginName + '/style.css') : false;
        })
        .filter(_.identity)
        .value();
      var cssPrioritized = _.flattenDeep([
        '<!--MODULES_CSS-->',
        _.map(cssFiles.slice(0, 1), function(cssFilePath) {
          return '<link rel="stylesheet" href="' + cssFilePath + '"></link>';
        }),
        '<!--/MODULES_CSS-->'
      ]).join('\n');
      var cssDeferred = _.flattenDeep([
        '<!--MODULES_CSS_DEFER-->',
        '<script>', ['[', '"' + cssFiles.slice(1).join('", "') + '"', '].forEach(function(f){loadCSS(f)})'].join(''),
        '</script>',
        '<!--/MODULES_CSS_DEFER-->'
      ]).join('\n');
      appIndex = appIndex.replace(new RegExp('<!--MODULES_CSS-->(.|\n|\r)*<!--\\/MODULES_CSS-->', 'gm'), cssPrioritized);
      return appIndex.replace(new RegExp('<!--MODULES_CSS_DEFER-->(.|\n|\r)*<!--\\/MODULES_CSS_DEFER-->', 'gm'), cssDeferred);
    }

    function replacePaasAppIndexJS(appDetails, appPlugins, appIndex) {
      var js = _.flattenDeep([
        '<!--MODULES_JS-->',
        _(appPlugins)
        .map(function(appPlugin) {
            var flist = appPlugin.pluginPackage && appPlugin.pluginPackage.js || [];
            return flist.length ? (appPlugin.pluginName + '/main.js') : false;
          })
          .filter(_.identity)
        .map(function(jsFilePath) {
            return '<script defer src="' + jsFilePath + '"></script>';
          })
          .value(),
        '<!--/MODULES_JS-->'
      ]).join('\n');
      return appIndex.replace(new RegExp('<!--MODULES_JS-->(.|\n|\r)*<!--\\/MODULES_JS-->', 'gm'), js);
    }

    function replacePaasAppIndexNgModules(appDetails, appPlugins, appIndex) {
      var c8yNgModules = [
        'C8Y_NG_MODULES=["',
        _.uniq(_.flattenDeep(_.map(appPlugins, function(appPlugin) {
          return appPlugin.pluginPackage && appPlugin.pluginPackage.ngModules || [];
        }))).join('","'),
        '"];'
      ].join('');
      return appIndex.replace(new RegExp('C8Y_NG_MODULES=\\[(.|\n|\r)*?\\];', 'gm'), c8yNgModules);
    }

    function uploadPaasAppFiles(app, files) {
      var url = buildDetailUrl(app) + '/binaries/files';
      var fd = new FormData();
      _.forEach(files, function(f) {
        fd.append(f.path, new File([f.file], f.path));
      });
      return $http.post(url, fd, {
        transformRequest: _.identity,
        headers: {
          'Content-Type': undefined
        }
      });
    }

    function removePaasAppPlugin(app, plugin) {
      var pluginName = plugin.pluginName || plugin;
      var url = buildDetailUrl(app) + '/binaries/plugins/' + pluginName;
      return $http.delete(url)
        .then(_.partial(refreshPaasApp, app));
    }

    function isPaasApp(app) {
      return getPaasAppManifest(app)
        .then(function(paasAppManifest) {
          return paasAppManifest._webpaas;
        }, function() {
          return false;
        });
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
        '/apps/' + (app.public ? 'public/' : '') + app.contextPath;
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
      var match = $window.location.pathname.match(/\/apps\/(public\/){0,1}(.+?)(\/|\?|\#|$)/);
      return match && match[2];
    }

    /**
     * @ngdoc function
     * @name isCurrentAppAccessedViaPublicEndpoint
     * @methodOf c8y.core.service:c8yApplication
     *
     * @description
     * Checks if current application is accessed via public endpoint.
     *
     * @returns {boolean} Returns boolean value indicating whether current application is accessed via public endpoint.
     *
     * @example
     * <pre>
     *   var isCurrentAppAccessedViaPublicEndpoint = c8yApplication.isCurrentAppAccessedViaPublicEndpoint();
     * </pre>
     */
    function isCurrentAppAccessedViaPublicEndpoint() {
      var match = $window.location.pathname.match(/\/apps\/(public\/([^\/]+)|([^\/]+))/);
      return match && match[1].indexOf('public') !== -1;
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
      var accessedViaPublic = !!isCurrentAppAccessedViaPublicEndpoint();

      function findApp(app) {
        var isMarket = app.availability === 'MARKET';
        var matchesContextPath = app.contextPath === currentContextPath;
        return matchesContextPath && (!accessedViaPublic || isMarket);
      }

      return listByUser(null, {dropOverwrittenApps: false})
        .then(function(applications) {
          var currentApp = _.find(applications, findApp);
          return currentApp;
        });
    }

    function getAppConfig(_app) {
      return c8yInventory.list({
        type: 'c8y_SmartAppApplication'
      }).then(function(apps) {
        var config = null;
        apps.forEach(function(app) {
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
        .then(function(app) {
          outputApp = app;
          return app;
        })
        .then(getAppConfig)
        .then(function(config) {
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
      return (isHostedOrRepositoryApp(app)) ? createUrl(app) : app.externalUrl;
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
      var type = _.isString(application) ? application : application.type;
      if (application.manifest) {
        type = 'SMARTAPP';
      }
      return iconMap[type];
    }

    /**
     * @ngdoc function
     * @name typeLabel
     * @methodOf c8y.core.service:c8yApplication
     *
     * @description
     * Gets application's type label.
     *
     * @param {object} app Application object or type string.
     *
     * @returns {string} Returns application's type label.
     *
     * @example
     * <pre>
     *   var applicationId = 1;
     *   c8yApplication.detail(applicationId).then(function (res) {
     *     $scope.appTypeLabel = c8yApplication.typeLabel(res.data);
     *   });
     * </pre>
     */
    function typeLabel(application) {
      var type = _.isString(application) ? application : application.type;
      return typeLabelMap[type];
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
      $interval(function() {
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
      return _(apps)
        .uniq('id')
        .filter(function(app) {
          var manifest = app.manifest;
          var noAppSwitcher = false;
          var visibleApplicationTypes = ['HOSTED', 'EXTERNAL'];

          if (manifest) {
            noAppSwitcher = manifest.noAppSwitcher;
          }

          return !noAppSwitcher &&
                 _.includes(visibleApplicationTypes, app.type);
        })
        .value();
    }

    /**
     * @ngdoc function
     * @name rejectBackendApplications
     * @methodOf c8y.core.service:c8yApplication
     *
     * @description
     * Rejects backend-specific applications.
     */
    function rejectBackendApplications(apps) {
      var filteredApps = _.reject(apps, function (app) {
        return app.name === 'management' && app.owner.tenant.id === 'management';
      });
      _.assign(filteredApps, _.pick(apps, _.filter(_.keys(apps), isNaN)));
      return filteredApps;
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
        .then(filterApplications).then(function(applications) {
          return $q.when(applications);
        });
    }

    /**
     * @ngdoc function
     * @name parseAppName
     * @methodOf c8y.core.service:c8yApplication
     *
     * @description
     * Transforms the name of the applications if needed
     *
     * @example
     * <pre>
     *   c8yApplication.c8yApplication(app.name);
     * </pre>
     */
    function parseAppName(name) {
      if (name && name.toLowerCase() === 'devicemanagement') {
        return 'Device management';
      }
      return name || 'Cumulocity';
    }

    function isHostedOrRepositoryApp(app) {
      return (app.type === 'HOSTED' || app.type === 'REPOSITORY');
    }

    if (c8yBase.getFlag('test')) {
      currentAppCached._cache = $q.when({
        name: 'app',
        manifest: {}
      });
    }

    function currentAppCached() {
      if (currentAppCached._cache) {
        return currentAppCached._cache;
      }

      function config(url) {
        return {
          url: url,
          noAppKey: true
        };
      }

      function manifest() {
        return $http(config([
          c8yBase.url(basePath2),
          (isCurrentAppAccessedViaPublicEndpoint() ? 'public/' : '') + getCurrentContextPath(),
          'manifest'
        ].join('/')));
      }

      function getAppDetail(res) {
        return $http(config([c8yBase.url(basePath2), res.data.application.id].join('/')));
      }

      return manifest()
        .then(getAppDetail)
        .then(c8yBase.getResData)
        .then(function (currentApp) {
          currentAppCached._cache = $q.when(currentApp);
          return currentAppCached._cache;
        });
    }

    return {
      list: listByTenant,
      listByUser: listByUser,
      listByTenant: listByTenant,
      listByOwner: listByOwner,
      listPlugins: listPlugins,
      listPluginsByTenant: listPluginsByTenant,
      listPluginsByApplication: listPluginsByApplication,
      listPluginsByPaasApp: listPluginsByPaasApp,
      listByVisibleLinks: listByVisibleLinks,
      detail: detail,
      update: update,
      create: create,
      remove: remove,
      save: save,
      trySave: trySave,
      clone: clone,
      getHref: getHref,
      icon: icon,
      typeLabel: typeLabel,
      getCurrent: getCurrent,
      getConfig: getConfig,
      pollRefreshMessages: pollRefreshMessages,
      getCurrentContextPath: getCurrentContextPath,
      updateManifest: updateManifest,
      listArchives: listArchives,
      uploadArchive: uploadArchive,
      deleteArchive: deleteArchive,
      setActiveArchive: setActiveArchive,
      addPaasAppPlugin: addPaasAppPlugin,
      removePaasAppPlugin: removePaasAppPlugin,
      uploadPaasAppFiles: uploadPaasAppFiles,
      getPaasAppManifest: getPaasAppManifest,
      refreshPaasApp: refreshPaasApp,
      isPaasApp: isPaasApp,
      convertType: convertType,
      revertType: revertType,
      parseAppName: parseAppName,
      currentAppCached: currentAppCached
    };
  }
}());
