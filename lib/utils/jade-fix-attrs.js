function jade_fix_attrs(attrs) {
  attrs = attrs || {};
  if ('for' in attrs) {
    attrs.htmlFor = attrs['for'];
    delete attrs['for'];
  }
  if ('maxlength' in attrs) {
    attrs.maxLength = attrs['maxlength'];
    delete attrs['maxlength'];
  }
  if ('class' in attrs) {
    attrs.className = attrs['class'];
    delete attrs['class'];
  }
  return attrs;
}
