---
title: Modules-And-Declarations
tags: [learning, typescript, modules, declarations]
lastUpdated: 2026-05-15
---
# Modules and declarations — `.d.ts`, augmentation, ambients

> **Convention**: Answer blocks live as children of "Show answer" parents. Click the triangle to collapse — Logseq remembers the state.

## 🎯 Why this matters

You install a JavaScript-only library. No types. The editor goes red, autocomplete dies, every call site is `any`. Three options:

Live with the `any`. Lose the type safety; gain nothing.

Find `@types/the-library` on npm. Best case — just install it.

- **Write a `.d.ts` file yourself.** A few minutes of work, full IntelliSense forever after.
  - The third option is the one nobody teaches you but every senior TS engineer can do in their sleep. It's the difference between being a TypeScript *user* and being someone who can fix anything in their toolchain.
  - The same skills apply to a parallel problem: you want to *extend* a third-party type (add a custom property to `Window`, add a custom field to Express's `Request`). The trick — **module augmentation** — is one of the most useful TS features that almost nobody understands until they need it.
  - This page covers: writing your own `.d.ts` for an untyped library, augmenting third-party types, declaration merging mechanics, and when each of these is the right move.

## A tiny worked example

You install `mystery-lib`. Its README says it exports a function `parse(input)` that returns a tree. No types. You write a `mystery-lib.d.ts` in your project's `types/` directory:

```ts
// types/mystery-lib.d.ts
declare module 'mystery-lib' {
  export type TreeNode = {
    type: string;
    children: TreeNode[];
    value?: string;
  };

  export function parse(input: string): TreeNode;
  export function stringify(tree: TreeNode): string;
}
```

Add `"include": ["src/**/*", "types/**/*"]` to your `tsconfig.json`, and now:

```ts
import { parse } from 'mystery-lib';

const tree = parse('foo');
tree.children[0].type;   // ✅ fully typed
```

That's the whole pattern. Five minutes of work for permanent autocomplete.

### Naming the parts as they come up

- **`.d.ts` file** — a declaration file. Contains only type information; no runtime code. Used to describe the *shape* of JavaScript (a library, a global, an environment).
- **Ambient declaration** — declarations made available globally without an explicit import. The `declare` keyword introduces them.
- **`declare module 'name'`** — describes the shape of a module that exists at runtime but lacks types.
- **Module augmentation** — extending an existing typed module by re-opening its declaration in your own code.
- **Declaration merging** — TS's mechanism that combines multiple declarations of the same interface/namespace into one. This is what makes augmentation work.
- **Triple-slash directive** — `/// <reference path="..." />`. Historical syntax for declaring dependencies between `.d.ts` files. Mostly superseded by modules; you'll see it in legacy code and `@types` packages.
  - For the canonical reference: [Handbook: Declaration Files](https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html).

## When you author a `.d.ts`

The decision tree:

```
Library has types built in (TypeScript-native or has .d.ts shipped)?
  → Just use it. No action needed.
Library has @types/name on npm (DefinitelyTyped)?
  → npm install -D @types/name
Library is internal / niche / no types available?
  → Write your own .d.ts in types/library-name.d.ts
```

Authoring is the third case. Two patterns based on what the library is:

### A npm package with a default export

```ts
// types/legacy-charts.d.ts
declare module 'legacy-charts' {
  export interface ChartOptions {
    type: 'bar' | 'line' | 'pie';
    data: number[];
    labels?: string[];
    colors?: string[];
  }

  export default class Chart {
    constructor(container: HTMLElement, options: ChartOptions);
    render(): void;
    destroy(): void;
    update(options: Partial<ChartOptions>): void;
  }
}
```

You describe the public API as you understand it. Don't try to type every internal detail — type the surface area your code actually uses. **An incomplete `.d.ts` is infinitely better than no `.d.ts`.** Add types for what you call; mark the rest as `unknown` or omit it. The compiler won't complain about missing parts you never use.

### A script tag dependency (global)

```ts
// types/globals.d.ts
declare global {
  interface Window {
    __APP_CONFIG__: {
      apiUrl: string;
      featureFlags: Record<string, boolean>;
    };
  }

  // A library loaded via <script> tag, attached to globalThis:
  const VENDOR_LIB: {
    init(key: string): void;
    track(event: string, props?: Record<string, unknown>): void;
  };
}

export {};   // ← makes this file a module; required when using `declare global`
```

That trailing `export {};` is a real gotcha. Without it, the file is a script (everything is global automatically), and `declare global` is unnecessary and confusing. With it, the file is a module, and `declare global` is the explicit way to add things to the global scope. **Always include `export {};` when using `declare global` in your own code.**

### Tips for writing them well

- **Start by typing what your code uses.** Don't type the whole API. Add types as you call new functions.
- **Read the library's `index.js`** to understand the export shape. Are exports CJS (`module.exports = ...`) or ESM (`export default ...`)? It matters for the declaration shape.
- **Look at similar `@types/...` packages on GitHub** for the same kind of library. The structure is informative even if the library itself is different.
- **Use `unknown`, not `any`,** for parameters you don't yet understand. It forces the caller to narrow, which catches real bugs.

## Module augmentation — extending third-party types

You're using Express. You add an auth middleware that sets `req.user`. The handler downstream reads `req.user`. Trouble: `req.user` isn't on Express's `Request` type.

```ts
// src/middleware/auth.ts
app.use((req, res, next) => {
  req.user = decodeJwt(req.headers.authorization);  // ❌ Property 'user' does not exist
  next();
});

// src/routes/profile.ts
app.get('/profile', (req, res) => {
  res.json(req.user);   // ❌ same error
});
```

The fix: **augment** the Express `Request` interface from your own code.

```ts
// types/express.d.ts
import 'express';   // import for side effect — pulls in Express's types

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string;
      email: string;
      roles: string[];
    };
  }
}
```

Now Express's `Request` type has a `user` field — *globally, everywhere you import Express*. The mechanism: **interface declarations with the same name and scope merge**. Your `interface Request { user?: ... }` joins Express's `interface Request { ... }` (which is in the `express-serve-static-core` module that re-exports it as `express.Request`), giving you one combined type.

Three subtle pitfalls:

**You augment the module that *declares* the interface, not the one you import from.** For Express, the actual declaration is in `express-serve-static-core`, and `express` re-exports. The augmentation has to target the original.

- **Interface, not type.** Type aliases don't merge. If the library used `type Request = ...`, you can't augment it from outside. You'd have to wrap or fork.
- **The augmenting file must be a module.** It needs at least one `import` or `export` statement, otherwise it's a script and `declare module 'name'` means something different (it's *declaring* the module, not *augmenting* it).
  - For a real-world deep dive: [Express's TypeScript guide](https://expressjs.com/en/advanced/typescript-with-express.html) (community-maintained pattern). The same trick works for `Fastify`, `Koa`, `Next.js`'s `NextApiRequest`, and most other Node web frameworks.

## Declaration merging mechanics

Two `interface Foo` declarations in the same scope produce one merged `Foo`. Two `type Foo` declarations are an error. This is the whole reason `interface` exists alongside `type`:

```ts
interface Box { x: number }
interface Box { y: number }
// Merged: { x: number; y: number }

type Box2 = { x: number };
type Box2 = { y: number };   // ❌ Duplicate identifier 'Box2'
```

Where this matters:

- **Library augmentation** — described above. Only works with interfaces.
- **Class + interface merging** — you can have an `interface Foo` and a `class Foo` together; the interface adds properties to the class's type. Used for "decorator-style" type additions.
- **Namespace + class merging** — historically used for "static methods that act like a namespace." Modern equivalent is usually just adding static methods to the class.
  - Mostly, you'll encounter this through augmentation. The other forms are increasingly historical.

## Ambient declarations — globals and modules

The `declare` keyword introduces something the compiler should *believe exists* without checking. Three flavors:

### Ambient globals

```ts
// types/globals.d.ts
declare const __DEV__: boolean;
declare const __VERSION__: string;
```

Used for build-time constants injected by your bundler (Vite, esbuild, Webpack DefinePlugin). The runtime sets them; TS now believes they exist.

### Ambient modules

```ts
// types/mystery-lib.d.ts
declare module 'mystery-lib' {
  export function parse(s: string): unknown;
}
```

As covered above — describes a module the runtime has but the types don't.

### Wildcard ambient modules

```ts
// types/assets.d.ts
declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const content: string;
  export default content;
}
```

Lets you `import logo from './logo.png'` and have the import typed as `string`. Critical for asset imports in Vite/Webpack/esbuild projects. Without these, every asset import would be a type error.

## Triple-slash directives — mostly historical

```ts
/// <reference path="./other.d.ts" />
/// <reference types="node" />
```

These were the pre-module way to declare type dependencies. The first form pulls in another `.d.ts` file; the second references a `@types/` package.

Modern code uses `import` and `tsconfig.json`'s `types` field instead. You'll still see triple-slash in:

`@types/` packages on DefinitelyTyped — they use it to declare cross-package dependencies.

Some legacy codebases.

`node_modules`-bundled `.d.ts` files for Node built-ins (`/// <reference types="node" />` is the canonical example).

The leverage: **read** them when you see them. Don't write new ones unless you're publishing types and have a specific reason. Modern modules are cleaner.

## Real-world workflow — adopting an untyped library

Practical sequence when you `npm install` something with no types:

- **First, check `@types/the-library` on npm.** Most libraries have community-maintained types. `npm install -D @types/the-library` and you're done.
- **If no `@types` package**, check the GitHub repo — sometimes there are types in a non-published location, or in a fork.
- **If still nothing**, create `types/the-library.d.ts` in your project, configured via `tsconfig.json`'s `include` field.
- **Start with a stub**: `declare module 'the-library';` (the most minimal form — typed as `any`). This unblocks imports.
- **Type incrementally**: as you call functions, add their signatures. The stub stays useful for unused parts.
- **If you type a meaningful subset**, consider publishing to DefinitelyTyped so the next person benefits. The repo has a [contribution guide](https://github.com/DefinitelyTyped/DefinitelyTyped#how-can-i-contribute).
  - The mindset: typing libraries is a normal part of TS work, not a specialist activity. The more comfortable you get writing `.d.ts` files, the more libraries become usable in your typed codebase.

## 🔍 Quick check (try before scrolling)

- **Q1**: You write `declare module 'mystery-lib' { ... }` in a file. What's the difference between the file having `export {};` at the bottom vs not having it?
- Show answer to Q1
  - With `export {};`, the file is a **module** — its declarations are scoped, and `declare module 'mystery-lib'` is an **augmentation** of (or initial declaration of) that named module from inside a module context.
  - Without `export {};` (and no other import/export), the file is a **script** — everything is global. `declare module 'mystery-lib' { ... }` in a script declares the module ambiently in the global scope.
  - In practice, both work for the bare "make this import typed" case, but if you're *augmenting* a module that already exists, you must be in module scope — which means an `import` or `export` is required. The `export {};` is the lightest way to satisfy that requirement.
  - **Q2**: Why can you augment `interface Request { user?: User }` but not `type Request = { ... }`?
- Show answer to Q2
  - **Declaration merging** only applies to interfaces (and namespaces). Two `interface` declarations of the same name in the same scope merge into one combined interface. Type aliases are single declarations — a second `type Foo = ...` would be a duplicate-identifier error. This is the one place where `interface` has a strict capability advantage over `type`: it's *extensible from outside*. That's exactly the reason library authors choose `interface` for their public types — they're inviting you to augment.
  - **Q3**: When should you reach for a wildcard ambient module like `declare module '*.png'`?
- Show answer to Q3
  - When your bundler (Vite, Webpack, esbuild) lets you `import logo from './logo.png'` and resolves it at build time to a URL string (or a transformed module). TS doesn't know about the bundler's resolution; the wildcard declaration tells it "treat any `*.png` import as a default export of `string`." Same for SVG, CSS modules, JSON if you're not using `resolveJsonModule`, etc. Without these, every asset import would be a type error in a modern bundler-driven workflow.

---

## 💪 Practice (a separate session, not your first read)

### Worked → faded → blank: write a `.d.ts` for a small library

#### Worked example (read)

A made-up library `tiny-csv`:

```js
// tiny-csv.js (the library, in JS):
exports.parse = function(text, options) {
  // returns array of arrays
};
exports.stringify = function(rows, options) {
  // returns a string
};
```

Your `.d.ts`:

```ts
// types/tiny-csv.d.ts
declare module 'tiny-csv' {
  export interface ParseOptions {
    delimiter?: string;
    skipHeader?: boolean;
  }

  export interface StringifyOptions {
    delimiter?: string;
    includeHeader?: boolean;
    headers?: string[];
  }

  export function parse(text: string, options?: ParseOptions): string[][];
  export function stringify(rows: readonly string[][], options?: StringifyOptions): string;
}
```

Note `readonly string[][]` on `stringify` — defensive typing, hints to callers that the function doesn't mutate. The actual library probably doesn't enforce this, but the type encodes the contract.

#### Faded — fill in the blanks

A library `simple-fetch`:

Default export is a function `simpleFetch(url, options?)` returning a `Promise<Response>`.

A named export `setDefaultHeaders(headers: Record<string, string>): void`.

A named export `RequestError` which is a `class extends Error` with a `status: number` field.

```ts
declare module 'simple-fetch' {
  interface FetchOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    body?: string;
  }

  export default function simpleFetch(
    url: string,
    options?: FetchOptions,
  ): Promise<Response>;

  export function setDefaultHeaders(_____________________): void;

  export class RequestError _____________________ {
    _____________________
    constructor(message: string, status: number);
  }
}
```

- Show the answer

```ts

- export function setDefaultHeaders(headers: Record<string, string>): void;
- export class RequestError extends Error {
- status: number;
- constructor(message: string, status: number);
- }

```
  - The class declaration mirrors the runtime shape. `extends Error` is required for `instanceof Error` checks to work as expected.

#### From scratch

Pick a small npm package you've used that doesn't have `@types/...` (or pretend it doesn't, even if it does). Write a `.d.ts` for the 3–5 functions you've used most. Test by writing a small consumer file and verifying autocomplete and type errors fire correctly.

### Worked → faded → blank: augment Express's `Request`

#### Worked example (read)

```ts
// types/express.d.ts
import 'express';

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string;
      email: string;
      roles: string[];
    };
    requestId: string;
  }
}
```

The `requestId` is non-optional — meaning your middleware *must* set it (a contract enforced at the type level if you carefully audit). The `user` is optional because not every endpoint is authenticated.

#### Faded — fill in the blanks

Augment `react`'s `CSSProperties` to allow custom CSS variables (props starting with `--`):

```ts
// types/react-css.d.ts
import 'react';

declare module 'react' {
  interface CSSProperties {
    _____________________;
  }
}
```

- Show the answer

```ts

- interface CSSProperties {
- [key: `--${string}`]: string | number | undefined;
- }

```
  - The template literal type as a computed index signature allows any property starting with `--`. Now `<div style={{ '--accent': '#FF00AA', color: 'blue' }}>` typechecks. This is the official answer from React's team; the canonical [TS issue](https://github.com/frenic/csstype/issues/63) and Stack Overflow patterns all converge here.

### Debug-this

```ts
// types/my-lib.d.ts
declare module 'my-lib' {
  export function parse(s: string): unknown;
}

declare module 'my-lib' {
  export function stringify(x: unknown): string;
}
```

- Two `declare module 'my-lib'` blocks in the same file. What happens?
- Show the bug
  - **They merge.** Both `parse` and `stringify` end up in the `my-lib` module. This is intentional — module declarations merge the same way interface declarations do. People sometimes split a `.d.ts` across multiple `declare module` blocks for organization, and it works. **What doesn't work**: declaring the same function twice with different signatures. That would be a duplicate-identifier error (unless you're using overload syntax intentionally).

### Teach-it-back

Without notes, in ~5 sentences:

> *"Your teammate is about to write `req.user as any` everywhere because the auth middleware adds a `user` property to Express's request. Explain module augmentation, show them the four-line fix in `types/express.d.ts`, and tell them why this works (declaration merging on interfaces)."*

If you can't, the augmentation mechanics didn't click.

---

## 🎴 Flashcards (for daily review, not the first read)

- What's a **`.d.ts` file**? #card
  - A TypeScript declaration file. Contains only type information — no runtime code. Used to describe the shape of JavaScript (a library, a global, an environment).
- When to write your own `.d.ts` for a library? #card
  - When the library doesn't ship types AND has no `@types/library` on DefinitelyTyped. Three-minute fix that turns red squigglies into autocomplete forever.
- What does `declare module 'foo'` do? #card
  - Declares the shape of a module named `'foo'` ambiently. If the module already has types, this *augments* them (merging interfaces). If it doesn't, this provides them.
- {{cloze Two `interface Foo` declarations with the same name in the same scope **merge** into one combined interface. Two `type Foo` declarations are a **duplicate-identifier error**.}} #card
- Why does the `interface` vs `type` distinction matter for libraries? #card
  - Interfaces can be **augmented from outside** (declaration merging). Type aliases cannot. Library authors choose `interface` for types they want consumers to extend (e.g., Express's `Request`, React's `CSSProperties`).
- What's **module augmentation**? #card
  - Re-opening a third-party module's declaration from your own code to add fields/types. The mechanism is declaration merging — your `interface Request { user?: User }` joins the library's `interface Request { ... }`.
- Required boilerplate when augmenting a module? #card
  - The file must be a **module** (have at least one `import` or `export`). The augmenting block goes inside `declare module 'name' { interface Foo { ... } }`. Often you also need `import 'name';` to pull in the original types.
- What does `export {};` do at the end of a `.d.ts`? #card
  - Marks the file as a module rather than a script. Required when using `declare global` from a file that has no other imports/exports.
- One use of a **wildcard ambient module**? #card
  - `declare module '*.png' { const src: string; export default src; }` — lets you import asset files in a bundler-driven project (Vite, Webpack) without type errors.
- {{cloze When augmenting Express's `Request`, target the **`express-serve-static-core`** module, not `'express'` — that's where the interface is actually declared.}} #card
- What are triple-slash directives, and when do you write new ones? #card
  - `/// <reference path="..." />` and `/// <reference types="..." />` — pre-module syntax for cross-`.d.ts` dependencies. **Mostly historical.** You read them in legacy code and `@types/` packages; you rarely write new ones.
- Workflow when you `npm install` something untyped? #card
  - (1) Try `npm install -D @types/the-library`. (2) If absent, write `types/the-library.d.ts` with `declare module 'the-library' { ... }` and add to tsconfig `include`. (3) Type incrementally — start with stubs for what you use, add more as you go.

---

## ✅ Self-check before moving on

Can I write a `.d.ts` for a small untyped library (3–5 functions) from scratch?

Can I augment Express's `Request` or React's `CSSProperties` and explain *why* it works (declaration merging)?

Do I know when to reach for `declare module 'name'` vs `declare global` vs `declare module '*.ext'`?

Could I explain triple-slash directives to a teammate (read, don't write)?

If any "no", do one practice exercise above. If all "yes", move to [[Learning/TypeScript/Tsconfig-And-Escape-Hatches]].

## 🔗 Related

- Up: [[Learning/TypeScript]]
- Prev: [[Learning/TypeScript/Branded-Types]]
- Next: [[Learning/TypeScript/Tsconfig-And-Escape-Hatches]]
- Related: [[Learning/TypeScript/Foundations]] (`type` vs `interface` discussion)
- Practice problems: [[Learning/TypeScript/Exercises]]
