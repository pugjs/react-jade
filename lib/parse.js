'use strict';

var fs = require('fs');
var assert = require('assert');
var uglify = require('uglify-js');
var Parser = require('jade/lib/parser.js');
var jade = require('jade/lib/runtime.js');
var addWith = require('with');
var Compiler = require('./utils/compiler.js');
var JavaScriptCompressor = require('./utils/java-script-compressor.js');

var jade_join_classes = fs.readFileSync(__dirname + '/utils/jade-join-classes.js', 'utf8');
var jade_fix_style = fs.readFileSync(__dirname + '/utils/jade-fix-style.js', 'utf8');
var jade_fix_attrs = fs.readFileSync(__dirname + '/utils/jade-fix-attrs.js', 'utf8');
var jade_merge = fs.readFileSync(__dirname + '/utils/jade-merge.js', 'utf8');
var setLocals = fs.readFileSync(__dirname + '/utils/set-locals.js', 'utf8');

module.exports = parse;
function parse(str, options) {
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

  var src = compiler.compile();
  src = [
    jade_join_classes + ';',
    jade_fix_style + ';',
    jade_fix_attrs + ';',
    jade_merge + ';',
    'var jade_mixins = {};',
    'var jade_interp;',
    src
  ].join('\n')

  var ast = uglify.parse(';(function () {' + src + '}.call(this));', {
    filename: options.filename
  });

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

  src = ast.body[0].body.expression.expression.body.map(function (statement) {
    return statement.print_to_string({
      beautify: true,
      comments: true,
      indent_level: 2
    });
  }).join('\n');
  src = addWith('locals || {}', src, [
    'tags',
    'React',
    'Array',
    'undefined'
  ]);
  var js = 'var fn = function (locals) {' +
    'var tags = [];' +
    src +
    'if (tags.length === 1 && !Array.isArray(tags[0])) { return tags.pop() };' +
    'tags.unshift("div", null);' +
    'return React.createElement.apply(React, tags);' +
    '}';

  // Check that the compiled JavaScript code is valid thus far.
  // uglify-js throws very cryptic errors when it fails to parse code.
  try {
    Function('', js);
  } catch (ex) {
    console.log(js);
    throw ex;
  }

  var ast = uglify.parse(js + ';\nfn.locals = ' + setLocals + ';', {
    filename: options.filename
  });
  js = ast.print_to_string({
    beautify: true,
    comments: true,
    indent_level: 2
  });
  return js + ';\nreturn fn;';
}
