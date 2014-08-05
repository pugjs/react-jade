var React = require('react')
  , jade = require('jade/lib/runtime.js')
  , method;

for(method in jade) exports[method] = jade[method];

exports.toReact = function (components, name, args) {
  return (components && React.isValidClass(components[name]))
      ? components[name].apply(components[name], args) 
      : (React.DOM[name]) ? React.DOM[name].apply(React.DOM, args) : React.DOM.div.apply(React.DOM, args)
};

exports.React = React;