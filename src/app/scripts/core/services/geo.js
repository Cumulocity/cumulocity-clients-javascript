/**
 * @ngdoc service
 * @name c8y.core.service:c8yGeo
 * @requires $http
 *
 * @description
 * This service allows for managing geographic data.
 */
angular.module('c8y.core').factory('c8yGeo', ['$http',
function ($http) {
  'use strict';

  var geoCodeSearchUrl = '//open.mapquestapi.com/nominatim/v1/search.php?json_callback=JSON_CALLBACK';

  /**
   * @ngdoc function
   * @name geoCode
   * @methodOf c8y.core.service:c8yGeo
   * 
   * @description
   * Invokes a geographic search for a given address.
   * 
   * @param {string} address Address to be searched.
   * 
   * @returns {promise} $http's promise with response from server.
   * 
   * @example
   * <pre>
   *   c8yGeo.geoCode('Schiessstraße 43, Düsseldorf').then(function (res) {
   *     if (res.data.length > 0) {
   *       var position = res.data[0];
   *       $scope.latitude = Number(position.lat);
   *       $scope.longitude = Number(position.lon);
   *     }
   *   });
   * </pre>
   */
  function geoCode(address) {
    return $http.jsonp(geoCodeSearchUrl, {
      params: {
        format: 'json',
        q: address
      }
    });
  }

  /**
   * @ngdoc function
   * @name Bounds
   * @methodOf c8y.core.service:c8yGeo
   * 
   * @description
   * Gets Bounds object.
   * 
   * @returns {Bounds} Returns Bounds object that allows for defining the list of boundary points. Available methods are:
   * 
   * - **reset** - Removes all defined points.
   * - **add** - Adds a new boundary point.
   * - **get** - Gets the list of boundary points.
   * 
   * @example
   * <pre>
   *   var bounds = new c8yGeo.Bounds();
   *   bounds.reset();
   *   var markers = [
   *     {alt: 102.36, lat: 51.267259, lng: 6.769717, message: 'Marker 1'},
   *     {alt: null, lat: 52.512222, lng: 13.426389, message: 'Marker 2'}
   *   ];
   *   markers.forEach(angular.bind(bounds, bounds.add));
   *   $scope.bounds = bounds.get();
   * </pre>
   */
  function Bounds() {
    this.points = [];
    return this;
  }

  Bounds.prototype.add = function (p) {
    this.points.push(p);
  };

  Bounds.prototype.reset = function () {
    this.points.length = 0;
  };

  Bounds.prototype.get = function () {
    var bounds = {
      southWest: {},
      northEast: {}
    };

    if (!this.points.length) {
      bounds = null;
    }

    this.points.forEach(function (p) {
      if (p.lat < (bounds.southWest.lat || Infinity)) {
        bounds.southWest.lat = p.lat;
      }

      if (p.lng < (bounds.southWest.lng || Infinity)) {
        bounds.southWest.lng = p.lng;
      }

      if (p.lat > (bounds.northEast.lat || -Infinity)) {
        bounds.northEast.lat = p.lat;
      }

      if (p.lng > (bounds.northEast.lng || -Infinity)) {
        bounds.northEast.lng = p.lng;
      }
    });

    return bounds;
  };

  return {
    geoCode: geoCode,
    Bounds : Bounds
  };

}]);
