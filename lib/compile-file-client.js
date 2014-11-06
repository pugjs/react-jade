'use strict';

var fs = require('fs');
var path = require('path');
var compileClient = require('./compile-client');

module.exports = compileFileClient;
function compileFileClient(filename, options) {
  var str = fs.readFileSync(filename, 'utf8').toString();
  var options = options || {};
  options.filename = path.resolve(filename);
  return compileClient(str, options);
}
