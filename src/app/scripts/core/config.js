(function () {
  'use strict';
  var gettext = _.identity;

  window.c8yConfig = {
    validation: {
      deviceId: {
        pattern: /^[^\s\/]*$/,
        message: gettext('Device ID must not contain spaces or slashes ("/").')
      },
      domain: {
        pattern: /^[a-z]+[a-z0-9_]*[a-z0-9]+\.{1}.+$/,
        message: gettext('Only lowercase letters, digits and underscore character allowed in the first part of the URI! It must start with a letter, underscore only allowed in the middle. Must be a valid URI.')
      },
      groupName: {
        maxlength: 254
      },
      internationalPhoneNumber: {
        message: gettext('International phone number required, in the format +49 9 876 543 210.')
      },
      jsonPath: {
        pattern: /^(\$\.){0,1}[\$\.\[\]\w\@\<\>\-\*\(\)\d\'\?\s,:]*$/,
        message: gettext('Must be valid JSONPath expression.')
      },
      opcuaBrowsePath: {
        pattern: /^(opc.tcp|http|https):\/\/[^ "]+$/
      },
      password: {
        pattern: /^[a-zA-Z0-9`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]{8,32}$/,
        message: gettext('Password must have at least 8 characters and no more than 32 and can only contain letters, numbers and following symbols: `~!@#$%^&*()_|+-=?;:\'",.<>{}[]\\/')
      },
      phoneNumber: {
        pattern: /^$|^(\+|0{2})[\d\s/-]{1,30}$/,
        message: gettext('Invalid phone number format. Only digits, spaces, slashes ("/") and dashes ("-") allowed.')
      },
      tennantId: {
        pattern: /^[a-z]+[a-z0-9_]*[a-z0-9]+$/,
        message: gettext('Only lowercase letters, digits and underscore character allowed! Must start with a letter, underscore only allowed in the middle, minimum 2 characters.')
      },
      user: {
        pattern: /^[^\\\/\s$:+]*$/,
        message: gettext('Username must not contain spaces nor slashes ("/", "\\") nor ("+"), (":"), ("$") signs.')
      }
    },
    deviceListMap: {},
    tracking: {},
    smartRules: {},
    administration: {
      statistics: {}
    },
    deviceDetailControl: {
      showControls: false
    }
  };
})();
