'use strict';

var Transform = require('stream').Transform;
var PassThrough = require('stream').PassThrough;
var staticModule = require('static-module');
var resolve = require('resolve');
var path = require('path');
var stringify = require('js-stringify');
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
    try {
      var res = fn(src);
      res.on('data', this.push.bind(this));
      res.on('error', callback);
      res.on('end', callback.bind(null, null));
    } catch (err) {
      callback(err);
    }
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
      return '(function () { throw new Error("Invalid client side argument to react-jade"); }())';
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
  function templateToJs(template) {
    return '(function () {' +
          'var quasi = ' + stringify(template.slice(0)) + ';' +
          'quasi.raw = ' + stringify(template.raw.slice(0)) + ';' +
          'return quasi;}())';
  }

  if (/\.json$/.test(filename)) {
    var stream = new PassThrough();
    stream.end(source);
    return stream;
  }

  source = acornTransform(source, {
    TaggedTemplateExpression: function (node) {
      var cooked = node.quasi.quasis.map(function (q) {
        return q.value.cooked;
      });
      cooked.raw = node.quasi.quasis.map(function (q) {
        return q.value.raw;
      });
      var quasi = templateToJs(cooked);

      var expressions = node.quasi.expressions.map(acornTransform.getSource);

      acornTransform.setSource(node, acornTransform.getSource(node.tag) + '(' +
                               [quasi].concat(expressions).join(', ') + ')');
    }
  });
  // var $__0 = Object.freeze(Object.defineProperties(["\ndiv\n  h1 Page not found"], {raw: {value: Object.freeze(["\ndiv\n  h1 Page not found"])}}));
  // var notFound =  jade($__0);
  function isObjectDot(node, property) {
    return node.type === 'CallExpression' && node.callee.type === 'MemberExpression'  &&
      node.callee.object.type === 'Identifier' && node.callee.object.name === 'Object' &&
      node.callee.computed === false && node.callee.property.type === 'Identifier' &&
      node.callee.property.name === property;
  }
  function isArrayOfStrings(node) {
    return node.type === 'ArrayExpression' && node.elements.every(function (el) {
      return el.type === 'Literal' && typeof el.value === 'string';
    });
  }
  function isKeyedObject(node, key) {
    return node.type === 'ObjectExpression' && node.properties.length === 1 &&
      node.properties[0].computed === false && node.properties[0].key.type === 'Identifier' &&
      node.properties[0].key.name === key;
  }
  function isTraceuredTemplateLiteral(node) {
    if (isObjectDot(node, 'freeze') && node.arguments.length === 1 && isObjectDot(node.arguments[0], 'defineProperties')) {
      var args = node.arguments[0].arguments;
      if (isArrayOfStrings(args[0]) && isKeyedObject(args[1], 'raw')) {
        var raw = args[1].properties[0].value;
        if (isKeyedObject(raw, 'value')) {
          raw = raw.properties[0].value;
          if (isObjectDot(raw, 'freeze') && raw.arguments.length === 1 && isArrayOfStrings(raw.arguments[0])) {
            return Function('', 'return ' + acornTransform.getSource(node))();
          }
        }
      }
    }
  }

  var literals = {};
  source = acornTransform(source, {
    VariableDeclaration: function (node) {
      node.declarations.forEach(function (declaration) {
        if (declaration.id.type === 'Identifier' && declaration.id.name[0] === '$' && declaration.init) {
          var value = isTraceuredTemplateLiteral(declaration.init);
          if (value) {
            literals[declaration.id.name] = value;
            acornTransform.setSource(declaration.init, 'undefined');
          }
        }
      });
    },
    Identifier: function (node) {
      if (node.name[0] === '$' && node.name in literals) {
        acornTransform.setSource(node, templateToJs(literals[node.name]));
      }
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
