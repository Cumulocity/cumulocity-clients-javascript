(function () {
  'use strict';

  angular.module('c8y.core')
    .factory('c8yInventory', c8yInventory);

  /**
   * @ngdoc service
   * @name c8y.core.service:c8yInventory
   * @requires c8y.core.service:c8yBase
   * @requires $http
   * @requires $q
   *
   * @description
   * This service allows for managing managed objects inventory.
   */
  /* @ngInject */
  function c8yInventory(
    $http,
    $q,
    c8yBase,
    c8yUser,
    c8yRealtime,
    c8yQueriesUtil
  ) {
    var path = 'inventory/managedObjects';
    var moIdLocationRegExp = '\\/inventory\\/managedObjects\\/(\\d+)';
    var defaultConfig = {
      headers: c8yBase.contentHeaders('managedObject', 'managedObject')
    };
    var defaultConfigReference = {
      headers: c8yBase.contentHeaders('managedObjectReference')
    };
    var fieldsToClean = [
      'lastUpdated',
      'assetParents',
      'deviceParents',
      'additionParents',
      'childAssets',
      'childDevices',
      'childAdditions',
      'c8y_ActiveAlarmsStatus',
      'c8y_Availability'
    ];
    var CHILD_ASSET = 'asset';
    var CHILD_DEVICE = 'device';
    var CHILD_ADDITION = 'addition';

    function buildDetailUrl(mo) {
      var id = mo && (mo.id || mo);
      return id && c8yBase.url(path + '/' + id);
    }

    function buildChildrenUrl(mo, type) {
      return buildDetailUrl(mo) + '/' + type;
    }

    function buildChildUrl(mo, moChild, type) {
      var id = moChild.id || moChild;
      return buildChildrenUrl(mo, type) + '/' + id;
    }

    function cleanFilters(filters) {
      var _filters = filters || {};
      var allowedWithText = [
        'text',
        'pageSize',
        'currentPage',
        'skipChildrenNames',
        'fragmentType',
        'withParents',
        'q',
        'query'
      ];

      // text parameters can only be used with some parameters:
      if (_filters.text) {
        _filters = _.pick(_filters, allowedWithText);
      }

      return _filters;
    }

    /**
     * @ngdoc function
     * @name list
     * @methodOf c8y.core.service:c8yInventory
     *
     * @description
     * Gets the list of managed objects.
     *
     * @param {object} filters Object containing filters for querying managed objects. Supported filters are:
     *
     * - **fragmentType** - `string` - Filter managed objects that have specific fragment defined.
     * - **type** - `string` - Filter managed objects of given type.
     * - **pageSize** - `integer` - Limit the number of items returned on a single page.
     * - **withParents** - `boolean` - Load parent references to assetParents and deviceParents.
     *
     * <!--For other available filters see specification {@link http://docs.cumulocity.com/managedObjectsFilters@TODO here}.-->
     *
     * @returns {array} Returns the list of filtered managed objects. Each managed object has at least the following common properties:
     *
     * - **id** - `integer` - Managed object's id.
     * - **name** - `string` - Managed object's name (optional).
     * - **lastUpdated** - `string` - Date and time when managed object was last updated.
     * - **owner** - `string` - Managed object's owner's username.
     * - **self** - `string` - Managed object's self URL.
     * - **type** - `string` - Managed object's type.
     * - **assetParents** - `object` - Object containing references to managed object's parent assets.
     * - **childAssets** - `object` - Object containing references to managed object's child assets.
     * - **childDevices** - `object` - Object containing references to managed object's child devices.
     * - **deviceParents** - `object` - Object containing references to managed object's parent devices.
     *
     * <!--For more details about managed objects see specification {@link http://docs.cumulocity.com/managedObjects@TODO here}.-->
     *
     * @example
     * <pre>
     *   var filters = {fragmentType: 'c8y_IsDevice', withParents: true};
     *   c8yInventory.list(filters).then(function (devices) {
     *     $scope.devices = [];
     *     _.forEach(devices, function(device) {
     *       $scope.devices.push(device);
     *     });
     *   });
     * </pre>
     */
    function list(filters) {
      var url = c8yBase.url(path);
      var _filters = c8yBase.pageSizeFilter(cleanFilters(filters));
      var config = {
        params: _filters
      };
      var blindPaging = true;
      var onList = c8yBase.cleanListCallback('managedObjects', list, _filters, blindPaging);

      return $http.get(url, config).then(onList);
    }

    /**
     * @ngdoc function
     * @name listQuery
     * @methodOf c8y.core.service:c8yInventory
     *
     * @description
     * Gets the list of managed object filtered and sorted by given query.
     * By default it queries only devices but with `queryAll` param
     * you can query all kinds of managed objects.
     *
     * @param {object} query Object defining filtering and sorting for managed objects to get.
     * @param {object} params Additional request parameters.
     * @param {boolean} queryAll Query all kinds of managed objects (not only devices).
     *
     * @returns {array} Returns the list of filtered managed objects. Each managed object has at least the following common properties:
     *
     * - **id** - `integer` - Managed object's id.
     * - **name** - `string` - Managed object's name (optional).
     * - **lastUpdated** - `string` - Date and time when managed object was last updated.
     * - **owner** - `string` - Managed object's owner's username.
     * - **self** - `string` - Managed object's self URL.
     * - **type** - `string` - Managed object's type.
     * - **assetParents** - `object` - Object containing references to managed object's parent assets.
     * - **childAssets** - `object` - Object containing references to managed object's child assets.
     * - **childDevices** - `object` - Object containing references to managed object's child devices.
     * - **deviceParents** - `object` - Object containing references to managed object's parent devices.
     *
     * @example
     * <pre>
     *   var query = {
     *     __filter: {
     *       'name': 'My Device*',
     *       'c8y_Availability.status': {
     *         __in: ['AVAILABLE', 'UNAVAILABLE']
     *       },
     *       'creationTime': {
     *         __lt: '2015-11-30T13:28:123Z'
     *       },
     *       'c8y_ActiveAlarmsStatus.critical': {
     *         __gt: 0
     *       },
     *       __or: [
     *         {__not: {__has: 'c8y_ActiveAlarmsStatus.major'}},
     *         {
     *           __or: [
     *             {__bygroupid: 10300},
     *             {__bygroupid: 10400}
     *           ]
     *         }
     *       ]
     *     },
     *     __orderby: [
     *       {'name': 1},
     *       {'creationTime': -1},
     *       {'c8y_ActiveAlarmsStatus.critical': -1}
     *     ]
     *   };
     *   var params = {
     *     customParam: true
     *   };
     *   var queryAll = true;
     *   c8yInventory.listQuery(query, params, queryAll)
     *     .then(function (mos) {
     *       vm.mos = mos;
     *     });
     * </pre>
     */
    function listQuery(query, params, queryAll) {
      var _params = c8yBase.pageSizeFilter(params);
      var queryParam = queryAll ? 'query' : 'q';
      _params[queryParam] = c8yQueriesUtil.buildQuery(query);

      return list(_params);
    }

    /**
     * @ngdoc function
     * @name detail
     * @methodOf c8y.core.service:c8yInventory
     *
     * @description
     * Gets the details of selected managed object.
     *
     * @param {integer|object} mo Managed object's id or object.
     * @param {object} params Object with additional query parameters)
     * @param {object} config Additional configuration for sending requests.
     *
     * @returns {promise} Returns $http's promise with response containing data property with managed object's details.<!-- See object's specification {@link http://docs.cumulocity.com/managedObjects@TODO here}.-->
     *
     * @example
     * <pre>
     *   var moId = 1;
     *   var params = {withParents: true};
     *   var config = {silentError: true};
     *   c8yInventory.detail(moId, params, config).then(function (res) {
     *     $scope.managedObject = res.data;
     *   });
     * </pre>
     */
    function detail(mo, params, config) {
      var url = buildDetailUrl(mo);
      var _params = params || {};
      var _config = _.defaults({params: _params}, config);
      return url ? $http.get(url, _config) : $q.reject('Managed object not valid');
    }

    function detailCached(id) {
      return detail(id);
    }

    /**
     * @ngdoc function
     * @name detailRealtime
     * @methodOf c8y.core.service:c8yInventory
     *
     * @description
     * Gets managed object as JavaScript object updated in tealtime.
     *
     * @param {integer|object} mo Managed object's id or object.
     * @param {scope} scope Scope to which realtime will be binded.
     *
     * @returns {promise} Returns promise with managed object updated in realtime.
     *
     * @example
     * <pre>
     *   var moId = 1;
     *   c8yInventory.detailRealtime(moId, $scope).then(function (moRT) {
     *     $scope.moRealtime = moRT;
     *   });
     * </pre>
     */
    function detailRealtime(mo, scope) {
      var moRT;
      var moId = mo.id || mo;
      var moDetails = _.isObjectLike(mo) ?
        $q.when(mo) :
        detail(moId).then(c8yBase.getResData);
      var scopeId;
      var channel = '/managedobjects/' + moId;
      var op = c8yRealtime.realtimeActions().UPDATE;
      var result;

      function updateListener(evt, data) {
        mergeMoRT(data);
      }

      function mergeMoRT(_mo) {
        if (!moRT) {
          moRT = _mo;
        } else {
          _.assign(moRT, _mo);
        }
        _.forEach(moRT, function (val, key) {
          if (_mo[key] === undefined) {
            delete moRT[key];
          }
        });
      }

      if (scope) {
        scopeId = scope.$id;
        c8yRealtime.addListener(scopeId, channel, op, updateListener);
        c8yRealtime.start(scopeId, channel);
        scope.$on('stopRealtime', function () {
          c8yRealtime.stop(scopeId, channel);
        });
        scope.$on('$destroy', function () {
          c8yRealtime.stop(scopeId, channel);
        });
        result = moDetails.then(function (moData) {
          mergeMoRT(moData);
          return moRT;
        });
      } else {
        var output = {};
        var promise = result = detail(moId)
          .then(function (val) {
            return _.merge(output, val.data);
          });
        var RTConfig = {
          ops: op,
          channel: channel,
          onUpdate: function (e, data) {
            _.merge(output, data);
            _.forEach(output, function (val, key) {
              if (data[key] === undefined) {
                delete output[key];
              }
            });
          }
        };
        var RTObject = c8yRealtime.watch(RTConfig);
        promise.stop = _.bind(RTObject.stop, RTObject);

        return promise;
      }
      return result;
    }

    /**
     * @ngdoc function
     * @name remove
     * @methodOf c8y.core.service:c8yInventory
     *
     * @description
     * Removes managed object from inventory.
     *
     * @param {integer|object} mo Managed object's id or object.
     * @param {object} params (Optional) Query parameters. Supported params are:
     * - cascade: Cascade deletion for groups/assets and devices.
     *
     * @returns {promise} Returns $http's promise with response from server.
     *
     * @example
     * <pre>
     *   var moId = 1;
     *   c8yInventory.remove(moId, {cascade: true});
     * </pre>
     */
    function remove(mo, params) {
      var url = buildDetailUrl(mo);
      if (!url) {
        throw new Error('No managed object id provided!');
      }
      return $http.delete(url, {params: _.isObjectLike(params) ? params : {}});
    }

    /**
     * @ngdoc function
     * @name create
     * @methodOf c8y.core.service:c8yInventory
     *
     * @description
     * Creates a new managed object in the inventory.
     *
     * @param {object} mo Managed object to create.<!-- See object's specification {@link http://docs.cumulocity.com/managedObject@TODO here}.-->
     *
     * @returns {promise} Returns $http's promise after posting new managed object's data.
     *
     * @example
     * <pre>
     *   c8yInventory.create({
     *     type: 'myManagedObjectType',
     *     name: 'My Object',
     *     myProperty: 'myPropertyValue'
     *   });
     * </pre>
     */
    function create(mo) {
      var url = c8yBase.url(path);
      var config = _.cloneDeep(defaultConfig);
      var data = c8yBase.cleanFields(mo, fieldsToClean);
      return $http.post(url, data, config);
    }

    function createChildAsset(mo, parent) {
      return createChild(mo, parent, 'childAssets');
    }

    function createChildDevice(mo, parent) {
      return createChild(mo, parent, 'childDevices');
    }

    function createChildAddition(mo, parent) {
      return createChild(mo, parent, 'childAdditions');
    }

    function createChild(mo, parent, type) {
      var url = buildChildrenUrl(parent, type);
      var data = _.omit(mo, ['id']);
      var cfg = _.assign({}, defaultConfig, {Accept: 'application/json'});
      return $http.post(url, data, cfg);
    }

    /**
     * @ngdoc function
     * @name createConfirm
     * @methodOf c8y.core.service:c8yInventory
     *
     * @description
     * Creates a new managed object in the inventory and retrieves its saved details from backend to confirm.
     *
     * @param {object} mo Managed object to create.<!-- See object's specification {@link http://docs.cumulocity.com/managedObject@TODO here}.-->
     *
     * @returns {promise} Returns $http's promise with managed object's details as response's data.
     *
     * @example
     * <pre>
     *   c8yInventory.createConfirm({
     *     type: 'myManagedObjectType',
     *     name: 'My Object',
     *     myProperty: 'myPropertyValue'
     *   }).then(function (res) {
     *     var savedMO = res.data;
     *     var newlyAddedId = savedMO.id;
     *   });
     * </pre>
     */
    function createConfirm(mo) {
      return create(mo).then(getIdFromRes).then(detail);
    }

    function getIdFromRes(res) {
      var regexp = new RegExp(moIdLocationRegExp);
      var matches = res.headers('Location').match(regexp);
      return matches[1];
    }

    /**
     * @ngdoc function
     * @name update
     * @methodOf c8y.core.service:c8yInventory
     *
     * @description
     * Updates managed object's data.
     *
     * @param {object} mo Managed object.
     *
     * @returns {promise} Returns $http's promise with the response from server.
     *
     * @example
     * <pre>
     *   var moId = 1;
     *   c8yInventory.detail(moId).then(function (mo) {
     *     return mo.name = 'New Name';
     *   }).then(c8yInventory.update);
     * </pre>
     */
    function update(mo) {
      var url = buildDetailUrl(mo);
      var cfg = _.cloneDeep(defaultConfig);
      var data = c8yBase.cleanFields(mo, fieldsToClean);
      removeCache(mo);
      return $http.put(url, data, cfg);
    }

    /**
     * @ngdoc function
     * @name save
     * @methodOf c8y.core.service:c8yInventory
     *
     * @description
     * Creates managed object if it doesn't exist. Otherwise, updates existing one.
     *
     * @param {object} mo Managed object.
     *
     * @returns {promise} Returns $http's promise with the response from server.
     *
     * @example
     * This will create a new managed object:
     * <pre>
     *   c8yInventory.save({
     *     type: 'MyManagedObjectType',
     *     name: 'MyManagedObject'
     *   });
     * </pre>
     * This will update existing managed object:
     * <pre>
     *   c8yInventory.save({
     *     id: 1,
     *     name: 'New Name'
     *   });
     * </pre>
     */
    function save(mo) {
      return mo.id ? update(mo) : create(mo);
    }

    /**
     * @ngdoc function
     * @name hasChildAssets
     * @methodOf c8y.core.service:c8yInventory
     *
     * @description
     * Checks if given managed object has child assets.
     *
     * @param {object} mo Managed object.
     *
     * @returns {bool} Returns true if MO has child assets.
     *
     * @example
     * <pre>
     *   $scope.hasChildAssets = c8yInventory.hasChildAssets(mo);
     * </pre>
     */
    function hasChildAssets(mo) {
      return hasChildren(mo, 'childAssets');
    }

    /**
     * @ngdoc function
     * @name hasChildDevices
     * @methodOf c8y.core.service:c8yInventory
     *
     * @description
     * Checks if given managed object has child devices.
     *
     * @param {object} mo Managed object.
     *
     * @returns {bool} Returns true if MO has child devices.
     *
     * @example
     * <pre>
     *   $scope.hasChildDevices = c8yInventory.hasChildDevices(mo);
     * </pre>
     */
    function hasChildDevices(mo) {
      return hasChildren(mo, 'childDevices');
    }

    /**
     * @ngdoc function
     * @name hasChildAdditions
     * @methodOf c8y.core.service:c8yInventory
     *
     * @description
     * Checks if given managed object has child additions.
     *
     * @param {object} mo Managed object.
     *
     * @returns {bool} Returns true if MO has child additions.
     *
     * @example
     * <pre>
     *   $scope.hasChildAdditions = c8yInventory.hasChildAdditions(mo);
     * </pre>
     */
    function hasChildAdditions(mo) {
      return hasChildren(mo, 'childAdditions');
    }

    function hasChildren(mo, childType) {
      return !!getChildrenCount(mo, childType);
    }

    /**
     * @ngdoc function
     * @name getChildAssetsCount
     * @methodOf c8y.core.service:c8yInventory
     *
     * @description
     * Gets the number of child assets for given managed object.
     *
     * @param {object} mo Managed object.
     *
     * @returns {int} Returns the number of child assets.
     *
     * @example
     * <pre>
     *   $scope.count = c8yInventory.getChildAssetsCount(mo);
     * </pre>
     */
    function getChildAssetsCount(mo) {
      return getChildrenCount(mo, 'childAssets');
    }

    /**
     * @ngdoc function
     * @name getChildDevicesCount
     * @methodOf c8y.core.service:c8yInventory
     *
     * @description
     * Gets the number of child devices for given managed object.
     *
     * @param {object} mo Managed object.
     *
     * @returns {int} Returns the number of child devices.
     *
     * @example
     * <pre>
     *   $scope.count = c8yInventory.getChildDevicesCount(mo);
     * </pre>
     */
    function getChildDevicesCount(mo) {
      return getChildrenCount(mo, 'childDevices');
    }

    /**
     * @ngdoc function
     * @name getChildAdditionsCount
     * @methodOf c8y.core.service:c8yInventory
     *
     * @description
     * Gets the number of child additions for given managed object.
     *
     * @param {object} mo Managed object.
     *
     * @returns {int} Returns the number of child additions.
     *
     * @example
     * <pre>
     *   $scope.count = c8yInventory.getChildAdditionsCount(mo);
     * </pre>
     */
    function getChildAdditionsCount(mo) {
      return getChildrenCount(mo, 'childAdditions');
    }

    function getChildrenCount(mo, childType) {
      return _.get(mo, [childType, 'references', 'length']);
    }

    /**
     * @ngdoc function
     * @name childAssets
     * @methodOf c8y.core.service:c8yInventory
     *
     * @description
     * Gets the list of children assets for given managed object.
     *
     * @param {integer|object} mo Managed object's id or object.
     * @param {object} config Additional configuration for sending requests.
     *
     * @returns {promise} Returns promise with the array of managed object's children assets references.
     *
     * @example
     * <pre>
     *   var moId = 1;
     *   c8yInventory.childAssets(moId).then(function (childrenAssets) {
     *     $scope.childrenAssets = childrenAssets;
     *   });
     * </pre>
     */
    function childAssets(mo, config) {
      return children(mo, 'childAssets', config).then(onChildren);
    }

    /**
     * @ngdoc function
     * @name childDevices
     * @methodOf c8y.core.service:c8yInventory
     *
     * @description
     * Gets the list of children devices for given managed object.
     *
     * @param {integer|object} mo Managed object's id or object.
     * @param {object} config Additional configuration for sending requests.
     *
     * @returns {promise} Returns promise with the array of managed object's children devices references.
     *
     * @example
     * <pre>
     *   var moId = 1;
     *   c8yInventory.childDevices(moId).then(function (childrenDevices) {
     *     $scope.childrenDevices = childrenDevices;
     *   });
     * </pre>
     */
    function childDevices(mo, config) {
      return children(mo, 'childDevices', config).then(onChildren);
    }

    /**
     * @ngdoc function
     * @name childAdditions
     * @methodOf c8y.core.service:c8yInventory
     *
     * @description
     * Gets the list of children additions for given managed object.
     *
     * @param {integer|object} mo Managed object's id or object.
     * @param {object} config Additional configuration for sending requests.
     *
     * @returns {promise} Returns promise with the array of managed object's children addition references.
     *
     * @example
     * <pre>
     *   var moId = 1;
     *   c8yInventory.childAdditions(moId).then(function (childrenDevices) {
     *     $scope.childrenAdditions = childrenAdditions;
     *   });
     * </pre>
     */
    function childAdditions(mo, config) {
      return children(mo, 'childAdditions', config).then(onChildren);
    }

    function children(mo, type, config) {
      var url = buildChildrenUrl(mo, type);
      var cfg = config || {};

      return detailCached(mo).then(function (res) {
        return res.data[type].references.length;
      }).then(function (childrenCount) {
        cfg.params = {pageSize: childrenCount};
        return $http.get(url, cfg);
      });
    }

    function onChildren(res) {
      return _.map(res.data.references, _.property('managedObject'));
    }

    /**
     * @ngdoc function
     * @name addChildAsset
     * @methodOf c8y.core.service:c8yInventory
     *
     * @description
     * Adds managed object to the children assets of another managed object.
     *
     * @param {integer|object} mo Managed object's id or object.
     * @param {object} moChild Managed object to be added as a child.
     *
     * @returns {promise} Returns $http's promise with response from server.
     *
     * @example
     * <pre>
     *   var moId = 1;
     *   var moChild = {id: 2};
     *   c8yInventory.addChildAsset(moId, moChild);
     * </pre>
     */
    function addChildAsset(mo, moChild) {
      return addChild(mo, moChild, 'childAssets');
    }

    /**
     * @ngdoc function
     * @name addChildDevice
     * @methodOf c8y.core.service:c8yInventory
     *
     * @description
     * Adds managed object to the children devices of another managed object.
     *
     * @param {integer|object} mo Managed object's id or object.
     * @param {object} moChild Managed object to be added as a child.
     *
     * @returns {promise} Returns $http's promise with response from server.
     *
     * @example
     * <pre>
     *   var moId = 1;
     *   var moChild = {id: 2};
     *   c8yInventory.addChildDevice(moId, moChild);
     * </pre>
     */
    function addChildDevice(mo, moChild) {
      return addChild(mo, moChild, 'childDevices');
    }

    /**
     * @ngdoc function
     * @name addChildAddition
     * @methodOf c8y.core.service:c8yInventory
     *
     * @description
     * Adds managed object to the children additions of another managed object.
     *
     * @param {integer|object} mo Managed object's id or object.
     * @param {object} moChild Managed object to be added as a child.
     *
     * @returns {promise} Returns $http's promise with response from server.
     *
     * @example
     * <pre>
     *   var moId = 1;
     *   var moChild = {id: 2};
     *   c8yInventory.addChildAddition(moId, moChild);
     * </pre>
     */
    function addChildAddition(mo, moChild) {
      return addChild(mo, moChild, 'childAdditions');
    }

    function addChild(mo, moChild, type) {
      var url = buildChildrenUrl(mo, type);
      var data = {managedObject: moChild};
      var cfg = _.cloneDeep(defaultConfigReference);
      return $http.post(url, data, cfg);
    }

    /**
     * @ngdoc function
     * @name parentsAsset
     * @methodOf c8y.core.service:c8yInventory
     *
     * @description
     * Gets the list of parent assets with specific type or fragment type for given managed object.
     *
     * @param {integer|object} mo Managed object's id or object.
     * @param {object} moType Type of parent assets to filter.
     * @param {object} moFragmentType Fragment type of parent assets to filter.
     *
     * @returns {promise} Returns promise with the list of parent assets.
     *
     * @example
     * <pre>
     *   var moId = 1;
     *   var moType = 'c8y_DeviceGroup';
     *   var moFragmentType = 'c8y_IsDeviceGroup';
     *   c8yInventory.parentsAsset(moId, moType, moFragmentType).then(function (parents) {
     *     $scope.parents = parents;
     *   });
     * </pre>
     */
    function parentsAsset(mo, moType, moFragmentType) {
      return parents(mo, 'asset', moType, moFragmentType);
    }

    /**
     * @ngdoc function
     * @name parentsDevice
     * @methodOf c8y.core.service:c8yInventory
     *
     * @description
     * Gets the list of parent devices with specific type or fragment type for given managed object.
     *
     * @param {integer|object} mo Managed object's id or object.
     * @param {object} moType Type of parent devices to filter.
     * @param {object} moFragmentType Fragment type of parent devices to filter.
     *
     * @returns {promise} Returns $http's promise with response from server.
     *
     * @example
     * <pre>
     *   var moId = 1;
     *   var moType = 'c8y_DeviceGroup';
     *   var moFragmentType = 'c8y_IsDeviceGroup';
     *   c8yInventory.parentsDevice(moId, moType, moFragmentType).then(function (parents) {
     *     $scope.parents = parents;
     *   });
     * </pre>
     */
    function parentsDevice(mo, moType, moFragmentType) {
      return parents(mo, 'device', moType, moFragmentType);
    }

    /**
     * @ngdoc function
     * @name parentsAddition
     * @methodOf c8y.core.service:c8yInventory
     *
     * @description
     * Gets the list of parent addition with specific type or fragment type for given managed object.
     *
     * @param {integer|object} mo Managed object's id or object.
     * @param {object} moType Type of parent devices to filter.
     * @param {object} moFragmentType Fragment type of parent devices to filter.
     *
     * @returns {promise} Returns $http's promise with response from server.
     *
     * @example
     * <pre>
     *   var moId = 1;
     *   var moType = 'c8y_DeviceGroup';
     *   var moFragmentType = 'c8y_IsDeviceGroup';
     *   c8yInventory.parentsAddition(moId, moType, moFragmentType).then(function (parents) {
     *     $scope.parents = parents;
     *   });
     * </pre>
     */
    function parentsAddition(mo, moType, moFragmentType) {
      return parents(mo, 'addition', moType, moFragmentType);
    }

    function parents(mo, parentType, moType, moFragmentType) {

      return detail(mo, {withParents: true})
        .then(function (res) {
          var refPath = 'data.' + parentType + 'Parents.references';
          return _.map(_.get(res, refPath), _.property('managedObject.id'));
        })
        .then(function (parentIds) {
          var out = [];
          var listFilter = {
            ids: parentIds.join(',')
          };
          if (parentIds.length) {
            out = list(listFilter);
            // filter by either type or fragment type:
            if (moType || moFragmentType) {
              out = out.then(createFilterForTypes(moType, moFragmentType));
            }
          }
          return out;
        });
    }

    function createFilterForTypes(moType, moFragmentType) {
      return function (mos) {
        return _.filter(mos, function (_mo) {
          return (moType && _mo.type === moType) ||
            (moFragmentType && !_.isUndefined(_mo[moFragmentType]));
        });
      };
    }


    /**
     * @ngdoc function
     * @name directParentAssets
     * @methodOf c8y.core.service:c8yInventory
     *
     * @description
     * Gets the list of direct parent assets of specific type or with fragment type for given managed object.
     *
     * @param {integer|object} mo Managed object's id or object.
     * @param {object} moType Type of parent assets to filter.
     * @param {object} moFragmentType Fragment type of parent assets to filter.
     *
     * @returns {promise} Returns promise with the list of direct parent assets.
     *
     * @example
     * <pre>
     *   var moId = 1;
     *   var moType = 'c8y_DeviceGroup';
     *   var moFragmentType = 'c8y_IsDeviceGroup';
     *   c8yInventory.directParentAssets(moId, moType, moFragmentType).then(function (directParentDeviceGroups) {
     *     $scope.directParentDeviceGroups = directParentDeviceGroups;
     *   });
     * </pre>
     */
    function directParentAssets(mo, moType, moFragmentType) {
      return directParents(mo, 'asset', moType, moFragmentType);
    }

    /**
     * @ngdoc function
     * @name directParentDevices
     * @methodOf c8y.core.service:c8yInventory
     *
     * @description
     * Gets the list of direct parent devices of specific type or with fragment type for given managed object.
     *
     * @param {integer|object} mo Managed object's id or object.
     * @param {object} moType Type of parent devices to filter.
     * @param {object} moFragmentType Fragment type of parent devices to filter.
     *
     * @returns {promise} Returns promise with the list of direct parent devices.
     *
     * @example
     * <pre>
     *   var moId = 1;
     *   var moType = 'c8y_MyDevice';
     *   var moFragmentType = 'c8y_Mobile';
     *   c8yInventory.directParentDevices(moId, moType, moFragmentType).then(function (directParentMobileDevices) {
     *     $scope.directParentMobileDevices = directParentMobileDevices;
     *   });
     * </pre>
     */
    function directParentDevices(mo, moType, moFragmentType) {
      return directParents(mo, 'device', moType, moFragmentType);
    }

    /**
     * @ngdoc function
     * @name directParentAdditions
     * @methodOf c8y.core.service:c8yInventory
     *
     * @description
     * Gets the list of direct parent additions of specific type or with fragment type for given managed object.
     *
     * @param {integer|object} mo Managed object's id or object.
     * @param {object} moType Type of parent devices to filter.
     * @param {object} moFragmentType Fragment type of parent devices to filter.
     *
     * @returns {promise} Returns promise with the list of direct parent devices.
     *
     * @example
     * <pre>
     *   var moId = 1;
     *   var moType = 'c8y_MyDevice';
     *   var moFragmentType = 'c8y_Mobile';
     *   c8yInventory.directParentAdditions(moId, moType, moFragmentType).then(function (parentsAddition) {
     *     $scope.parentsAddition = parentsAddition;
     *   });
     * </pre>
     */
    function directParentAdditions(mo, moType, moFragmentType) {
      return directParents(mo, 'addition', moType, moFragmentType);
    }

    function directParents(mo, parentType, moType, moFragmentType) {
      var childIdParamName = _.camelCase(['child', _.lowerCase(parentType), 'id']);
      var filters = {withParents: true};
      filters[childIdParamName] = mo.id || mo;
      return list(filters)
        .then(function (_parents) {
          return (moType || moFragmentType) ?
            createFilterForTypes(moType, moFragmentType)(_parents) :
            _parents;
        });
    }

    /**
     * @ngdoc function
     * @name removeChildAsset
     * @methodOf c8y.core.service:c8yInventory
     *
     * @description
     * Removes child asset from managed object.
     *
     * @param {integer|object} mo Managed object's id or object.
     * @param {object} moChild Managed object to be removed from children.
     *
     * @returns {promise} Returns $http's promise with response from server.
     *
     * @example
     * <pre>
     *   var moId = 1;
     *   var moChild = {id: 2};
     *   c8yInventory.removeChildAsset(moId, moChild);
     * </pre>
     */
    function removeChildAsset(mo, moChild) {
      return removeChild(mo, moChild, 'childAssets');
    }

    /**
     * @ngdoc function
     * @name removeChildDevice
     * @methodOf c8y.core.service:c8yInventory
     *
     * @description
     * Removes child device from managed object.
     *
     * @param {integer|object} mo Managed object's id or object.
     * @param {object} moChild Managed object to be removed from children.
     *
     * @returns {promise} Returns $http's promise with response from server.
     *
     * @example
     * <pre>
     *   var moId = 1;
     *   var moChild = {id: 2};
     *   c8yInventory.removeChildDevice(moId, moChild);
     * </pre>
     */
    function removeChildDevice(mo, moChild) {
      return removeChild(mo, moChild, 'childDevices');
    }

    /**
     * @ngdoc function
     * @name removeChildAddition
     * @methodOf c8y.core.service:c8yInventory
     *
     * @description
     * Removes child addition from managed object.
     *
     * @param {integer|object} mo Managed object's id or object.
     * @param {object} moChild Managed object to be removed from children.
     *
     * @returns {promise} Returns $http's promise with response from server.
     *
     * @example
     * <pre>
     *   var moId = 1;
     *   var moChild = {id: 2};
     *   c8yInventory.removeChildAddition(moId, moChild);
     * </pre>
     */
    function removeChildAddition(mo, moChild) {
      return removeChild(mo, moChild, 'childAdditions');
    }

    function removeChild(mo, moChild, type) {
      var url = buildChildUrl(mo, moChild, type);
      return $http.delete(url);
    }

    function removeCache(mo) {
      var id = mo && mo.id || mo;
      delete _detailCached.cache[id];
    }

    /**
     * @ngdoc function
     * @name getCount
     * @methodOf c8y.core.service:c8yInventory
     *
     * @description
     * Gets the number of managed objects that would be returned by {@link c8y.core.service:c8yInventory#methods_list list} function for given filters.
     *
     * @param {object} filter Filters for counting managed objects.
     *
     * @returns {promise} Returns promise with item count.
     *
     * @example
     * <pre>
     *   var filters = {
     *     fragmentType: 'c8y_IsDevice'
     *   };
     *   c8yInventory.getCount(filters).then(function (count) {
     *     $scope.total = count;
     *   });
     * </pre>
     */
    function getCount(filter) {
      return c8yBase.getCount(list, filter || {});
    }

    /**
     * @ngdoc function
     * @name getSupportedMeasurements
     * @methodOf c8y.core.service:c8yInventory
     *
     * @description
     * Gets the list of measurements supported by managed object.
     *
     * @param {integer|object} mo Managed object's id or object.
     *
     * @returns {promise} Returns promise with the array of supported measurements.<!-- Structure defining supported measurements is exlpained {@link http://docs.cumulocity.com/supportedMeasurements@TODO here}.-->
     *
     * @example
     * <pre>
     *   var moId = 1;
     *   c8yInventory.getSupportedMeasurements(moId).then(function (measurements) {
     *     $scope.supportedMeasurements = measurements;
     *   });
     * </pre>
     */
    function getSupportedMeasurements(mo) {
      var url = buildDetailUrl(mo) + '/supportedMeasurements';
      return $http.get(url)
        .then(_.property('data.c8y_SupportedMeasurements'));
    }

    function _getSupportedSeries(mo) {
      var url = buildDetailUrl(mo) + '/supportedSeries';
      return $http.get(url)
        .then(_.property('data.c8y_SupportedSeries'));
    }

    /**
     * @ngdoc function
     * @name getSupportedSeries
     * @methodOf c8y.core.service:c8yInventory
     *
     * @description
     * Gets the list of series supported by managed object.
     *
     * @param {integer|object} mo Managed object's id or object.
     *
     * @returns {promise} Returns promise with the array of supported series (object with fragment and series names).
     *
     * @example
     * <pre>
     *   var moId = 1;
     *   c8yInventory.getSupportedSeries(moId).then(function (supportedSeries) {
     *     $scope.supportedSeries = supportedSeries;
     *   });
     * </pre>
     */
    function getSupportedSeries(mo) {
      return $q.all([
        getSupportedMeasurements(mo),
        _getSupportedSeries(mo)
      ]).then(function (results) {
        var supportedMeasurements = _.sortBy(results[0], 'length').reverse();
        var supportedSeries = results[1];
        return _(supportedSeries)
          .map(function (s) {
            var fragment = _.find(supportedMeasurements, function (m) {
              return s.indexOf(m) === 0;
            });
            var series = s.replace(fragment + '.', '');
            return {
              fragment: fragment,
              series: series
            };
          })
          .filter(_.property('fragment'))
          .value();
      });
    }

    /**
     * @ngdoc function
     * @name getFragments
     * @methodOf c8y.core.service:c8yInventory
     *
     * @description
     * Gets the list of fragment names.
     *
     * @param {object} mo device object.
     *
     * @returns {array} Returns list of fragment names.
     *
     * @example
     * <pre>
     *   var device = {
     *     id: "25000"
     *     type: 'CustomDeviceType'
     *     c8y_LastMeasurement: {
     *       "time":"2014-09-19T21:12:55"
     *     }
     *   };
     *   var fragments = c8yDevices.getFragments(device); // ['c8y_LastMeasurement']
     * </pre>
     */
    function getFragments(mo) {
      var fieldsToIgnore = _.union(fieldsToClean, ['id', 'type', 'name', 'owner', 'self']);
      return _.keys(c8yBase.cleanFields(mo, fieldsToIgnore));
    }

    /**
     * @ngdoc function
     * @name isOwner
     * @methodOf c8y.core.service:c8yInventory
     *
     * @description
     * Checks if user is owner of managed object.
     *
     * @param {object|integer} mo Managed object or id to check.
     * @param {object} user User object to check for ownership. Defaults to current user.
     *
     * @returns {bool} Returns true if user is owner of managed object.
     *
     * @example
     * <pre>
     *   var moId = 10300;
     *   c8yInventory.isOwner(moId)
     *     .then(function (isOwner) {
     *       console.log(isOwner); // true if current user is owner of managed object 10300
     *     });
     * </pre>
     */
    function isOwner(mo, user) {
      var promises = {
        user: user ? $q.when(user) : c8yUser.current(),
        owner: getOwner(mo)
      };
      return $q.all(promises)
        .then(function (results) {
          return results.user.userName === results.owner;
        });
    }

    /**
     * @ngdoc function
     * @name isOwnerCached
     * @methodOf c8y.core.service:c8yInventory
     *
     * @description
     * Checks if user is owner of managed object (fetches MO details only for first invoke).
     *
     * @param {object|integer} mo Managed object or id to check.
     * @param {object} user User object to check for ownership. Defaults to current user.
     *
     * @returns {bool} Returns true if user is owner of managed object.
     *
     * @example
     * <pre>
     *   var moId = 10300;
     *   c8yInventory.isOwnerCached(moId)
     *     .then(function (isOwner) {
     *       console.log(isOwner); // true if current user is owner of managed object 10300
     *     });
     * </pre>
     */
    function isOwnerCached(mo, user) {
      var promises = {
        user: user ? $q.when(user) : c8yUser.current(),
        owner: getOwnerCached(mo)
      };
      return $q.all(promises)
        .then(function (results) {
          return results.user.userName === results.owner;
        });
    }

    /**
     * @ngdoc function
     * @name getOwner
     * @methodOf c8y.core.service:c8yInventory
     *
     * @description
     * Gets the owner of managed object.
     *
     * @param {object|integer} mo Managed object or id to check.
     *
     * @returns {promise} Returns a promise resolving to owner's username string.
     *
     * @example
     * <pre>
     *   c8yInventory.getOwner({
     *     id: 10,
     *     owner: 'admin'
     *   }).then(function (owner) {
     *     console.log(owner); // 'admin'
     *   });
     *   c8yInventory.getOwner(10)
     *     .then(function (owner) {
     *       console.log(owner); // 'admin'
     *     });
     * </pre>
     */
    function getOwner(mo) {
      var propertyOwner = 'owner';
      var knownOwner = _.get(mo, propertyOwner);
      var detailsPromise = knownOwner ? $q.when(mo) : detail(mo).then(c8yBase.getResData);
      return detailsPromise
        .then(_.property(propertyOwner));
    }

    /**
     * @ngdoc function
     * @name getOwnerCached
     * @methodOf c8y.core.service:c8yInventory
     *
     * @description
     * Gets the owner of managed object (fetches MO details only for first invoke).
     *
     * @param {object|integer} mo Managed object or id to check.
     *
     * @returns {promise} Returns a promise resolving to owner's username string.
     *
     * @example
     * <pre>
     *   c8yInventory.getOwnerCached(10)
     *     .then(function (owner) {
     *       console.log(owner); // 'admin'
     *     });
     * </pre>
     */
    var getOwnerCached = _.memoize(getOwner, function (mo) {
      return c8yBase.getId(mo);
    });

    /**
     * @ngdoc function
     * @name detailCached
     * @methodOf c8y.core.service:c8yInventory
     *
     * @description
     * Gets the cached details of selected managed object.
     *
     * @param {integer|object} mo Managed object's id or object.
     *
     * @returns {promise} Returns $http's promise with response containing data property with managed object's details.<!-- See object's specification {@link http://docs.cumulocity.com/managedObjects@TODO here}.-->
     *
     * @example
     * <pre>
     *   var moId = 1;
     *   c8yInventory.detailCached(moId).then(function (res) {
     *     $scope.managedObject = res.data;
     *   });
     * </pre>
     */
    var _detailCached = _.memoize(detailCached, _.identity);

    return {
      list: list,
      listQuery: listQuery,

      detail: detail,
      detailCached: _detailCached,
      detailRealtime: detailRealtime,

      create: create,
      createChild: createChild,
      createConfirm: createConfirm,
      update: update,
      save: save,
      remove: remove,

      hasChildAssets: hasChildAssets,
      hasChildDevices: hasChildDevices,
      hasChildAdditions: hasChildAdditions,

      getChildAssetsCount: getChildAssetsCount,
      getChildDevicesCount: getChildDevicesCount,
      getChildAdditionsCount: getChildAdditionsCount,

      childAssets: childAssets,
      childDevices: childDevices,
      childAdditions: childAdditions,

      addChildAsset: addChildAsset,
      addChildDevice: addChildDevice,
      addChildAddition: addChildAddition,

      createChildAsset: createChildAsset,
      createChildDevice: createChildDevice,
      createChildAddition: createChildAddition,

      removeChildAsset: removeChildAsset,
      removeChildDevice: removeChildDevice,
      removeChildAddition: removeChildAddition,

      parentsAsset: parentsAsset,
      parentsDevice: parentsDevice,
      parentsAddition: parentsAddition,

      directParentAssets: directParentAssets,
      directParentDevices: directParentDevices,
      directParentAdditions: directParentAdditions,

      getCount: getCount,
      getFragments: getFragments,

      getSupportedMeasurements: getSupportedMeasurements,
      getSupportedSeries: getSupportedSeries,

      isOwner: isOwner,
      isOwnerCached: isOwnerCached,

      getOwner: getOwner,
      getOwnerCached: getOwnerCached
    };
  }
})();
