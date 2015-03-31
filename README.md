# react-jade

Compile Jade to React JavaScript

[![Build Status](https://img.shields.io/travis/jadejs/react-jade/master.svg)](https://travis-ci.org/jadejs/react-jade)
[![Dependency Status](https://img.shields.io/gemnasium/jadejs/react-jade.svg)](https://gemnasium.com/jadejs/react-jade)
[![NPM version](https://img.shields.io/npm/v/react-jade.svg)](https://www.npmjs.org/package/react-jade)

## Installation

    npm install react-jade

## Usage

### With Browserify

If you are using browserify, just write a file that looks like the following, then use `react-jade` as a transform.  It will then inline the result of calling `jade.compileFile` automatically.

```js
var React = require('react');
var jade = require('react-jade');

var template = jade.compileFile(__dirname + '/template.jade');

React.render(template({local: 'values'}), document.getElementById('container'));
```

```
browserify index.js --transform react-jade > bundle.js
```

### Without Browserify

If you are not using browserify, you could manually compile the jade to some client file.  e.g.

```js
var fs = require('fs');
var jade = require('react-jade');

fs.writeFileSync(__dirname + '/template.js', 'var template = ' + jade.compileFileClient(__dirname + '/template.jade'));
```

Then on your html page:

```html
<div id="container"></div>
<script src="http://fb.me/react-0.12.2.js"></script>
<script src="template.js"></script>
<script>
  React.render(template({local: 'values'}), document.getElementById('container'));
</script>
```

### Server Side

You can also use react-jade to render templates on the server side via `React.renderToString`.  This is especially useful for building isomorphic applications (i.e. applications that run the same on the server side and client side).

```js
var fs = require('fs');
var React = require('react');
var jade = require('react-jade');

var template = jade.compileFile(__dirname + '/template.jade');

var html = React.renderToString(template({local: 'values'}));
fs.writeFileSync(__dirname + '/template.html', html);
```

### ES6

If you are using ES6 server side, or the browserify transform client side (even without any other ES6 support), you can use Tagged Literals to embed your jade code directly within your JavaScript components:

```js
var TodoList = React.createClass({
  render: jade`
ul
  - each item in this.props.items
    li= item
`
});
var TodoApp = React.createClass({
  getInitialState: function() {
    return {items: [], text: ''};
  },
  onChange: function(e) {
    this.setState({text: e.target.value});
  },
  handleSubmit: function(e) {
    e.preventDefault();
    var nextItems = this.state.items.concat([this.state.text]);
    var nextText = '';
    this.setState({items: nextItems, text: nextText});
  },
  render: jade`
h3 TODO
TodoList(items=this.state.items)
form(onSubmit=this.handleSubmit)
  input(onChange=this.onChange value=this.state.text)
  button= 'Add #' + (this.state.items.length + 1)
`.locals({TodoList: TodoList})
});
React.render(TodoApp(), mountNode);
```

## API

```js
var jade = require('react-jade');
```

### jade(options) / jade(file)

Acts as a browseify transform to inline calls to `jade.compileFile`.  The source code looks something like:

```js
function browserify(options) {
  function transform(file) {
    return new TransformStream(); //stream to do the transform implemented here
  }
  if (typeof options === 'string') {
    var file = options;
    options = arguments[2] || {};
    return transform(file);
  } else {
    return transform;
  }
}
```

### jade.compileFile(filename, options) => fn

Compile a jade file into a function that takes locals and returns a React DOM node.

### jade.compileFileClient(filename, options)

Compile a jade file into the source code for a function that takes locals and returns a React DOM node.  The result requires either a global 'React' variable, or the ability to require 'React' as a CommonJS module.

### jade.compile(jadeString, options) => fn

Same as `jade.compileFile` except you pass an inline jade string instead of a filename. You should set `options.filename` manually.

### jade.compileClient(jadeString, options)

Same as `jade.compileFileClient` except you pass an inline jade string instead of a filename. You should set `options.filename` manually.

### template.locals(locals)

You can set default `locals` values via the `template.locals` api.  e.g.

```js
var React = require('react');
var jade = require('react-jade');

var template = jade.compileFile(__dirname + '/template.jade').locals({title: 'React Jade'});

React.render(template({local: 'values'}), document.getElementById('container'));
```

## Differences from jade

React Jade has a few bonus features, that are not part of Jade.

### Automatic partial application of `on` functions

In react, you add event listeners by setting attributes, e.g. `onClick`.  For example:

```jade
button(onClick=clicked) Click Me!
```
```js
var fn = jade.compileFile('template.jade');
React.render(fn({clicked: function () { alert('clicked'); }), container);
```

Often, you may want to partially apply a function, e.g.

```jade
input(value=view.text onChange=view.setProperty.bind(view, 'text'))
```
```js
function View() {
}
View.prototype.setProperty = function (name, e) {
  this[name] = e.target.value;
  render();
};
var view = new View();
function render() {
  React.renderComponent(fn({view: view}), container);
}
```

Because you so often want that `.bind` syntax, and it gets pretty long and cumbersome to write, react-jade lets you omit it:

```jade
input(value=view.text onChange=view.setProperty('text'))
```

This is then automatically re-written to do the `.bind` for you.

### Style

In keeping with React, the style attribute should be an object, not a string.  e.g.

```jade
div(style={background: 'blue'})
```

### valueLink

The `valueLink` property supports two way binding to `this.state.name` by default.  e.g.

```jade
input(valueLink=this.state.name)
```

is eqivalent to:

```jade
input(valueLink={value: this.state.name,requestChange:function(v){ this.setState({name:v})}.bind(this)})
```

This makes building simple forms where each input should use a property of the state very easy.

### Unsupported Features

Although a lot of jade just works, there are still some features that have yet to be implemented. Here is a list of known missing features, in order of priority for adding them. Pull requests welcome:

 - mixins
 - attribute extension/merging (via `&attributes`)
 - case/when
 - using each to iterate over keys of an object (rather than over items in an array)
 - interpolation
 - attribute interpollation
 - special handling of data-attributes
 - outputting unescaped html results in an extra wrapper div and doesn't work for attributes

## License

  MIT
