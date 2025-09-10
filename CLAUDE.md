# jsonref - Claude Development Guide

## Project Overview
Javascript References ($ref) and Pointers library for JSON Schema references and pointer resolution.

## Key Commands
- **build**: `pnpm run build` - Builds both ESM and CJS versions
- **test**: `pnpm run test` - Runs tests with full build
- **coverage**: `pnpm run cover` - Runs tests with coverage reporting
- **check-coverage**: `pnpm run check-coverage` - Verifies 100% coverage requirement
- **clean**: `pnpm run clean` - Removes build artifacts

## Project Structure
- `src/` - TypeScript source files
- `dist/` - Built JavaScript files (ESM and CJS)
- `test/` - Test files

## Build Configuration
- **TypeScript**: 5.5.2 with NodeNext modules targeting ES2022
- **Dual Export**: ESM (`dist/index.js`) and CJS (`dist/cjs/index.js`)
- **Node.js**: >=18.17.0
- **Coverage**: 100% required (statements, branches, functions, lines)

## Development Notes
- Uses pnpm as package manager
- Supports both import and require syntax
- All code must maintain 100% test coverage
- Source maps enabled for debugging