---
title: Branded-Types
tags: [topic/typescript, topic/type-system, kind/concept]
lastUpdated: 2026-05-15
---
# Branded types — nominal typing on demand

> **Convention**: Answer blocks live as children of "Show answer" parents. Click the triangle to collapse — Logseq remembers the state.

## 🎯 Why this matters

Structural typing is great until two things that have the same shape *shouldn't* be interchangeable. The canonical example:

```ts
type UserId = string;
type Email = string;

function sendEmail(to: Email) { /* ... */ }

const userId: UserId = 'user_42';
sendEmail(userId);   // compiles. Catastrophe at runtime.
```

`UserId` and `Email` are *structurally identical* — both are `string`. TypeScript treats them as interchangeable. This is correct from a type-theory standpoint and absolutely wrong from a real-world standpoint.

Branded types are the workaround: add an invisible tag that breaks the structural compatibility without changing the runtime value. After branding:

```ts
type UserId = string & { readonly __brand: 'UserId' };
type Email = string & { readonly __brand: 'Email' };

declare const userId: UserId;
sendEmail(userId);   // ❌ — UserId is not assignable to Email
```

The intersection `string & { __brand: ... }` is structurally a `string` for all practical purposes (you can still call `.toLowerCase()`, slice it, etc.), but the `__brand` field — which never exists at runtime — makes the two types unequal.

This is the **nominal typing escape hatch** for cases where structural compatibility is exactly the wrong default. It's not a feature you'll use everywhere; it's a precision tool for a specific class of bug.

## A tiny worked example

```ts
type UserId = string & { readonly __brand: 'UserId' };

function asUserId(s: string): UserId {
  // assume validation happened upstream
  return s as UserId;
}

function getUser(id: UserId): User {
  // ...
}

const raw: string = req.params.id;
// getUser(raw);              // ❌ — raw is just `string`, not UserId
const id = asUserId(raw);     // smart constructor handles the cast
getUser(id);                  // ✅
```

Three things going on:

The brand `{ readonly __brand: 'UserId' }` makes the type nominally distinct.

The `asUserId` "smart constructor" is the only way to mint a `UserId` from a raw string. You concentrate the `as` cast there and treat it as the trust boundary.

Everywhere else in your codebase, `UserId` flows through without casts. The type system has been told once — "this string is a UserId" — and the rest is downstream of that trust.

### Naming the parts as they come up

- **Brand** — the phantom property used to distinguish nominally identical structural types.
- **Nominal typing** — types are equal only when explicitly declared equal (Java, C#). The opposite of structural.
- **Phantom type** — a type with no runtime representation. The brand field is phantom; you never set it, but the type system knows it's there.
- **Smart constructor** — a function that takes the unbranded type, performs validation, and returns the branded type. The trust boundary.
- **Opaque type** — a type whose internal structure is hidden from consumers. Branded types are TS's nearest approximation.
  - For more on the patterns, see the [TypeScript Deep Dive on branded types](https://basarat.gitbook.io/typescript/main-1/nominaltyping) and the [type-fest library's `Tagged` helper](https://github.com/sindresorhus/type-fest/blob/main/source/tagged.d.ts).

## Variations on the brand syntax

There's no single canonical syntax. Three common forms:

```ts
// 1. Literal brand field (simplest):
type UserId = string & { readonly __brand: 'UserId' };

// 2. Unique-symbol brand (truly impossible to spoof):
declare const userIdBrand: unique symbol;
type UserId = string & { readonly [userIdBrand]: 'UserId' };

// 3. Helper utility (generic):
type Brand<T, B> = T & { readonly __brand: B };
type UserId = Brand<string, 'UserId'>;
type Email = Brand<string, 'Email'>;
```

The `Brand<T, B>` helper is what most production codebases settle on. It's readable, composable, and consistent across your codebase. The `unique symbol` version is slightly more bulletproof (the brand can't be constructed accidentally from a string literal), but adds friction for diminishing returns.

The full pattern in practice usually lives in a `types/brand.ts` module:

```ts
// types/brand.ts
declare const brand: unique symbol;
export type Brand<T, B> = T & { readonly [brand]: B };

// types/ids.ts
import { Brand } from './brand';
export type UserId = Brand<string, 'UserId'>;
export type OrderId = Brand<string, 'OrderId'>;
export type ProductId = Brand<string, 'ProductId'>;

export const asUserId = (s: string): UserId => s as UserId;
// ...
```

## When branded types earn their keep

Three scenarios where the pattern is unambiguously worth the ceremony:

### 1. IDs across multiple entity types

```ts
type UserId = Brand<string, 'UserId'>;
type OrderId = Brand<string, 'OrderId'>;

function getOrder(orderId: OrderId): Order { /* ... */ }
function getUser(userId: UserId): User { /* ... */ }

declare const userId: UserId;
declare const orderId: OrderId;

getOrder(userId);    // ❌ caught at compile time
getOrder(orderId);   // ✅
```

The classic bug this prevents: passing a `userId` to a function that expects an `orderId`. Both are strings; both look identical at the call site. The brand makes them unequal at the type level.

### 2. Validated input

```ts
type Email = Brand<string, 'Email'>;
type PositiveInt = Brand<number, 'PositiveInt'>;

function asEmail(s: string): Email | null {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? (s as Email) : null;
}

function asPositiveInt(n: number): PositiveInt | null {
  return Number.isInteger(n) && n > 0 ? (n as PositiveInt) : null;
}
```

After validation, the value carries proof of its validity in its type. Downstream code that takes `Email` knows it's been validated — no need to revalidate, no risk of forgetting to. Combined with assertion functions (see [[Learning/TypeScript/Unions-And-Narrowing]]), this becomes the "parse, don't validate" pattern: parse the input *once* at the boundary, get a typed value that's true by construction.

### 3. Units of measure

```ts
type Meters = Brand<number, 'Meters'>;
type Feet = Brand<number, 'Feet'>;

function addMeters(a: Meters, b: Meters): Meters {
  return (a + b) as Meters;
}

declare const distance: Meters;
declare const height: Feet;

addMeters(distance, height);   // ❌ — Feet is not Meters
```

The Mars Climate Orbiter cost $327M to a unit-of-measure bug. Branded types model "this number is in feet" at the type level. Real engineering codebases (CAD, geospatial, scientific computing) use this pattern extensively.

Trade-off: arithmetic gets tedious. `(a + b) as Meters` is a small cast every operation. Some codebases write helper operators (`add`, `multiply`) to centralize the casts. For prose-level computation, the friction may not be worth it; for high-stakes physical-units code, absolutely.

## A concrete domain example — order processing

```ts
type UserId = Brand<string, 'UserId'>;
type OrderId = Brand<string, 'OrderId'>;
type ProductId = Brand<string, 'ProductId'>;
type Cents = Brand<number, 'Cents'>;          // store money as integer cents
type Email = Brand<string, 'Email'>;

type OrderLine = {
  productId: ProductId;
  quantity: number;
  unitPrice: Cents;
};

type Order = {
  id: OrderId;
  customerId: UserId;
  customerEmail: Email;
  lines: OrderLine[];
  total: Cents;
};

function createOrder(
  customerId: UserId,
  customerEmail: Email,
  lines: OrderLine[],
): Order {
  const total = lines.reduce(
    (acc, line) => acc + line.unitPrice * line.quantity,
    0,
  ) as Cents;

  return {
    id: generateOrderId(),
    customerId,
    customerEmail,
    lines,
    total,
  };
}
```

Notice what's structurally impossible here:

You can't pass a `ProductId` where an `OrderId` is expected.

You can't pass an unvalidated string as an `Email`.

You can't accidentally multiply `Cents` by `Cents` and pretend the result is still `Cents` (the cast forces you to think about whether the operation makes sense).

You can't store dollars instead of cents — the `Cents` brand is right there in the type, reminding everyone.

The `as Cents` cast on the reduce result is the only place arithmetic produces a branded number. You can hide it behind a helper if it gets used repeatedly. **The pattern concentrates the trust into smart constructors and explicit casts**, and lets the rest of the codebase flow through with full type safety.

## Costs and when not to brand

The ceremony isn't free. Three signs you're over-branding:

- **Every function call site needs a cast.** If you find yourself writing `asUserId(x as string)` everywhere, the brand isn't aligned with how data flows. Push the cast upstream (at the API boundary, the DB layer) so most call sites just pass branded values through.
- **The brand carries no runtime distinction.** A `Username` is a string; a `Bio` is a string. They're both display strings, used interchangeably. Branding them adds friction without preventing bugs. Brand things where mixing them up causes real damage.
- **Generic helpers stop being usable.** A `Map<UserId, User>` is fine; `Map<UserId, User> & Map<OrderId, Order>` is fighting the language. If you can't express a generic structure cleanly, the brand might be misplaced.
  - The discipline: brand **identifiers**, **validated inputs**, and **physical units**. Don't brand free-form text fields, arbitrary numbers, or already-distinct types. The pattern is a precision tool, not a default.

## Comparison: branded types vs alternatives

| Approach | Compile-time guarantee | Runtime cost | Ceremony |
|---|---|---|---|
| `type UserId = string` (alias) | None — fully interchangeable | None | None |
| Branded type `string & { __brand: 'UserId' }` | Strong — types are distinct | None (phantom) | Moderate (smart constructors) |
| Wrapper class `class UserId { constructor(public value: string) {} }` | Strong | Allocation per ID | High (`.value` everywhere) |
| Newtype via tagged union | Strong | None | High (constant unwrapping) |

Branded types are the sweet spot — strong guarantees, no runtime cost, manageable ceremony. The wrapper-class approach is the more traditional OOP answer and is sometimes worth it when you also want methods on the type (`UserId.toAnonymized()`). But you pay allocation and unwrap costs for every ID.

## 🔍 Quick check (try before scrolling)

- **Q1**: Why does this still compile, despite the brand?

```ts
type UserId = string & { readonly __brand: 'UserId' };
const id: UserId = 'user_42' as UserId;
const upper = id.toUpperCase();   // type? error?
```

- Show answer to Q1
  - It compiles. `id.toUpperCase()` returns `string`, not `UserId`. The intersection `string & { __brand: ... }` is structurally a string for purposes of method access; you can call any string method on it. **What you lose is the brand on the result.** Methods like `.slice`, `.toLowerCase`, etc., return plain `string` — the type system doesn't track the brand through string operations. This is usually fine: if you need to retain the brand, re-cast: `id.toLowerCase() as UserId` (or build a helper).
  - **Q2**: Two implementations of the same brand. Which is more "spoof-proof," and why?

```ts
// A:
type IdA = string & { readonly __brand: 'IdA' };

// B:
declare const idBrand: unique symbol;
type IdB = string & { readonly [idBrand]: 'IdB' };
```

- Show answer to Q2
  - **B is harder to spoof.** With `A`, you could in theory write `{ __brand: 'IdA' as const, ... }` and intersect it with a string by some contortion. With `B`, the brand key is a `unique symbol` that's only accessible via that specific `idBrand` declaration — there's no way to construct it accidentally. In practice, **A is what most codebases use** because the spoofing risk is theoretical (no one's writing that intersection by accident), and `A` is more readable. Use `B` when the cost of accidental compatibility is catastrophic (e.g., security tokens, signed values).
  - **Q3**: Why is the smart-constructor pattern (`asUserId(s: string): UserId`) better than scattering `as UserId` casts throughout the codebase?
- Show answer to Q3
  - Three reasons:
  - (1) **Validation lives in one place.** If you ever want to validate that a string is a well-formed user ID before branding, you have one function to modify, not 100 call sites.
  - (2) **The casts are explicit and grep-able.** `asUserId` calls are searchable; raw `as UserId` casts could be anywhere.
  - (3) **The trust boundary is visible in the type signature.** A function that takes `string` and returns `UserId` is *obviously* a trust crossing; an inline `as UserId` is easy to overlook in review. Smart constructors are how you make the lie a deliberate, auditable choice.

---

## 💪 Practice (a separate session, not your first read)

### Worked → faded → blank: a `Currency` brand with conversions

#### Worked example (read)

```ts
type Cents = Brand<number, 'Cents'>;
type Dollars = Brand<number, 'Dollars'>;

const cents = (n: number): Cents => Math.round(n) as Cents;
const dollars = (n: number): Dollars => n as Dollars;

function dollarsToCents(d: Dollars): Cents {
  return cents(d * 100);
}

function formatCents(c: Cents): string {
  return `$${(c / 100).toFixed(2)}`;
}

const price = dollars(9.99);
const stored = dollarsToCents(price);
console.log(formatCents(stored));   // "$9.99"
```

The brands prevent: passing dollars to something expecting cents (or vice versa), accidentally storing 9.99 in a database column meant for integer cents, accidentally formatting cents as dollars without dividing first.

#### Faded — fill in the blanks

Add a `Pence` brand (UK pennies) and conversion helpers:

```ts
type Pence = _____________________;
const pence = (n: number): Pence => Math.round(n) as Pence;

function pencePerCent(rate: number) {
  return function convert(c: Cents): Pence {
    return _________________________________;
  };
}
```

- Show the answer

```ts

- type Pence = Brand<number, 'Pence'>;
- const pence = (n: number): Pence => Math.round(n) as Pence;
- function pencePerCent(rate: number) {
- return function convert(c: Cents): Pence {
- return pence(c * rate);
- };
- }

```
  - The `pence(...)` smart constructor handles the cast. Without it, you'd have to `as Pence` inline, which is uglier and harder to validate consistently.

#### From scratch

Implement an `Email` brand with:

- A regex-based validator `asEmail(s: string): Email | null` (returns null for invalid).
- An assertion-function version `assertEmail(s: string): asserts s is Email`.
- A type guard `isEmail(s: string): s is Email`.

Discuss with yourself: which would you use at an HTTP body parser? Which would you use inside a hot loop? Which would you use in a one-off script?

### Worked → faded → blank: typed unique entity IDs

#### Worked example (read)

```ts
type UserId = Brand<string, 'UserId'>;
type Username = Brand<string, 'Username'>;
type OrderId = Brand<string, 'OrderId'>;

class UserRepo {
  getById(id: UserId): User { /* ... */ }
  getByUsername(username: Username): User { /* ... */ }
}

class OrderRepo {
  getById(id: OrderId): Order { /* ... */ }
  getForUser(userId: UserId): Order[] { /* ... */ }
}
```

Now consider: `userRepo.getById(orderId)` is a compile error. `orderRepo.getForUser(orderId)` is a compile error. `orderRepo.getById(username)` is a compile error. **Every cross-entity mistake is caught.**

#### Faded — fill in the blanks

You have a `Customer` and an `Address` entity. Brand their IDs, then write a function that fetches a customer's primary address. The signature should be impossible to call with the IDs swapped:

```ts
type CustomerId = _____________________;
type AddressId = _____________________;

declare function fetchAddress(
  _____________________,
  _____________________,
): Promise<Address>;

// Usage:
declare const customerId: CustomerId;
declare const addressId: AddressId;
fetchAddress(customerId, addressId);  // ✅
fetchAddress(addressId, customerId);  // ❌
```

- Show the answer

```ts

- type CustomerId = Brand<string, 'CustomerId'>;
- type AddressId = Brand<string, 'AddressId'>;
- declare function fetchAddress(
- customerId: CustomerId,
- addressId: AddressId,
- ): Promise<Address>;

```
  - Both parameters are nominally distinct, so swapping them at the call site is a type error. Note the parameter names are also useful for documentation, but the brands are what enforce correctness.

### Debug-this

```ts
type UserId = string & { readonly __brand: 'UserId' };

const id: UserId = 'user_42' as UserId;
const ids: UserId[] = [id];

const fromParams: string = req.params.userId;
ids.push(fromParams);   // ?
```

- Show the bug
  - The push is a type error (`string` not assignable to `UserId`) — that's working. The bug is **at the layer above**: how did we end up with `fromParams: string` in the first place? The answer is that the route handler should have called `asUserId(req.params.userId)` (a smart constructor that does validation) to convert the raw string into a `UserId` once, at the trust boundary. **Branded types are a contract; the smart constructor is where the contract is established.** Scattering `req.params.userId as UserId` everywhere defeats the brand.

### Teach-it-back

Without notes, in ~4 sentences:

> *"Your teammate says 'we already have `type UserId = string` — what does adding a brand buy us?' Explain the bug class branding catches, and give a concrete example of two structurally identical types where the brand prevents real damage."*

If you can't, the "structural compatibility is the wrong default sometimes" framing didn't stick.

---

## 🎴 Flashcards (for daily review, not the first read)

- What problem do **branded types** solve? #card #ts/branded-types
  - They prevent accidental interchange of two types that are structurally identical but semantically distinct (e.g., `UserId` vs `Email`, both strings). Adds a phantom property to break structural compatibility without runtime cost.
- {{cloze TypeScript's default is **structural** typing; branded types add **nominal** typing on demand.}} #card #ts/branded-types
- Canonical brand syntax? #card #ts/branded-types

```ts

- type UserId = string & { readonly __brand: 'UserId' };
- // or:
- type Brand<T, B> = T & { readonly __brand: B };
- type UserId = Brand<string, 'UserId'>;

```

- What's a **smart constructor**? #card #ts/branded-types
  - A function that takes the unbranded type, performs validation, and returns the branded type. Concentrates `as` casts into one place that can be audited. The trust boundary between unvalidated input and the rest of the codebase.

- {{cloze Branded types have **zero runtime cost** — the phantom brand property never exists at runtime.}} #card #ts/branded-types

- Three real-world places to reach for branded types? #card #ts/branded-types
  - **IDs** across entity types (UserId vs OrderId), **validated inputs** (Email after regex check), **units of measure** (Meters vs Feet, Cents vs Dollars).

- Why does `id.toUpperCase()` return `string` rather than `UserId` on a branded `UserId`? #card #ts/branded-types
  - String methods are typed to return `string` regardless of branding. The intersection makes `UserId` callable like a string, but the brand isn't preserved through methods. Re-cast or wrap in a helper if you need to retain the brand.

- Difference between literal-brand and unique-symbol-brand? #card #ts/branded-types
  - Literal: `{ __brand: 'UserId' }` — readable, slight theoretical spoof risk. Unique-symbol: `{ [brand]: 'UserId' }` — bulletproof against accidental construction, slightly more verbose. Most codebases use literal; unique-symbol for security-critical types.

- One sign you're **over-branding**? #card #ts/branded-types
  - Every function call site needs an `as Brand` cast. The brand should flow through naturally — if it doesn't, the smart constructor is in the wrong place (probably too far downstream).

- Branded types vs wrapper classes — which has runtime cost? #card #ts/branded-types
  - Wrapper classes (`class UserId { value: string }`) allocate an object per ID. Branded types are phantom — zero runtime cost. The trade-off: wrapper classes can attach methods (`UserId.parse`), brands cannot.

- Phrase that describes the parse-once-then-trust pattern? #card #ts/branded-types
  - **"Parse, don't validate"** — coined in the Haskell world but applies directly to TS. Validate at the boundary, get a branded type back, trust the type system from there on. Don't re-validate inside the codebase.

---

## ✅ Self-check before moving on

- Can I write a branded `UserId` type and a smart-constructor `asUserId` from scratch?
- Can I explain to a teammate why structural typing isn't enough for IDs across entity types?
- Can I name two domains where branded units of measure prevent real-world bugs?
- Can I identify when branding is overkill (free-form text, single-use types)?

If any "no", do one practice exercise above. If all "yes", move to [[Learning/TypeScript/Modules-And-Declarations]].

## 🔗 Related

- Up: [[Learning/TypeScript]]
- Prev: [[Learning/TypeScript/Template-Literal-Types]]
- Next: [[Learning/TypeScript/Modules-And-Declarations]]
- Related: [[Learning/TypeScript/Foundations]] (structural typing intro), [[Learning/TypeScript/Unions-And-Narrowing]] (assertion functions for smart constructors)
- Practice problems: [[Learning/TypeScript/Exercises]]
