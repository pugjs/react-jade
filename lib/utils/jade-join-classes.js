function jade_join_classes(val) {
  return (Array.isArray(val) ? val.map(jade_join_classes) :
    (val && typeof val === "object") ? Object.keys(val).filter(function (key) { return val[key]; }) :
      [val]
  ).filter(function (val) { return val != null && val !== ""; }).join(" ");
}
