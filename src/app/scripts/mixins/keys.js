(function () {
  'use strict';

  var KeysMixin = {};

  KeysMixin.getKeys = function (e) {
    var reserved = this.reservedKeys || [];
    var isNotReservedKey = function (p) {
      return reserved.indexOf(p) === -1;
    };
    var props = _.keys(e);
    return props.filter(isNotReservedKey);
  };

  KeysMixin.getStandardKeys = function (e) {
    var stdKeys = this.standardKeys || {};
    return _.pickBy(stdKeys, function (label, key) {
      return _.has(e, key);
    });
  };

  KeysMixin.getNonStandardKeys = function (e) {
    return _.difference(
      this.getKeys(e),
      _.keys(this.getStandardKeys(e))
    );
  };

  angular.module('c8y.core').constant('KeysMixin', KeysMixin);
})();
