'use strict';

var isTemplateLiteral = require('./lib/utils/is-template-literal.js');
var browserify = require('./lib/browserify');
var compile = require('./lib/compile');
var compileFile = require('./lib/compile-file');
var compileClient = require('./lib/compile-client');
var compileFileClient = require('./lib/compile-file-client');

exports = (module.exports = browserifySupport);
function browserifySupport(options, extra) {
  if (isTemplateLiteral(options)) {
    return compile(options.raw[0]);
  } else {
    return browserify.apply(this, arguments);
  }
}

exports.compile = compile;
exports.compileFile = compileFile;
exports.compileClient = compileClient;
exports.compileFileClient = compileFileClient;
