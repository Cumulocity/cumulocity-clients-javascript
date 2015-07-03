(function () {
  var core = angular.module('c8y.core', ['angularFileUpload']);
  core.run([
    'info',
    'c8yUser',
    run
  ]);

  function run(
    info,
    c8yUser
  ) {
    if (info.token && !info.preventGetUser) {
      c8yUser.current();
    }
  }
})();
