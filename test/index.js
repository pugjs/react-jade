'use strict';

var fs = require('fs');
var assert = require('assert');
var test = require('testit');
var rimraf = require('rimraf').sync;
var htmlparser = require('htmlparser2');
var mockDom = require('./mock-dom.js');
var jade = require('../');

var outputDir = __dirname + '/output';
var inputDir = __dirname + '/jade/test/cases';

rimraf(outputDir);
fs.mkdirSync(outputDir);
try {
  fs.statSync(inputDir);
} catch (ex) {
  throw new Error('You must first download jade before you can run tests. This is done automatically if you use "npm test" to run tests.');
}

fs.readdirSync(inputDir).filter(function (name) {
  return /\.jade$/.test(name) &&
    !/doctype/.test(name) &&
    !/mixin/.test(name) &&
    !/filter/.test(name) &&
    !/case/.test(name) &&
    'xml.jade' !== name &&
    'tag.interpolation.jade' !== name &&
    'scripts.non-js.jade' !== name &&
    'namespaces.jade' !== name &&
    'html.jade' !== name &&
    'html5.jade' !== name &&
    'escape-test.jade' !== name &&
    'attrs.unescaped.jade' !== name &&
    'regression.784.jade' !== name &&
    'tags.self-closing.jade' !== name &&
    'interpolation.escape.jade' !== name &&
    'include.yield.nested.jade' !== name &&
    'escaping-class-attribute.jade' !== name &&
    'each.else.jade' !== name &&
    'includes.jade' !== name &&
    'code.iteration.jade' !== name &&
    'code.escape.jade' !== name &&
    'blockquote.jade' !== name &&
    'attrs.js.jade' !== name &&
    'attrs.jade' !== name &&
    'attrs.interpolation.jade' !== name &&
    'attrs-data.jade' !== name;
}).forEach(function (name) {
  name = name.replace(/\.jade$/, '');
  test(name, function () {
    var src = fs.readFileSync(inputDir + '/' + name + '.jade', 'utf8');
    var expected = htmlparser.parseDOM(fs.readFileSync(inputDir + '/' + name + '.html', 'utf8'));
    fs.writeFileSync(outputDir + '/' + name + '.jade', src);
    var js = jade.compileFileClient(inputDir + '/' + name + '.jade', {
      outputFile: outputDir + '/' + name + '.js',
      basedir: inputDir
    });
    fs.writeFileSync(outputDir + '/' + name + '.js', js);
    mockDom.mock();
    var fn = jade.compileFile(inputDir + '/' + name + '.jade', {
      outputFile: outputDir + '/' + name + '.js',
      basedir: inputDir
    });
    var actual = fn({title: 'Jade'}).children;
    mockDom.reset();

    if (domToString(expected) !== domToString(actual)) {
      fs.writeFileSync(outputDir + '/' + name + '.expected.dom', domToString(expected) + '\n');
      fs.writeFileSync(outputDir + '/' + name + '.actual.dom', domToString(actual) + '\n');
      assert(domToString(expected) === domToString(actual), 'Expected output dom to match expected dom (see /test/output/' + name + '.actual.dom and /test/output/' + name + '.expected.dom for details.');
    }
  });
});

function domToString(dom, indent) {
  if (Array.isArray(dom)) {
    return joinStrings(dom).map(function (child) {
      return domToString(child, indent);
    }).join('\n');
  }
  indent = indent || '';
  if (dom.type === 'script' || dom.type === 'style' || dom.type === 'tag' && (dom.name === 'script' || dom.name === 'style')) {
    return indent + dom.name + ' ' + JSON.stringify(dom.attribs);
  } else if (dom.type === 'tag') {
    return indent + dom.name + ' ' + JSON.stringify(dom.attribs) + joinStrings(dom.children).map(function (child) {
      return '\n' + domToString(child, indent + '  ');
    }).join('');
  } else if (typeof dom === 'string') {
    return indent + JSON.stringify(dom + '');
  }
  return indent + '[' + dom.type + ']';
}
function joinStrings(elements) {
  var result = [];
  for (var i = 0; i < elements.length; i++) {
    var el = elements[i];
    if (el === null || el === undefined) el = '';
    if (el.type === 'text') {
      el = el.data;
    }
    if (typeof el !== 'function' && typeof el !== 'object') {
      el = (el + '').replace(/\s+/g, '');
    }
    if (el.type === 'comment' || (typeof el === 'string' && el === '')) {
      // ignore
    } else if (typeof el === 'string' && typeof result[result.length - 1] === 'string') {
      result[result.length - 1] = (result[result.length - 1] + el).replace(/\s+/g, '');
    } else {
      result.push(el);
    }
  }
  return result;
}
