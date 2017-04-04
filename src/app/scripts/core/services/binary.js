/**
 * @ngdoc service
 * @name c8y.core.service:c8yBinary
 * @requires c8y.core.service:c8yInventory
 *
 * @description
 * This service allows for managing binary objects stored in inventory as managed objects.
 */
(function () {
  'use strict';

  angular.module('c8y.core')
    .factory('c8yBinary', c8yBinary);

  /* @ngInject */
  function c8yBinary(
    $q,
    $upload,
    $http,
    $rootScope,
    $window,
    c8yBase,
    c8yInventory,
    c8yAuth,
    c8ySettings,
    c8yBinaryCommon
  ) {
    var path = 'inventory/binaries';
    var managedObjectsPath = 'inventory/managedObjects';
    var BYTES_SIZE_LIMIT = 52428800;
    var fileSizeLimitConf = {
      category: 'files',
      key: 'max.size'
    };
    var fileNameRegexp = /(?:\.([^.]+))?$/;
    var fileTypeIconsMap = {
      archive: {
        mimes: [],
        exts: ['7z', 'apk', 'cab', 'gz', 'iso', 'jar', 'rar', 'tar', 'zip']
      },
      audio: {
        mimes: [],
        exts: ['3gp', 'aiff', 'aac', 'amr', 'm4a', 'm4p', 'mp3', 'oga', 'ogg', 'raw', 'wav', 'wma']
      },
      code: {
        mimes: [],
        exts: ['aspx', 'exe', 'htm', 'html', 'jad', 'js', 'json', 'jsp', 'php', 'xml']
      },
      excel: {
        mimes: [],
        exts: ['xls', 'xlsx']
      },
      image: {
        mimes: [],
        exts: ['bmp', 'gif', 'jpeg', 'jpg', 'png', 'tiff', 'svg']
      },
      pdf: {
        mimes: [],
        exts: ['pdf']
      },
      powerpoint: {
        mimes: [],
        exts: ['ppt', 'pptx']
      },
      text: {
        mimes: [],
        exts: ['txt']
      },
      video: {
        mimes: [],
        exts: ['3gp', 'asf', 'avi', 'flv', 'mov', 'mp4', 'ogv', 'qt', 'rm', 'rmvb', 'wmv']
      },
      word: {
        mimes: [],
        exts: ['doc', 'docx']
      }
    };

    function updateFileSizeLimit() {
      c8ySettings.getSystemOptionValue(fileSizeLimitConf, BYTES_SIZE_LIMIT).then(function (value) {
        output.BYTES_SIZE_LIMIT = BYTES_SIZE_LIMIT = value;
      });
    }

    if (!window.c8y_testing) {
      c8yAuth.initializing.then(updateFileSizeLimit);
      $rootScope.$on('authStateChange', authStateChange);
    }

    function authStateChange(ev, data) {
      if (data && data.hasAuth) {
        updateFileSizeLimit();
      }
    }

    /**
     * @ngdoc function
     * @name list
     * @methodOf c8y.core.service:c8yBinary
     *
     * @description
     * Gets the list of managed objects for stored binary files.
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
     * @returns {array} Returns the list of filtered managed objects. Each managed object has at least the following common properties about stored file:
     *
     * - **id** - `integer` - Managed object's id.*
     * - **name** - `string` - File name.*
     * - **lastUpdated** - `string` - Date and time when managed object was last updated.*
     * - **owner** - `string` - Managed object's owner's username.*
     * - **self** - `string` - Managed object's self URL.*
     * - **type** - `string` - MIME-Type Managed object's type.*
     *
     * <!--For more details about managed objects see specification {@link http://docs.cumulocity.com/managedObjects@TODO here}.-->
     *
     * @example
     * <pre>
     *   var filters = {};
     *   c8yBinary.list(filters).then(function (devices) {
     *     $scope.devices = [];
     *     _.forEach(devices, function(device) {
     *       $scope.devices.push(device);
     *     });
     *   });
     * </pre>
     */
    function list(filters) {
      var url = c8yBase.url(path);
      var _filters = c8yBase.pageSizeFilter(filters);
      var cfg = {
        params: _filters
      };
      var blindPaging = true;
      var onList = c8yBase.cleanListCallback('managedObjects', list, _filters, blindPaging);

      return $http.get(url, cfg).then(onList);
    }

    function upload(binary, moConf) {
      var mo = {
        name: binary.name,
        type: binary.type
      };
      var binaryMo = _.assign(mo, moConf);

      return c8yBinaryCommon.upload(binary, {
        url: c8yBase.url(path),
        headers: c8yBase.contentHeaders('managedObject', 'managedObject'),
        data: {
          object: binaryMo
        }
      });
    }

    function downloadAndSaveAs(binary, length) {
      var url = buildFileUrl(binary);
      return c8yBinaryCommon.download(binary, url, length).then(function (xhr) {
        var contentType = xhr.getResponseHeader('Content-Type');
        var contentDisposition = xhr.getResponseHeader('Content-Disposition');
        var blob = isLegacyBinaryObject(binary) ?
          getBlobFromLegacyBinaryObject(binary, contentType) :
          new Blob([xhr.response], {
            type: contentType
          });

        saveAs(blob, c8yBinaryCommon.getFilenameFromContentDisposition(contentDisposition));
      });
    }

    function isLegacyBinaryObject(binary) {
      return binary && binary.data;
    }

    function getBlobFromLegacyBinaryObject(binary, contentType, sliceSize) {
      var ct = contentType || '';
      var ss = sliceSize || 512;

      var byteCharacters = $window.atob(binary.data);
      var byteArrays = [];

      for (var offset = 0; offset < byteCharacters.length; offset += ss) {
        var slice = byteCharacters.slice(offset, offset + ss);

        var byteNumbers = new Array(slice.length);
        for (var i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }

        var byteArray = new Uint8Array(byteNumbers);

        byteArrays.push(byteArray);
      }

      return new Blob(byteArrays, {
        type: ct
      });
    }

    function downloadAsDataUri(binary) {
      var url = buildFileUrl(binary);
      return c8yBinaryCommon.download(binary, url)
        .then(function (xhr) {
          var contentType = xhr.getResponseHeader('Content-Type');
          var base64 = c8yBinaryCommon.arrayBufferToBase64(xhr.response);
          var dataUri = isLegacyBinaryObject(binary) ?
            getDataUri(binary) :
            'data:' + contentType + ';base64,' + base64;
          return dataUri;
        })
        .catch(function () {
          return getDataUri(binary) || $q.reject();
        });
    }

    function downloadAsText(binary) {
      var url = buildFileUrl(binary);
      var config = {
        headers: c8yAuth.headers(),
        responseType: 'text',
        transformResponse: function (data) {
          return data;
        }
      };
      return $http.get(url, config);
    }

    function buildFileUrl(binary) {
      var id = binary.id || binary;
      return c8yBase.url(path + '/' + id);
    }

    function getDownloadUrl(binary) {
      return binary && binary.self &&
        binary.self.replace(c8yBase.url(managedObjectsPath), c8yBase.url(path));
    }

    /**
     * @ngdoc function
     * @name removeBinary
     * @methodOf c8y.core.service:c8yBinary
     *
     * @description
     * Removes binary artefact from binaries repository.
     *
     * @param {object|integer} binary Binary managed object or binary managed object's id.
     *
     * @returns {promise} Returns $http's promise.
     *
     * @example
     * <pre>
     *   var binaryId = 1;
     *   c8yBinary.removeBinary(binaryId);
     * </pre>
     */
    function removeBinary(binary) {
      var url = buildFileUrl(binary);
      return $http.delete(url);
    }

    /**
     * @ngdoc function
     * @name icon
     * @methodOf c8y.core.service:c8yBinary
     *
     * @description
     * Gets the name of CSS icon class for binary artefact.
     *
     * @param {object} binary Binary managed object.
     *
     * @returns {string} Returns the string with the name of CSS icon class.
     *
     * @example
     * <pre>
     *   var binary = {...};
     *   var icon = c8yBinary.icon(binary);
     * </pre>
     */
    function icon(binary) {
      var targetIcon = ['file', 'o'];
      var fileGenericType = getFileGenericType(binary);
      if (fileGenericType) {
        targetIcon.splice(1, 0, fileGenericType);
      }
      return targetIcon.join('-');
    }

    function getFileGenericType(binary) {
      var type = '';
      _.forEach(fileTypeIconsMap, function (iconCfg, icon) {
        var moExt = fileNameRegexp.exec(binary.name)[1];
        _.forEach(iconCfg.exts, function (ext) {
          if (ext === _.lowerCase(moExt)) {
            type = icon;
            return false;
          }
        });
        if (!type) {
          var moMimeType = getBinaryContentType(binary);
          _.forEach(iconCfg.mimes, function (mime) {
            if (mime === moMimeType) {
              type = icon;
              return false;
            }
          });
        }
      });
      return type;
    }

    function getBinaryContentType(binary) {
      var contentType = binary.contentType;
      if (!contentType && !_.isUndefined(binary._attachments)) {
        contentType = binary._attachments[_.keys(binary._attachments)[0]].content_type;
      }
      return contentType;
    }

    /**
     * @ngdoc function
     * @name size
     * @methodOf c8y.core.service:c8yBinary
     *
     * @description
     * Gets the size of binary artefact in bytes.
     *
     * @param {object} binary Binary managed object.
     *
     * @returns {integer} Returns the size of the file in bytes.
     *
     * @example
     * <pre>
     *   var binary = {(...)};
     *   var size = c8yBinary.size(binary);
     * </pre>
     */
    function size(binary) {
      return c8yBinaryCommon.size(binary);
    }

    /**
     * @ngdoc function
     * @name isImage
     * @methodOf c8y.core.service:c8yBinary
     *
     * @description
     * Checks if a binary artefact is image.
     *
     * @param {object} binary Binary managed object.
     *
     * @returns {boolean} Returns true if binary artefact is an image.
     *
     * @example
     * <pre>
     *   var binary = {(...)};
     *   var isImage = c8yBinary.isImage(binary);
     * </pre>
     */
    function isImage(binary) {
      var fileGenericType = getFileGenericType(binary);
      return fileGenericType === 'image';
    }

    /**
     * @ngdoc function
     * @name hasValidSize
     * @methodOf c8y.core.service:c8yBinary
     *
     * @description
     * Checks if a file has valid size.
     *
     * @param {File} file File to check.
     *
     * @returns {boolean} Returns true if file has valid size.
     *
     * @example
     * <pre>
     *   $scope.hasValidSize = c8yBinary.hasValidSize(file);
     * </pre>
     */
    function hasValidSize(file) {
      return file && file.size <= BYTES_SIZE_LIMIT;
    }

    /**
     * @ngdoc function
     * @name save
     * @deprecated
     * @methodOf c8y.core.service:c8yBinary
     *
     * @description
     * Updates existing binary object (if `binary.id` is provided) or creates a new one in inventory.
     * This function is deprecated. Please use c8yBinary.upload().
     *
     * @param {object} binary Binary object to store. <!--See object specification {@link http://docs.cumulocity.com/binary@TODO here}.-->
     *
     * @returns {promise} Returns $http's promise. <!--See response's `data` object specification {@link http://docs.cumulocity.com/binary@TODO here}.-->
     *
     * @example
     * <pre>
     *   var image = {
     *     name: 'My Image 01',
     *     dataType: 'image/png',
     *     data: 'iVBORw0KGgo(...)AASUVORK5CYII=',
     *     size: 14672
     *   };
     *   c8yBinary.save(image).then(function (res) {
     *     var storedImage = res.data;
     *   });
     * </pre>
     */
    function save(binary) {
      return binary.id ? update(binary) : create(binary);
    }

    function create(binary) {
      var mo = _.assign(binary, {
        c8y_IsBinary: true
      });
      return c8yInventory.createConfirm(mo);
    }

    function update(binary) {
      return c8yInventory.update(binary);
    }

    /**
     * @ngdoc function
     * @name detail
     * @methodOf c8y.core.service:c8yBinary
     *
     * @description
     * Gets binary object from inventory.
     *
     * @param {integer} binaryId Binary object's id.
     * @param {object} params Parameters for querying binary object in inventory.
     *
     * @returns {promise} Returns $http's promise. <!--See response's `data` object specification {@link http://docs.cumulocity.com/binary@TODO here}.-->
     *
     * @example
     * <pre>
     *   var binaryId = 1;
     *   c8yBinary.detail(binaryId).then(function (res) {
     *     $scope.binary = res.data;
     *   });
     * </pre>
     */
    function detail(binaryId, params) {
      return c8yInventory.detail(binaryId, params);
    }

    /**
     * @ngdoc function
     * @name remove
     * @deprecated
     * @methodOf c8y.core.service:c8yBinary
     *
     * @description
     * Removes binary object from inventory.
     * This function is deprecated. Please use c8yBinary.removeBinary().
     *
     * @param {object|integer} binary Binary object or binary's id.
     *
     * @returns {promise} Returns $http's promise.
     *
     * @example
     * <pre>
     *   var binaryId = 1;
     *   c8yBinary.remove(binaryId);
     * </pre>
     */
    function remove(binary) {
      return c8yInventory.remove(binary);
    }

    /**
     * @ngdoc function
     * @name getDataUri
     * @deprecated
     * @methodOf c8y.core.service:c8yBinary
     *
     * @description
     * Gets Data URI for binary object.
     * This function is deprecated. Please use c8yBinary.downloadAsDataUri().
     *
     * @param {object} binary Binary object.
     *
     * @returns {string} Returns Data URI for binary object.
     *
     * @example
     * Controller:
     * <pre>
     *   var binaryId = 1;
     *   c8yBinary.detail(binaryId).then(function (res) {
     *     $scope.dataUri = c8yBinary.getDataUri(res.data);
     *   });
     * </pre>
     * Template:
     * <pre>
     *   <img ng-src="{{dataUri}}" />
     * </pre>
     */
    function getDataUri(binary) {
      var type = _.get(binary, 'type') || _.get(binary, 'dataType');
      var data = _.get(binary, 'data');
      var result = '';
      if (type && data) {
        try {
          $window.atob(data);
        } catch (e) {
          data = $window.btoa(data);
        }
        result = 'data:' + type + ';base64,' + data;
      }
      return result;
    }

    /**
     * @ngdoc function
     * @name readDataUri
     * @methodOf c8y.core.service:c8yBinary
     *
     * @description
     * Gets Data URI for Blob/File object.
     *
     * @param {Blob} binary Binary object.
     *
     * @returns {string} Returns Data URI for binary object.
     *
     * @example
     * Controller:
     * <pre>
     *     c8yBinary.readDataUri(binary).then(function(dataUri){
     *       $scope.dataUri = dataUri;
     *     });
     * </pre>
     * Template:
     * <pre>
     *   <img ng-src="{{dataUri}}" />
     * </pre>
     */
    function readDataUri(binary) {
      var reader = new FileReader();
      var deferred = $q.defer();

      reader.addEventListener('load', function () {
        deferred.resolve(reader.result);
      }, false);

      reader.addEventListener('error', function (evt) {
        deferred.reject(evt);
      });

      if (binary) {
        reader.readAsDataURL(binary);
      }
      return deferred.promise;
    }

    /**
     * @ngdoc function
     * @name getText
     * @deprecated
     * @methodOf c8y.core.service:c8yBinary
     *
     * @description
     * Gets text content from binary
     * This function is deprecated. Please use c8yBinary.decodeDataUri().
     *
     * @param {object} binary binary MO object.
     *
     * @returns {string} return text content extracted from binary object.
     */
    function getText(binary) {
      if (binary && binary.data) {
        return $window.atob(binary.data);
      }
      return '';
    }

    /**
     * @ngdoc function
     * @name getIdFromUrl
     * @methodOf c8y.core.service:c8yBinary
     *
     * @description
     * Gets binary managed object's id from its download or self URL.
     *
     * @param {string} url URL string.
     *
     * @returns {integer} Returns binary managed object's id.
     *
     * @example
     * <pre>
     *   var id = c8yBinary.getIdFromUrl('http://mytenant.cumulocity.com/inventory/binaries/12345');
     * </pre>
     */
    function getIdFromUrl(url) {
      var regexp = new RegExp('\\/inventory\\/binaries\\/(\\d+)|\\/inventory\\/managedObjects\\/(\\d+)');
      var matches = url.match(regexp);
      return matches && (matches[1] || matches[2]);
    }

    /**
     * @ngdoc function
     * @name decodeDataUri
     * @methodOf c8y.core.service:c8yBinary
     *
     * @description
     * Decode Data URI string (retrieved from either c8yBinary.downloadAsDataUri()
     * or c8yBinary.readDataUri()) to raw file content.
     * Should be used for text based files like SVG or CSV.
     *
     * @param {string} dataUri Data URI for binary object:
     *    var data = "data:image/svg;base64,YWJj..YWJj";
     *
     * @returns {string} Returns content of dataUri.
     *
     * @example
     * <pre>
     *   var xml = c8yBinary.downloadAsDataUri(binary).then(c8yBinary.decodeDataUri);
     * </pre>
     */
    function decodeDataUri(dataUri) {
      return $window.atob(_.last(dataUri.split(',')));
    }

    var output = _.assign(_.cloneDeep(c8yInventory), {
      BYTES_SIZE_LIMIT: BYTES_SIZE_LIMIT,
      list: list,
      upload: upload,
      downloadAndSaveAs: downloadAndSaveAs,
      downloadAsDataUri: downloadAsDataUri,
      downloadAsText: downloadAsText,
      getDownloadUrl: getDownloadUrl,
      removeBinary: removeBinary, // verify old usage
      icon: icon,
      size: size,
      isImage: isImage,
      hasValidSize: hasValidSize,
      getIdFromUrl: getIdFromUrl,
      readDataUri: readDataUri,
      decodeDataUri: decodeDataUri,

      // old functions to check: save, detail, remove, getDataUri
      save: save, // -> upload
      detail: detail, // ->
      remove: remove, // changed implementation
      getDataUri: getDataUri, // ->
      getText: getText
    });
    return output;
  }

}());
