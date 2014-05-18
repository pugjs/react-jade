'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var Parser = require('jade/lib/parser.js');
var jade = require('jade/lib/runtime.js');
var React = require('react');
var staticModule = require('static-module');
var resolve = require('resolve');
var uglify = require('uglify-js');
var Compiler = require('./lib/compiler.js');
var JavaScriptCompressor = require('./lib/java-script-compressor.js');

var reactRuntimePath = require.resolve('react');

exports = (module.exports = browserifySupport);
function browserifySupport(options, extra) {
  function transform(filename) {
    function clientRequire(path) {
      return require(clientRequire.resolve(path));
    }
    clientRequire.resolve = function (path) {
      return resolve.sync(path, {
        basedir: path.dirname(filename)
      });
    };
    return staticModule({
    'react-jade': {
        compileFile: function (filename, options) {
          return compileFileClient(filename, options);
        }
      }
    }, {
      vars: {
        __dirname: path.dirname(filename),
        __filename: path.resolve(filename),
        path: path,
        require: clientRequire
      }
    });
  }
  if (typeof options === 'string') {
    var file = options;
    options = extra || {};
    return transform(file);
  } else {
    return transform;
  }
}

function parseFile(filename, options) {
  var str = fs.readFileSync(filename, 'utf8');
  var options = options || {};
  options.filename = path.resolve(filename);
  var parser = new Parser(str, options.filename, options);
  var tokens;
  try {
    // Parse
    tokens = parser.parse();
  } catch (err) {
    parser = parser.context();
    jade.rethrow(err, parser.filename, parser.lexer.lineno, parser.input);
  }
  var compiler = new Compiler(tokens);
  var js = 'exports = function () {' +
    'var jade = {};' +
    'jade.joinClasses = function joinClasses(val) {' +
    'function nulls(val) { return val != null && val !== ""; }' +
    'return Array.isArray(val) ? val.map(joinClasses).filter(nulls).join(" ") : val;' +
    '};' +
    compiler.compile() +
    '}';

  Function('', js);
  var ast = uglify.parse(js, {filename: filename});

  ast.figure_out_scope();
  ast = ast.transform(uglify.Compressor({
    sequences: false,   // join consecutive statemets with the “comma operator"
    properties: true,   // optimize property access: a["foo"] → a.foo
    dead_code: true,    // discard unreachable code
    unsafe: true,       // some unsafe optimizations (see below)
    conditionals: true, // optimize if-s and conditional expressions
    comparisons: true,  // optimize comparisons
    evaluate: true,     // evaluate constant expressions
    booleans: true,     // optimize boolean expressions
    loops: true,        // optimize loops
    unused: true,       // drop unused variables/functions
    hoist_funs: true,   // hoist function declarations
    hoist_vars: false,  // hoist variable declarations
    if_return: true,    // optimize if-s followed by return/continue
    join_vars: false,   // join var declarations
    cascade: true,      // try to cascade `right` into `left` in sequences
    side_effects: true, // drop side-effect-free statements
    warnings: true,     // warn about potentially dangerous optimizations/code
    global_defs: {}     // global definitions));
  }));

  ast = ast.transform(new JavaScriptCompressor());

  js = ast.print_to_string({
    beautify: true,
    comments: true,
    indent_level: 2
  });
  assert(/^exports *= */.test(js));
  return js.replace(/^exports *= */, '');
}

exports.compileFile = compileFile;
function compileFile(filename, options) {
  return Function('React', 'return ' + parseFile(filename, options))(React);
}

exports.compileFileClient = compileFileClient;
function compileFileClient(filename, options) {
  var react = options.outputFile ? path.relative(path.dirname(options.outputFile), reactRuntimePath) : reactRuntimePath;
  return '(function (jade, React) {\n  return ' +
    parseFile(filename, options).split('\n').join('\n  ') +
    '\n}(typeof React !== "undefined" ? React : require("' + react.replace(/\\/g, '/') + '")))';
}
