module.exports = {
  extends: ['4catalyzer', '4catalyzer-typescript', 'prettier'],
  plugins: ['prettier'],
  env: {
    node: true,
  },
  rules: {
    'prettier/prettier': 'error',
  },
};
