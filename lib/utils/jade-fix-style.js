function jade_fix_style(style) {
  return typeof style === "string" ? style.split(";").filter(function (str) {
    return str.split(":").length > 1;
  }).reduce(function (obj, style) {
    obj[style.split(":")[0]] = style.split(":").slice(1).join(":"); return obj;
  }, {}) : style;
}
