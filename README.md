<p align="center">
  <a href="[https://www.medusajs.com](https://github.com/ayazmojs/ayazmo)">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://github.com/ayazmojs/ayazmo/assets/2565891/34da26cf-bae6-4d14-b073-dc6cdbe83905">
    <source media="(prefers-color-scheme: light)" srcset="https://github.com/ayazmojs/ayazmo/assets/2565891/34da26cf-bae6-4d14-b073-dc6cdbe83905">
    <img alt="Ayazmo logo" src="https://github.com/ayazmojs/ayazmo/assets/2565891/34da26cf-bae6-4d14-b073-dc6cdbe83905" width="100">
    </picture>
  </a>
</p>

<h1 align="center">
  Ayazmo
</h1>

<h3 align="center">
  API platform for busy engineers
</h3>

<section align="center">
  <a href="https://github.com/medusajs/medusa/blob/develop/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="Ayazmo is released under the MIT license." />
  </a>
  <a href="https://github.com/medusajs/medusa/blob/develop/CONTRIBUTING.md">
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat" alt="PRs welcome!" />
  </a>
</section>

## Getting Started

```
npx ayazmo app:create
```

## Creating a plugin

```
npx ayazmo plugin:create
```

## Installing a plugin

```
npx ayazmo add <plugin-name>
```

## Configuration

Ayazmo provides a flexible configuration system that supports multiple sources:

- Environment variables prefixed with `AYAZMO_`
- `.env` file variables
- User configuration file (`ayazmo.config.js`)
- Default configuration

```bash
# Validate your environment variables
npx ayazmo config:validate

# Generate a template .env file
npx ayazmo config:template
```

Learn more about [configuration options](./docs/configuration.md).