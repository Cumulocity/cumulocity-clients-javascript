/**
 * @ngdoc service
 * @name c8y.core.service:c8ySimulator
 * @requires c8y.core.service:c8yBase
 * @requires $http
 *
 * @description
 * This service allows for managing simulator configurations. A simulator configuration is a managedobject with a fragement of type 
 * "com_cumulocity_model_devicesimulator_SimulatorConfiguration".
 * The following would be a typical scenario how to create a simulator configuration:
 *    1) Create a device template. This defines how the device looks like. 
 *    2) Create a sensor template. This defines what kind of sensor should be used.
 *    3) Create a measurement template for 2). This defines how the measurement values look like (e.g. Celsius for temperature)
 *    4) Create a simulator configuration with the id from 1) and with a sensor with the ids from 2) and 3).
 *
 * @see #createSimulator
 */
angular.module('c8y.core')
.factory('c8ySimulator', ['$http', 'c8yBase',
function ($http, c8yBase) {
  'use strict';

  var templatePath = 'simulator/templates',
  configPath = 'simulator/configurations',
  sensorsPath = templatePath + '/sensors',
  defaultConfigSimulator = {
      headers: c8yBase.contentHeaders('simulator', 'simulator')
  },
  defaultConfigTemplate = {
      headers: c8yBase.contentHeaders('template', 'template')
  };

  /**
   * @ngdoc function
   * @name list
   * @methodOf c8y.core.service:c8ySimulator
   * 
   * @description
   * Gets the list of simulator configurations.
   */
  function list(){
    var simulatorUrl = c8yBase.url(configPath);
    return $http.get(simulatorUrl).then(c8yBase.getResData);
  }

  /**
   * @ngdoc function
   * @name changeState
   * @methodOf c8y.core.service:c8ySimulator
   * 
   * @param {integer|object} id Simulator configuration's id or simulator object.
   * @param {object} newstate The new state of the simulator configuration.
   *
   * @description
   * Changes the state of the simulator configurations. The states are: NEW; RUNNING; PAUSED; REMOVED.
   * You cannot change the state to NEW. 
   * REMOVED will delete the configuration.
   */
  function changeState(simulator, newstate){
    var id = simulator.id || simulator;
    var url = c8yBase.url(configPath + '/' + id),
    data = {state: newstate},
    cfg = angular.copy(defaultConfigSimulator);
    return $http.put(url, data, cfg);
  }

  /**
   * @ngdoc function
   * @name deleteSimulator
   * @methodOf c8y.core.service:c8ySimulator
   * 
   * @description
   * Deletes the simulator configuration.
   * 
   * @param {integer|object} id Simulator configuration's id or simulator object.
   * 
   * @returns {promise} Returns $http's promise with response from server.
   * 
   */
  function deleteSimulator(simulator){
    var id = simulator.id || simulator;
    var url = c8yBase.url(configPath + '/' + id),
    cfg = angular.copy(defaultConfigSimulator);
    return $http.delete(url, cfg);
  }

  /**
   * @ngdoc function
   * @name getSensors
   * @methodOf c8y.core.service:c8ySimulator
   * 
   * @description
   * Retrieves the sensors as sensor templates which are available under the uri: simulator/templates/sensors.
   * 
   * 
   * @returns {promise} Returns $http's promise with the response from server.
   * 
   */
  function getSensors(){
    var sensorsUrl = c8yBase.url(sensorsPath);
    return $http.get(sensorsUrl).then(c8yBase.getResData);
  }

  /**
   * @ngdoc function
   * @name create
   * @methodOf c8y.core.service:c8ySimulator
   * 
   * @description
   * Creates a new template object. This can be either a device template, sensor template or a measurement template.
   * 
   * @param {object} template The Template object to create.
   * 
   * @returns {promise} Returns $http's promise after posting new managed object's data.
   * 
   * @example
   * <pre>
   *   c8ySimulator.createTemplate({
        "name": "temperatureSensor",
        "api": "/inventory/managedObjects",
        "placeholder":"&&",
        "contentType": "application/vnd.com.nsn.cumulocity.managedObject+json",
        "templateString": "{\"name\": \"temperatureSensor\", \"c8y_TemperatureSensor\": {}, \"c8y_SupportedMeasurements\": [\"c8y_TemperatureMeasurement\"]}"
      });
   * </pre>
   */
  function createTemplate(template){
    var url = c8yBase.url(templatePath),
    data = angular.copy(template),
    cfg = angular.copy(defaultConfigTemplate);
    return $http.post(url, data, cfg);
  }

/**
   * @ngdoc function
   * @name createSimulator
   * @methodOf c8y.core.service:c8ySimulator
   * 
   * @description
   * Creates a new simulator configuration. You have to define existing templates in order to create a simulator
   * configuration.
   * 
   * @param {object} simulator Simulator configuration to create.
   * 
   * @returns {promise} Returns $http's promise after posting new simulator configuration object's data.
   * 
   * @example
   * <pre>
   *   c8ySimulator.createSimulator({
         "name": "simulated device",
         "type": "com_cumulocity_model_simulator_Configuration",
         "numberOfInstances": 1,
         "deviceTemplate": "10200",
         "com_cumulocity_model_simulator_Sensors": [{
         "name": "TemperatureSensor",
         "sensorTemplate": "10300",
         "measurementTemplate": "10400",
         "msgId": 105,
         "data": ["24,{{NOW}},{{$.id}}",
                  "25,{{NOW}},{{$.id}}",
                  "26,{{NOW}},{{$.id}}",
                  "27,{{NOW}},{{$.id}}"],
         "intervall": 5
         }]
       });
   * </pre>
   */
  function createSimulator(simulator){
    var url = c8yBase.url(configPath),
    data = angular.copy(simulator),
    cfg = angular.copy(defaultConfigSimulator);
    return $http.post(url, data, cfg);
  }

  return {
    list: list,
    changeState: changeState,
    deleteSimulator: deleteSimulator,
    createSimulator: createSimulator,
    createTemplate: createTemplate,
    getSensors: getSensors
  };

}]);