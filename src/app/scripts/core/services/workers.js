/**
 * @ngdoc service
 * @name c8y.core.service:c8yWorkers
 * @requires c8y.core.service:c8yBase
 * @requires $timeout
 *
 * @description
 * This service allows for creating web workers.
 */
angular.module('c8y.core')
.factory('c8yWorkers', ['c8yBase', '$timeout',
  function(c8yBase, $timeout) {
    'use strict';
    var exports = {};
    /**
     * @ngdoc function
     * @name create
     * @methodOf c8y.core.service:c8yWorkers
     * 
     * @description
     * Creates a new web worker.
     * 
     * @param {string} path Path to worker's script to be executed in background.
     * 
     * @returns {object} Returns object with the following methods:
     * 
     * - **push(message)** - Sends a message.
     * - **terminateOnMessage()** - Causes worker to terminate after a message has been received.
     * - **message(callback)** - Sets callback for handling messages.
     * - **error(callback)** - Sets callback for handling error.
     * - **terminate** - Terminates created worker.
     * 
     * @example
     * <pre>
     *   var w = c8yWorkers.create('worker.js');
     *   w.message(function (message) {
     *     console.log('Received message:');
     *     console.log(message);
     *   });
     * </pre>
     */
    exports.create = function(path) {
      var self, worker = new Worker(c8yBase.url(path)), continueOnMessage = true;
      self = {
        push: function(message) {
          worker.postMessage(message);
          return self;
        },
        terminateOnMessage: function() {
          continueOnMessage = false;
          return self;
        },
        message: function(callback) {
          worker.onmessage = function(message) {
            $timeout(function() {
              callback(message.data);
              if (!continueOnMessage) {
                worker.terminate();
              }
            });
          };
          return self;
        },
        error: function(callback) {
          worker.onerror = function(message) {
            $timeout(function() {
              callback(message);
              if (!continueOnMessage) {
                worker.terminate();
              }
            });
          };
          return self;
        },
        terminate: function() {
          worker.terminate();
        }

      };
      return self;
    };
    return exports;
  }]);
