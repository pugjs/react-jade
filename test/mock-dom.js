'use strict';

var React = require('react');

var tags = Object.keys(React.DOM);
var originalValues = tags.map(function (tag) { return React.DOM[tag]; });
var originalCreateElement = React.createElement;

exports.mock = mock;
function mock() {
  for (var i = 0; i < tags.length; i++) {
    React.DOM[tags[i]] = mockFor(tags[i]);
  }
  React.createElement = function() {
    var args = Array.prototype.slice.call(arguments, 0);
    var tag = args.shift();
    return mockFor(tag).apply(null, args);
  }
  function mockFor(name) {
    return function (attribs) {
      var children = Array.prototype.slice.call(arguments, 1);
      var sortedAttribs = {};
      if (attribs) {
        if ('class' in attribs) throw new Error('Cannot have an attribute named "class", perhaps you meant "className"');
        if ('className' in attribs) {
          attribs['class'] = attribs.className;
          delete attribs.className;
        }
        if (attribs['class'] === '') delete attribs['class'];
        if (attribs['style']) {
          if (typeof attribs['style'] !== 'object') {
            throw new Error('Cannot have anything other than an object as the "style"');
          }
          attribs['style'] = Object.keys(attribs.style).sort().map(function (key) {
            return key + ':' + attribs['style'][key];
          }).join(';');
        }
        Object.keys(attribs).sort().forEach(function (key) {
          if (attribs[key] === true) {
            sortedAttribs[key] = key;
          } else if (attribs[key] === false || attribs[key] === null || attribs[key] === undefined) {
          } else {
            sortedAttribs[key] = attribs[key] + '';
          }
        });
      }
      return {
        type: 'tag',
        name: name,
        attribs: sortedAttribs,
        children: Array.isArray(children) ? children : (children ? [children] : [])
      };
    }
  }
}

exports.reset = reset;
function reset() {
  for (var i = 0; i < tags.length; i++) {
    React.DOM[tags[i]] = originalValues[i];
  }
  React.createElement = originalCreateElement;
}
