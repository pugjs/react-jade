var jade = require('./');
require.extensions['.jade'] = function(module, filename){
    module.exports = jade.compileFile(filename);
};
