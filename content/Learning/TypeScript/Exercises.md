---
title: Exercises
tags: [topic/typescript, topic/type-system, kind/exercises]
lastUpdated: 2026-05-15
---
# TypeScript — exercises & practice sets

Organized by learning-science principles, not by chronology. Pick sets matching your current skill level and current subtopic. **Interleave deliberately** — drilling 10 mapped-type puzzles in a row gives an illusion of mastery; mixing builds transfer.

Note: TypeScript practice is genuinely different from algorithms practice. Most of these aren't "solve a puzzle with an answer" — they're **refactoring drills**, **type-construction puzzles**, and **codebase-shaping exercises**. The Tier 2 / Tier 7 framing is adapted accordingly.

## 📖 How to use this page

- **DO** rotate across difficulty tiers and exercise types (write-from-scratch, debug, teach-back, refactor) within a session.
- **DO** spend ~5 minutes *predicting* before typing — wrong predictions are valuable data.
- **DO** time-box: stuck for 25 minutes, write down what you tried and move on. Spacing > grinding.
- **DON'T** look at type-challenges editorial solutions before attempting your own. Worked examples help *before* you struggle or *after* you've failed, not mid-attempt.
- **DON'T** mark `DONE` until you can re-solve from a blank file a week later. Use `RECHECK` for "solved once, not yet retained."
  - Status markers: `TODO` not started · `LATER` paused · `DOING` active · `DONE` solved & retained · `RECHECK` solved once, retest next week.

## 🌱 Tier 1 — orienting (read & trace, no typing yet)

Pure recognition. Build the schema before problem-solving load kicks in.

- TODO Skim the [TypeScript Handbook's advanced sections](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html), focusing on the chapters whose names appear in this curriculum. Note any concept you can't define.
- TODO Read the [type-challenges README](https://github.com/type-challenges/type-challenges) — understand the difficulty tiers (warm, easy, medium, hard, extreme), the playground link mechanic, the solution format.
- TODO Read the [Effective TypeScript table of contents](https://effectivetypescript.com/) — for each item title, predict whether you could explain it in one paragraph. Mark the ones where you can't.
- TODO Skim [TotalTypeScript's free tutorial](https://www.totaltypescript.com/tutorials/beginners-typescript) just for orientation if your basics feel shaky.
- TODO Read three or four entries from [microsoft/TypeScript's release notes](https://www.typescriptlang.org/docs/handbook/release-notes/overview.html), starting from the most recent. Notice which features you don't recognize.
- TODO Trace through the worked examples on the curriculum pages on paper — predict each result before reading. Particularly:
  - Distribution: `Exclude<'a' | 'b' | 'c', 'b'>` step-by-step
  - The `Getters<T>` mapped type, traced on a small `User` type
  - `PathValue<T, 'a.b.c'>` recursive trace

## 🔨 Tier 2 — write-from-scratch (foundational utilities)

Implement each in a blank `.ts` file. **No copying.** Test with small example types and verify the result with `// hover-to-check` comments. Use [the TS playground](https://www.typescriptlang.org/play) so you can hover types.

### Utility types — the canon

- TODO `MyPartial<T>` — make every property optional.
- TODO `MyRequired<T>` — strip optionality from every property.
- TODO `MyReadonly<T>` — make every property readonly.
- TODO `Mutable<T>` — strip readonly from every property.
- TODO `MyPick<T, K extends keyof T>` — pick selected keys.
- TODO `MyOmit<T, K extends keyof T>` — drop selected keys.
- TODO `MyRecord<K extends string, V>` — build a record from key union and value type.
- TODO `MyExclude<T, U>` — union exclusion.
- TODO `MyExtract<T, U>` — union extraction.
- TODO `MyReturnType<F>` — extract a function's return type via `infer`.
- TODO `MyParameters<F>` — extract a function's parameter tuple via `infer`.
- TODO `MyAwaited<T>` — recursively unwrap promises.
- TODO `MyNonNullable<T>` — remove null and undefined.
- TODO `MyPromisify<F>` — given `(x: T) => R`, produce `(x: T) => Promise<R>`.

### Deep / recursive utilities

- TODO `DeepReadonly<T>` — recursive readonly. Decide whether to recurse into arrays/functions.
- TODO `DeepPartial<T>` — recursive optional.
- TODO `DeepNonNullable<T>` — strip null/undefined at every level.
- TODO `DeepRequired<T>` — recursive required.

### Custom mapped types

- TODO `Getters<T>` — produce `{ getFoo(): T['foo'], ... }`.
- TODO `Setters<T>` — produce `{ setFoo(v: T['foo']): void, ... }`.
- TODO `PickByValue<T, V>` — keep only properties whose value extends V.
- TODO `OmitByValue<T, V>` — drop properties whose value extends V.
- TODO `RenameKeys<T, M>` — given a mapping `M = { oldKey: 'newKey' }`, produce a renamed type.
- TODO `FunctionKeys<T>` — produce a union of keys whose values are functions.

### Discriminated-union / Result patterns

- TODO `Result<T, E>` — discriminated `{ ok: true; value: T } | { ok: false; error: E }`.
- TODO `ok` and `err` smart constructors.
- TODO `mapResult<T, U, E>(r: Result<T, E>, fn: (v: T) => U): Result<U, E>`.
- TODO `flatMapResult<T, U, E>(r: Result<T, E>, fn: (v: T) => Result<U, E>): Result<U, E>`.
- TODO `unwrap<T, E>(r: Result<T, E>): T` — throws on error.
- TODO `unwrapOr<T, E>(r: Result<T, E>, fallback: T): T`.
- TODO `assertNever(x: never): never` — the canonical exhaustiveness helper.

### Template-literal / string-level

- TODO `Capitalize<S>`, `Uncapitalize<S>` from scratch (you'll need template literals + `infer`).
- TODO `Split<S extends string, D extends string>` — split a string literal type by a delimiter, producing a tuple.
- TODO `Join<T extends string[], D extends string>` — the inverse.
- TODO `Replace<S, From, To>` — replace the first occurrence.
- TODO `ReplaceAll<S, From, To>` — replace all occurrences.
- TODO `TrimLeft<S>`, `TrimRight<S>`, `Trim<S>` — strip whitespace.
- TODO `PathValue<T, P extends string>` — index a nested object by dotted path.
- TODO `PathsOf<T>` — produce a union of all dotted paths to leaf values.

### Length-typed tuples (intermediate)

- TODO `Tuple<T, N>` — a tuple type with exactly N elements of T. (`Tuple<string, 3>` = `[string, string, string]`.)
- TODO `Length<T extends readonly unknown[]>` — extract the length of a tuple at the type level.
- TODO `Head<T>`, `Tail<T>`, `Last<T>` — destructure a tuple type.
- TODO `Reverse<T>` — reverse a tuple type.
- TODO `Concat<A, B>` — concatenate two tuple types.

### Branded types

- TODO Generic `Brand<T, B>` helper.
- TODO Smart constructor pattern for a domain `Email` brand with regex validation.
- TODO Multiple ID brands (`UserId`, `OrderId`, `ProductId`) and a query function that proves at compile time it can't mix them up.
- TODO Unit-of-measure brands (`Meters`, `Feet`) with arithmetic helpers (`addMeters`, `addFeet`).

### Event emitter / router patterns

- TODO Typed event emitter (`Emitter<Events>`) with `on`, `off`, `emit`, `once` — all typed by the event-name → payload map.
- TODO Route param extraction: `ExtractParams<'/users/:id/posts/:postId'>` returns `'id' | 'postId'`.
- TODO Typed `get(obj, path)` that infers the return from the path.
- TODO Typed `set(obj, path, value)` that constrains value to the type at that path.

## 📋 Tier 3 — type-challenges by difficulty

The [type-challenges](https://github.com/type-challenges/type-challenges) repo is the canonical practice ladder. Each challenge has a playground link; solve in TS playground, verify, then move on.

Note: challenge numbers below are written as `tc-NNN` to avoid Logseq's tag parsing. Each maps directly to type-challenges issue `#NNN` — the canonical URL pattern is `github.com/type-challenges/type-challenges/blob/main/questions/NNNN-difficulty-name/README.md`.

### Warm-up (start here)

- TODO `tc-13` — Hello World
- TODO `tc-14` — First of Array
- TODO `tc-18` — Length of Tuple
- TODO `tc-43` — Exclude
- TODO `tc-189` — Awaited

### Easy

- TODO `tc-4` — Pick
- TODO `tc-7` — Readonly
- TODO `tc-11` — Tuple to Object
- TODO `tc-533` — Concat
- TODO `tc-898` — Includes
- TODO `tc-3057` — Push
- TODO `tc-3060` — Unshift
- TODO `tc-3312` — Parameters

### Medium

- TODO `tc-2` — Return Type
- TODO `tc-3` — Omit
- TODO `tc-8` — Readonly 2
- TODO `tc-9` — Deep Readonly
- TODO `tc-10` — Tuple to Union
- TODO `tc-12` — Chainable Options
- TODO `tc-15` — Last of Array
- TODO `tc-16` — Pop
- TODO `tc-20` — Promise.all
- TODO `tc-62` — Type Lookup
- TODO `tc-106` — Trim Left
- TODO `tc-108` — Trim
- TODO `tc-110` — Capitalize
- TODO `tc-116` — Replace
- TODO `tc-119` — Replace All
- TODO `tc-191` — Append Argument
- TODO `tc-296` — Permutation
- TODO `tc-298` — Length of String

### Hard (when medium feels easy)

- TODO `tc-17` — Currying
- TODO `tc-55` — Union to Intersection
- TODO `tc-57` — Get Required
- TODO `tc-59` — Get Optional
- TODO `tc-89` — Required Keys
- TODO `tc-90` — Optional Keys
- TODO `tc-112` — Capitalize Words
- TODO `tc-114` — CamelCase
- TODO `tc-147` — C-Printf Parser
- TODO `tc-223` — IsAny
- TODO `tc-270` — Get Readonly Keys
- TODO `tc-399` — Tuple Filter
- TODO `tc-472` — Tuple to Enum Object

### Extreme (only after hard is comfortable)

- TODO `tc-6` — Simple Vue type system
- TODO `tc-213` — Vue Basic Props
- TODO `tc-284` — JSON Schema to TypeScript
- TODO `tc-730` — Union to Tuple
- TODO `tc-1290` — Stringify Math expressions
- TODO `tc-5181` — Mini camelcase
- TODO `tc-5423` — Pinia

## 🔀 Tier 4 — interleaved practice sets

- **The point of these sets is variety.** Solve in the listed order; don't shuffle into nice topical clumps. Each set ~45–60 minutes.

### Set A — narrowing + generics + conditional (foundations interleave)

Implement `Result<T, E>` with `ok`/`err` constructors and a `mapResult` helper that preserves the error type.

Solve type-challenges `tc-2` (ReturnType) and `tc-3312` (Parameters) — both `infer`-based.

Write a `safeJSONParse<T>(s: string, guard: (v: unknown) => v is T): Result<T, SyntaxError>` that composes runtime validation with the `Result` type.

### Set B — mapped types + template literals (object reshaping)

Write `Getters<T>` and `Setters<T>` mapped types.

Solve type-challenges `tc-110` (Capitalize), `tc-112` (Capitalize Words).

Combine: write `PrefixedKeys<T, P extends string>` that prefixes every key of `T` with `P` (e.g., `PrefixedKeys<{ a: 1; b: 2 }, 'on'>` = `{ ona: 1; onb: 2 }`), then a `EventHandlers<T>` that uses it with `Capitalize` to produce `{ onA: () => 1; onB: () => 2 }`.

### Set C — branded types + escape hatches

Implement `Email`, `UserId`, `OrderId` brands. Write smart constructors with validation.

Audit a tiny made-up function library for instances where `as` could be replaced with a type guard or assertion function.

Convert a `tsconfig.json` snippet from lax (no strict, no `noUncheckedIndexedAccess`) to a defensible strict configuration. Identify which patterns in some sample code would now fail.

### Set D — discriminated unions + exhaustiveness (state machines)

Model a four-state UI request as a discriminated union (idle/loading/success/error).

Write a reducer with full `switch` exhaustiveness using `assertNever`.

Add a fifth state (`cancelled`). Verify the compiler points at every unhandled site.

Solve type-challenges `tc-62` (Type Lookup) — closely related to discriminated-union extraction.

### Set E — modules and declarations

Find a small npm library you depend on. Write a minimal `.d.ts` covering the 3–5 functions you actually use, even if `@types/...` exists.

Augment Express's `Request` to add `req.user`. Verify the type flows through to a route handler.

Write wildcard ambient declarations for SVG and CSS-module imports.

### Set F — late-stage mixed challenge

Build a typed event emitter using template literal types for event names derived from a `Domain × Action` cartesian product.

Solve type-challenges `tc-17` (Currying).

Write the type machinery for a typed REST client: given a `Routes` map, produce typed `get/post/put/delete` methods that infer params, body, and response.

## 🐛 Tier 5 — debug-this (subtle type bugs)

For each, **predict the bug before pasting into the TS playground.** Save snippets locally.

- TODO Snippet: a function that should narrow a `string | string[]` to `string[]` but uses truthiness narrowing. *Hidden bug: the empty array is falsy at runtime? No — but empty string is. Predict the misnarrow.*
- TODO Snippet: a generic that "preserves" its argument type but actually widens. (`function freeze<T>(obj: T): Readonly<T>` with literal-object input.) *Hidden bug: literal types lost during inference.*
- TODO Snippet: a `<T>(x: T) => T` higher-order function that, due to inference order, sometimes infers `T` as `any`. *Hidden bug: contravariant position blocks inference.*
- TODO Snippet: a discriminated union `switch` without `default: assertNever(...)`. Add a new variant; predict what the compiler says vs what it ignores.
- TODO Snippet: an `as User` cast on `JSON.parse(body)` with no validation. *Hidden bug: runtime crash on malformed input.*
- TODO Snippet: a `Promise<T>[]` typed as `T[]` because `await` was forgotten. *Hidden bug: the array is of Promises, not values.*
- TODO Snippet: a `Record<string, User>` access without `noUncheckedIndexedAccess`. *Hidden bug: missing-key access crashes.*
- TODO Snippet: array variance — assigning `Dog[]` to `Animal[]` then pushing an `Animal`. *Hidden bug: TS allows it, runtime breaks.*
- TODO Snippet: a brand that should distinguish `UserId` from `Email` but uses `type` instead of intersection (`type UserId = string` with no brand). *Hidden bug: brand absent.*
- TODO Snippet: a custom type guard that returns true unconditionally. *Hidden bug: compiler trusts the predicate; bad narrowing throughout the codebase.*
- TODO Snippet: a conditional type with `T extends never ? true : false` called with `never` — predict the wrong answer.
- TODO Snippet: a recursive mapped type for `DeepReadonly<T>` that recurses into functions, producing nonsense.
- TODO Snippet: a `@ts-ignore` comment above code that has been fixed; the ignore is now silently hiding nothing but the directive remains. *Lesson: why `@ts-expect-error` would have caught this.*
- TODO Snippet: an interface augmentation that targets the wrong module name (e.g., `'express'` instead of `'express-serve-static-core'`). *Hidden bug: augmentation silently does nothing.*

## 🗣️ Tier 6 — teach-it-back prompts

Write or record a 2–4 minute explanation for each. If you can't, that's the lesson.

- TODO Explain structural typing to a Java developer. Give one example where it surprises them.
- TODO Explain why `type` is a better default than `interface`, and the one case where `interface` wins (augmentation).
- TODO Explain discriminated unions and exhaustiveness checking. Give a concrete refactoring win (changing a "shape with optional fields" into a union).
- TODO Explain why `function log<T>(x: T): void` is a useless generic, and what makes a generic actually useful.
- TODO Explain why conditional types distribute over unions, and how to opt out with `[T] extends [U]`.
- TODO Explain `infer`. Walk through `ReturnType<F>` from scratch.
- TODO Explain mapped types. Walk through `Partial<T>` and one custom mapped type from scratch.
- TODO Explain template literal types. Give one real-world use (event names or paths) and one anti-use (general string parsing).
- TODO Explain why branded types exist. Give one bug class they prevent.
- TODO Explain when to author your own `.d.ts` and the difference between `declare module 'name' { ... }` and `declare global { ... }`.
- TODO Explain why `noUncheckedIndexedAccess` is the single most impactful flag beyond `strict`.
- TODO Explain the escape-hatch hierarchy: `unknown`, `as`, `as unknown as`, `@ts-expect-error`, `any`. Justify when each is appropriate.

## 🏆 Tier 7 — real-world refactoring drills

Not puzzles — actual codebase-shaping work. Each is a multi-hour or multi-day project. Pick when you want depth practice.

- TODO **Strict-mode migration.** Take a TypeScript codebase with `strict: false` (or even better, a JS codebase) and ratchet it up: add types incrementally, fix the errors, commit per flag. Track the bug discoveries.
- TODO **Convert a JS library to authored `.d.ts`.** Pick an untyped npm package you use. Write a minimal `.d.ts` for the surface you call. Get IntelliSense working. Optional stretch: submit to DefinitelyTyped.
- TODO **Refactor `{ data?, error?, loading }` to a discriminated union.** Find or write a small fetch hook with this shape. Convert it to a discriminated union. Watch the call sites improve.
- TODO **Add branded IDs to a domain.** Pick a domain in your code with multiple entity ID types (User, Order, Product). Brand them all. Note how many cross-entity bugs the compiler catches during the conversion.
- TODO **Build a typed event emitter** for a real (small) system. Use template literal types for event names and a `Events` map for payloads. Replace string literals with the typed API throughout.
- TODO **Augment a framework's types.** Add a `req.user` augmentation to an Express app, or extend React's `CSSProperties` to allow CSS variables. Verify the augmentation propagates to all consumers.
- TODO **Turn on `noUncheckedIndexedAccess` in an existing project.** Fix the resulting errors. Track which ones were real bugs (would have crashed in production).
- TODO **Replace all `as` casts in a small module** with type guards, assertion functions, or proper narrowing. Note which casts were necessary (DOM access, etc.) and which were laziness.
- TODO **Write a `Result<T, E>`-based parsing library** for a small domain (e.g., parsing CSV, or HTTP request bodies). Compare developer experience to a `throw`-based version.
- TODO **Convert a Zod schema or io-ts codec** into a type-from-schema pattern in your own code. Understand how `z.infer<typeof Schema>` works under the hood (it's `ReturnType<Schema['_output']>` or similar; trace through their source).

## ⏱️ Spacing rhythm (suggested)

Most people skip this part and most regret skipping it.

- **Daily (5–10 min)**: Logseq flashcard queue. No exceptions; it's 5 minutes.
- **Every other day (45–90 min)**: 1 Tier 2 utility OR 1 interleaved set OR 2–3 type-challenges problems.
- **Weekly (15 min)**: Pick a `RECHECK` task. Re-solve from a blank file. If retained, mark `DONE`; otherwise leave `RECHECK` and revisit next week.
- **Every 2–3 weeks**: One Tier 7 real-world refactor. These take a session or two; they're how the curriculum becomes muscle memory.
- **End of subtopic**: Do the relevant teach-it-back prompts. If any feels mushy, return to that subtopic's worked examples.

## 🔗 Related

Up: [[Learning/TypeScript]]

Subtopics: [[Learning/TypeScript/Foundations]] · [[Learning/TypeScript/Unions-And-Narrowing]] · [[Learning/TypeScript/Generics]] · [[Learning/TypeScript/Conditional-Types]] · [[Learning/TypeScript/Mapped-Types]] · [[Learning/TypeScript/Template-Literal-Types]] · [[Learning/TypeScript/Branded-Types]] · [[Learning/TypeScript/Modules-And-Declarations]] · [[Learning/TypeScript/Tsconfig-And-Escape-Hatches]]

External: [type-challenges](https://github.com/type-challenges/type-challenges) · [Effective TypeScript](https://effectivetypescript.com/) · [Total TypeScript](https://www.totaltypescript.com/) · [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
