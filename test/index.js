'use strict';

var fs = require('fs');
var assert = require('assert');
var test = require('testit');
var rimraf = require('rimraf').sync;
var htmlparser = require('htmlparser2');
var unescapeHtml = require('unescape-html');
var mockDom = require('./mock-dom.js');
var jade = require('../');
var React = require('react');
var ReactDOM = require('react-dom/server')

var outputDir = __dirname + '/output';
var inputDir = __dirname + '/jade/test/cases';
var bonusDir = __dirname + '/bonus-features';

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
    'scripts.non-js.jade' !== name &&
    'html.jade' !== name &&
    'html5.jade' !== name &&
    'escape-test.jade' !== name &&
    'attrs.unescaped.jade' !== name &&
    'regression.784.jade' !== name &&
    'tags.self-closing.jade' !== name &&
    'interpolation.escape.jade' !== name &&
    'each.else.jade' !== name &&
    'includes.jade' !== name &&
    'code.iteration.jade' !== name &&
    'code.escape.jade' !== name &&
    'blockquote.jade' !== name &&
    'attrs-data.jade' !== name &&
    'blocks-in-blocks.jade' !== name &&
    'blocks-in-if.jade' !== name;
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
  if (dom.attribs) {
    var sortedAttribs = {};
    Object.keys(dom.attribs).sort().forEach(function (key) {
      sortedAttribs[key] = unescapeHtml(dom.attribs[key]);
    });
    dom.attribs = sortedAttribs;
  }
  if (dom.attribs && dom.attribs.style) {
    dom.attribs.style = dom.attribs.style.split(';').sort().join(';');
  }
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

fs.readdirSync(bonusDir).filter(function (name) {
  return  /\.jade$/.test(name) &&
          /component-this/.test(name)
}).forEach(function(name) {
  name = name.replace(/\.jade$/, '');
  test(name, function () {
    var fn = jade.compileFile(bonusDir + '/' + name + '.jade');
    var c = React.createClass({ render: fn });
    var html = ReactDOM.renderToStaticMarkup(React.createElement(c, { title: 'Jade', list: ['a', 'b', 'c']}));

    var actual = htmlparser.parseDOM(html);
    var expected = htmlparser.parseDOM(fs.readFileSync(bonusDir + '/' + name + '.html', 'utf8'));
    if (domToString(expected) !== domToString(actual)) {
      fs.writeFileSync(outputDir + '/' + name + '.expected.dom', domToString(expected) + '\n');
      fs.writeFileSync(outputDir + '/' + name + '.actual.dom', domToString(actual) + '\n');
      assert(domToString(expected) === domToString(actual), 'Expected output dom to match expected dom (see /test/output/' + name + '.actual.dom and /test/output/' + name + '.expected.dom for details.');
    }
  });
});

test('bonus-features/component-composition.jade', function () {

  var name = 'component-composition';

  var render1 = jade.compileFile(bonusDir + '/' + 'component-subcomponent' + '.jade');
  var SubComponent= React.createClass({ render: render1 });

  var render2 = jade.compileFile(bonusDir + '/' + name + '.jade').locals({SubComponent: SubComponent});
  var c = React.createClass({
    render: render2
  });

  var html = ReactDOM.renderToStaticMarkup(React.createElement(c, { title: 'Jade', items: [ 'a', 'b', 'c' ]}));

  var actual = htmlparser.parseDOM(html);
  var expected = htmlparser.parseDOM(fs.readFileSync(bonusDir + '/' + name + '.html', 'utf8'));
  if (domToString(expected) !== domToString(actual)) {
     fs.writeFileSync(outputDir + '/' + name + '.expected.dom', domToString(expected) + '\n');
     fs.writeFileSync(outputDir + '/' + name + '.actual.dom', domToString(actual) + '\n');
     assert(domToString(expected) === domToString(actual), 'Expected output dom to match expected dom (see /test/output/' + name + '.actual.dom and /test/output/' + name + '.expected.dom for details.');
  }
});

test('bonus-features/browserify', function (done) {
  fs.createReadStream(require.resolve('./test-client.js'))
    .pipe(jade(require.resolve('./test-client.js')))
    .pipe(fs.createWriteStream(__dirname + '/output/test-client.js'))
    .on('close', function () {
      require('./output/test-client.js');
      done();
    });
});
test('bonus-features/browserify after es6ify', function (done) {
  fs.createReadStream(require.resolve('./test-client.js'))
    .pipe(require('es6ify')(require.resolve('./test-client.js')))
    .pipe(jade(require.resolve('./test-client.js')))
    .pipe(fs.createWriteStream(__dirname + '/output/test-client-es6ify.js'))
    .on('close', function () {
      require('./output/test-client-es6ify.js');
      done();
    });
});


test('bonus-features/browserify - error reporting', function (done) {
  fs.createReadStream(require.resolve('./test-client-syntax-error.js'))
    .pipe(jade(require.resolve('./test-client.js')))
    .on('error', function (err) {
      assert(/var templateA \= jade\`/.test(err.message));
      return done();
    }).resume();
});

test('bonus-features/browserify - pass through JSON', function (done) {
  fs.createReadStream(require.resolve('../package.json'))
    .pipe(jade(require.resolve('../package.json')))
    .pipe(fs.createWriteStream(__dirname + '/output/test-client-pass-through.json'))
    .on('close', function () {
      require('./output/test-client-pass-through');
      done();
    });
});
