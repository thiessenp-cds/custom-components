# Custom Components

A workbench for exploring and prototyping accessible HTML custom elements (Web Components).

Hosted on GitHub Pages at: https://thiessenp-cds.github.io/custom-components/

## Purpose

Isolate, build, and test custom HTML elements against established accessibility patterns.
Each component page shows multiple variants and tracks known AT/browser issues.

## Getting Started

```bash
npm install
npm run dev
```

## Deploying

Deploys are done manually. Run:

```bash
npm run deploy
```

This builds the project and pushes the `dist/` folder to the `gh-pages` branch, which GitHub Pages serves from.

## Tech Stack

- [React 19](https://react.dev)
- [Vite](https://vite.dev)
- GitHub Pages (via GitHub Actions)
