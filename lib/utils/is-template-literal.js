'use strict';

module.exports = isTemplateLiteral;
function isTemplateLiteral(str) {
  return str && typeof str === 'object' &&
    str.raw && typeof str.raw === 'object' &&
    str.raw.length === 1 && typeof str.raw[0] === 'string';
}
