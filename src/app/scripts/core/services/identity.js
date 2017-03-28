/**
 * @ngdoc service
 * @name c8y.core.service:c8yIdentity
 * @requires c8y.core.service:c8yBase
 * @requires $http
 *
 * @description
 * This service allows for managing identities.
 */
angular.module('c8y.core')
.factory('c8yIdentity', ['$http', 'c8yBase',
function ($http, c8yBase) {
  'use strict';

  var path = 'identity',
    defaultConfig = {
      headers: c8yBase.contentHeaders('externalId')
    };

  function onExternalIds(res) {
    return res.data.externalIds;
  }

  function buildUrlMo(mo) {
    return c8yBase.url(path) + '/globalIds/' + (mo.id || mo) + '/externalIds';
  }

  function buildUrl(identity) {
    return c8yBase.url(path) + '/externalIds/' +
      identity.type + '/' +
      encodeURIComponent(identity.externalId);
  }

  /**
   * @ngdoc function
   * @name createIdentity
   * @methodOf c8y.core.service:c8yIdentity
   *
   * @description
   * Creates new identity for managed object.
   *
   * @param {object} mo Managed object's id or object.
   * @param {object} identity Identity object.<!-- See identity object specification {@link http://docs.cumulocity.com/identity@TODO here}.-->
   *
   * @returns {promise} Returns $http's promise with response.
   *
   * @example
   * <pre>
   *   var identity = {
   *     type: 'MY_ID',
   *     externalId: 'ID-01'
   *   };
   *   c8yIdentity.createIdentity($routeParams.deviceId, identity);
   * </pre>
   */
  function createIdentity(mo, identity, cfg) {
    var url = buildUrlMo(mo),
      _cfg = _.assign(_.cloneDeep(defaultConfig), cfg);
    return $http.post(url, identity, _cfg);
  }

  /**
   * @ngdoc function
   * @name deleteIdentity
   * @methodOf c8y.core.service:c8yIdentity
   *
   * @description
   * Deletes given identity.
   *
   * @param {integer|object} identity Identity's id or identity object.
   *
   * @returns {promise} Returns $http's promise with response.
   *
   * @example
   * <pre>
   *   var identityId = 11;
   *   c8yIdentity.deleteIdentity(identityId);
   * </pre>
   */
  function deleteIdentity(identity) {
    var url = buildUrl(identity);
    return $http['delete'](url);
  }

  /**
   * @ngdoc function
   * @name listExternalIds
   * @methodOf c8y.core.service:c8yIdentity
   *
   * @description
   * Gets the list of identities for managed object.
   *
   * @param {integer|object} mo Managed object's id or object.
   *
   * @returns {promise} Returns promise with the list of identitiee.
   *
   * @example
   * <pre>
   *   c8yIdentity.listExternalIds($routeParams.deviceId).then(function (externalIds) {
   *     $scope.externalIds = externalIds;
   *   });
   * </pre>
   */
  function listExternalIds(mo) {
    var url = buildUrlMo(mo);
    return $http.get(url).then(onExternalIds);
  }

  /**
   * @ngdoc function
   * @name getExternalId
   * @methodOf c8y.core.service:c8yIdentity
   *
   * @description
   * Gets the details of external identity.
   *
   * @param {object} identity Identity's object.<!-- See identity object specification {@link http://docs.cumulocity.com/identity@TODO here}.-->
   *
   * @returns {promise} Returns $http's promise with the details of identity.
   *
   * @example
   * <pre>
   *   var identity = {
   *     type: 'MY_ID',
   *     externalId: 'ID-01'
   *   };
   *   c8yIdentity.getExternalId(identity).then(function (res) {
   *     $scope.externalIdMO = res.data;
   *   });
   * </pre>
   */
  function getExternalId(identity, cfg) {
    var url = buildUrl(identity);
    return $http.get(url, cfg);
  }

  return {
    createIdentity: createIdentity,
    deleteIdentity: deleteIdentity,
    listExternalIds: listExternalIds,
    getExternalId: getExternalId
  };

}]);
