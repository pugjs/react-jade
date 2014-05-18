'use strict';

var fs = require('fs');
var gethub = require('gethub');
var jadeVersion = require('jade/package.json').version;
var downloadedVersion = '';

try {
  downloadedVersion = fs.readFileSync(__dirname + '/jade/version.txt', 'utf8');
} catch (ex) {
  // ignore non-existant version.txt file
}

if (downloadedVersion !== jadeVersion) {
  gethub('visionmedia', 'jade', jadeVersion, __dirname + '/jade', function (err) {
    if (err) throw err;
    fs.writeFileSync(__dirname + '/jade/version.txt', jadeVersion);
  });
}