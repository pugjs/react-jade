'use strict';

var Transform = require('stream').Transform;
var staticModule = require('static-module');
var resolve = require('resolve');
var path = require('path');
var isTemplateLiteral = require('./utils/is-template-literal.js');
var acornTransform = require('./utils/acorn-transform.js');
var compileClient = require('./compile-client.js');
var compileFileClient = require('./compile-file-client.js');

module.exports = browserify;
function browserify(options, extra) {
  if (typeof options === 'string') {
    var filename = options;
    options = extra || {};
    return makeStream(function (source) {
      return transform(filename, source, options);
    });
  } else {
    options = options || {};
    return function (filename, extra) {
      extra = extra || {};
      Object.keys(options).forEach(function (key) {
        if (typeof extra[key] === 'undefined') {
          extra[key] = options[key];
        }
      });
      return makeStream(function (source) {
        return transform(filename, source, options);
      });
    };
  }
}

function makeStream(fn) {
  var src = '';
  var stream = new Transform();
  stream._transform = function (chunk, encoding, callback) {
    src += chunk;
    callback();
  };
  stream._flush = function (callback) {
    var res = fn(src);
    res.on('data', this.push.bind(this));
    res.on('error', callback);
    res.on('end', callback.bind(null, null));
  };
  return stream;
}

function makeClientRequire(filename) {
  function cr(path) {
    return require(cr.resolve(path));
  }
  cr.resolve = function (path) {
    return resolve.sync(path, {
      basedir: path.dirname(filename)
    });
  };
  return cr;
}

function makeStaticImplementation(filename, options) {
  function staticImplementation(templateLiteral) {
    if (isTemplateLiteral(templateLiteral)) {
      return staticCompileImplementation(templateLiteral.raw[0]);
    } else {
      return 'throw new Error("Invalid client side argument to react-jade");';
    }
  }
  function staticCompileImplementation(jadeSrc, localOptions) {
    localOptions = localOptions || {};
    for (var key in options) {
      if ((key in options) && !(key in localOptions))
      localOptions[key] = options[key];
    }
    localOptions.filename = localOptions.filename || filename;
    localOptions.outputFile = filename;
    return compileClient(jadeSrc, localOptions);
  }
  function staticCompileFileImplementation(jadeFile, localOptions) {
    localOptions = localOptions || {};
    for (var key in options) {
      if ((key in options) && !(key in localOptions))
      localOptions[key] = options[key];
    }
    localOptions.outputFile = filename;
    return compileFileClient(jadeFile, localOptions);
  }
  staticImplementation.compile = staticCompileImplementation;
  staticImplementation.compileFile = staticCompileFileImplementation;
  return staticImplementation;
}

// compile filename and return a readable stream
function transform(filename, source, options) {
  source = acornTransform(source, {
    TaggedTemplateExpression: function (node) {
      var quasi = '(function () {' +
          'var quasi = ' + acornTransform.stringify(node.quasi.quasis.map(function (q) {
            return q.value.cooked;
          })) + ';' +
          'quasi.raw = ' + acornTransform.stringify(node.quasi.quasis.map(function (q) {
            return q.value.raw;
          })) + ';' +
          'return quasi;}())';

      var expressions = node.quasi.expressions.map(acornTransform.getSource);
      acornTransform.setSource(node, acornTransform.getSource(node.tag) + '(' +
                               [quasi].concat(expressions).join(', ') + ')');
    }
  });
  var makeStatic = staticModule({ 'react-jade': makeStaticImplementation(filename, options) }, {
    vars: {
      __dirname: path.dirname(filename),
      __filename: path.resolve(filename),
      path: path,
      require: makeClientRequire(filename)
    }
  });
  makeStatic.end(source);
  return makeStatic;
}
