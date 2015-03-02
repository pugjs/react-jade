'use strict';

/**
 * This file is contains a customised UglifyJS compressor.  The advantage of having this is
 * that we can generate slow, ugly but correct code and simply run it through this to clean
 * it up.  It's far simpler to just use `array.push` to add elements, but often you know the
 * list of elements up front and it's better to just use them as an array.
 */
var uglify = require('uglify-js');

module.exports = Compressor;
function Compressor(options) {
  uglify.TreeTransformer.call(this, this.before, this.after);
};

Compressor.prototype = Object.create(uglify.TreeTransformer.prototype);

Compressor.prototype.after = function(node) {
  if (isVacuousFunction(node)) {
    var fn = node.expression.expression;
    if (fn.body.length > 0 && fn.body[0].TYPE === 'Return') {
      return fn.body[0].value;
    }
  }
  if (node.TYPE === 'Function') {
    var returnStatement = getReturnStatement(node);
    if (returnStatement) {
      node.body = [returnStatement];
      return node;
    }
  }
  if (isConcattedArray(node)) {
    node.expression.expression.elements = node.expression.expression.elements
      .concat(node.args[0].elements);
    return node.expression.expression;
  }

  if (isConstantApply(node)) {
    node.expression = node.expression.expression;
    node.args = node.args[1].elements;
  }
};

// [...].concat([...])
function isConcattedArray(node) {
  return node.TYPE === 'Call' && node.expression.TYPE === 'Dot' &&
    node.expression.property === 'concat' && node.expression.expression.TYPE === 'Array' &&
    node.args.length === 1 && node.args[0].TYPE === 'Array';
}

// function () { ... }.call(this)
function isVacuousFunction(node) {
  return node.TYPE === 'Call' && node.expression.TYPE === 'Dot' &&
    node.expression.property === 'call' && node.expression.expression.TYPE === 'Function' &&
    node.expression.expression.argnames.length == 0 && node.args.length === 1 &&
    node.args[0].TYPE === 'This';
}

// Foo.bar.apply(Foo, [...])
function isConstantApply(node) {
  return node.TYPE === 'Call' && node.expression.TYPE === 'Dot' &&
    node.expression.property === 'apply' && node.expression.expression.TYPE === 'Dot' &&
    node.expression.expression.expression.TYPE === 'SymbolRef' && node.args.length === 2 &&
    node.args[0].TYPE === 'SymbolRef' &&
    node.args[0].name === node.expression.expression.expression.name &&
    node.args[1].TYPE === 'Array';
}

// foo.push(...)
function isArrayPush(node, name) {
  return node.TYPE === 'SimpleStatement' && node.body.TYPE === 'Call' &&
    node.body.expression.TYPE === 'Dot' && node.body.expression.property === 'push' &&
    node.body.expression.expression.TYPE === 'SymbolRef' && node.body.expression.expression.name === name;
}

// for `function () { var arr = []; arr.push(...); arr.push(...); return arr;}` get `[..., ...]`
function getReturnStatement(node) {
  var nodes = node.body;
  if (nodes.length === 0) return new uglify.AST_Undefined({});
  if (nodes[0].TYPE === 'Var' && nodes[0].definitions.length === 1 && nodes[0].definitions[0].value.TYPE === 'Array') {
    var name = nodes[0].definitions[0].name.name;
    var array = nodes[0].definitions[0].value;
    var elements = array.elements;
    for (var i = 1; isArrayPush(nodes[i], name) && i < nodes.length; i++) {
      elements = elements.concat(nodes[i].body.args);
    }
    if (nodes[i].TYPE === 'Return' && nodes[i].value.TYPE === 'SymbolRef' && nodes[i].value.name === name) {
      array.elements = elements;
      nodes[i].value = array;
      return nodes[i];
    }
  }
}
