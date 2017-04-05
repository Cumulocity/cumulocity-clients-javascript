#!/bin/bash
FILES=`node -e "cfg=require('./config.json'); files=cfg.files.map(f => './src/'+f); console.log(files.join(' '));"`
FILES_ALL=`node -e "cfg=require('./config.json'); bower=cfg.bowerDependencies; files=cfg.files.map(f => './src/'+f); console.log(bower.concat(files).join(' '));"`
./node_modules/.bin/uglifyjs $FILES -o build/main.js --source-map build/main.js.map --screw-ie8
echo 'Built main.js'
./node_modules/.bin/uglifyjs $FILES_ALL -o build/main-standalone.js --source-map build/main-standalone.js.map --screw-ie8 
echo 'Built main-standalone.js'
