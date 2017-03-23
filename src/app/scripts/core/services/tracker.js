/* global L*/
(function () {
  'use strict';

  angular.module('c8y.core').factory('c8yTracker', [
    'c8yBase',
    'c8yRealtime',
    'c8yEvents',
    '$q',
    'c8yGeo',
    c8yTracker
  ]);

  function c8yTracker(
    c8yBase,
    c8yRealtime,
    c8yEvents,
    $q,
    c8yGeo
  ) {
    // props is {paths, bounds}
    function Tracker(scope, filter) {
      var self = this;
      self.scope = scope;
      // default filter is last day
      self.filter = filter || {
        dateFrom: moment().subtract(1, 'days').startOf('day').format(c8yBase.dateFullFormat),
        dateTo: moment().format(c8yBase.dateFullFormat)
      };
      self.active = {};
      self.events = {};
      self.loadMore = {};
      self._paths = {};
      self.canceler = $q.defer();
      Object.defineProperty(self, 'state', {
        get: function () {
          return c8yRealtime.getStatus(scope.$id, '/events/*');
        }
      });
    }

    Tracker.prototype.abortRequests = function () {
      var self = this;
      self.canceler.resolve();
      self.canceler = $q.defer();
    };

    Tracker.prototype.onPaths = function (callback) {
      var self = this;
      self.callback = callback;
    };

    Tracker.prototype._fetchAllEvents = function () {
      var self = this;
      var ids = _.keys(_.pickBy(self.active, _.identity));
      var promises = _.map(ids, _.bind(self._fetchEvents, self));
      return $q.all(promises).then(_.bind(self._notify, self, true));
    };

    Tracker.prototype._notify = function (shouldFitBounds) {
      var self = this;
      if (!self.callback) { return; }
      self.callback(
        L.multiPolyline(_.values(self._paths), {color: 'darkblue'}),
        shouldFitBounds
      );
    };

    Tracker.prototype._fetchEvents = function (id) {
      var self = this;

      var mainFilter = {source: id, type: 'c8y_LocationUpdate', pageSize: 1000, withTotalPages: true};
      _.assign(mainFilter, self.filter);
      self._fetching = c8yEvents
        .list(mainFilter, {timeout: self.canceler.promise})
        .then(function (events) {
          events = self._filterEvents(events);
          return self._buildEventListCallback(id, true)(events);
        });
      return self._fetching;
    };

    function isLocationUpdateEvent(event) {
      return event.type === 'c8y_LocationUpdate';
    }

    function isGPSEvent(event) {
      return !event.c8y_Position || !event.c8y_Position.fixType || event.c8y_Position.fixType === 'No Fix';
    }

    function isGSMEvent(event) {
      return event.c8y_Position && event.c8y_Position.fixType === 'GSM';
    }

    Tracker.prototype._filterEvents = function (events) {
      var self = this;
      var options = self.trackingOptions || {};
      var filteredEvents = _.filter(events, function (e) {
        return isLocationUpdateEvent(e) &&
          (
            (_.isUndefined(options.gps) && _.isUndefined(options.gsm)) ||
            (options.gps && isGPSEvent(e)) ||
            (options.gsm && isGSMEvent(e))
          );
      });
      var preservedStringKeys = _.filter(_.keys(events), isNaN);
      _.assign(filteredEvents, _.pick(events, preservedStringKeys));
      return filteredEvents;
    };

    Tracker.prototype._buildLoadMore = function (id, next) {
      var self = this;
      return function () {
        self._fetching = next()
          .then(self._buildEventListCallback(id, false))
          .then(function (paths) {
            if (paths.length) {
              self._notify(true);
            }
          });
        return self._fetching;
      };
    };

    Tracker.prototype._buildEventListCallback = function (id, firstRequest) {
      var self = this;
      return function (events) {
        var paging = events.paging;
        events = self.events[id] = firstRequest ? events : (self.events[id] || []).concat(events);
        self._paths[id] = _(events).filter(c8yGeo.getLocationFragment).map(c8yGeo.getLocationFragment).map(function (loc) {
          return L.latLng(loc.lat, loc.lng);
        }).value();
        self.loadMore[id] = paging.next && self._buildLoadMore(id, paging.next);
        self._fetching = false;
        return self._paths[id];
      };
    };

    Tracker.prototype.changeInterval = function (filter) {
      var self = this;
      self.filter = filter;
      self.abortRequests();
      return self._fetchAllEvents();
    };

    Tracker.prototype.refresh = function () {
      var self = this;
      self.abortRequests();
      return self._fetchAllEvents();
    };

    Tracker.prototype.activate = function (id, options) {
      var self = this;
      self.active[id] = true;
      self.trackingOptions = options;
      return self._fetchEvents(id).then(function (paths) {
        if (!paths.length) { return; }
        self._notify(true);
      });
    };

    Tracker.prototype.getActiveDeviceIds = function () {
      var self = this;
      return _.keys(self.active);
    };

    Tracker.prototype.deactivate = function (id) {
      var self = this;
      delete self.active[id];
      delete self._paths[id];
      delete self.events[id];
      self._notify();
    };

    Tracker.prototype.deactivateAll = function () {
      var self = this;
      _.forEach(_.keys(self.active), function (id) {
        delete self.active[id];
        delete self._paths[id];
        delete self.events[id];
      });
      self._notify();
    };

    Tracker.prototype._onNotification = function (evt, data) {
      var self = this;
      if (!self.active[data.source.id]) { return; }
      var path = c8yGeo.getLocationFragment(data);
      if (!path) { return; }
      if (self._filterEvents([data]).length) {
        var lPath = L.latLng(path.lat, path.lng);
        self._paths[data.source.id].unshift(lPath);
        self.events[data.source.id].unshift(data);
        self._notify(true);
      }
    };

    Tracker.prototype.start = function () {
      var self = this;
      if (self.state) {
        throw new Error('Tracker: Realtime is already started.');
      }
      var realtimeId = self.scope.$id;
      c8yRealtime.addListener(realtimeId, '/events/*', 'CREATE', _.bind(self._onNotification, self));
      c8yRealtime.start(realtimeId, '/events/*');
      self.scopeDestroyer = self.scope.$on('$destroy', function () {
        if (!self.state) { return; }
        self.stop();
      });
    };

    Tracker.prototype.stop = function () {
      var self = this;
      if (!self.state) {
        throw new Error('Tracker: Cannot stop realtime, it has not been started.');
      }
      // unregister destroy watcher
      self.scopeDestroyer();
      c8yRealtime.stop(self.scope.$id, '/events/*');
    };

    return {
      Tracker: Tracker
    };
  }
})();
