"use strict";

var uglify = require('uglify-js');

module.exports = Compressor;
function Compressor(options) {
    if (!(this instanceof Compressor)) return new Compressor(options);
    uglify.TreeTransformer.call(this, this.before, this.after);
};

Compressor.prototype = Object.create(uglify.TreeTransformer.prototype);

Compressor.prototype.after = function(node) {
  if (isSelfCallingFunction(node) && node.args.length === 0 &&
      node.expression.body.length > 0 && node.expression.body[0].TYPE === 'Return') {
    return node.expression.body[0].value;
  }
  if (node.TYPE === 'Function') {
    var returnStatement = getReturnStatement(node);
    if (returnStatement) {
      node.body = [returnStatement];
      return node;
    }
  }
};

function isSelfCallingFunction(node) {
  return node.TYPE === 'Call' && node.expression.TYPE === 'Function' &&
    node.args.length === node.expression.argnames.length;
}
// SimpleStatement .body Call .expression Dot [property="Call"] .expresion SymbolRef [name="$name"]
function isArrayPush(node, name) {
  return node.TYPE === 'SimpleStatement' && node.body.TYPE === 'Call' &&
    node.body.expression.TYPE === 'Dot' && node.body.expression.property === 'push' &&
    node.body.expression.expression.TYPE === 'SymbolRef' && ( node.body.expression.expression.name === name || !name);
}

function getReturnStatement(node) {
  var nodes = node.body;
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
