(function () {
  'use strict';
  angular.module('c8y.core').config(['$provide', function ($provide) { $provide.decorator('$q', ['$delegate', function ($delegate) {

    function objWithProperties(source) {
      return _.reduce(source, function (acc, val, key) {
        acc[key] = undefined;
        return acc;
      }, {});
    }

    // resolves as soon as `count` promises returning resolved values in an array/object
    // array/object size is equal to promises param size
    // i.e. _.size(promises) === _.size(results)
    //
    // similar behavior with rejection but rejects AFTER ALL promises fail
    // e.g:
    // var promises = [$q.reject(0), $q.when(1)];
    // $q.some(promises, 1).then(vals => {
    //     assert(vals[0] === undefined);
    //     assert(vals[1] === 1);
    //     assert(_.size(vals) === _.size(promises));
    // });
    // $q.some({first: $q.reject(0), second: $q.when(1)}).then(vals => {
    //     assert(vals.first === undefined);
    //     assert(vals.second === 1);
    //     assert(_size(vals) === _.size(promises));
    // });
    $delegate.some = function (promises, count) {
      var deferred = $delegate.defer();
      var successCount = 0;
      var failCount = 0;
      var allCount = _.size(promises);
      var results, reasons;
      if(_.isArray(promises)) {
        results = [];
        reasons = [];
      } else {
        results = objWithProperties(promises);
        reasons = objWithProperties(promises);
      }
      if (count === 0) {
        deferred.resolve(_.clone(results));
        return deferred.promise;
      }
      _.forEach(promises, function (promise, idx) {
        promise.then(function (val) {
          successCount++;
          results[idx] = val;
          deferred.notify({
            key: idx,
            result: val
          });
          if (successCount === count) {
            deferred.resolve(_.clone(results));
          }
        }, function (reason) {
          failCount++;
          reasons[idx] = reason;
          deferred.notify({
            key: idx,
            reason: reason
          });
          if (failCount === allCount) {
            deferred.reject(_.clone(reasons));
          }
        });
      });
      return deferred.promise;
    };


    // resolves with value of first successful promise
    // rejects if all promises fail with all reasons in an object/array
    $delegate.any = function (promises) {
      return $delegate.some(promises, 1).then(function (results) {
        return _.filter(results, _.identity)[0];
      });
    };

    return $delegate;
  }]); }]);
})();
