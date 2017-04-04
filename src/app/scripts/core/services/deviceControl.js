
(function () {
  'use strict';


/**
 * @ngdoc service
 * @name c8y.core.service:c8yDeviceControl
 * @requires c8y.core.service:c8yBase
 * @requires c8y.core.service:c8yRealtime
 * @requires $http
 * @requires $rootScope
 * @requires $q
 *
 * @description
 * This service allows for managing device operations.
 */
angular.module('c8y.core').service('c8yDeviceControl', [
  '$http',
  '$rootScope',
  '$q',
  'c8yBase',
  'c8yRealtime',
  'gettext',
  'KeysMixin',
  C8yDeviceControl
]);

function C8yDeviceControl(
  $http,
  $rootScope,
  $q,
  c8yBase,
  c8yRealtime,
  gettext,
  KeysMixin
) {
  var clean = c8yBase.cleanFields,
    path = 'devicecontrol/operations',
    opIdLocationRegExp = '\\/devicecontrol\\/operations\\/(\\d+)',
    defaultConfig = {
      headers: c8yBase.contentHeaders('operation')
    },
    /**
     * @ngdoc property
     * @name status
     * @propertyOf c8y.core.service:c8yDeviceControl
     * @returns {object} Device operation statuses map. <!--Available values are described {@link http://docs.cumulocity.com/deviceOperationStatus@TODO here}.-->
     *
     * @example
     * <pre>
     *   $scope.operation.status = c8yDeviceControl.status.SUCCESSFUL;
     * </pre>
     */
    status = {
      PENDING: gettext('PENDING'),
      SUCCESSFUL: gettext('SUCCESSFUL'),
      EXECUTING: gettext('EXECUTING'),
      FAILED: gettext('FAILED')
    },
    /**
     * @ngdoc property
     * @name statusList
     * @propertyOf c8y.core.service:c8yDeviceControl
     * @returns {array} The list of available device operation statuses.
     *
     * @example
     * <pre>
     *   $scope.operationStatuses = c8yDeviceControl.statusList;
     * </pre>
     */
    statusList = _.keys(status),
    cleanKeys = [
      'creationTime',
      'deviceExternalIDs',
      'id',
      'self'
    ],
    cleanKeysUpdate = [
      'deviceId',
      'deviceName',
      'bulkOperationId'
    ],
    style = {};

  this.reservedKeys = cleanKeys.concat(['deviceId', 'deviceName', 'bulkOperationId']);
  this.standardKeys = {
    failureReason: gettext('Failure reason'),
    description: gettext('Description'),
    status: gettext('Status')
  };

  /**
   * @ngdoc property
   * @name events
   * @propertyOf c8y.core.service:c8yDeviceControl
   * @returns {scope} Returns AngularJS scope on which the following events are emitted:
   *
   * - **create** - when operation was created,
   * - **update** - when operation was updated.
   *
   * @example
   * <pre>
   *   c8yDeviceControl.events.$on('create', function() {
   *     // code to execute when an operation was created
   *   });
   *   c8yDeviceControl.events.$on('update', function() {
   *     // code to execute when an operation was updated
   *   });
   * </pre>
   */
  var evtBus = $rootScope.$new(true);

  style[status.PENDING] = {
    icon: 'clock-o',
    cls: 'text-muted'
  };
  style[status.EXECUTING] = {
    icon: 'refresh',
    cls: 'text-info'
  };
  style[status.SUCCESSFUL] = {
    icon: 'check-circle',
    cls: 'text-success'
  };
  style[status.FAILED] = {
    icon: 'times-circle',
    cls: 'text-danger'
  };

  function buildDetailUrl(operation) {
    var id = operation.id || operation;
    return c8yBase.url(path + '/' + id);
  }

  /**
   * @ngdoc function
   * @name list
   * @methodOf c8y.core.service:c8yDeviceControl
   *
   * @description
   * Gets the list of device operations.
   *
   * @param {object} filters Filters object.
   *
   * @returns {promise} Returns promise with the list of operations. <!--See device operation object specification {@link http://docs.cumulocity.com/deviceOperation@TODO here}.-->
   *
   * @example
   * <pre>
   *   c8yDeviceControl.list().then(function (operations) {
   *     $scope.operations = [];
   *     _.forEach(operations, function(operation) {
   *       $scope.operations.push(operation);
   *     });
   *   });
   * </pre>
   */
  function list(filters) {
    var url = c8yBase.url(path),
      _filters = c8yBase.pageSizeNoTotalFilter(filters),
      cfg = {
        params: _filters
      },
      onList = c8yBase.cleanListCallback('operations', list, _filters);

    return $http.get(url, cfg).then(onList);
  }

  /**
   * @ngdoc function
   * @name listPaged
   * @methodOf c8y.core.service:c8yDeviceControl
   *
   * @description
   * Gets paged list of device operations.
   *
   * @param {object} filters Filters object.
   *
   * @returns {promise} Returns promise with the list of operations. <!--See device operation object specification {@link http://docs.cumulocity.com/deviceOperation@TODO here}.-->
   *
   * @example
   * <pre>
   *   function getOperationsAllPaged(filters) {
   *     var ops = [];
   *     var onNotify = function (_ops) {
   *       ops = ops.concat(_ops);
   *     };
   *     var onDone = function () {
   *       return ops;
   *     };
   *     return c8yDeviceControl.listPaged(filters)
   *            .then(onDone, _.noop, onNotify);
   *   }
   * </pre>
   */
  function listPaged(filters) {
    var defer = $q.defer(),
      _filters = _.assign(filters || {}, {pageSize: 1000}),
      cancelled = false,
      onList = function (list) {
        var isNext = !_.isUndefined(list.paging.next) && list.length >= _filters.pageSize;
        defer.notify(list);

        if (!isNext) {
          defer.resolve(true);
        }

        if (cancelled) {
          return true;
        }

        return isNext ? list.paging.next().then(onList) : true;
      };

    _.assign(defer.promise, {
      cancel: function () {
        cancelled = true;
        defer.reject('canceled');
      }
    });

    list(_filters).then(onList);

    return defer.promise;
  }

  /**
   * @ngdoc function
   * @name detail
   * @methodOf c8y.core.service:c8yDeviceControl
   *
   * @description
   * Gets details of device operation.
   *
   * @param {integer|object} operation Device operation's id or operation object.
   *
   * @returns {promise} Returns $http's promise. <!--See response's `data` object specification {@link http://docs.cumulocity.com/deviceOperation@TODO here}.-->
   *
   * @example
   * <pre>
   *   var operationId = 1;
   *   c8yDeviceControl.detail(operationId).then(function (res) {
   *     $scope.operation = res.data;
   *   });
   * </pre>
   */
  function detail(operation) {
    var url = buildDetailUrl(operation);
    return $http.get(url);
  }

  /**
   * @ngdoc function
   * @name create
   * @methodOf c8y.core.service:c8yDeviceControl
   *
   * @description
   * Creates a new device operation.
   *
   * @param {object} operation Device operation object. <!--See object specification {@link http://docs.cumulocity.com/deviceOperation@TODO here}.-->
   *
   * @returns {promise} Returns $http's promise and emits `create` event on {@link c8y.core.service:c8yDeviceControl#properties_events `events`}.
   *
   * @example
   * <pre>
   *   var operation = {
   *     deviceId: '1',
   *     com_cumulocity_model_WebCamDevice: {
   *       name: 'take picture',
   *       parameters: {
   *         duration: '5s',
   *         quality: 'HD'
   *       }
   *     }
   *   };
   *   c8yDeviceControl.create(operation);
   * </pre>
   */
  function create(operation) {
    var url = c8yBase.url(path),
      data = clean(operation, cleanKeys),
      cfg = _.cloneDeep(defaultConfig);

    if (!data.deviceId) {
      throw new Error('c8yDeviceControl: data must have a deviceId property');
    }

    return $http.post(url, data, cfg).then(getIdFromRes).finally(function (id) {
      evtBus.$emit('create');
      return id;
    });
  }

  function getIdFromRes(res) {
    var regexp = new RegExp(opIdLocationRegExp);
    var matches = res.headers('Location').match(regexp);
    return parseInt(matches[1], 10);
  }

  /**
   * @ngdoc function
   * @name createWithNotifications
   * @methodOf c8y.core.service:c8yDeviceControl
   *
   * @description
   * Creates a new device operation and returns promises which resolve when operation is created and when it is completed.
   *
   * @param {object} operation Device operation object. <!--See object specification {@link http://docs.cumulocity.com/deviceOperation@TODO here}.-->
   *
   * @returns {promise} Returns a promise that resolves to an object with two properties:
   *
   * - **created** – Promise that resolves when operation is created and returns operation's id.
   * - **completed** - Promise that resolves when operation is completed and returns operation's data.
   *
   * @example
   * <pre>
   *   var operation = {
   *     deviceId: $routeParams.deviceId,
   *     description: 'My Operation',
   *     c8y_MyOperation: {
   *       param1: 'paramValue'
   *     }
   *   };
   *   c8yDeviceControl.createWithNotifications(operation).then(function (operationPromises) {
   *     operationPromises.created.then(_.partial(c8yAlert.success, 'Operation ' + operation.description + ' has been created!'));
   *     operationPromises.completed.then(function (operationResult) {
   *       if (operationResult.status === c8yDeviceControl.status.SUCCESSFUL) {
   *         handleSuccess();
   *       } else if (operationResult.status === c8yDeviceControl.status.FAILED) {
   *         handleFailure();
   *       }
   *     });
   *   });
   * </pre>
   */
  function createWithNotifications(operation) {
    var created = create(operation);
    var completed = created.then(function (operationId) {
      operation.id = operationId;

      var deferred = $q.defer();
      var subscriptionId = 'operation' + operation.id;
      var subscriptionChannel = '/operations/' + operation.deviceId;
      c8yRealtime.addListener(subscriptionId, subscriptionChannel, 'UPDATE', function (evt, data) {
        // CAUTION: == is required here:
        if (data.id == operation.id) {
          if (data.status === status.SUCCESSFUL || data.status === status.FAILED) {
            c8yRealtime.stop(subscriptionId, subscriptionChannel);
            deferred.resolve(data);
          } else {
            deferred.notify(data);
          }
        }
      });
      c8yRealtime.start(subscriptionId, subscriptionChannel);
      return deferred.promise;
    });
    return $q.when({
      created: created,
      completed: completed
    });
  }

  /**
   * @ngdoc function
   * @name update
   * @methodOf c8y.core.service:c8yDeviceControl
   *
   * @description
   * Updates a device operation.
   *
   * @param {object} operation Device operation object. <!--See object specification {@link http://docs.cumulocity.com/deviceOperation@TODO here}.-->
   *
   * @returns {promise} Returns $http's promise and emits `update` event on {@link c8y.core.service:c8yDeviceControl#properties_events `events`}.
   *
   * @example
   * <pre>
   *   var operation = {
   *     id: 1,
   *     deviceId: '2',
   *     com_cumulocity_model_WebCamDevice: {
   *       name: 'take picture',
   *       parameters: {
   *         duration: '5s',
   *         quality: 'HD'
   *       }
   *     },
   *     status: c8yDeviceControl.status.SUCCESSFUL
   *   };
   *   c8yDeviceControl.update(operation);
   * </pre>
   */
  function update(operation) {
    var url = c8yBase.url(path) + '/' + operation.id,
      data = clean(operation, cleanKeys.concat(cleanKeysUpdate)),
      cfg = _.cloneDeep(defaultConfig);

    return $http.put(url, data, cfg).finally(function () {
      evtBus.$emit('update');
    });
  }

  /**
   * @ngdoc function
   * @name cancel
   * @methodOf c8y.core.service:c8yDeviceControl
   *
   * @description
   * Cancels given operation by:
   *
   * - changing `status` to `c8yDeviceControl.status.FAILED`
   * - setting `failureReason` to `Operation cancelled by user`.
   *
   * @param {object} operation Device operation object. <!--See object specification {@link http://docs.cumulocity.com/deviceOperation@TODO here}.-->
   *
   * @returns {promise} Returns $http's promise and emits `update` event on {@link c8y.core.service:c8yDeviceControl#properties_eventss `events`}.
   *
   * @example
   * <pre>
   *   var operationId = 1;
   *   c8yDeviceOperation.detail(operationId).then(function (res) {
   *     var operation = res.data;
   *     c8yDeviceControl.cancel(operation);
   *   });
   * </pre>
   */
  function cancel(operation) {
    operation.status = status.FAILED;
    operation.failureReason = gettext('Operation cancelled by user.');
    return update(operation);
  }

  /**
   * @ngdoc function
   * @name save
   * @methodOf c8y.core.service:c8yDeviceControl
   *
   * @description
   * Creates a new operation (if `operation.id` is not provided) or updates existing operation.
   *
   * @param {object} operation Device operation object. <!--See object specification {@link http://docs.cumulocity.com/deviceOperation@TODO here}.-->
   *
   * @returns {promise} Returns $http's promise and emits `create` or `update` event on {@link c8y.core.service:c8yDeviceControl#properties_events `events`}.
   *
   * @example
   * <pre>
   *   var operationId = 1;
   *   c8yDeviceControl.detail(operationId).then(function (res) {
   *     var operation = res.data;
   *     operation.status = c8yDeviceControl.status.EXECUTING;
   *     c8yDeviceControl.save(operation);
   *   });
   * </pre>
   */
  function save(operation) {
    return operation.id ? update(operation) : create(operation);
  }

  /**
   * @ngdoc function
   * @name getStyle
   * @methodOf c8y.core.service:c8yDeviceControl
   *
   * @description
   * Gets styling settings for operation status.
   *
   * @param {object|string} operationOrStatus Device operation object<!-- (see specification {@link http://docs.cumulocity.com/deviceOperation@TODO here})--> or operation status string.
   *
   * @returns {object} Returns object with the following properties:
   *
   * - **icon** - `string` - icon name,
   * - **cls** - `string` - CSS class name
   *
   * @example
   * Controller:
   * <pre>
   *   $scope.ico = function (operation) {
   *     return c8yDeviceControl.getStyle(operation).icon;
   *   };
   *   $scope.cls = function (operation) {
   *     return c8yDeviceControl.getStyle(operation).cls;
   *   };
   * </pre>
   * Template:
   * <pre>
   *   <i c8y-icon="{{ico(operation)}}" ng-class="cls(operation)"></i>
   * </pre>
   */
  function getStyle(operationOrStatus) {
    var _status = _.isString(operationOrStatus) ?
      operationOrStatus : operationOrStatus.status;
    return style[_status.toUpperCase()];
  }

  _.assign(this, {
    list: list,
    listPaged: listPaged,
    detail: detail,
    create: create,
    createWithNotifications: createWithNotifications,
    update: update,
    cancel: cancel,
    save: save,
    status: status,
    statusList: statusList,
    getStyle: getStyle,
    events: evtBus
  });

  _.assign(this, KeysMixin);
  _.bindAll(this, _.keys(KeysMixin));
}
})();
