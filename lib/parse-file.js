'use strict';

var fs = require('fs');
var path = require('path');
var parse = require('./parse');

module.exports = parseFile;
function parseFile(filename, options) {
  var str = fs.readFileSync(filename, 'utf8').toString();
  var options = options || {};
  options.filename = path.resolve(filename);
  return parse(str, options);
}
