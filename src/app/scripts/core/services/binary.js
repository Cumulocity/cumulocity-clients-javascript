/**
 * @ngdoc service
 * @name c8y.core.service:c8yBinary
 * @requires c8y.core.service:c8yInventory
 *
 * @description
 * This service allows for managing binary objects stored in inventory as managed objects.
 */
angular.module('c8y.core')

.factory('c8yBinary', ['$q', '$upload', '$http', 'c8yBase', 'c8yInventory', 'info', function ($q, $upload, $http, c8yBase, c8yInventory, info) {
  'use strict';

  var path = 'inventory/binaries',
    managedObjectsPath = 'inventory/managedObjects',
    BYTES_SIZE_LIMIT = 52428800,
    fileNameRegexp = /(?:\.([^.]+))?$/,
    fileTypeIconsMap = {
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
        exts: ['bmp', 'gif', 'jpeg', 'jpg', 'png', 'tiff']
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
   *     angular.forEach(devices, function(device) {
   *       $scope.devices.push(device);
   *     });
   *   });
   * </pre>
   */
  function list(filters) {
    var url = c8yBase.url(path),
      _filters = c8yBase.pageSizeFilter(filters),
      cfg = {params: _filters},
      blindPaging = true,
      onList = c8yBase.cleanListCallback('managedObjects', list, _filters, blindPaging);

    return $http.get(url, cfg).then(onList);
  }

  function upload(binary) {
    return $upload.upload({
      url: c8yBase.url(path),
      method: 'POST',
      headers: c8yBase.contentHeaders('managedObject'),
      data: {object: {name: binary.name, type: binary.type}, filesize: binary.size},
      file: binary
    });
  }

  function downloadAndSaveAs(binary) {
    return download(binary).then(function (xhr) {
      var contentType = xhr.getResponseHeader('Content-Type'),
        contentDisposition = xhr.getResponseHeader('Content-Disposition'),
        blob = new Blob([xhr.response], {type: contentType});

      saveAs(blob, getFilenameFromContentDisposition(contentDisposition));
    });
  }

  function getFilenameFromContentDisposition(contentDisposition) {
    return /filename="(.*)"/.exec(contentDisposition)[1];
  }

  function downloadAsDataUri(binary) {
    return download(binary).then(function (xhr) {
      var contentType = xhr.getResponseHeader('Content-Type'),
        base64 = arrayBufferToBase64(xhr.response);

      return 'data:' + contentType + ';base64,' + base64;
    });
  }

  function arrayBufferToBase64(buffer) {
    var binary = '';
    var bytes = new Uint8Array(buffer);
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  function download(binary) {
    var deferred = $q.defer(),
      url = buildFileUrl(binary),
      xhr = new XMLHttpRequest();

    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function (e) {
      if (xhr.status === 200) {
        deferred.resolve(xhr);
      } else {
        deferred.reject(xhr);
      }
    };
    xhr.onprogress = function (e) {
      if (angular.isDefined(e.loaded)) {
        deferred.notify(e.loaded / size(binary));
      }
    };
    xhr.setRequestHeader('Authorization', 'Basic ' + info.token);
    xhr.setRequestHeader('UseXBasic', true);
    xhr.send();

    return deferred.promise;
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
    angular.forEach(fileTypeIconsMap, function (iconCfg, icon) {
      var moExt = fileNameRegexp.exec(binary.name)[1];
      angular.forEach(iconCfg.exts, function (ext) {
        if (ext === moExt) {
          type = icon;
          return false;
        }
      });
      if (!type) {
        var moMime = binary._attachments[Object.keys(binary._attachments)[0]].content_type;
        angular.forEach(iconCfg.mimes, function (mime) {
          if (mime === moMime) {
            type = icon;
            return false;
          }
        });
      }
    });
    return type;
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
    return binary._attachments[Object.keys(binary._attachments)[0]].length;
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
   * @methodOf c8y.core.service:c8yBinary
   *
   * @description
   * Updates existing binary object (if `binary.id` is provided) or creates a new one in inventory.
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
    var mo = angular.extend(binary, {
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
   * @methodOf c8y.core.service:c8yBinary
   *
   * @description
   * Removes binary object from inventory.
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
   * @methodOf c8y.core.service:c8yBinary
   *
   * @description
   * Gets Data URI for binary object.
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
    if (binary && binary.dataType && binary.data) {
      return 'data:' + binary.dataType + ';base64,' + binary.data;
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

  return angular.extend(angular.copy(c8yInventory), {
    BYTES_SIZE_LIMIT: BYTES_SIZE_LIMIT,
    list: list,
    upload: upload,
    downloadAndSaveAs: downloadAndSaveAs,
    downloadAsDataUri: downloadAsDataUri,
    getDownloadUrl: getDownloadUrl,
    removeBinary: removeBinary, // verify old usage
    icon: icon,
    size: size,
    isImage: isImage,
    hasValidSize: hasValidSize,
    getIdFromUrl: getIdFromUrl,

    // old functions to check: save, detail, remove, getDataUri
    save: save, // -> upload
    detail: detail, // ->
    remove: remove, // changed implementation
    getDataUri: getDataUri // ->
  });

}]);
