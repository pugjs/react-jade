# react-jade

Compile Jade to React JavaScript

[![Build Status](https://travis-ci.org/ForbesLindesay/react-jade.png?branch=master)](https://travis-ci.org/ForbesLindesay/react-jade)
[![Dependency Status](https://gemnasium.com/ForbesLindesay/react-jade.png)](https://gemnasium.com/ForbesLindesay/react-jade)
[![NPM version](https://badge.fury.io/js/react-jade.png)](http://badge.fury.io/js/react-jade)

## Installation

    npm install react-jade

## Usage

### With Browserify

If you are using browserify, just write a file that looks like the following, then use `react-jade` as a transform.  It will then inline the result of calling `jade.compileFile` automatically.

```js
var React = require('react');
var jade = require('jade-react');

var template = jade.compileFile(__dirname + '/template.jade');

React.renderComponent(template({local: 'values'}), document.getElementById('container'));
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
<script src="http://fb.me/react-0.10.0.js"></script>
<script src="template.js"></script>
<script>
  React.renderComponent(template({local: 'values'}), document.getElementById('container'));
</script>
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

## Unsupported Features

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