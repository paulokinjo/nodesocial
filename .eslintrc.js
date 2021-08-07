const path = require('path');

module.exports = {
  root: true,
  parser: '@babel/eslint-parser',
  parserOptions: {
    sourceType: 'module',
    babelOptions: {
      configFile: path.join(__dirname, 'babel.config.json'),
    },
  },
};
