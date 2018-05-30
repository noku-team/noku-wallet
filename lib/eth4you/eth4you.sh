npm install
browserify eth4you.js --standalone eth4you -o eth4you.tmp.js -t [ babelify --presets [ es2015-ie ] ]
#uglify -s eth4you.tmp.js -o eth4you.min.js
#uglifyjs eth4you.tmp.js --verbose --compress -o eth4you.min.js
uglifyjs eth4you.tmp.js --compress -o eth4you.min.js
rm eth4you.tmp.js
mv eth4you.min.js ..
rm eth*.tmp.*
