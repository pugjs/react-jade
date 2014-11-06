'use strict';

var React = require('react');
var parse = require('./parse');

module.exports = compile;
function compile(str, options){
  options = options || { filename: '' };
  return Function('React', parse(str, options))(React);
}
