/**
 * @ngdoc service
 * @name c8y.core.service:c8yBase
 * @requires app.service:info
 * @requires $rootScope
 * @requires $http
 * @requires $window
 *
 * @description
 * This service allows for managing alarms.
 */
angular.module('c8y.core')
.factory('c8yBase', ['$rootScope','$http', '$window', 'info',
function ($rootScope, $http, $window, info) {
  'use strict';
  var basePath = function () { return info.baseUrl || '/'; },
    HEADER_APPKEY = 'X-Cumulocity-Application-Key',
    NAMESPACE = 'application/vnd.com.nsn.cumulocity.',
    appKey = info.appKey,
    /**
     * @ngdoc property
     * @name PAGESIZE
     * @propertyOf c8y.core.service:c8yBase
     * @returns {integer} Returns default page size.
     *
     * @example
     * <pre>
     *   var pageSize = c8yBase.PAGESIZE;
     * </pre>
     */
    pageSize = info.pageSize || 1000,
    /**
     * @ngdoc property
     * @name dateFormat
     * @propertyOf c8y.core.service:c8yBase
     * @returns {string} Returns default date format.
     *
     * @example
     * <pre>
     *   var formattedDate = moment().format(c8yBase.dateFormat);
     * </pre>
     */
    dateFormat = 'YYYY-MM-DD',
    /**
     * @ngdoc property
     * @name dateFullFormat
     * @propertyOf c8y.core.service:c8yBase
     * @returns {string} Returns default full date/time format.
     *
     * @example
     * <pre>
     *   var formattedDateTime = moment().format(c8yBase.dateFullFormat);
     * </pre>
     */
    dateFullFormat = 'YYYY-MM-DDTHH:mm:ssZ';

  if (!appKey) {
    throw(new Error('Application key must be defined'));
  }

  /**
   * @ngdoc function
   * @name mimeType
   * @methodOf c8y.core.service:c8yBase
   *
   * @description
   * Gets fully qualified MIME type for given type.
   *
   * @param {string} type Base MIME type.
   *
   * @returns {string} Returns fully qualified MIME type string for given type.
   *
   * @example
   * <pre>
   *   var type = 'myType';
   *   var mimeType = c8yBase.mimeType(type);
   *   // mimeType equals to 'application/vnd.com.nsn.cumulocity.myType+json'
   * </pre>
   */
  function mimeType(type) {
    return NAMESPACE + type + '+json';
  }

  /**
   * @ngdoc function
   * @name contentHeaders
   * @methodOf c8y.core.service:c8yBase
   *
   * @description
   * Gets `Content-Type` and `Accept` headers.
   *
   * @param {string} contentType Base MIME type for `Content-Type` header.
   * @param {string} acceptType Base MIME type for `Accept` header.
   *
   * @returns {object} Returns object with properties: `Content-Type` and `Accept`.
   *
   * @example
   * <pre>
   *   var contentType = 'a';
   *   var acceptType = 'b';
   *   var headers = c8yBase.contentHeaders(contentType, acceptType);
   *   // headers['Content-Type'] equals to 'application/vnd.com.nsn.cumulocity.a+json'
   *   // headers['Accept'] equals to 'application/vnd.com.nsn.cumulocity.b+json'
   * </pre>
   */
  function contentHeaders(contentType, acceptType) {
    return {
      'Content-Type': mimeType(contentType),
      Accept: acceptType ?
        (mimeType(angular.isString(acceptType) ?
          acceptType : contentType)) : undefined
    };
  }

  /**
   * @ngdoc function
   * @name deleteProperties
   * @methodOf c8y.core.service:c8yBase
   *
   * @description
   * Removes selected properties from object.
   *
   * @param {object} obj Original object.
   * @param {array} properties Array of properties to be removed from object.
   *
   * @returns {object} Returns a copy of original object with properties removed.
   *
   * @example
   * <pre>
   *   var obj = {id: 1, name: 'Example', checked: true};
   *   var propertiesToRemove = ['checked'];
   *   var cleanedObj = c8yBase.deleteProperties(obj, propertiesToRemove);
   * </pre>
   */
  function deleteProperties(obj, properties) {
    var _obj = angular.copy(obj);
    properties.forEach(function (property) {
      delete _obj[property];
    });
    return _obj;
  }

  /**
   * @ngdoc function
   * @name url
   * @methodOf c8y.core.service:c8yBase
   *
   * @description
   * Gets full url for given `path`.
   *
   * @param {string} path Target path.
   *
   * @returns {string} Returns full URL to the target path.
   *
   * @example
   * <pre>
   *   $scope.url = c8yBase.url('/target/path');
   * </pre>
   */
  function url(path) {
    return basePath()  + path;
  }

  /**
   * @ngdoc function
   * @name pageSizeNoTotalFilter
   * @methodOf c8y.core.service:c8yBase
   *
   * @description
   * Extends filters object with `pageSize` filter.
   *
   * @param {object} filter Original filters object.
   *
   * @returns {object} Returns extended filters object.
   *
   * @example
   * <pre>
   *   var filters = {(...)};
   *   c8yAlarm.list(c8yBase.pageSizeNoTotalFilter(filters)).then((...));
   * </pre>
   */
  function pageSizeNoTotalFilter(filter) {
    return angular.extend({
      pageSize: pageSize
    }, filter);
  }

  /**
   * @ngdoc function
   * @name pageSizeFilter
   * @methodOf c8y.core.service:c8yBase
   *
   * @description
   * Extends filters object with `withTotalPages` and `pageSize` filters.
   *
   * @param {object} filter Original filters object.
   *
   * @returns {object} Returns extended filters object.
   *
   * @example
   * <pre>
   *   var filters = {(...)};
   *   c8yAlarm.list(c8yBase.pageSizeFilter(filters)).then((...));
   * </pre>
   */
  function pageSizeFilter(filter) {
    return angular.extend({
      withTotalPages: true,
      pageSize: pageSize
    }, filter);
  }

  /**
   * @ngdoc function
   * @name timeOrderFilter
   * @methodOf c8y.core.service:c8yBase
   *
   * @description
   * Extends filters object with `dateFrom` equal to 1970-01-01 and `dateTo` equal to tomorrow's date.
   *
   * @param {object} filter Original filters object.
   *
   * @returns {object} Returns extended filters object.
   *
   * @example
   * <pre>
   *   var filters = {(...)};
   *   c8yAlarm.list(c8yBase.timeOrderFilter(filters)).then((...));
   * </pre>
   */
  function timeOrderFilter(filter) {
    return angular.extend({
      dateFrom: '1970-01-01',
      dateTo: moment().add(1, 'day').format(dateFormat)
    }, filter);
  }

  /**
   * @ngdoc function
   * @name lastWeekFilter
   * @methodOf c8y.core.service:c8yBase
   *
   * @description
   * Extends filters object with `dateFrom` and `dateTo` equal to starting and ending date of the last week.
   *
   * @param {object} filter Original filters object.
   *
   * @returns {object} Returns extended filters object.
   *
   * @example
   * <pre>
   *   var filters = {(...)};
   *   c8yAlarm.list(c8yBase.lastWeekFilter(filters)).then((...));
   * </pre>
   */
  function lastWeekFilter(filter) {
    return angular.extend({
      dateFrom: moment().subtract(1, 'week').format(dateFormat),
      dateTo: moment().add(1, 'day').format(dateFormat)
    }, filter);
  }

  /**
   * @ngdoc function
   * @name fromThisMonthStartFilter
   * @methodOf c8y.core.service:c8yBase
   *
   * @description
   * Extends filters object with `dateFrom` equal to starting date of current month.
   *
   * @param {object} filter Original filters object.
   *
   * @returns {object} Returns extended filters object.
   *
   * @example
   * <pre>
   *   var filters = {(...)};
   *   c8yAlarm.list(c8yBase.fromThisMonthStartFilter(filters)).then((...));
   * </pre>
   */
  function fromThisMonthStartFilter(filter) {
    return angular.extend({
      dateFrom: moment().startOf('month').format(dateFormat)
    }, filter);
  }

  /**
   * @ngdoc function
   * @name todayFilter
   * @methodOf c8y.core.service:c8yBase
   *
   * @description
   * Extends filters object with `dateFrom` and `dateTo` equal to starting and ending time of today.
   *
   * @param {object} filter Original filters object.
   *
   * @returns {object} Returns extended filters object.
   *
   * @example
   * <pre>
   *   var filters = {(...)};
   *   c8yAlarm.list(c8yBase.todayFilter(filters)).then((...));
   * </pre>
   */
  function todayFilter(filter) {
    return angular.extend({
      dateFrom: moment().subtract(1, 'day').format(dateFormat),
      dateTo: moment().add(1, 'day').format(dateFormat)
    }, filter);
  }

  function getParamFromUrl(paramName, url) {
    var params = {};
    if (url) {
      url.split('?')[1].split('&').forEach(function (param) {
        var split = param.split('=');
        params[split[0]] = decodeURIComponent(split[1]);
      });
    }
    return params[paramName];
  }

  function buildPagingObject(data, step) {
    var stats = data.statistics,
      page = ((step === 1) ? ('next') : ('prev')),
      pageUrl = data[page],
      result = {
        currentPage: stats.currentPage,
        pageSize: stats.pageSize,
        startkey: getParamFromUrl('startkey', pageUrl),
        startkey_docid: getParamFromUrl('startkey_docid', pageUrl)
      },
      currentPageStr = getParamFromUrl('currentPage', pageUrl);

    result.currentPage = parseInt(currentPageStr);

    return result;
  }

  function buildRefreshObject(data) {
    var stats = data.statistics,
      result = {
        currentPage: 1,
        pageSize: stats.pageSize * stats.currentPage,
        startkey: null,
        startkey_docid: null
      };

    if (angular.isDefined(data.totalPages)) {
      result.pageSize = stats.pageSize;
    }

    return result;
  }

  function buildPaging(data, fn, filter, blindPaging) {
    var stats = data.statistics,
      hasPrev = angular.isDefined(data.prev),
      hasNext = angular.isDefined(data.next),
      output = {};

    if (hasPrev) {
      var prevFilter = angular.extend(
          angular.copy(filter),
          buildPagingObject(data, -1)
        );
      output.prev = angular.bind({}, fn, prevFilter);
    }

    if (hasNext) {
      var nextFilter = angular.extend(
        angular.copy(filter),
        buildPagingObject(data, 1)
      );
      output.next = angular.bind({}, fn, nextFilter);
      if (angular.isDefined(stats.totalPages)) {
        output.more = (stats.totalPages - stats.currentPage) * stats.pageSize;
      }
    }

    // Make the list refresh but bind it the info of the last page
    var refreshFilter = angular.extend(
        angular.copy(filter),
        buildRefreshObject(data)
      ),
      refreshFn = angular.bind({}, fn, refreshFilter);

    output.statistics = stats;
    output.blind = blindPaging;

    output.refresh = function () {
      return refreshFn().then(function (list) {
        list.statistics = stats;
        list.paging = buildPaging(data, fn, filter, blindPaging);
        return list;
      });
    };

    return output;
  }

  /**
   * @ngdoc function
   * @name cleanListCallback
   * @methodOf c8y.core.service:c8yBase
   *
   * @description
   * Helper function to create callback functions to process list data retrieved from server.
   *
   * @param {string} name The name of $http's response data property containing a list to be cleaned.
   * @param {function} listFn Function which returns a $http's response with list.
   * @param {object} filters Filters object.
   *
   * @returns {function} Returns function which takes $http's response and returns list with added statistics and paging data.
   *
   * @example
   * <pre>
   *   function getList(filters) {
   *     var url = c8yBase.url(path),
   *       _filters = c8yBase.timeOrderFilter(
   *         c8yBase.pageSizeNoTotalFilter(filters)
   *       ),
   *       cfg = {
   *         params: _filters
   *       },
   *       onList = c8yBase.cleanListCallback('alarms', getList, _filters);
   *     return $http.get(url, cfg).then(onList);
   *   }
   * </pre>
   */
  function cleanListCallback(name, listFn, filters) {
    return function (res) {
      var data = res.data,
        list = data[name];
      list.statistics = data.statistics;

      if (!filters.withTotalPages && list.length === parseInt(filters.pageSize, 10)) {
        data.statistics.totalPages = list.statistics.totalPages = +Infinity;
      }

      list.paging = buildPaging(data, listFn, filters, !filters.withTotalPages);
      return list;
    };
  }

  /**
   * @ngdoc function
   * @name removeFromList
   * @methodOf c8y.core.service:c8yBase
   *
   * @description
   * Removes given item from the list.
   *
   * @param {array} list Original list.
   * @param {object} item Item to be removed.
   *
   * @example
   * <pre>
   *   var list = [{id: 1}, {id: 2}];
   *   var item = list[0];
   *   c8yBase.removeFromList(list, item);
   *   // list contains only {id: 2}
   * </pre>
   */
  function removeFromList(list, item) {
    var ix = list.indexOf(item);

    if (ix >= 0) {
      list.splice(ix, 1);
    }
  }

  /**
   * @ngdoc function
   * @name cleanFields
   * @methodOf c8y.core.service:c8yBase
   *
   * @description
   * Removes selected properties from an object.
   *
   * @param {object} obj Original object.
   * @param {array} fields Array of property names to remove.
   *
   * @returns {object} Returns a copy of original object with selected properties removed.
   *
   * @example
   * <pre>
   *   var obj = {id: 1, name: 'Example', checked: true};
   *   var fields = ['checked'];
   *   var cleanedObj = c8yBase.cleanFields(obj, fields);
   *   // cleanedObj does not contain checked field
   * </pre>
   */
  function cleanFields(obj, fields) {
    var _obj = angular.copy(obj);
    fields.forEach(function (field) {
      delete _obj[field];
    });
    return _obj;
  }

  /**
   * @ngdoc function
   * @name invalid
   * @methodOf c8y.core.service:c8yBase
   *
   * @description
   * Helper function to check whether a form's field in a given scope is invalid.
   *
   * @param {object} scope Controller's scope where a form is defined
   * @param {string} _form Form's name.
   * @param {string} _field Field's name.
   *
   * @returns {object} Returns field's validity status.
   *
   * @example
   * Controller:
   * <pre>
   *   $scope.invalid = angular.bind(c8yBase, c8yBase.invalid, $scope, 'userForm');
   * </pre>
   * View:
   * <pre>
   *   <form name="userForm" role="form" novalidate>
   *     <div class="form-group" ng-class="{'has-error': invalid('email')}">
   *       <label>E-mail</label>
   *       <input type="email" name="email" class="form-control" ng-model="user.email">
   *     </div>
   *   </form>
   * </pre>
   */
  function invalid(scope, _form, _field) {
    var form = scope && scope[_form],
      field = form && form[_field],
      pristine = field && field.$pristine,
      _invalid = field && field.$invalid;
    return pristine === false && _invalid === true;
  }

  /**
   * @ngdoc function
   * @name getCount
   * @methodOf c8y.core.service:c8yBase
   *
   * @description
   * Gets the count of elements retrieved by a function and filters.
   *
   * @param {function} fn Function that takes filters and returns the list.
   * @param {object} filters Filters object.
   *
   * @returns {promise} Returns promise with the count of retrieved elements.
   *
   * @example
   * <pre>
   *   c8yBase.getCount(list, filters).then(function (count) {
   *     $scope.listCount = count;
   *   });
   * </pre>
   */
  function getCount(fn, filters) {
    filters.pageSize = 1;
    filters.withTotalPages = true;
    return fn(filters).then(function (list) {
      return list.statistics.totalPages;
    });
  }

  /**
   * @ngdoc function
   * @name humanizeFragment
   * @methodOf c8y.core.service:c8yBase
   *
   * @description
   * Transforms fragment's name into human-friendly string.
   *
   * @param {string} str Fragment's name.
   *
   * @returns {string} Humanized fragment's name.
   *
   * @example
   * <pre>
   *   var friendlyName = c8yBase.humanizeFragment('c8y_MyFragmentName');
   *   // friendlyName equals to 'My Fragment Name'
   * </pre>
   */
  function humanizeFragment(str) {
    if (!str) {
      str = '';
    }
    return String(str).replace(/c8y_/, '').replace(/([A-Z])/g, ' $1').replace(/^\s*/, '').replace(/\s*$/, '');
  }

  $http.defaults.headers.common[HEADER_APPKEY] = appKey;

  /**
   * @ngdoc function
   * @name getResData
   * @methodOf c8y.core.service:c8yBase
   *
   * @description
   * Extracts data from $http's response object.
   *
   * @param {object} res $http's response object
   *
   * @returns {object} Data received through $http's response.
   *
   * @example
   * The example below is using getResData function to easily extract device data from the backend's response.
   * <pre>
   *   c8yDevices.detail(deviceId).then(c8yBase.getResData).then(function (device) {
   *     $scope.device = device;
   *   });
   * </pre>
   */
  function getResData(res) {
    return  (res && res.data) || res;
  }
  /**
   * @ngdoc function
   * @name createEnum
   * @methodOf c8y.core.service:c8yBase
   *
   * @description
   * Creates java like enum object
   *
   * @param {array} values list of values for enum object. Supported values types
   *
   *  *String* - value used as name and value for enum constant
   *  *object* - object with fields *name* and *value* used as
   *
   * @returns {object} Enum object. With set of constant definaed as fields
   * using names passed in values list.
   * Available methods :
   * *values* - returns list of available enum constant
   *
   * Each constant has available fields :
   * *name* - name of constant
   * *value* - value assigned to given enum, if not deviced the name is used
   * *ordinal* - index of constant on values list
   *
   *
   * @example
   * The example below shows how to create and use enum .
   * <pre>
   *   var AccessType = c8yBase.createEnum(['READ','WRITE', {name:'ASTERISK',value:'*'}]);
   *   AccessType.ASTERISK.name // ASTERISK
   *   AccessType.ASTERISK.value // *
   *   AccessType.ASTERISK.ordinal // 2
   *   AccessType.READ.name // READ
   *   AccessType.values() // [AccessType.READ, AccessType.WRITE, AccessType.ASTERISK]
   *   });
   * </pre>
   */
  function createEnum(values){
    var e = {},
    ordinal=0;
    e.values = _.constant(_.map(values, function(value){
      if(!angular.isObject(value)){
        return e[value]={
          name: value,
          ordinal: ordinal++,
          value: value
        };
      }else{
         return e[value.name]={
          name: value.name,
          ordinal: ordinal++,
          value: value.value
        };
      }
    }));
    return e;
  }

  /**
   * @ngdoc function
   * @name  createLocalId
   *
   * @description
   * Decorates an object with a random local id. If the id already present it doesn't
   * change the object
   *
   * @param {object} obj - Object to be decorated
   * @param {string} [key=id] - Key to store the id on the object
   *
   * @return {object} Returns the decorated object that was passed as a first parameter
   */
  function createLocalId(mo, key) {
    key = key || 'id';

    if (!angular.isObject(mo)) {
      throw new Error('mo is not an object');
    }

    if (angular.isUndefined(mo[key])) {
      mo[key] = String(Math.random()).substr(2);
    }
    return mo;
  }

  /**
   * @ngdoc function
   * @name  getId
   * @description
   * From a reference object extracts an id for a server side object
   *
   * @param {object|string|number} refId - Object with id property, number or numeric string
   * @return {string} The id for the object
   */
  function getId(refId) {
    var id;

    if (angular.isObject(refId)) {
      id = refId.id;
    }

    if (angular.isNumber(refId) || (angular.isString(refId) && refId.match(/^\d+$/))) {
      id = String(refId);
    }

    if (!id) {
      throw new Error('id cannot be found');
    }

    return id;
  }

  function checkIfModulesExist(modules) {
    try {
      _.each(modules, function(module) {
        angular.module(module);
      })
      return true;
    } catch(e) {
      return false;
    }
  }

  return {
    url: url,
    deleteProperties: deleteProperties,
    mimeType: mimeType,
    contentHeaders: contentHeaders,
    PAGESIZE: pageSize,
    pageSizeFilter: pageSizeFilter,
    pageSizeNoTotalFilter: pageSizeNoTotalFilter,
    timeOrderFilter: timeOrderFilter,
    lastWeekFilter: lastWeekFilter,
    todayFilter: todayFilter,
    fromThisMonthStartFilter: fromThisMonthStartFilter,
    cleanListCallback: cleanListCallback,
    removeFromList: removeFromList,
    cleanFields: cleanFields,
    dateFormat: dateFormat,
    dateFullFormat: dateFullFormat,
    invalid: invalid,
    getCount: getCount,
    humanizeFragment: humanizeFragment,
    getResData: getResData,
    createEnum: createEnum,
    createLocalId: createLocalId,
    getId: getId,
    checkIfModulesExist: checkIfModulesExist
  };

}]);
