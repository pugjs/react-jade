'use strict';

var assert = require('assert');
var React = require('react');
var jade = require('react-jade');

var test = /^\<div id\=\"container\".*\>Some Text\<\/div\>$/;

var templateA = jade`
#container Some Text
`;
assert(test.test(React.renderComponentToString(templateA())));

var templateB = jade.compile('#container Some Text');
assert(test.test(React.renderComponentToString(templateB())));
