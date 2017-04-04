/* global WeakMap */

(function () {
  'use strict';

  angular.module('c8y.core').constant('latestMixinFactory', function ($q) {
    var Mixin = {};

    Mixin.latest = function (fn) {
      if (!_.isFunction(fn)) {
        throw new TypeError('Argument needs to be a function');
      }
      var count = -1;
      return function () {
        var currCount = ++count;
        var promise = fn.apply(this, arguments);
        if (!_.isFunction(promise.then)) {
          throw new TypeError('Function must return a promise');
        }

        promise = promise.then(function (args) {
          if (currCount !== count) {
            return $q.reject('Promise is cancelled by a more recent one.');
          }
          return args;
        }, function (reason) {
          if (currCount !== count) {
            return $q.reject('Promise is cancelled by a more recent one.');
          }
          return $q.reject(reason);
        });

        return promise;
      };
    };

    return Mixin;
  });
})();
