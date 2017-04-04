(function() {
  'use strict';

  angular.module('c8y.core')
    .factory('c8yKpi', [
      '$q',
      '$log',
      'c8yInventory',
      'c8yMeasurements',
      'c8yUser',
      'c8yBase',
      'c8yPermissions',
      'c8yAlert',
      'c8yBatchOp',
      c8yKpi
    ]);

  function c8yKpi(
    $q,
    $log,
    c8yInventory,
    c8yMeasurements,
    c8yUser,
    c8yBase,
    c8yPermissions,
    c8yAlert,
    c8yBatchOp) {

    var FRAG = 'c8y_Kpi',
      FLOAT_FIELDS = ['target', 'min', 'max', 'yellowRangeMin', 'yellowRangeMax', 'redRangeMin', 'redRangeMax'];

    function list() {
      return c8yInventory.list({
        fragmentType: FRAG
      }).then(filterOld)
        .then(updateGlobalFlagIfNeededAndReturnList);
    }

    function updateGlobalFlagIfNeededAndReturnList(list) {
      return c8yPermissions.mustHaveAnyRole(['ROLE_INVENTORY_ADMIN'])
        .then(function () {
          var kpisToUpdate = _.filter(list, function (kpi) {
            return !!_.isUndefined(kpi.c8y_Global);
          });
          var ops = _.map(kpisToUpdate, function (kpi) {
            return function() {
              return save(kpi);
            };
          });
          return c8yBatchOp.run(ops, 'Updating KPIs...')
            .result.then(function (result) {
              if (result !== 'complete') {
                c8yAlert.danger('Failed to update KPIs!');
              }
              return list;
            });
        }, _.noop);
    }

    function listByIds(ids) {
      return list().then(function (kpis) {
        if (ids && ids.length) {
          return _.filter(kpis, function (kpi) { return ids.indexOf(kpi.id) > -1; });
        } else {
          return kpis;
        }
      });
    }

    function isPureKpi(mo) {
      var allowedKeys = [
        FRAG,
        'id',
        'lastUpdated',
        'creationTime',
        'owner',
        'self',
        'c8y_Global',
        '_fragments',
        'assetParents',
        'deviceParents',
        'additionParents',
        'childAssets',
        'childDevices',
        'childAdditions'
      ];
      var keys = _.keys(mo);

      return _.every(keys, function (key) {
        return allowedKeys.indexOf(key) > -1;
      });
    }

    function filterOld(managedObjects) {
      var oldDevices = _.filter(managedObjects, function (mo) {
        return !isPureKpi(mo) && !mo.c8y_Kpi_Migrated;
      });
        // standaloneKpi = _.map(_.filter(managedObjects, isPureKpi), FRAG);

      if (oldDevices.length) {
        $log.info('Not migrated deprecated KPI found: ', oldDevices.length);
      }

      return $q.when(_.filter(managedObjects, isPureKpi));

      /** REMOVING THE MIGRATION PROCESS. IT WAS INTRODUCED A LONG TIME AND NO LONGER NECESSARY.
      if (!oldDevices.length) {
        defer.resolve(_.filter(managedObjects, isPureKpi));
      //Clean old KPI's attached to devices
      } else {
        var kpisToCreate = _.map(
            _.reduce(
              _.flattenDeep(_.map(oldDevices, FRAG)),
              _.partial(uniqueKpi, standaloneKpi),
              []), function (k) {
                var mo = {};
                mo[FRAG] = k;
                return _.partial(c8yInventory.save, mo);
            }),
          devicesWithKpi = _.map(oldDevices, function (dev) {
            return _.partial(migrateKpi, dev);
          }),
          ops = _.flattenDeep([kpisToCreate, devicesWithKpi]),
          promise = $q.when(),
          modal;

        c8yUser.current().then(function (user) {
          if (c8yUser.hasRole(user, 'ROLE_INVENTORY_ADMIN')) {
            modal = c8yBatchOp.run(ops, 'Migrating KPIs to new data model');
            promise = modal.result.then(function (result) {
              if (result === 'complete') {
                //replace for list() when  remove the data from the device
                return list();
              } else {
                c8yAlert.danger('Failed to migrate KPIs to new data model!');
              }
            });
          }
        });

        defer.resolve(promise);
      }

      return defer.promise;
      **/
    }
    /** MAY GO WAY SOON / WERE ONLY NEEDED FOR MIGRATION
    function matchKpi(list, kpi) {
      return _.find(list, function (k) {
        return k.fragment === kpi.fragment &&
          k.series === kpi.series &&
          k.unit === kpi.unit &&
          k.label === kpi.label;
      });
    }


    function uniqueKpi(existingList, list, kpi) {
      var found = matchKpi(existingList, kpi) ||
        matchKpi(list, kpi);

      if (!found && kpi.fragment && kpi.series) {
        list.push(kpi);
      }

      return list;
    }

    function migrateKpi(managedObject) {
      var mo = {
        id: managedObject.id,
        c8y_Kpi_Migrated: true
      };

      // mo[FRAG] = null;
      return c8yInventory.save(mo);
    }
    **/

    function detail(id) {
      return c8yInventory.detail(id).then(function (res) {
        var data = res.data.c8y_Kpi;
        _.forEach(FLOAT_FIELDS, function (field) {
          if (!_.isUndefined(data[field])) {
            data[field] = parseFloat(data[field]);
            if (isNaN(data[field])) {
              delete data[field];
            }
          }
        });
        return res;
      });
    }

    function listKpiForDevice(device) {
      var deviceId = device.id || device;
      return $q.all([list(), c8yInventory.getSupportedSeries(deviceId)])
        .then(function (promises) {
          var kpis = promises[0],
            series = promises[1];
          var matchKpi = _.filter(kpis, function (k) {
              return _.find(series, {fragment: k.c8y_Kpi.fragment, series: k.c8y_Kpi.series});
            }),
            nonKpiSeries = _.filter(series, function (s) {
              return !_.find(kpis, function (k) {
                return k.c8y_Kpi.fragment === s.fragment && k.c8y_Kpi.series === s.series;
              });
            });

          return {
            matchKpi: matchKpi,
            nonKpiSeries: nonKpiSeries
          };
        });
    }

    function onMeasurement(kpi, measurement) {
      var data = (measurement || {})[kpi.fragment] || {};
      data.kpi = kpi;
      data.time = (measurement || {}).time;
      data.source = (measurement || {}).source;
      return data;
    }

    function getMeasurement(_kpi, device, overRidePageSize) {
      var kpi = _kpi.c8y_Kpi || _kpi;
      return c8yMeasurements.list(_.assign(c8yBase.timeOrderFilter(), {
        revert: true,
        fragmentType: kpi.fragment,
        source: device,
        pageSize: overRidePageSize || 10
      }))
      .then(function (measurements) {
        return _.find(measurements, function (m) {
          var frag = m[_kpi.fragment];
          return frag && !_.isUndefined(frag[_kpi.series]);
        });
      })
      .then(_.partial(onMeasurement, kpi));
    }

    function save(kpi) {
      var kpiCopy = _.cloneDeep(kpi);
      delete(kpiCopy._measurement);
      kpiCopy.c8y_Global = {};
      return c8yInventory.save(kpiCopy);
    }

    return {
      list: list,
      listByIds: listByIds,
      detail: detail,
      remove: c8yInventory.remove,
      save: save,
      listKpiForDevice: listKpiForDevice,
      getMeasurement: getMeasurement
    };
  }

}());
