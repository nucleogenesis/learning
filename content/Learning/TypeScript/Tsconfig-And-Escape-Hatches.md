---
title: Tsconfig-And-Escape-Hatches
tags: [learning, typescript, tsconfig]
lastUpdated: 2026-05-15
---
# Tsconfig and escape hatches

> **Convention**: Answer blocks live as children of "Show answer" parents. Click the triangle to collapse — Logseq remembers the state.

## 🎯 Why this matters

Two codebases. Same lines of TypeScript. Same dependencies. One catches 80% of would-be runtime bugs at compile time; the other catches 20%. The difference is almost entirely in `tsconfig.json`.

The compiler has settings — about 40 of them with type-safety implications. Most teams pick the defaults and never look back. The defaults are *lax*. They were designed in an era when TS was trying to be approachable to JS users, and they err toward "everything compiles." Turning on the strict flags doesn't just catch more bugs — it changes what *kind of code you write*, because the constraints force you to encode invariants you'd otherwise leave implicit.

The same discipline applies to the **escape hatches** in the language itself. `as`, `any`, `// @ts-expect-error` — these are the trapdoors that let you bypass the type system. They're not anti-patterns; they're tools. The anti-pattern is reaching for them reflexively to make a red squiggly go away. Used deliberately, they're how you handle real-world cases where the type system can't yet express what you know.

This page is about both: which compiler flags actually matter, and how to use the escape hatches with discipline.

## A tiny worked example

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": false,
    "moduleResolution": "bundler",
    "target": "ES2022"
  }
}
```

That's a defensible baseline for a modern app. Five flags doing most of the work. The rest of this page is about *why* each one matters, what they catch, and which ones to add when.

### Naming the parts as they come up

- **`strict`** — a meta-flag that turns on the seven strict-family flags. Treat as non-negotiable.
- **`noUncheckedIndexedAccess`** — adds `| undefined` to array and record index access. Catches "what if this key isn't there?" at compile time.
- **`exactOptionalPropertyTypes`** — distinguishes `prop?: T` from `prop: T | undefined`. Useful but loud.
- **`moduleResolution`** — how TS finds modules. `bundler` is the modern default for app code; `nodenext` for Node-targeted libraries.
- **Escape hatch** — a syntactic device to override the type system: `as`, `as unknown as`, `any`, `// @ts-expect-error`, type assertions in general.
  - For the canonical reference: [tsconfig docs](https://www.typescriptlang.org/tsconfig). Bookmark it.

## The strict family — non-negotiable

`"strict": true` enables seven flags. They're a package; turn them all on for any new codebase, and migrate existing ones gradually.

### `strictNullChecks`

```ts
// Off (lax) — `null` and `undefined` are assignable to every type:
function len(s: string): number { return s.length; }
len(null);   // compiles, crashes at runtime

// On (strict) — null/undefined are their own types:
len(null);   // ❌ Argument of type 'null' is not assignable to parameter of type 'string'
```

The single most important flag in the language. Forces you to handle nullability explicitly. Without it, TypeScript catches *no* "cannot read property X of null" bugs — the most common JS runtime error class. With it, you catch nearly all of them. Worth turning on alone if you turn on nothing else.

### `noImplicitAny`

```ts
// Off (lax):
function parse(input) { /* input is any */ }

// On (strict):
function parse(input) { /* ❌ Parameter 'input' implicitly has an 'any' type */ }
```

Forces you to either annotate or let inference work. Without it, untyped parameters silently become `any`, and the type system is one missing annotation away from total collapse. The flag isn't about "don't ever use any" — it's "if you mean `any`, say so."

### `strictFunctionTypes`

Enables contravariant parameter checking. We covered this on [[Learning/TypeScript/Generics]]. Catches the function-assignment unsoundness from the days before TS 2.6.

### `strictBindCallApply`

`Function.prototype.bind/call/apply` get correctly typed. Without it, `.bind` and friends return loosely-typed function values. With it, the bound function has the precise signature.

### `strictPropertyInitialization`

```ts
class User {
  name: string;   // ❌ Property 'name' has no initializer and is not definitely assigned
}
```

Forces class properties to be initialized in the constructor or have a definite-assignment assertion (`name!: string`). Catches "I declared this but forgot to set it" bugs in classes.

### `alwaysStrict`

Adds `"use strict"` to every emitted file. Mostly a JS-quirks-era thing now; mostly irrelevant for modern ES module code. Keep it on; you'll never notice.

### `noImplicitThis`

Catches uses of `this` in contexts where the compiler can't determine its type. Rare in modern code (arrow functions sidestep `this` entirely), but useful for the legacy patterns.

- **Bottom line: `"strict": true`.** No new codebase has a good reason to opt out. Migrating an existing codebase? Turn it on, fix the errors, profit.

## Beyond strict — the high-leverage flags

`strict` is the floor. These four flags add genuine additional safety; turn them on for new projects and migrate to them in existing ones.

### `noUncheckedIndexedAccess` — the most underused flag in TS

```ts
const arr = [1, 2, 3];
const first = arr[0];   // type: number   (without flag)
                         // type: number | undefined   (with flag)

const map: Record<string, User> = {};
const user = map['xxx'];   // type: User   (without flag)
                            // type: User | undefined   (with flag)
```

The flag adds `| undefined` to every index access on arrays and records. **This is the real shape of the runtime.** `arr[0]` on an empty array is undefined. `map[key]` for an absent key is undefined. The default flag-off behavior lies; turning it on makes the type system honest.

Cost: every array indexing now requires a null check or destructuring. Loud at first. Worth it within a week — the discipline you develop maps directly to "fewer null-pointer crashes in production." If I had to pick *one* non-default flag to turn on, this is it.

### `noImplicitReturns`

```ts
function describe(s: 'a' | 'b'): string {
  if (s === 'a') return 'apple';
  // forgot to handle 'b' — function implicitly returns undefined
}
```

Errors when a function has some code paths that return and others that don't. Catches missing else branches, partial switches, early-exit bugs. Pairs naturally with exhaustiveness checking from [[Learning/TypeScript/Unions-And-Narrowing]].

### `noFallthroughCasesInSwitch`

```ts
switch (x) {
  case 'a':
    doA();
    // forgot break — falls through to 'b'
  case 'b':
    doB();
    break;
}
```

Errors on case bodies without `break`, `return`, or `throw`. Catches the classic C-style switch fallthrough bug. Tiny flag, no downside.

### `noUnusedLocals` and `noUnusedParameters`

```ts
function compute(a: number, b: number, c: number) {
  return a + b;  // c is unused
}
```

Errors on declared-but-unused variables and parameters. Some teams find these noisy; most teams find them useful as a cleanup signal. Compromise: leave them off in `tsconfig.json` and rely on lint (`eslint-plugin-unused-imports`, `@typescript-eslint/no-unused-vars`) which is more configurable.

## Useful but loud — `exactOptionalPropertyTypes`

```ts
type User = { name?: string };

const a: User = { name: 'Alice' };        // ✅
const b: User = {};                        // ✅
const c: User = { name: undefined };      // with flag: ❌ — explicit undefined isn't `?`
```

Without the flag, `name?: string` and `name: string | undefined` are the same type. With it, they're different: `name?: string` means "may be absent," while `name: string | undefined` means "must be present but can be `undefined`."

The pro: catches "I meant to leave this out but accidentally set it to `undefined`" bugs in object literals, particularly around React props and config merging.

The con: a lot of existing patterns become errors. `{ ...defaults, ...overrides }` where `overrides` might have `undefined` values is broken under this flag. Migrating an established codebase is painful.

- **Recommendation: turn it on for new codebases, leave it off for existing ones until you have time to audit.** It's the most "is this worth it?" flag in the strict family.

## Module resolution — pick one and commit

Three relevant modes:

| Mode | When | Notes |
|---|---|---|
| `node10` (formerly `node`) | Legacy projects | Mimics historical Node CJS resolution; mostly irrelevant for new projects |
| `bundler` | Modern app code with Vite/esbuild/Webpack | The right default for frontend and any app code |
| `nodenext` | Node-targeted libraries, modern ESM-aware servers | Respects `package.json`'s `exports`, distinguishes `.ts`/`.mts`/`.cts` |

The decision tree:

- **Frontend app, bundler in the pipeline?** `bundler`. Don't think about it.
- **Node app or library, modern ESM?** `nodenext`. Pay the up-front config cost; get correct resolution.
- **Legacy project with mixed CJS/ESM dependencies?** Probably `node10` until you can migrate. Plan the migration.
  - A specific gotcha with `nodenext`: it enforces `.js` extensions in import paths (`import './foo.js'` even though the file is `foo.ts`). This trips everyone up exactly once. Once you internalize "the runtime resolves `.js`, so your import says `.js`," it stops being weird.

## Project references — when you actually need them

```json
// tsconfig.json
{
  "references": [
    { "path": "./packages/shared" },
    { "path": "./packages/server" }
  ]
}
```

Project references let you split a TypeScript build into multiple sub-projects that depend on each other. Useful for:

- **Monorepos with shared libraries** — packages/shared compiles independently and consumers depend on its emitted types.
- **Massive single repos** — splitting into 10 sub-projects can speed up incremental builds.
- **Mixed dependency graphs** — when one part needs strict mode and another part needs lax (during migration).
  - Mostly: **you don't need them.** A flat `tsconfig.json` with `include` and `exclude` works for almost every project under ~1000 files. Don't reach for project references because you "should" have them — reach for them when build times or strict-mode-migration pain demands it.
  - If you do need them, the [official docs](https://www.typescriptlang.org/docs/handbook/project-references.html) cover the build-mode mechanics (`tsc --build`, `composite: true`, etc.).

## The escape hatch hierarchy

Now the language-level overrides. Every escape hatch has a *correct* level of cost:

### `unknown` — the seatbelt for `any`

```ts
// Bad — full any:
function parse(s: string): any {
  return JSON.parse(s);
}
parse('foo').banana.split(0).whatever;   // no errors, will crash

// Good — unknown:
function parse(s: string): unknown {
  return JSON.parse(s);
}
const result = parse('foo');
// result.banana   ← ❌ Object is of type 'unknown'
if (isUser(result)) {
  result.name;  // ✅ narrowed
}
```

`unknown` is "I don't know what this is — narrow before using." `any` is "I don't know what this is — and I don't care." Always prefer `unknown` at API boundaries. The compiler forces consumers to validate; the type system stays honest.

### `as` — type assertion (compile-time, no runtime check)

```ts
const el = document.getElementById('app') as HTMLDivElement;
```

`as` says "trust me, this is a `HTMLDivElement`." The compiler doesn't check; the runtime doesn't check; if you're wrong, undefined behavior. Use it when you have information the type system doesn't.

The legitimate cases:

- **DOM accesses where you know more than the type system** (the example above — `getElementById` returns `HTMLElement | null` but you know it's a div).
- **JSON parsing after validation** — `JSON.parse(...) as User`, immediately after `isUser(...)` confirmed the shape.
- **Inside generic helpers where TS can't quite prove the type relationship** (e.g., the `as F` cast inside a higher-order generic wrapper).
  - The illegitimate cases:
- **Silencing a confusing error.** If `as` is your first move when an error pops up, ask "what would I do if `as` didn't exist?" Usually that route is also correct and safer.
- **Casting `unknown` directly to a domain type without validation.** That's just `any` with extra steps.

### `as unknown as T` — the double cast

```ts
const x = someStrangeValue as unknown as TargetType;
```

TS rejects `as` between types that have no overlap. `as unknown as T` is a two-step cast that goes through `unknown`, defeating the safety check. Reserved for cases where you *really* know better than the compiler. Should be commented to explain why.

```ts
// e.g., a generic typed wrapper where the actual relationship is too complex for TS:
const wrapped = (originalFn as unknown as Wrapped<F>);
```

Treat every `as unknown as` as a code smell that needs a justification comment. If you can't justify it, refactor.

### `@ts-expect-error` vs `@ts-ignore`

```ts
// @ts-expect-error — the next line has a type error, and that's intentional:
const result = someBuggyApiThatLies(input);

// @ts-ignore — silence whatever's next, errors or not:
const result2 = someBuggyApiThatLies(input);
```

- **Always prefer `@ts-expect-error` over `@ts-ignore`.** The difference:

`@ts-expect-error` *expects* an error and *errors if there isn't one*. If the underlying issue gets fixed (a library updates its types), the directive becomes an error itself, prompting you to remove it.

`@ts-ignore` silently suppresses anything. The directive stays forever, even after the underlying problem is fixed.

The `@ts-expect-error` directive is self-cleaning. The `@ts-ignore` directive is technical debt that compounds. Use the first; never use the second unless you have a specific reason.

Convention: every `@ts-expect-error` should have an explanatory comment:

```ts
// @ts-expect-error — library's types are wrong; PR open at <link>
const result = someBuggyApi(input);
```

### `any` — the last resort

`any` exists. There are real cases for it:

- **Migrating untyped JavaScript.** You can't add types to a 50k-line codebase in a day. `any` in a `.ts` file is better than staying in `.js`.
- **Truly dynamic code paths.** The escape hatches in the type system itself — `Function.prototype.apply`, generic factories that can't be expressed in current TS. Rare.
- **Generic-helper-function internals.** Inside `withLogging<F extends Function>(fn: F)`, the `args: any[]` cast is the standard idiom.
  - What `any` should NOT be:

The first thing you reach for when an error appears.

A way to "make the build pass."

Anywhere near data flowing across an API boundary.

- **The discipline**: when you write `any`, it should hurt. Every `any` should be a code-review conversation. Many codebases enforce this with `@typescript-eslint/no-explicit-any` set to `error`.

## Putting it together — a recommended `tsconfig.json`

```json
{
  "compilerOptions": {
    // Core type-safety:
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,

    // Useful-but-loud (turn on for new projects, migrate existing):
    "exactOptionalPropertyTypes": true,

    // Module resolution (pick one based on target):
    "moduleResolution": "bundler",
    "module": "ESNext",
    "target": "ES2022",

    // Misc quality-of-life:
    "skipLibCheck": true,             // don't check node_modules' .d.ts files
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,           // enables bundler compatibility
    "esModuleInterop": true            // CJS import/export interop
  },
  "include": ["src/**/*", "types/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

If you're migrating an existing codebase: turn on `strict` first, fix the errors, then add `noUncheckedIndexedAccess`, then `exactOptionalPropertyTypes`. Each step is its own PR cycle.

## 🔍 Quick check (try before scrolling)

- **Q1**: You see `arr[0].name` in code and the codebase has `strict` on. What flag would turn this into a compile error, and why?
- Show answer to Q1
  - **`noUncheckedIndexedAccess`**. Without it, `arr[0]` is typed as the array's element type — fully present, no `undefined`. With it, `arr[0]` is `T | undefined`, and `.name` becomes "Cannot read properties of undefined" at the type level. The flag catches the most common null-pointer bug class in JS code. `strict` alone doesn't enable this; it's a separate flag.
  - **Q2**: Why prefer `@ts-expect-error` over `@ts-ignore`?
- Show answer to Q2
  - `@ts-expect-error` is self-cleaning: if the underlying type issue gets fixed (e.g., a library updates its types), the directive itself becomes an error, prompting you to remove it. `@ts-ignore` is *not* — it silently suppresses anything, so once the issue is fixed, the directive stays as zombie code. Over time, `@ts-ignore` accumulates as silent technical debt; `@ts-expect-error` cleans itself up. Always use the first.
  - **Q3**: A teammate writes `const user = JSON.parse(body) as User`. What's wrong with this and what's the better pattern?
- Show answer to Q3
  - **No runtime validation.** The cast tells the compiler the result is a `User`, but `JSON.parse` returns `any` (or `unknown` with stricter parsers) and there's no actual check that the JSON matches the `User` shape. At runtime, missing fields are `undefined`, extra fields are present, type mismatches go undetected.
  - **Better**: `const raw = JSON.parse(body) as unknown; if (isUser(raw)) { /* use raw as User */ }` — or use a parsing library like Zod: `const user = UserSchema.parse(body)`. The validator is the trust boundary; the cast inside the validator is acceptable; the cast at the call site is not.

---

## 💪 Practice (a separate session, not your first read)

### Worked → faded → blank: ratcheting up strictness on an existing codebase

#### Worked example (read)

You inherit a codebase with `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "module": "commonjs"
    // no strict family
  }
}
```

Your migration plan, in order:

Add `"strict": true`. Run `tsc --noEmit`. Fix the first batch of errors — usually 80% are nullability (`strictNullChecks`) and a few are missing types (`noImplicitAny`).

Add `"noUncheckedIndexedAccess": true`. New crop of errors — array/record accesses that need null checks.

Add `"noImplicitReturns": true`, `"noFallthroughCasesInSwitch": true`. Small batches, easy to fix.

Add `"exactOptionalPropertyTypes": true` (the most painful flag — leave for last). Audit object spreads with optional fields.

Each step is its own PR. Each PR has one purpose: turn on the flag, fix the errors, no behavior changes.

#### Faded — fill in the blanks

You have an existing project with `strict: true` and need to enable `noUncheckedIndexedAccess`. You hit this error:

```ts
function firstUserId(users: User[]): string {
  return users[0].id;   // ❌ Object is possibly 'undefined'
}
```

Fix it without weakening the type (no `!`):

```ts
function firstUserId(users: User[]): string _____________________ {
  const first = users[0];
  if (_____________________) {
    return first.id;
  }
  _____________________
}
```

- Show the answer

```ts

- function firstUserId(users: User[]): string | undefined {
- const first = users[0];
- if (first !== undefined) {
- return first.id;
- }
- return undefined;
- }

```
  - Or, if you want to throw rather than return undefined:
  - ```ts
    function firstUserId(users: User[]): string {
      const first = users[0];
      if (first === undefined) {
        throw new Error('users array is empty');
      }
      return first.id;
    }
    ```

The point: encode the "might be empty" reality into the type, or check explicitly. Don't use `users[0]!.id` — that hides the bug at the call site.

#### From scratch

Write three versions of a function `assertNonNull<T>(value: T | null | undefined, message?: string): T`:

Returns the value if non-null, throws otherwise.

Is correctly typed as an assertion function (`asserts value is NonNullable<T>`).

Has a default message.

Use it to clean up `users[0]!.id`-style code patterns into `assertNonNull(users[0]).id`.

### Worked → faded → blank: justify your escape hatches

#### Worked example (read)

A real-world `@ts-expect-error` with proper justification:

```ts
// @ts-expect-error — react-router-dom's NavigateOptions doesn't expose `relative`
// in its v6 types yet, but the runtime supports it. PR open at
// https://github.com/remix-run/react-router/issues/XXXXX
navigate('/foo', { relative: 'path' });
```

The comment tells the reviewer (and future-you):

- *What* is being silenced.
- *Why* it's necessary right now.

*When* it can be removed (when the upstream PR lands).

The directive auto-cleans-up when the types are fixed.

#### Faded — fill in the blanks

A library returns `any` from a poorly-typed function. You know the return shape. Write the safest possible interaction:

```ts
import { dangerouslyTypedFunc } from 'old-lib';

// FILL: declare a type for what you know about the return shape
type _________ = _________;

// FILL: write a type guard
function _________(value: unknown): value is _________ {
  return _________________________________;
}

// FILL: use the function safely
const raw: unknown = dangerouslyTypedFunc(input);
if (_________(raw)) {
  raw.field   // ✅ typed
}
```

- Show the answer

```ts

- type LibResult = { field: string; count: number };
- function isLibResult(value: unknown): value is LibResult {
- return (
- typeof value === 'object' &&
- value !== null &&
- typeof (value as any).field === 'string' &&
- typeof (value as any).count === 'number'
- );
- }
- const raw: unknown = dangerouslyTypedFunc(input);
- if (isLibResult(raw)) {
- raw.field;
- }

```
  - The `as unknown` cast tames the library's `any` return. The type guard is the trust boundary — beyond it, you have safe access. This is "parse, don't validate" applied to a third-party API.

### Debug-this

```ts
// tsconfig.json: strict: true, but NO noUncheckedIndexedAccess

function getActiveUser(users: User[]): User {
  const active = users.find(u => u.active);
  return active!;
}
```

- What's the bug? Why does `noUncheckedIndexedAccess` not catch it?
- Show the bug
  - `Array.prototype.find` returns `T | undefined`. The `!` non-null assertion lies — if no user is active, `active` is `undefined`, and the function returns `undefined` despite claiming `User`. **`noUncheckedIndexedAccess` doesn't apply here** because `.find` isn't index access; it's already correctly typed as returning `T | undefined`. The bug is the `!` itself — the non-null assertion is one of the most dangerous escape hatches in the language. It's syntactically tiny and easy to miss in review.
  - Fix: handle the missing case explicitly. Either `return users.find(u => u.active) ?? throw ...` (with the throw expression proposal, or via an assertion helper) or split into `const active = users.find(...); if (!active) throw ...; return active;`.

### Teach-it-back

Without notes, in ~5 sentences:

> *"A teammate asks why your project's tsconfig has `noUncheckedIndexedAccess: true` when it makes some patterns more verbose. Convince them with one concrete bug class it catches and one trade-off it imposes."*

If you can't, the "compiler honesty about array access" framing didn't stick.

---

## 🎴 Flashcards (for daily review, not the first read)

- What does `strict: true` enable? #card
  - Seven flags: `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `alwaysStrict`, `noImplicitThis`. Treat as non-negotiable for new code.
- {{cloze The single most important flag in TypeScript is **`strictNullChecks`** — it forces explicit handling of `null` and `undefined`.}} #card
- What does `noUncheckedIndexedAccess` do? #card
  - Adds `| undefined` to every array and record index access. Catches "what if this index is out of bounds / this key is absent" at compile time. The most underused high-leverage flag in TS.
- `noUncheckedIndexedAccess` vs `strict` — relationship? #card
  - Separate flags. `strict` does NOT include `noUncheckedIndexedAccess`. You have to turn it on explicitly. Many codebases turn on `strict` and stop, missing this lever.
- {{cloze `exactOptionalPropertyTypes` distinguishes **`prop?: T`** (may be absent) from **`prop: T | undefined`** (must be present, may be undefined).}} #card
- `moduleResolution` — when to use `bundler` vs `nodenext`? #card
  - `bundler` for frontend/app code that runs through Vite/esbuild/Webpack. `nodenext` for Node-targeted libraries and modern ESM-aware servers. `node10` only for legacy. Pick once per project; commit.
- `@ts-expect-error` vs `@ts-ignore`? #card
  - `@ts-expect-error` errors if there's no error on the next line — self-cleaning when the underlying issue is fixed. `@ts-ignore` silently suppresses anything. **Always prefer `@ts-expect-error`.**
- `unknown` vs `any` — when to use which? #card
  - `unknown`: "I don't know what this is, narrow before using." `any`: "I don't know what this is, and I don't care." Always prefer `unknown` at API boundaries — the compiler forces consumers to validate.
- Why is `as User` after `JSON.parse(body)` a bug? #card
  - There's no runtime check that the JSON matches the `User` shape. The cast tells the compiler a lie. Fix: validate first (`if (isUser(raw))`), or use a parsing library (Zod, io-ts) that does the check.
- {{cloze The non-null assertion operator (`!`) is one of the most dangerous escape hatches — it claims something is non-null **without checking**. Prefer explicit null-checks.}} #card
- One legitimate use of `as`? #card
  - DOM access where you know more than the type system: `document.getElementById('app') as HTMLDivElement`. The compiler only knows it's `HTMLElement | null`; you know it's specifically a div. The cast encodes your additional knowledge.
- Order to migrate an existing codebase to stricter flags? #card
  - (1) `strict: true`. (2) `noUncheckedIndexedAccess`. (3) `noImplicitReturns`, `noFallthroughCasesInSwitch`. (4) `exactOptionalPropertyTypes` (most painful — last). Each as its own PR.

---

## ✅ Self-check before moving on

Can I name the seven flags in `strict` and what each one catches?

Do I know why `noUncheckedIndexedAccess` is separate from `strict`, and can I argue for turning it on?

Can I justify the difference between `as`, `as unknown as`, `@ts-expect-error`, `any`, and `unknown`?

Can I explain why `arr[0]!.foo` is almost always wrong?

If any "no", do one practice exercise above. If all "yes", you've completed the TypeScript content pages. Head to [[Learning/TypeScript/Exercises]] for the consolidated practice.

## 🔗 Related

Up: [[Learning/TypeScript]]

Prev: [[Learning/TypeScript/Modules-And-Declarations]]

Related: [[Learning/TypeScript/Foundations]] (`type` vs `interface`, structural typing), [[Learning/TypeScript/Unions-And-Narrowing]] (exhaustiveness pairs with `noImplicitReturns`)

Practice problems: [[Learning/TypeScript/Exercises]]
