'use strict';

var acorn = require('acorn');
var walk = require('acorn/util/walk');

module.exports = transform;
function transform(src, walker) {
  try {
    var ast = acorn.parse(src, {ecmaVersion: 6});
  } catch (ex) {
    if (typeof ex.loc === 'object' && typeof ex.loc.line === 'number' && typeof ex.loc.column === 'number') {
      var lines = src.split(/\n/g);

      ex.message += '\n\n  | ' + (lines[ex.loc.line - 2] || '') +
        '\n> | ' + (lines[ex.loc.line - 1] || '') +
        '\n  | ' + (lines[ex.loc.line] || '');
    }
    throw ex;
  }
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
