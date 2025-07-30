/* eslint-env node */
module.exports = {
  env: {
    node: true,
    es2022: true,
  },
  extends: [
    "eslint:recommended"
  ],
  rules: {
    "no-undef": "off", // pour éviter les fausses erreurs
  }
};
