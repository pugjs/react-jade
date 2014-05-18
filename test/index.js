'use strict';

var fs = require('fs');
var test = require('testit');
var rimraf = require('rimraf').sync;
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
    'xml.jade' !== name &&
    'tag.interpolation.jade' !== name &&
    'scripts.non-js.jade' !== name &&
    'namespaces.jade' !== name &&
    'html.jade' !== name &&
    'html5.jade' !== name &&
    'escape-test.jade' !== name &&
    'attrs.unescaped.jade' !== name;
}).forEach(function (name) {
  name = name.replace(/\.jade$/, '');
  test(name, function () {
    var src = fs.readFileSync(inputDir + '/' + name + '.jade', 'utf8');
    fs.writeFileSync(outputDir + '/' + name + '.jade', src);
    var js = jade.compileFileClient(inputDir + '/' + name + '.jade', {
      outputFile: outputDir + '/' + name + '.js',
      basedir: inputDir
    });
    fs.writeFileSync(outputDir + '/' + name + '.js', js);
  });
});
