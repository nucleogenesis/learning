---
title: TypeScript
tags: [learning, typescript]
lastUpdated: 2026-05-15
---
# TypeScript — topic hub

## 🎯 Why TypeScript?

Four concrete things a strong TypeScript habit buys you in a real codebase:

- **Whole bug classes vanish at compile time.** "Cannot read property 'name' of undefined" — the most common runtime crash in any JS codebase — becomes a red squiggly during typing. So does "I forgot this returns a Promise." So does "I renamed this field in one file but not the other." The compiler runs every time you save; you ship fewer crashes.
- **Domain rules are encoded in the type system.** A `User` with `role: 'admin' | 'editor' | 'viewer'` makes "what if role is something else?" structurally impossible. A `Result<T, E>` makes "what if I forgot to handle the error?" structurally impossible. The type system becomes a tool for *making invalid states unrepresentable* — Yaron Minsky's phrase from the OCaml world, ported into the JS ecosystem.
- **Refactoring confidence.** Rename a field, change a function signature, move a module — the compiler tells you every call site that needs updating. Three-keystroke renames across 200-file codebases stop being terrifying.
- **Autocomplete becomes a thinking tool, not a typing tool.** When the editor knows the exact shape of every object, the dot-press becomes a conversation: "what can I do with this thing?" Discoverability of an unfamiliar library or your own code from six months ago goes up dramatically.
  - The catch: TypeScript's type system is *deep*. The basics are easy, but the leverage points — discriminated unions, conditional types, branded types, the strict-flag family — live one level up. This curriculum is about that level.

## Who this is for

This curriculum **assumes you can already write basic TypeScript**: functions with typed parameters, classes with typed fields, interfaces, generics syntax, `string`/`number`/`boolean` literals. If any of that is shaky, work through the [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) first — particularly [Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html) and [Object Types](https://www.typescriptlang.org/docs/handbook/2/objects.html). Reference docs explain *how to write* syntax; this curriculum explains *how to leverage* it.

## How to walk this curriculum

Top-to-bottom, but the later pages are more independent than the DSA curriculum was — Conditional Types and Mapped Types each stand alone, Template Literal Types builds on both. Each page has:

A motivating problem at the top — concrete leverage, not theory

A small worked example with terminology introduced inline

Decision criteria (when to lean which way) — TypeScript is full of "two ways to do this" choices

A separate **practice** section for a later session

- **Flashcards** for daily review

A yes/no self-check before you move on

For exercises across all subtopics, see [[Learning/TypeScript/Exercises]].

## Curriculum order

- [[Learning/TypeScript/Foundations]]
  - Structural typing (why TS surprises Java/C# refugees)
  - `type` vs `interface` — decision criteria
  - Inference, widening, narrowing intro, `as const`
- [[Learning/TypeScript/Unions-And-Narrowing]]
  - Discriminated unions — the workhorse pattern for state modeling
  - `typeof` / `instanceof` / `in` narrowing
  - Custom type guards (`x is T`) and assertion functions (`asserts x is T`)
  - Exhaustiveness checking with `never` and `assertNever`
- [[Learning/TypeScript/Generics]]
  - Constraints, defaults, multiple parameters
  - When generics are appropriate vs. disguised `any`
  - Variance (briefly) — covariant returns, contravariant parameters
- [[Learning/TypeScript/Conditional-Types]]
  - `T extends U ? X : Y` and distributivity
  - `infer` — pulling types out of types
  - Built-ins: `ReturnType`, `Parameters`, `Awaited`
- [[Learning/TypeScript/Mapped-Types]]
  - `[K in keyof T]` and key remapping
  - Modifiers (`readonly`, `?`, and `+/-` variants)
  - Building utility types from scratch
- [[Learning/TypeScript/Template-Literal-Types]]
  - String literal manipulation in the type system
  - Type-safe event names and object-path strings
  - Recursive splitting and parsing
- [[Learning/TypeScript/Branded-Types]]
  - The brand pattern for nominal typing
  - Validated input, IDs, units of measure
- [[Learning/TypeScript/Modules-And-Declarations]]
  - `.d.ts` files — when and how to author
  - Module augmentation and declaration merging
  - Ambient declarations for untyped JS libraries
- [[Learning/TypeScript/Tsconfig-And-Escape-Hatches]]
  - The strict flag family — non-negotiables and useful-but-loud
  - `moduleResolution`, project references
  - Escape hatches: `as`, `as unknown as`, `@ts-expect-error`, `any` vs `unknown`

## Cross-cutting prerequisites

Modern TS work assumes some adjacent knowledge — pick these up as the curriculum hits them:

- **JavaScript fundamentals**: closures, `this` binding, prototype chain, ES module syntax. [MDN's JS guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide) is the canonical reference.
- **Promise / async-await semantics** — Conditional Types pulls heavily on `Awaited<T>`.
- **At least one TS project setup**: `tsc`, a bundler (esbuild/vite/webpack), and the difference between type-checking-only and emit. See [the Handbook's project section](https://www.typescriptlang.org/docs/handbook/project-references.html).

## 📝 Whiteboard candidates (sketch these out)

Type-system reasoning sticks better when you draw the type-flow on paper. Good candidates:

A discriminated union for a four-state UI machine (`idle | loading | success | error`); annotate which fields exist in which state

A conditional type's distribution over a union: walk `Exclude<'a' | 'b' | 'c', 'b'>` step by step

A mapped type with key remapping: `{ name: string } → { getName: () => string }` — sketch the transformation

A `.d.ts` module augmentation diagram: original module + your augmentation = merged final shape

## Recommended outside reading

Curriculum-supporting books and references — none required, all excellent:

[Effective TypeScript](https://effectivetypescript.com/) by Dan Vanderkam — 83 items, each a leverage point. The single best book on the language.

[Total TypeScript](https://www.totaltypescript.com/) by Matt Pocock — interactive courses, particularly strong on the advanced type-system features.

[type-challenges](https://github.com/type-challenges/type-challenges) — graded type-system puzzles. Your Tier 3 in [[Learning/TypeScript/Exercises]].

[The TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) — official reference. Linked throughout this curriculum for syntax detail.

## 🔗 Related

Up: [[Learning]]

Exercises: [[Learning/TypeScript/Exercises]]
