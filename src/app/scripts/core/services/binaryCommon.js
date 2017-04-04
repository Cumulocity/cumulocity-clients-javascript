(function () {
  'use strict';
  angular
    .module('c8y.core')
    .factory('c8yBinaryCommon', c8yBinaryCommon);

  /* @ngInject */
  function c8yBinaryCommon($q, $upload, c8yBase, c8yAuth) {
    var service = {
      upload: upload,
      download: download,
      getFilenameFromContentDisposition: getFilenameFromContentDisposition,
      arrayBufferToBase64: arrayBufferToBase64,
      size: size
    };

    function upload(binary, configOverride) {

      var defaultConfig = {
        method: 'POST',
        data: {
          filesize: binary.size
        },
        file: binary
      };

      var finalConfig = _.assign({}, defaultConfig, configOverride);

      return $upload.upload(finalConfig);
    }

    function download(binary, url, length) {
      var deferred = $q.defer();
      var xhr = new XMLHttpRequest();

      xhr.open('GET', url, true);
      xhr.responseType = 'arraybuffer';
      xhr.onload = function () {
        if (xhr.status === 200) {
          deferred.resolve(xhr);
        } else {
          deferred.reject(xhr);
        }
      };
      xhr.onprogress = function (e) {
        if (!_.isUndefined(e.loaded)) {
          var totalLength = _.isNumber(Number(length)) && length || size(binary);
          if (!_.isUndefined(totalLength)) {
            var loadedPercentage = e.loaded / totalLength;
            deferred.notify(loadedPercentage);
          }
        }
      };

      _.forEach(c8yAuth.headers(), function (val, key) {
        if (val) {
          xhr.setRequestHeader(key, val);
        }
      });

      if (service.__test) {
        service.__downloadDeferred = deferred;
      } else {
        xhr.send();
      }

      return deferred.promise;
    }

    function size(binary) {
      var binaryLength = _.get(binary, 'length');
      var attachments = _.get(binary, '_attachments');
      var attachmentsObj = _.get(attachments, _.first(_.keys(attachments)));
      return _.isUndefined(binaryLength) ? _.get(attachmentsObj, 'length') : binaryLength;
    }

    function getFilenameFromContentDisposition(contentDisposition) {
      return /filename="(.*)"/.exec(contentDisposition)[1];
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

    return service;
  }
}());
