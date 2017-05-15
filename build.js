const sh = require('shelljs');
const {
  ensureFileSync,
  ensureDirSync,
  removeSync,
} = require('fs-extra');

const {
  files,
  bowerDependencies,
} = require('./config.json');

const annotatedFiles = files.map((file) => {
  const annotatedFile = `.tmp/${file}`;

  ensureFileSync(annotatedFile);
  sh.exec(`ng-annotate -a src/${file} -o ${annotatedFile}`);

  return annotatedFile;
});

ensureDirSync('build');

sh.exec(`uglifyjs ${annotatedFiles.join(' ')} --compress --mangle --screw-ie8 -o build/main.js --source-map build/main.js.map`);
console.log('Built main.js');

sh.exec(`uglifyjs ${[...bowerDependencies, ...annotatedFiles].join(' ')} --compress --mangle --screw-ie8 -o build/main-standalone.js --source-map build/main-standalone.js.map`);
console.log('Built main-standalone.js');

removeSync('.tmp');
