(function () {
  'use strict';

  angular.module('c8y.core')
    .factory('c8yDeviceBulkControl', ['$http', 'c8yBase', c8yDeviceBulkControl]);

  /**
   * @ngdoc service
   * @name c8y.core.service:c8yDeviceBulkControl
   * @requires $http
   * @requires c8y.core.service:c8yBase
   *
   * @description
   * This service allows for managing bulk device operations.
   */
  function c8yDeviceBulkControl($http, c8yBase) {
    var path = 'devicecontrol/bulkoperations',
      opIdLocationRegExp = '\\/devicecontrol\\/bulkoperations\\/(\\d+)',
      clean = c8yBase.cleanFields,
      defaultConfig = {
        headers: c8yBase.contentHeaders('bulkOperation')
      },
      cleanKeys = [
        'creationTime',
        'id',
        'self',
        'operations'
      ],
      cleanKeysUpdate = [],
      status = {
        SCHEDULED: 'SCHEDULED',
        EXECUTING: 'EXECUTING',
        COMPLETED_WITH_FAILURES: 'COMPLETED_WITH_FAILURES',
        COMPLETED_SUCCESSFULLY: 'COMPLETED_SUCCESSFULLY',
        CANCELLED: 'CANCELLED'
      },
      statusList = _.keys(status),
      internalStatus = {
        ACTIVE: 'ACTIVE',
        IN_PROGRESS: 'IN_PROGRESS',
        COMPLETED: 'COMPLETED',
        DELETED: 'DELETED'
      },
      singleOpStatusMap = {
        PENDING: [status.SCHEDULED],
        EXECUTING: [status.EXECUTING],
        SUCCESSFUL: [status.COMPLETED_SUCCESSFULLY],
        FAILED: [status.COMPLETED_WITH_FAILURES, status.CANCELLED]
      },
      style = {};

    style['SCHEDULED'] = {
      label: 'SCHEDULED',
      icon: 'clock-o',
      cls: 'text-muted'
    };
    style['EXECUTING'] = {
      label: 'EXECUTING',
      icon: 'refresh',
      cls: 'text-info'
    };
    style['COMPLETED_WITH_FAILURES'] = {
      label: 'COMPLETED WITH FAILURES',
      icon: 'times-circle',
      cls: 'text-danger'
    };
    style['COMPLETED_SUCCESSFULLY'] = {
      label: 'COMPLETED SUCCESSFULLY',
      icon: 'check-circle',
      cls: 'text-success'
    };
    style['CANCELLED'] = {
      label: 'CANCELLED',
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
     * @methodOf c8y.core.service:c8yDeviceBulkControl
     *
     * @description
     * Gets the list of bulk device operations.
     *
     * @param {object} filters Filters object.
     * @param {object} silentError If true then in case of error it does not display standard error message but allows you to handle it in promise.
     *
     * @returns {promise} Returns promise with the list of operations.
     *
     * @example
     * <pre>
     *   c8yDeviceBulkControl.list().then(function (operations) {
     *     $scope.operations = [];
     *     _.forEach(operations, function(operation) {
     *       $scope.operations.push(operation);
     *     });
     *     $scope.paging = operations.paging;
     *   });
     * </pre>
     */
    function list(filters, silentError) {
      var url = c8yBase.url(path),
        _filters = c8yBase.pageSizeNoTotalFilter(filters),
        cfg = {
          params: _filters,
          silentError: silentError
        },
        onList = c8yBase.cleanListCallback('bulkOperations', list, _filters);

      return $http.get(url, cfg)
        .then(onList)
        .then(_.partialRight(filterByStatus, _filters.status));
    }

    function filterByStatus(operations, statuses) {
      var result;
      if (_.isUndefined(statuses)) {
        result = operations;
      } else {
        var list = _.isArray(statuses) ? statuses : [statuses];
        result = _.filter(operations, function (o) {
          return _.includes(statuses, getStatus(o));
        });
      }
      return result;
    }

    /**
     * @ngdoc function
     * @name detail
     * @methodOf c8y.core.service:c8yDeviceBulkControl
     *
     * @description
     * Gets the details of bulk device operation.
     *
     * @param {integer|object} operation Bulk device operation's id or operation object.
     *
     * @returns {promise} Returns $http's promise with operation details.
     *
     * @example
     * <pre>
     *   var operationId = 1;
     *   c8yDeviceBulkControl.detail(operationId).then(function (res) {
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
     * @name save
     * @methodOf c8y.core.service:c8yDeviceBulkControl
     *
     * @description
     * Creates a new operation (if `operation.id` is not provided) or updates existing operation.
     *
     * @param {object} operation Bulk device operation object.
     *
     * @returns {promise} Returns $http's promise.
     *
     * @example
     * <pre>
     *   var operationId = 1;
     *   c8yDeviceBulkControl.detail(operationId).then(function (res) {
     *     var operation = res.data;
     *     operation.creationRamp = 60;
     *     c8yDeviceBulkControl.save(operation);
     *   });
     * </pre>
     */
    function save(operation) {
      return operation.id ? update(operation) : create(operation);
    }

    /**
     * @ngdoc function
     * @name create
     * @methodOf c8y.core.service:c8yDeviceBulkControl
     *
     * @description
     * Creates a new bulk device operation.
     *
     * @param {object} operation Bulk device operation object.
     *
     * @returns {promise} Returns $http's promise with created operation's id.
     *
     * @example
     * <pre>
     *   var operation = {
     *     groupId: 1,
     *     startDate: '2015-07-08T16:36+02:00',
     *     creationRamp: 45,
     *     operationPrototype: {
     *       description: 'Take picture',
     *       c8y_TakePicture: {
     *         duration: '5s',
     *         quality: 'HD'
     *       }
     *     }
     *   };
     *   c8yDeviceBulkControl.create(operation);
     * </pre>
     */
    function create(operation) {
      var url = c8yBase.url(path),
        data = clean(operation, cleanKeys),
        cfg = _.cloneDeep(defaultConfig);

      return $http.post(url, data, cfg)
        .then(getIdFromRes);
    }

    function getIdFromRes(res) {
      var regexp = new RegExp(opIdLocationRegExp);
      var matches = res.headers('Location').match(regexp);
      return parseInt(matches[1], 10);
    }

    /**
     * @ngdoc function
     * @name update
     * @methodOf c8y.core.service:c8yDeviceBulkControl
     *
     * @description
     * Updates a device operation.
     *
     * @param {object} operation Device operation object.
     *
     * @returns {promise} Returns $http's promise and emits `update` event on {@link c8y.core.service:c8yDeviceBulkControl#properties_events `events`}.
     *
     * @example
     * <pre>
     *   var operationId = 1;
     *   c8yDeviceBulkControl.detail(operationId).then(function (res) {
     *     var operation = res.data;
     *     operation.creationRamp = 60;
     *     c8yDeviceBulkControl.update(operation);
     *   });
     *   c8yDeviceBulkControl.update(operation);
     * </pre>
     */
    function update(operation) {
      var url = c8yBase.url(path + '/' + operation.id),
        data = clean(operation, cleanKeys.concat(cleanKeysUpdate)),
        cfg = _.cloneDeep(defaultConfig);

      return $http.put(url, data, cfg);
    }

    /**
     * @ngdoc function
     * @name canCancel
     * @methodOf c8y.core.service:c8yDeviceBulkControl
     *
     * @description
     * Checks if operation can be cancelled based on its status.
     *
     * @param {object} operation Device bulk operation object.
     *
     * @returns {boolean} Returns true if operation can be cancelled.
     *
     * @example
     * <pre>
     *   if (c8yDeviceBulkControl.canCancel(operation)) {
     *     c8yDeviceBulkControl.cancel(operation);
     *   }
     * </pre>
     */
    function canCancel(operation) {
      var s = operation && operation.status;
      return _.includes([
        internalStatus.ACTIVE,
        internalStatus.IN_PROGRESS
      ], s);
    }

    /**
     * @ngdoc function
     * @name cancel
     * @methodOf c8y.core.service:c8yDeviceBulkControl
     *
     * @description
     * Cancels given operation by removing it from server.
     *
     * @param {object} operation Device bulk operation object.
     *
     * @returns {promise} Returns $http's promise.
     *
     * @example
     * <pre>
     *   var operationId = 1;
     *   c8yDeviceBulkControl.detail(operationId).then(function (res) {
     *     var operation = res.data;
     *     if (shouldCancelOperation(operation)) {
     *       c8yDeviceBulkControl.cancel(operation);
     *     }
     *   });
     *   // or just:
     *   c8yDeviceBulkControl.cancel(operationId);
     * </pre>
     */
    function cancel(operation) {
      var url = buildDetailUrl(operation);
      return $http['delete'](url);
    }

    /**
     * @ngdoc function
     * @name retryFailed
     * @methodOf c8y.core.service:c8yDeviceBulkControl
     *
     * @description
     * Updates bulk operation and schedules it to execute failed device operations again.
     *
     * @param {object} operation Device bulk operation object.
     *
     * @returns {promise} Returns $http's promise.
     *
     * @example
     * <pre>
     *   var operationId = 1;
     *   c8yDeviceBulkControl.detail(operationId).then(function (res) {
     *     var operation = res.data;
     *     if (shouldRetryFailed(operation)) {
     *       c8yDeviceBulkControl.retryFailed(operation);
     *     }
     *   });
     * </pre>
     */
    function retryFailed(operation) {
      var op = _.cloneDeep(operation);
      delete op.groupId;
      op.failedParentId = operation.id;
      return create(op);
    }

    /**
     * @ngdoc function
     * @name getStatus
     * @methodOf c8y.core.service:c8yDeviceBulkControl
     *
     * @description
     * Gets status for bulk operation.
     *
     * @param {object} operation Bulk operation object.
     *
     * @returns {string} Returns status of bulk operation.
     *
     * @example
     * Controller:
     * <pre>
     *   $scope.status = function (operation) {
     *     return c8yDeviceBulkControl.getStatus(operation);
     *   };
     * </pre>
     * Template:
     * <pre>
     *   <spab>Status: {{status(operation)}}</span>
     * </pre>
     */
    function getStatus(operation) {
      if (operation.status === 'CANCELED' || operation.status === 'DELETED') {
        return status.CANCELLED;
      }
      if (!operation.progress || !operation.progress.all || (operation.progress.pending === 0 && operation.progress.executing === 0 && operation.progress.successful === 0 && operation.progress.failed === 0)) {
        return status.SCHEDULED;
      } else if (operation.progress && ((operation.progress.successful + operation.progress.failed) < operation.progress.all)) {
        return status.EXECUTING;
      } else {
        if (operation.progress.failed > 0) {
          return status.COMPLETED_WITH_FAILURES;
        } else {
          return status.COMPLETED_SUCCESSFULLY;
        }
      }
    }

    /**
     * @ngdoc function
     * @name getStatusStyle
     * @methodOf c8y.core.service:c8yDeviceBulkControl
     *
     * @description
     * Gets styling settings for bulk operation status or bulk operation.
     *
     * @param {object|string} operationOrStatus Bulk operation object.
     *
     * @returns {object} Returns object with the following properties:
     *
     * - **label** - `string` - label for status,
     * - **icon** - `string` - icon name,
     * - **cls** - `string` - CSS class name
     *
     * @example
     * Controller:
     * <pre>
     *   $scope.ico = function (operation) {
     *     return c8yDeviceBulkControl.getStatusStyle(operation).icon;
     *   };
     *   $scope.cls = function (operation) {
     *     return c8yDeviceBulkControl.getStatusStyle(operation).cls;
     *   };
     * </pre>
     * Template:
     * <pre>
     *   <i c8y-icon="{{ico(operation)}}" ng-class="cls(operation)"></i>
     * </pre>
     */
    function getStatusStyle(operationOrStatus) {
      var status = _.isObjectLike(operationOrStatus) ? getStatus(operationOrStatus) : operationOrStatus;
      return style[status];
    }

    /**
     * @ngdoc function
     * @name doesMatchSingleOpStatus
     * @methodOf c8y.core.service:c8yDeviceBulkControl
     *
     * @description
     * Checks if given single operation status matches the status of given bulk operation according to mapping:
     *
     * - **PENDING**: SCHEDULED,
     * - **EXECUTING**: EXECUTING,
     * - **SUCCESSFUL**: COMPLETED_SUCCESSFULLY,
     * - **FAILED**: COMPLETED_WITH_FAILURES, CANCELLED.
     *
     * @param {object|string} bulkOperationOrStatus Bulk operation object or its status.
     * @param {string} singleOpStatus Single operation status.
     *
     * @returns {boolean} Returns boolean indicating if the two statuses match together.
     *
     * @example
     * <pre>
     *   // will return true if bulkOperation is in SCHEDULED status:
     *   c8yDeviceBulkControl.doesMatchSingleOpStatus(bulkOperation, 'PENDING');
     * </pre>
     */
    function doesMatchSingleOpStatus(bulkOperationOrStatus, singleOpStatus) {
      var status = _.isObjectLike(bulkOperationOrStatus) ? getStatus(bulkOperationOrStatus) : bulkOperationOrStatus;
      var matchingStatuses = getMappedSingleOpStatus(singleOpStatus);
      return _.includes(matchingStatuses, status);
    }

    /**
     * @ngdoc function
     * @name getMappedSingleOpStatus
     * @methodOf c8y.core.service:c8yDeviceBulkControl
     *
     * @description
     * Gets matching bulk operation statuses list for single operation status.
     *
     * @param {string} singleOpStatus Bulk operation object or its status.
     *
     * @returns {array} Returns an array of matching statuses.
     *
     * @example
     * <pre>
     *   // will return ['COMPLETED_WITH_FAILURES', 'CANCELLED']:
     *   c8yDeviceBulkControl.getMappedSingleOpStatus('FAILED');
     * </pre>
     */
    function getMappedSingleOpStatus(singleOpStatus) {
      return singleOpStatusMap[singleOpStatus];
    }

    return {
      list: list,
      detail: detail,
      create: create,
      save: save,
      update: update,
      canCancel: canCancel,
      cancel: cancel,
      retryFailed: retryFailed,
      status: status,
      statusList: statusList,
      getStatus: getStatus,
      getStatusStyle: getStatusStyle,
      doesMatchSingleOpStatus: doesMatchSingleOpStatus,
      getMappedSingleOpStatus: getMappedSingleOpStatus
    };
  }
})();
