---
id: eslint-plugin-router
title: ESLint Plugin Router
---

TanStack Router comes with its own ESLint plugin. This plugin is used to enforce best practices and to help you avoid common mistakes.

## Installation

The plugin is a separate package that you need to install:

```sh
npm install -D @tanstack/eslint-plugin-router
```

or

```sh
pnpm add -D @tanstack/eslint-plugin-router
```

or

```sh
yarn add -D @tanstack/eslint-plugin-router
```

or

```sh
bun add -D @tanstack/eslint-plugin-router
```

## Flat Config (`eslint.config.js`)

### Recommended Flat Config setup

To enable all of the recommended rules for our plugin, add the following config:

```js
import pluginRouter from '@tanstack/eslint-plugin-router'

export default [
  ...pluginRouter.configs['flat/recommended'],
  // Any other config...
]
```

### Custom Flat Config setup

Alternatively, you can load the plugin and configure only the rules you want to use:

```js
import pluginRouter from '@tanstack/eslint-plugin-router'

export default [
  {
    plugins: {
      '@tanstack/router': pluginRouter,
    },
    rules: {
      '@tanstack/router/create-route-property-order': 'error',
    },
  },
  // Any other config...
]
```

## Legacy Config (`.eslintrc`)

### Recommended Legacy Config setup

To enable all of the recommended rules for our plugin, add `plugin:@tanstack/eslint-plugin-router/recommended` in extends:

```json
{
  "extends": ["plugin:@tanstack/eslint-plugin-router/recommended"]
}
```

### Custom Legacy Config setup

Alternatively, add `@tanstack/eslint-plugin-router` to the plugins section, and configure the rules you want to use:

```json
{
  "plugins": ["@tanstack/eslint-plugin-router"],
  "rules": {
    "@tanstack/router/create-route-property-order": "error"
  }
}
```

## Rules

- [@tanstack/router/create-route-property-order](./create-route-property-order.md)