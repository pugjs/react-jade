'use strict';

var path = require('path');
var parse = require('./parse');

var reactRuntimePath;

try {
  reactRuntimePath = require.resolve('react');
} catch (ex) {
  reactRuntimePath = false;
}

module.exports = compileClient;
function compileClient(str, options){
  options = options || { filename: '' };
  var react = options.outputFile ? path.relative(path.dirname(options.outputFile), reactRuntimePath) : reactRuntimePath;

  if (options.globalReact || !reactRuntimePath) {
    return '(function (React) {\n  ' +
      parse(str, options).split('\n').join('\n  ') +
      '\n}(React))';
  } else {
    return '(function (React) {\n  ' +
      parse(str, options).split('\n').join('\n  ') +
      '\n}(typeof React !== "undefined" ? React : require("' + react.replace(/^([^\.])/, './$1').replace(/\\/g, '/') + '")))';
  }
}
