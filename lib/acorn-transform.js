'use strict';

var acorn = require('acorn');
var walk = require('acorn/util/walk');

module.exports = transform;
function transform(src, walker) {
  var ast = acorn.parse(src, {ecmaVersion: 6});
  src = src.split('');

  function getSource(node) {
    return src.slice(node.start, node.end).join('');
  }
  function setSource(node, str) {
    for (var i = node.start; i < node.end; i++) {
      src[i] = '';
    }
    src[node.start] = str;
  }
  module.exports.getSource = getSource;
  module.exports.setSource = setSource;

  walk.ancestor(ast, walker);

  return src.join('');
}

module.exports.stringify = function(str) {
  return JSON.stringify(str)
             .replace(/\u2028/g, '\\u2028')
             .replace(/\u2029/g, '\\u2029');
};
