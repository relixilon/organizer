# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A React + TypeScript single-page application built with Vite. Vitest is the test runner (it shares Vite's transform pipeline, so the same `vite.config.ts` configures both dev and test).

## Commands

| Command                 | Purpose                                                         |
| ----------------------- | --------------------------------------------------------------- |
| `npm run dev`           | Start the Vite dev server with HMR                              |
| `npm run build`         | Type-check (`tsc -b`) then produce a production bundle          |
| `npm run preview`       | Serve the built `dist/` locally to verify the production bundle |
| `npm run lint`          | Run ESLint over the project                                     |
| `npm run lint:fix`      | Run ESLint with `--fix`                                         |
| `npm run format`        | Rewrite all files with Prettier                                 |
| `npm run format:check`  | Verify formatting without writing (use in CI)                   |
| `npm run typecheck`     | Run `tsc -b --noEmit` against the project references            |
| `npm test`              | Run the full Vitest suite once                                  |
| `npm run test:watch`    | Re-run Vitest on file change                                    |
| `npm run test:coverage` | Run Vitest and emit a v8 coverage report under `coverage/`      |

Run a single test file: `npm test -- src/App.test.tsx`
Filter by test name: `npm test -- -t "increments the counter"`
Run a single file in watch mode: `npm run test:watch -- src/App.test.tsx`

Before declaring a change "done", run lint, typecheck, and tests. The build script also runs typecheck, so `npm run build` is the strongest single signal.

## Architecture

- **`index.html`** is the Vite entry. It loads `src/main.tsx`, which mounts `<App />` into `#root`.
- **`vite.config.ts`** is the single source of truth for both the dev server and Vitest. It imports `defineConfig` from `vitest/config` (not `vite`) so the `test` block is type-checked. Test environment is `jsdom`, with globals enabled and `src/test/setup.ts` registered as the setup file.
- **`src/test/setup.ts`** imports `@testing-library/jest-dom/vitest` (custom matchers like `toBeInTheDocument`) and runs `cleanup()` after every test so React trees from previous tests don't leak into the next.
- **TypeScript** uses project references: `tsconfig.json` is a solution file pointing at `tsconfig.app.json` (the application code) and `tsconfig.node.json` (the Vite config itself). When adding strictness flags, edit `tsconfig.app.json`. The `types` field there pulls in `vite/client`, `vitest/globals`, and `@testing-library/jest-dom`, which is why `describe`/`it`/`expect` and the custom matchers work without imports — though tests in this repo still import them explicitly for clarity.
- **ESLint** uses the flat config in `eslint.config.js`. The chain is: `@eslint/js` recommended → `typescript-eslint` recommended → `eslint-plugin-react-hooks` → `eslint-plugin-react-refresh` (Vite-specific) → `eslint-config-prettier` (must stay last so it can disable any stylistic rules that conflict with Prettier).
- **Prettier** is configured in `.prettierrc.json`: no semicolons, single quotes, trailing commas everywhere, 100-column print width, LF line endings. `.prettierignore` excludes `dist`, `coverage`, `node_modules`, and `package-lock.json`.

## Test-driven development

This project follows red → green → refactor:

1. **Red.** Write a failing test that describes the behavior you want. Run `npm run test:watch` and watch it fail for the right reason (assertion mismatch, not a syntax or import error).
2. **Green.** Write the smallest amount of production code that makes the test pass. Resist the urge to design ahead.
3. **Refactor.** With the test green, restructure freely — extract helpers, rename, dedupe. Re-run the tests after each change.

Guidelines specific to this codebase:

- **Co-locate tests** with the file under test as `Foo.test.tsx` next to `Foo.tsx`. Keep `src/test/` for shared setup, fixtures, and test utilities only.
- **Test behavior, not implementation.** Use `@testing-library/react` queries that mirror what a user sees: `getByRole`, `getByLabelText`, `getByText`. Reach for `getByTestId` only when nothing else works.
- **Prefer `userEvent` over `fireEvent`.** `userEvent.setup()` simulates real user interaction (focus, typing delays, pointer events) and is what the existing `App.test.tsx` uses as a reference.
- **Async assertions** should use `findBy*` queries or `waitFor`, never arbitrary `setTimeout`. Tests must be deterministic.
- **One behavior per `it` block.** When a test grows multiple unrelated assertions, split it.
- **Mock at the boundary.** Mock `fetch`, timers, or external modules — never internal functions of the unit under test. If you find yourself mocking your own modules, the unit boundary is probably wrong.
- **Coverage is a smell detector, not a target.** Use `npm run test:coverage` to find untested branches; don't write tests purely to bump the number.

## Linting and formatting

- ESLint catches correctness issues (unused vars, missing hook deps, TypeScript misuses). Prettier handles formatting. They do not overlap because `eslint-config-prettier` disables all stylistic ESLint rules.
- Do **not** add Prettier rules to ESLint or run Prettier through ESLint — keep them as separate steps so each one is fast and the error messages stay clear.
- Fix lint errors at the source. Disabling rules with `// eslint-disable-next-line` requires a comment on the same line explaining _why_; otherwise remove it.
- The `tsconfig.app.json` flags `noUnusedLocals`, `noUnusedParameters`, and `noFallthroughCasesInSwitch` are enabled — TypeScript will fail the build before ESLint gets a chance, so don't suppress them with leading underscores unless you genuinely need the parameter for its position (e.g. callback signatures).
- If you add a new file type or directory that should be formatted, update `.prettierignore` rather than scattering `// prettier-ignore` comments.

## React conventions

- **Function components only.** No class components.
- **Hooks rules are enforced** by `eslint-plugin-react-hooks`. If the linter complains about a missing dependency, add it — don't suppress. If adding it causes an infinite loop, the underlying logic needs `useCallback`/`useMemo` or a ref, not a suppressed warning.
- **`react-refresh/only-export-components`** (from `eslint-plugin-react-refresh`) requires that files exporting a component export _only_ components. Put hooks, constants, and helpers in their own files so HMR keeps working.
- This project targets **React 19** — `React` does not need to be imported for JSX, and you can use the new hooks (`use`, `useActionState`, etc.) directly.
