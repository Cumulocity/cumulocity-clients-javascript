(function () {
  'use strict';
  var c8y = window.c8y = window.c8y || {};

  function coreFilePath(f) {
    var p = (window.C8Y_APP || {}).core_path || '/apps/core/';
    return p + f;
  }

  function dataFilePath(f) {
    var p = (window.C8Y_APP || {}).data_path || (window.C8Y_PAAS ? '/apps/core/c8ydata/' : '/apps/c8ydata/');
    return p + f;
  }

  c8y.coreFilePath = coreFilePath;
  c8y.dataFilePath = dataFilePath;

  /**
   * @ngdoc service
   * @name c8y.core.service:c8yBase
   * @requires app.service:info
   * @requires $http
   * @requires $window
   *
   * @description
   * This service allows for managing alarms.
   */
  angular.module('c8y.core')
    .factory('c8yBase', c8yBase);

  /* @ngInject */
  function c8yBase(
    $window,
    $q,
    $injector,
    info,
    gettextCatalog,
    latestMixinFactory
  ) {
    var basePath = function () { return info.baseUrl || '/'; },
      NAMESPACE = 'application/vnd.com.nsn.cumulocity.',
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
      pageSize = info.pageSize || 100,
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
          (mimeType(_.isString(acceptType) ?
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
      return cleanFields(obj, properties);
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
      return _.assign({
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
      return _.assign({
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
      return _.assign({
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
      return _.assign({
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
      return _.assign({
        dateFrom: moment().startOf('month').format(dateFormat)
      }, filter);
    }

    /**
     * @ngdoc function
     * @name monthFilter
     * @methodOf c8y.core.service:c8yBase
     *
     * @description
     * Extends filters object with `dateFrom` and `dateTo` equal to starting date of last month and starting date of this month respectively. If monthDiff is provided, it will take this month by adding monthDiff to the current one.
     *
     * @param {object} filter Original filters object.
     *
     * @param {number} number of months to subtract from `now` to consider as current month
     * @returns {object} Returns extended filters object.
     *
     * @example
     * <pre>
     *   var filters = {(...)};
     *   // lists alarms for current month
     *   c8yAlarm.list(c8yBase.monthFilter(filters)).then((...));
     *   // lists alarms for 5 months before
     *   c8yAlarm.list(c8yBase.monthFilter(filters, 5)).then((...));
     *   // you can use the following hack to list alarms for next month
     *   // which actually doesn't make sense
     *   c8yAlarm.list(c8yBase.monthFilter(filters, -1)).then((...));
     * </pre>
     */
    function monthFilter(filter, monthDiff) {
      var month = moment().subtract(monthDiff || 0, 'months');
      return _.assign({
        dateFrom: month.startOf('month').format(dateFormat),
        dateTo: month.endOf('month').format(dateFormat)
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
      return _.assign({
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

    function buildRefreshObject(data, changingPage) {
      var stats = data.statistics || {},
        result = {
          currentPage: changingPage ? stats.currentPage : 1,
          pageSize: changingPage ? stats.pageSize : stats.pageSize * stats.currentPage,
          startkey: null,
          startkey_docid: null
        };

      if (!_.isUndefined(data.totalPages)) {
        result.pageSize = stats.pageSize;
      }

      return result;
    }

    function buildPaging(data, fn, filter, blindPaging, changingPage) {
      var stats = data.statistics,
        hasPrev = !_.isUndefined(data.prev),
        hasNext = !_.isUndefined(data.next),
        output = {};

      if (hasPrev) {
        var prevFilter = _.assign(
            _.cloneDeep(filter),
            buildPagingObject(data, -1)
          );
        output.prev = angular.bind({}, fn, prevFilter);
      }
      if (hasNext) {
        var nextFilter = _.assign(
          _.cloneDeep(filter),
          buildPagingObject(data, 1)
        );
        output.next = angular.bind({}, fn, nextFilter);
        if (!_.isUndefined(stats.totalPages)) {
          output.more = (stats.totalPages - stats.currentPage) * stats.pageSize;
        }
      }

      // Make the list refresh but bind it the info of the last page
      var refreshFilter = _.assign(
          _.cloneDeep(filter),
          buildRefreshObject(data, changingPage)
        ),
        refreshFn = angular.bind({}, fn, refreshFilter);

      output.statistics = stats;
      output.blind = blindPaging;

      output.refresh = function () {
        return refreshFn().then(function (list) {
          if (changingPage) {
            list.paging = buildPaging(list, fn, filter, blindPaging, changingPage);
          }
          return list;
        });
      };

      var changePageFn = function (page) {
        var changePageFilter = _.assign({}, filter, {pageSize: stats.pageSize, currentPage: page});
        return fn(changePageFilter);
      };

      output.changePage = function (page) {
        return changePageFn(page).then(function (list) {
          list.paging = buildPaging(list, fn, filter, blindPaging, true);
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
        var data = res.data || {},
          list = data[name] || [];

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
      var _obj = _.cloneDeep(obj);
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

    function invalidFormOrField(formOrField) {
      return formOrField.$dirty && formOrField.$invalid;
    }

    /**
     * @ngdoc function
     * @name validationHints
     * @methodOf c8y.core.service:c8yBase
     *
     * @description
     * Helper function to get translated validation hints for a form or field.
     *
     * @param {object} formOrField Form or field object (must have $error property).
     * @param {object} errorsToMessages Mapping errors to string messages.
     *
     * @returns {string} Returns field's validation hints.
     *
     * @example
     * Controller:
     * <pre>
     *   var errorsToMessages = {
     *     'min': gettext('Value cannot be lower than minimum!'),
     *     'required': {
     *       'fieldName1': gettext('FieldName1 is required!'),
     *       'fieldName2': gettext('FieldName2 is required!')
     *     },
     *     'custom-validation-error-key': gettext('Custom validation hint')
     *   };
     *   $scope.validationHints = function (field) {
    *      return c8yBase.validationHints(field, errorsToMessages);
    *    };
     * </pre>
     * View:
     * <pre>
     *   <form name="userForm" role="form" novalidate>
     *     <div class="form-group" tooltip="validationHints(userForm.email)">
     *       <label>E-mail</label>
     *       <input type="email" name="email" class="form-control" ng-model="user.email">
     *     </div>
     *   </form>
     * </pre>
     */
    function validationHints(formOrField, errorsToMessages) {
      var hints = [];
      if (formOrField && formOrField.$error) {
        _.forEach(formOrField.$error, function (error, key) {
          if (error && !_.isUndefined(errorsToMessages[key])) {
            if (_.isObjectLike(errorsToMessages[key]) && errorsToMessages[key][formOrField.$name]) {
              hints.push(errorsToMessages[key][formOrField.$name]);
            } else {
              hints.push(errorsToMessages[key]);
            }
          }
        });
      }
      return _.map(hints, function (hint) {
        return gettextCatalog.getString(hint);
      }).join(' ');
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
     * Creates enum object
     *
     * @param {array} values list of values for enum object. Supported values types
     *
     *  *string* - value used as name, label and value for enum constant,
     *  *object* - object with properties *name*, *label*, *value* and custom ones.
     *
     * @returns {object} Enum object. With set of constant defined as fields
     * using names passed in values list.
     * Available methods:
     * *values* - returns the list of available enum constants.
     *
     * Each constant has got at least these properties:
     * *name* - name of constant
     * *value* - value assigned to given enum (if not defined the name is used)
     * *ordinal* - index of constant on values list
     *
     *
     * @example
     * The example below shows how to create and use enums.
     * <pre>
     *   var AccessType = c8yBase.createEnum([
     *     'READ',
     *     'WRITE',
     *     {name: 'ASTERISK', value: '*'},
     *     {name: 'CUSTOMIZED', custom: 'CustomProperty'}
     *   ]);
     *
     *   AccessType.ASTERISK.name // 'ASTERISK'
     *   AccessType.ASTERISK.value // '*'
     *   AccessType.ASTERISK.ordinal // 2
     *   AccessType.READ.name // 'READ'
     *   AccessType.CUSTOMIZED.custom // 'CustomProperty'
     *   AccessType.values() // [AccessType.READ, AccessType.WRITE, AccessType.ASTERISK, AccessType.CUSTOMIZED]
     * </pre>
     */
    function createEnum(values) {
      var e = {};
      var ordinal = 0;

      e.values = _.constant(_.map(values, function (value) {
        var v = {};

        if (_.isObjectLike(value)) {
          _.defaults(v, value, {
            name: value.name,
            value: value.name,
            label: value.name
          });
        } else {
          _.defaults(v, {
            name: value,
            value: value,
            label: value
          });
        }
        _.assign(v, {
          ordinal: ordinal++
        });

        e[v.name] = v;

        return v;
      }));

      return e;
    }

    /**
     * @ngdoc function
     * @name  createLocalId
     * @methodOf c8y.core.service:c8yBase
     *
     * @description
     * Decorates an object with a random local id. If the id already present it doesn't
     * change the object
     *
     * @param {object} mo - Object to be decorated
     * @param {string} [key=id] - Key to store the id on the object
     *
     * @return {object} Returns the decorated object that was passed as a first parameter
     */
    function createLocalId(mo, key) {
      key = key || 'id';

      if (!_.isObjectLike(mo)) {
        throw new Error('mo is not an object');
      }

      if (_.isUndefined(mo[key])) {
        mo[key] = String(Math.random()).substr(2);
      }
      return mo;
    }

    /**
     * @ngdoc function
     * @name  getId
     * @methodOf c8y.core.service:c8yBase
     *
     * @description
     * From a reference object extracts an id for a server side object
     *
     * @param {object|string|number} refId - Object with id property, number or numeric string
     * @return {string} The id for the object
     */
    function getId(refId) {
      var id;

      if (_.isObjectLike(refId)) {
        id = refId.id;
      }

      if (_.isNumber(refId) || (_.isString(refId) && refId.match(/^\d+$/))) {
        id = String(refId);
      }

      if (!id) {
        throw new Error('id cannot be found');
      }

      return id;
    }

    function checkIfModulesExist(modules) {
      try {
        _.forEach(modules, function(module) {
          angular.module(module);
        });
        return true;
      } catch(e) {
        return false;
      }
    }

    function getInfoProperty(name) {
      return info[name];
    }

    function appOption(name) {
      var appManifest = (info.appConfig || {}).manifest;
      var oldAppOptions = window.C8Y_APP && window.C8Y_APP.C8Y_INSTANCE_OPTIONS;
      var appOptions = window.C8Y_INSTANCE_OPTIONS;
      var o = _.merge({}, appManifest, oldAppOptions, appOptions);
      return o[name];
    }

    function getPluginService(serviceName) {
      return $injector.has(serviceName) ? $injector.get(serviceName) : undefined;
    }

    var result = {
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
      monthFilter: monthFilter,
      cleanListCallback: cleanListCallback,
      removeFromList: removeFromList,
      cleanFields: cleanFields,
      dateFormat: dateFormat,
      dateFullFormat: dateFullFormat,
      invalid: invalid,
      invalidFormOrField: invalidFormOrField,
      validationHints: validationHints,
      getCount: getCount,
      humanizeFragment: humanizeFragment,
      getResData: getResData,
      createEnum: createEnum,
      createLocalId: createLocalId,
      getId: getId,
      checkIfModulesExist: checkIfModulesExist,
      coreFilePath: coreFilePath,
      dataFilePath: dataFilePath,
      getFlag: getInfoProperty,
      getRuntimeOption: getInfoProperty,
      appOption: appOption,
      getPluginService: getPluginService
    };

    _.mixin(result, latestMixinFactory($q));
    return result;
  }

})();
