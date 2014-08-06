'use strict';

var fs = require('fs');
var assert = require('assert');
var test = require('testit');
var rimraf = require('rimraf').sync;
var htmlparser = require('htmlparser2');
var mockDom = require('./mock-dom.js');
var jade = require('../');
var react = require('react');

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
    'mixin.attrs.jade' !== name &&
    'mixin.merge.jade' !== name &&
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
    var actual = fn({title: 'Jade'});
    var hasDiv = expected.filter(function(element) { return element.type !== 'text' }).length !== 1;
    actual = hasDiv ? actual.children : actual; 
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

test('bonus-features/partial-application.jade', function () {
  var fn = jade.compileFile(__dirname + '/bonus-features/partial-application.jade');
  fs.writeFileSync(__dirname + '/output/partial-application.js', jade.compileFileClient(__dirname + '/bonus-features/partial-application.jade'));
  function click() {
    throw new Error('click should never actually get called');
  }
  var i = 0;
  var view = { click: click };
  click.bind = function (self, val) {
    if (i === 0) {
      assert(self === view);
      assert(arguments.length === 1);
    } else if (i === 1) {
      assert(self === null);
      assert(val === 'Click Me 0!');
    } else if (i === 2) {
      assert(self === view);
      assert(val === 'Click Me 1!');
    } else if (i === 3) {
      assert(self === view);
      assert(val === 'Click Me 2!');
    }
    i++;
    return click;
  };
  fn({ view: view });
  assert(i === 4);
});


test('bonus-features/react-component-tags.jade', function () {
  var template = jade.compileFile(__dirname + '/bonus-features/react-component-tags.jade');

  var Person = react.createClass({
    render: function(){
      return react.DOM.div({className: 'person'}, this.props.name);
    }
  });
  
  var components = {Person: Person};
  
  var rendered = template({ name: "Jack" }, function(name, args){
    if(name in components) return components[name].apply(null, args);
    else return react.DOM.div.apply(react.DOM, args);
  });
  
  assert(react.isValidComponent(rendered));
  
  var str = react.renderComponentToStaticMarkup(rendered);

  assert(str.match(/<div data-transform="div">/));
  assert(str.match(/<div class="person">Jack<\/div>/));
  
});