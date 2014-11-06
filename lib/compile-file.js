'use strict';

var React = require('react');
var parseFile = require('./parse-file');

module.exports = compileFile;
function compileFile(filename, options) {
  return Function('React', parseFile(filename, options))(React);
}
