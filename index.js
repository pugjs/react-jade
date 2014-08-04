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
        compileFile: function (jadeFile, localOptions) {
          localOptions = localOptions || {};
          for (var key in options) {
            if ((key in options) && !(key in localOptions))
            localOptions[key] = options[key];
          }
          localOptions.outputFile = filename;
          return compileFileClient(jadeFile, localOptions);
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
    options = options || {};
    return transform;
  }
}

function parse(str, options){
  var options = options || {};
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

  var js = 'exports = function (locals) {' +
    'function getReactClass(name, args) { ' +
    'return (React.isValidClass(locals[name])) ' + 
        '? locals[name].apply(locals[name], args) ' +
        ': (React.DOM[name]) ? React.DOM[name].apply(React.DOM, args) : React.DOM.div.apply(React.DOM, args)' +
    '};' +
    'function jade_join_classes(val) {' +
    'return Array.isArray(val) ? val.map(jade_join_classes).filter(function (val) { return val != null && val !== ""; }).join(" ") : val;' +
    '};' +
    'var jade_mixins = {};' +
    'var jade_interp;' +
    'jade_variables(locals);' +
    compiler.compile() +
    '}';

  // Check that the compiled JavaScript code is valid thus far.
  // uglify-js throws very cryptic errors when it fails to parse code.
  try {
    Function('', js);
  } catch (ex) {
    console.log(js);
    throw ex;
  }

  var ast = uglify.parse(js, {filename: options.filename});

  ast.figure_out_scope();
  ast = ast.transform(uglify.Compressor({
    sequences: false,   // join consecutive statemets with the “comma operator"
    properties: true,   // optimize property access: a["foo"] → a.foo
    dead_code: true,    // discard unreachable code
    unsafe: true,       // some unsafe optimizations (see below)
    conditionals: true, // optimize if-s and conditional expressions
    comparisons: true,  // optimize comparisonsx
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
    warnings: false,     // warn about potentially dangerous optimizations/code
    global_defs: {}     // global definitions));
  }));

  ast = ast.transform(new JavaScriptCompressor());

  ast.figure_out_scope();
  var globals = ast.globals.map(function (node, name) {
    return name;
  }).filter(function (name) {
    return name !== 'jade_variables' && name !== 'exports' && name !== 'Array' && name !== 'React';
  });

  js = ast.print_to_string({
    beautify: true,
    comments: true,
    indent_level: 2
  });
  assert(/^exports *= */.test(js));
  assert(/jade_variables\(locals\)/.test(js));

  js = js.replace(/\n? *jade_variables\(locals\);?/, globals.map(function (g) {
    return '  var ' + g + ' = ' + JSON.stringify(g) + ' in locals ? locals.' + g + ' : jade_globals_' + g + ';';
  }).join('\n'));
  
  return globals.map(function (g) {
    return 'var jade_globals_' + g + ' = typeof ' + g + ' === "undefined" ? undefined : ' + g + ';\n';
  }).join('') + js.replace(/^exports *= */, 'return ');
}

function parseFile(filename, options) {
  var str = fs.readFileSync(filename, 'utf8');
  var options = options || {};
  options.filename = path.resolve(filename);
  return parse(str, options);
}

exports.compile = function(str, options){
  return Function('React', parse(str, options))(React);
}

exports.compileFile = compileFile;
function compileFile(filename, options) {
  return Function('React', parseFile(filename, options))(React);
}

exports.compileClient = compileClient;
function compileClient(content, options){
  options = options || {};
  var react = options.outputFile ? path.relative(path.dirname(options.outputFile), reactRuntimePath) : reactRuntimePath;
  return '(function (React) {\n  ' +
    parse(content, options).split('\n').join('\n  ') +
    '\n}(typeof React !== "undefined" ? React : require("' + react.replace(/^([^\.])/, './$1').replace(/\\/g, '/') + '")))';
}

exports.compileFileClient = compileFileClient;
function compileFileClient(filename, options) {
  var str = fs.readFileSync(filename, 'utf8');
  var options = options || {};
  options.filename = path.resolve(filename);
  return compileClient(str, options);
}
