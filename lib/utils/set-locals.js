function setLocals(locals) {
  var render = this;
  function newRender(additionalLocals) {
    var newLocals = {};
    for (var key in locals) {
      newLocals[key] = locals[key];
    }
    if (additionalLocals) {
      for (var key in additionalLocals) {
        newLocals[key] = additionalLocals[key];
      }
    }
    return render.call(this, newLocals);
  }
  newRender.locals = setLocals;
  return newRender;
}
