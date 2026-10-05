# SOLID (distilled)

Adapted from the Wikipedia article "SOLID", CC BY-SA 4.0 (see ../LICENSE.md). Principles by
Robert C. Martin (2000); acronym by Michael Feathers (c. 2004). They originate in OO design but
apply to modules, services, and functional code.

| Letter | Principle | Rule | Why it matters |
| --- | --- | --- | --- |
| **S** | Single Responsibility | A class should have only one reason to change. | Easier to understand and modify; focused unit tests; changes to one responsibility do not ripple. |
| **O** | Open-Closed | Open for extension, closed for modification. | Add features without editing working code; fewer regressions; adapts to change. |
| **L** | Liskov Substitution | Code written against a base type must work unchanged with any subtype. | Polymorphism is safe; subtypes honour the contract; swapping types never breaks callers. |
| **I** | Interface Segregation | Clients must not depend on methods they do not use. | Looser coupling; targeted implementations; no dead dependencies. |
| **D** | Dependency Inversion | Depend on abstractions, not concretions. | Modules swap freely; easy to test; easier to understand and change. |

## Applying each

- **SRP.** "Responsibility" means a reason to change tied to one stakeholder or axis (persistence,
  formatting, rules, transport). Smell: "Manager"/"Util" classes, I/O mixed with computation, tests
  needing a database to check arithmetic. Fix: extract the secondary concern and inject it.
- **OCP.** New behaviour arrives as new code (strategy, subclass, handler, registration), not edits.
  Smell: the same `switch` on a type tag in several places; every feature touches one core file.
  Fix: abstract the varying part; one implementation per case. Abstract only along axes that
  actually vary.
- **LSP.** Subtypes keep preconditions no stronger, postconditions no weaker, invariants intact, no
  surprise exceptions. Smell: overrides that throw `NotImplemented`, `Square extends Rectangle`,
  `instanceof` checks before use. Fix: composition over inheritance, split the hierarchy, or narrow
  the base contract.
- **ISP.** Smell: 10+ method interfaces, empty implementations, mocks that stub everything to test
  one call. Fix: role interfaces (`Readable`, `Writable`, `Closeable`) the concrete class combines.
- **DIP.** High-level policy owns the abstraction; concretes are supplied from outside (constructor
  injection, factory, composition root). Smell: `new ConcreteRepository()` inside a service;
  business logic importing an ORM or SDK; tests that need network or disk. Fix: define the interface
  next to the consumer, inject the implementation, wire at the entry point.

Do not gold-plate: an interface with one implementation and no foreseeable second is speculation.
