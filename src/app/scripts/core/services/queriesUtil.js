(function () {
  'use strict';

  /**
   * @ngdoc service
   * @name c8y.core.service:c8yQueriesUtil
   *
   * @description
   * This service helps  for managing managed objects inventory.
   */
  angular.module('c8y.core')
    .factory('c8yQueriesUtil', [
      '$rootScope',
      '$injector',
      c8yQueriesUtil
    ]);

  function c8yQueriesUtil($rootScope, $injector) {
    var operatorFns = {
      __not: function (operand) {
        return ['not(', buildQueryFilter(operand, null), ')'].join('');
      },
      __and: function (operand) {
        return buildQueryFilter(operand, null, 'and');
      },
      __or: function (operand) {
        return buildQueryFilter(operand, null, 'or');
      },
      __eq: function (operand, contextKey) {
        if (_.isObjectLike(operand)) {
          return buildQueryFilter(operand, contextKey);
        } else {
          return [contextKey, 'eq', quoteString(operand)].join(' ');
        }
      },
      __gt: function (operand, contextKey) {
        return [contextKey, 'gt', quoteString(operand)].join(' ');
      },
      __lt: function (operand, contextKey) {
        return [contextKey, 'lt', quoteString(operand)].join(' ');
      },
      __in: function (operand, contextKey) {
        var stmts = _.map(_.filter(operand, _.identity), function (op) {
          return [contextKey, 'eq', quoteString(op)].join(' ');
        });
        return glue(stmts, 'or');
      },
      __bygroupid: function (operand) {
        return ['bygroupid(', operand, ')'].join('');
      },
      __has: function (operand) {
        return ['has(', operand, ')'].join('');
      }
    };

    function glue(stmts, type) {
      return ((stmts.length > 1) ? (['(', stmts.join(') ' + type + ' ('), ')'].join('')) : (stmts[0]));
    }

    function quoteString(s) {
      return _.isString(s) ? ['\'', s, '\''].join('') : s;
    }

    /**
       * @ngdoc function
       * @name buildQuery
       * @methodOf c8y.core.service:c8yQueriesUtil
       *
       * @description Builds query string from provided query object. Query object can look like:
       *
       * @param {object} query Object containing filters and sort order for querying managed objects. Supported filters are:
       *
       * - **__and** - Specifies conditions, e.g. {__and: [{__has: 'c8y_IsDevice'}, {'count': {__gt: 0}}]}.
       * - **__or** - Specifies alternative conditions, e.g. {__or: [{__bygroupid: 10300}, {__bygroupid: 10400}]}.
       * - **__eq** - Specified fragment must be equal to given value, e.g. {'status': 'AVAILABLE'} (no nested object required).
       * - **__lt** - Specified fragment must be less then given value, e.g. {'count': {__lt: 10}}.
       * - **__gt** - Specified fragment must be greater then given value, e.g. {'count': {__gt: 0}}.
       * - **__in** - Specified fragment must be equal to one of values in the list, e.g. {'status': {__in: ['AVAILABLE', 'UNAVAILABLE']}}.
       * - **__not** - Negates condition, e.g. {__not: {'status': 'AVAILABLE'}}.
       * - **__bygroupid** - True if filtered managed object is assigned to given group, e.g. {__bygroupid: 10300}.
       * - **__has** - Specified fragment must have a value defined, e.g. {__has: 'c8y_IsDevice'}.
       *
       * The order is specified by an array of field paths and sort direction (1 for ascending, -1 for descending), e.g.:
       * - {__orderby: [{'creationTime': -1}, {'name': 1}], __filter: {...}}
       *
       * @returns {string} Returns a query string ready to be sent in request params to backend.
       *
       * @example
       * <pre>
       *   var query = * {
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
       *   var params = {};
       *   params.q = c8yQueriesUtil.buildQuery(query);
       * </pre>
       */
    function buildQuery(query) {
      var q = [],
        filter = buildQueryFilter(query.__filter || query),
        orderby = buildQueryOrderby(query.__orderby);

      if (!_.isEmpty(filter)) {
        q.push(['$filter=(', filter, ')'].join(''));
      }
      if (!_.isEmpty(orderby)) {
        q.push(['$orderby=', orderby].join(''));
      }

      return q.join(' ');
    }

    function buildQueryFilter(queryObj, queryKey, glueType) {
      queryKey = queryKey || null;
      glueType = glueType || 'and';

      var q = [];

      if (_.isArray(queryObj)) {
        _.forEach(queryObj, function (qObj) {
          var _q = buildQueryFilter(qObj, null, glueType);
          if (!_.isEmpty(_q)) {
            q.push(_q);
          }
        });
      } else {
        _.forEach(queryObj, function (v, k) {
          if (!_.isUndefined(operatorFns[k])) {
            var _q = operatorFns[k](v, queryKey);
            if (!_.isEmpty(_q)) {
              q.push(_q);
            }
          } else {
            var _q = operatorFns.__eq(v, k);
            if (!_.isEmpty(_q)) {
              q.push(_q);
            }
          }
        });
      }

      return glue(q, glueType);
    }

    function buildQueryOrderby(query) {
      var o = [];

      _.forEach(query, function (q) {
        _.forEach(q, function (v, k) {
          if (0 !== v) {
            o.push([k, v > 0 ? 'asc' : 'desc'].join(' '));
          }
        });
      });

      return o.join(',');
    }

    return {
      buildQuery: buildQuery,
      buildQueryFilter: buildQueryFilter,
      buildQueryOrderby: buildQueryOrderby
    };
  }
})();
