(function () {
  'use strict';

  angular.module('c8y.core')
  .factory('c8yUtil',
    [
      'c8yBase',
      c8yUtil
    ]);

  function c8yUtil(c8yBase) {
    function dateToString(date) {
      return date && moment(date).format(c8yBase.dateFormat);
    }

    function stringToDate(date) {
      return date && moment(date).toDate();
    }

    return {
      dateToString: dateToString,
      stringToDate: stringToDate
    };
  }
})();
