/**
 * Created by jzolnowski on 12.05.15.
 */
/**
 * @ngdoc service
 * @name c8y.core.service:c8yDeviceShell
 *
 * @description
 * This service allows for managing device shell operations.
 */
angular.module('c8y.core')
  .factory('c8yDeviceShell', ['$http', '$q', 'c8yBase',
    function ($http, $q, c8yBase) {
      'use strict';

      /**
       * @ngdoc
       * @name  getCommandTemplatesForDeviceType
       * @methodOf c8y.core.service:c8yDeviceShell
       *
       * @description
       * Fetch '/apps/c8ydata/devicecommands/'+deviceType+'.json' file with command templates and modify it by adding syntax property.
       * Final collection with command templates is returned by a promise.
       *
       * @param  {string} Device type - required
       * @return Promise with command templates for specyfic device type.
       */
      function getCommandTemplatesForDeviceType(deviceType) {
        var url = getCommandTemplatesUrl(deviceType);
        return $http.get(url).then(c8yBase.getResData)
          .then(_.partial(extractCommandTemplatesFromData, deviceType));
      }

      function getCommandTemplatesUrl(deviceType) {
        var commandTemplatesBaseUrl = '/apps/c8ydata/devicecommands/';
        return commandTemplatesBaseUrl + deviceType + '.json';
      }

      /**
       * @ngdoc function
       * @name extractCommandTemplatesFromData
       * @methodOf c8y.deviceShell.controller:commandTemplatesCtrl
       *
       * @description
       * Extracts command templates from JSON data loaded fromm command templates static file.
       * Data can be either object or array of objects with the following structure:
       * - **name** - `string` - Short descriptive name for the set of command templates.
       * - **syntax** - `string` - Indicator for a syntax used in command templates.
       * - **templates** - `array` - Array of objects defining command templates. Each object can have the following properties:
       *     - **category** - `string` - category/group name,
       *     - **name** - `string` - command template's name,
       *     - **command** - `string` - command string.
       *
       * @param {array|object} data Data loaded from command templates file.
       *
       * @returns {array} Array of templates extracted from command templates file.
       */
      function extractCommandTemplatesFromData(deviceType, data) {
        var templates;
        if (angular.isArray(data)) {
          templates = _.chain(data).map(function (d) {
            return getExtendedTemplates(d.templates, d.syntax, deviceType);
          }).flatten().value();
        } else {
          templates = getExtendedTemplates(data.templates, data.syntax, deviceType);
        }
        return $q.when(templates);
      }

      function getExtendedTemplates(templates, syntax, deviceType) {
        return _.map(templates || [], function (t) {
          return angular.extend(t, {syntax: syntax, deviceType: deviceType});
        });
      }


      return {
        getCommandTemplatesForDeviceType: getCommandTemplatesForDeviceType
      };

    }]);
