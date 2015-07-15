function jade_object_merge(args) {
  var a = args[0], b = args[1];
  if (b === undefined) return a;
  for (var key in b) {
    if (Array.isArray(a[key])) {
      a[key] = a[key].concat(b[key]);
    } else if (typeof a[key] === "object" && typeof b[key] === "object") {
      a[key] = jade_object_merge([a[key], b[key]]);
    } else {
      a[key] = b[key];
    }
  }
  return jade_object_merge([a].concat(args.slice(2)));
}