module.exports = {
  root: true,
  env: {
    node: true
  },
  parser: 'vue-eslint-parser', // 🔹 vue dosyalarını doğru anlaması için şart
  parserOptions: {
    parser: '@typescript-eslint/parser', // 🔹 script içeriği için
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  extends: [
    'plugin:vue/vue3-essential',
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'vue/multi-word-component-names': 'off'
  }
}
