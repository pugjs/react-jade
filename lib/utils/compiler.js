'use strict';

var fs = require('fs');
var constantinople = require('constantinople');
var ent = require('ent');
var uglify = require('uglify-js');
var React = require('react');

var joinClasses = Function('', 'return ' + fs.readFileSync(__dirname + '/jade-join-classes.js', 'utf8'))();
var fixStyle = Function('', 'return ' + fs.readFileSync(__dirname + '/jade-fix-style.js', 'utf8'))();

function isConstant(str) {
  return constantinople(str);
}
function toConstant(str) {
  return constantinople.toConstant(str);
}

module.exports = Compiler;
function Compiler(node) {
  this.node = node;
  this.mixins = {};
  this.dynamicMixins = false;
}

Compiler.prototype.compile = function(){
  this.buf = [];
  this.visit(this.node);

  if (!this.dynamicMixins) {
    // if there are no dynamic mixins we can remove any un-used mixins
    var mixinNames = Object.keys(this.mixins);
    for (var i = 0; i < mixinNames.length; i++) {
      var mixin = this.mixins[mixinNames[i]];
      if (!mixin.used) {
        for (var x = 0; x < mixin.instances.length; x++) {
          for (var y = mixin.instances[x].start; y < mixin.instances[x].end; y++) {
            this.buf[y] = '';
          }
        }
      }
    }
  }
  return this.buf.join('\n');
};
Compiler.prototype.visit = function(node){
  return this['visit' + node.type](node);
}
Compiler.prototype.visitBlock = function(block){
  for (var i = 0; i < block.nodes.length; i++) {
    this.visit(block.nodes[i]);
  }
}
Compiler.prototype.visitCode = function (code) {
  if (code.block && code.buffer) {
    throw new Error('Not Implemented');
  }
  if (code.buffer && !code.escape) {
    this.buf.push('tags.push(React.createElement("div", {dangerouslySetInnerHTML:{__html: ' + code.val + '}}))');
  } else if (code.buffer) {
    this.buf.push('tags.push(' + code.val + ')');
  } else {
    this.buf.push(code.val);
    if (code.block) {
      this.buf.push('{');
      this.visit(code.block);
      this.buf.push('}');
    }
  }
};
Compiler.prototype.visitComment = function (comment) {
  this.buf.push('\n//' + comment.val + '\n');
};
Compiler.prototype.visitBlockComment = function (comment) {
  this.buf.push('/*');
  this.buf.push(comment.val);
  this.visit(comment.block);
  this.buf.push('*/');
};
Compiler.prototype.visitEach = function (each) {
  this.buf.push(''
    + '// iterate ' + each.obj + '\n'
    + ';tags.push(function(){\n'
    + '  var tags = [];\n'
    + '  var $$obj = ' + each.obj + ';\n'
    + '  if (\'number\' == typeof $$obj.length) {\n');

  if (each.alternative) {
    this.buf.push('  if ($$obj.length) {');
  }

  this.buf.push('for (var ' + each.key + ' = 0, $$l = $$obj.length; ' + each.key + ' < $$l; ' + each.key + '++) {\n'
    + 'var ' + each.val + ' = $$obj[' + each.key + '];\n');

  this.visit(each.block);
  this.buf.push('}');

  if (each.alternative) {
    this.buf.push('  } else {');
    this.visit(each.alternative);
    this.buf.push('  }');
  }

  this.buf.push(''
    + '  } else {\n'
    + '    var $$l = 0;\n'
    + '    for (var ' + each.key + ' in $$obj) {\n'
    + '      $$l++;'
    + '      var ' + each.val + ' = $$obj[' + each.key + '];\n');

  this.visit(each.block);
  this.buf.push('}');

  if (each.alternative) {
    this.buf.push('if ($$l === 0) {');
    this.visit(each.alternative);
    this.buf.push('}');
  }

  this.buf.push('}');

  this.buf.push('return tags;');
  this.buf.push('}.call(this));');
};
Compiler.prototype.visitLiteral = function (literal) {
  if (/[<>&]/.test(literal.str)) {
    throw new Error('Not Implemented');
  } else if (literal.str.length !== 0) {
    this.buf.push('tags.push(' + JSON.stringify(literal.str) + ')');
  }
};
Compiler.prototype.visitMixinBlock = function(block){
    this.buf.push('block && (tags = tags.concat(block.call(this)));');
};


Compiler.prototype.visitMixin = function(mixin) {
    var name = 'jade_mixins[';
    var args = mixin.args || '';
    var block = mixin.block;
    var attrs = mixin.attrs;
    var attrsBlocks = mixin.attributeBlocks;
    var pp = this.pp;
    var dynamic = mixin.name[0]==='#';
    var key = mixin.name;
    if (dynamic) this.dynamicMixins = true;
    name += (dynamic ? mixin.name.substr(2,mixin.name.length-3):'"'+mixin.name+'"')+']';

    this.mixins[key] = this.mixins[key] || {used: false, instances: []};
    if (mixin.call) {
      this.mixins[key].used = true;
      //if (pp) this.buf.push("jade_indent.push('" + Array(this.indents + 1).join('  ') + "');")
      if (block || attrs.length || attrsBlocks.length) {

        this.buf.push('tags = tags.concat(' + name + '.call(this, {');

        if (block) {
          this.buf.push('block: function(){');
          this.buf.push('var tags = [];');
          // Render block with no indents, dynamically added when rendered
          this.visit(mixin.block);
          this.buf.push('return tags;');

          if (attrs.length || attrsBlocks.length) {
            this.buf.push('},');
          } else {
            this.buf.push('}');
          }
        }

        if (attrsBlocks.length) {
          if (attrs.length) {
            var val = this.attrs(attrs);
            attrsBlocks.unshift(val);
          }
          this.buf.push('attributes: jade.merge([' + attrsBlocks.join(',') + '])');
        } else if (attrs.length) {
          var val = this.attrs(attrs);
          this.buf.push('attributes: ' + val);
        }

        if (args) {
          this.buf.push('}, ' + args + '));');
        } else {
          this.buf.push('}));');
        }

      } else {
        this.buf.push('tags = tags.concat(' + name + '.call(this, {}');
        if (args) {
          this.buf.push(', ' + args + '));');
        } else {
          this.buf.push('));');
        }
      }
    } else {
      var mixin_start = this.buf.length;
      args = args ? args.split(',') : [];
      var rest;
      if (args.length && /^\.\.\./.test(args[args.length - 1].trim())) {
        rest = args.pop().trim().replace(/^\.\.\./, '');
      }
      this.buf.push(name + ' = function(jade_mixin_options');
      if (args.length) this.buf.push(',' + args.join(','));
      this.buf.push('){');
      this.buf.push('var block = (jade_mixin_options && jade_mixin_options.block), attributes = (jade_mixin_options && jade_mixin_options.attributes) || {};');
      if (rest) {
        this.buf.push('var ' + rest + ' = [];');
        this.buf.push('for (jade_interp = ' + (args.length + 1) + '; jade_interp < arguments.length; jade_interp++) {');
        this.buf.push('  ' + rest + '.push(arguments[jade_interp]);');
        this.buf.push('}');
      }
      this.buf.push('var tags = [];');
      this.visit(block);
      this.buf.push('return tags;');
      this.buf.push('};');
      var mixin_end = this.buf.length;
      this.mixins[key].instances.push({start: mixin_start, end: mixin_end});
    }
};

Compiler.prototype.visitTag = function (tag) {
  var name = tag.name;
  if (/^[a-z]/.test(tag.name) && !tag.buffer) {
    name = '"' + name + '"';
  }
  this.buf.push('tags.push(React.createElement.apply(React, ['+name);


  if (tag.name === 'textarea' && tag.code && tag.code.buffer && tag.code.escape) {
    tag.attrs.push({
      name: 'value',
      val: tag.code.val
    });
    tag.code = null;
  }

  this.buf.push(',' + getAttributes(tag.attrs) + ']');
  if (tag.code || (tag.block && tag.block.nodes.length)) {
    this.buf.push('.concat(function () { var tags = [];');
    if (tag.code) this.visitCode(tag.code);
    this.visit(tag.block);
    this.buf.push('return tags;}.call(this))');
  }
  this.buf.push('))');
};
Compiler.prototype.visitText = function (text) {
  if (/[<>&]/.test(text.val.replace(/&((#\d+)|#[xX]([A-Fa-f0-9]+)|([^;\W]+));?/g, ''))) {
    throw new Error('Plain Text cannot contain "<" or ">" or "&" in react-jade');
  } else if (text.val.length !== 0) {
    text.val = ent.decode(text.val);
    this.buf.push('tags.push(' + JSON.stringify(text.val) + ')');
  }
};

function getAttributes(attrs){
  var buf = [];
  var classes = [];

  attrs.forEach(function(attr){
    var key = attr.name;
    if (key === 'for') key = 'htmlFor';
    if (key === 'maxlength') key = 'maxLength';
    if (key.substr(0, 2) === 'on') {
      var ast = uglify.parse('jade_interp = (' + attr.val + ')');
      var val = ast.body[0].body.right;
      if (val.TYPE === 'Call') {
        if (val.expression.TYPE !== 'Dot' && val.expression.TYPE !== 'Sub') {
          val.expression = new uglify.AST_Dot({
            expression: val.expression,
            property: 'bind'
          });
          val.args.unshift(new uglify.AST_Null({}));
          attr.val = val.print_to_string();
        } else if ((val.expression.TYPE === 'Dot' && val.expression.property !== 'bind') ||
                   val.expression.TYPE == 'Sub')  {
          var obj = val.expression.expression;
          val.expression.expression = new uglify.AST_SymbolRef({name: 'jade_interp'});
          val.expression = new uglify.AST_Dot({
            expression: val.expression,
            property: 'bind'
          });
          val.args.unshift(new uglify.AST_SymbolRef({name: 'jade_interp'}));
          val = new uglify.AST_Seq({
            car: new uglify.AST_Assign({
              operator: '=',
              left: new uglify.AST_SymbolRef({name: 'jade_interp'}),
              right: obj
            }),
            cdr: val
          });
          attr.val = '(' + val.print_to_string() + ')';
        }
      }
    }
    if (/Link$/.test(key)) {
      // transform: valueLink = this.state.name
      // into:      valueLink = {value: this.state.name,requestChange:function(v){ this.setState({name:v})}.bind(this)}
      var ast = uglify.parse('jade_interp = (' + attr.val + ')');
      var val = ast.body[0].body.right;
      if (val.TYPE === 'Dot' && val.expression.TYPE === 'Dot' &&
          val.expression.expression.TYPE === 'This' && val.expression.property === 'state') {
        attr.val = '{value:this.state.' + val.property + ',' +
          'requestChange:function(v){this.setState({' + val.property + ':v})}.bind(this)}';
      }
    }
    if (key === 'class') {
      classes.push(attr.val);
    } else if (key === 'style') {
      if (isConstant(attr.val)) {
        var val = toConstant(attr.val);
        buf.push(JSON.stringify(key) + ': ' + JSON.stringify(fixStyle(val)));
      } else {
        buf.push(JSON.stringify(key) + ': jade_fix_style(' + attr.val + ')');
      }
    } else if (isConstant(attr.val)) {
      var val = toConstant(attr.val);
      buf.push(JSON.stringify(key) + ': ' + JSON.stringify(val));
    } else {
      buf.push(JSON.stringify(key) + ': ' + attr.val);
    }
  });
  if (classes.length) {
    if (classes.every(isConstant)) {
      classes = JSON.stringify(joinClasses(classes.map(toConstant)));
    } else {
      classes = 'jade_join_classes([' + classes.join(',') + '])';
    }
    if (classes.length)
      buf.push('"className": ' + classes);
  }
  return '{' + buf.join(',') + '}';
}
