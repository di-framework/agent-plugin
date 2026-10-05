---
name: principled-engineering
description: Design, write, test, configure, and review production code using design calibration, clear naming, SOLID, boundary test doubles, and Twelve-Factor practices. Use for architecture or code reviews, refactoring, new services, maintainability, testability, naming, and decisions about how much structure a change needs.
license: Mixed. Naming material MIT; SOLID and Twelve-Factor reference text CC-BY-SA-4.0; test-doubles and design-calibration text MIT with cited quotations. See LICENSE.md
metadata:
  composed-from: design-calibration, naming-cheatsheet, solid-principles, test-doubles, twelve-factor-apps
  design-calibration-source: Sandro Mancuso, the design inflection point
  naming-source: https://github.com/kettanaito/naming-cheatsheet
  solid-source: https://en.wikipedia.org/wiki/SOLID
  twelve-factor-source: https://12factor.net/
  test-doubles-source: https://blog.cleancoder.com/uncle-bob/2014/05/14/TheLittleMocker.html
  version: "2.0"
---

# Principled engineering

Five disciplines, one habit: make the next change cheap. Design calibration decides how much
structure the evidence justifies. Names make code readable without reading the implementation.
SOLID keeps change local. Test doubles at the right boundaries keep tests fast and honest.
Twelve-Factor keeps a service portable and disposable. They reinforce each other, so this skill
applies them together rather than as five separate checklists.

Each pillar is distilled to its rules and canonical examples under `references/`. Read one when you need
the exact wording, a complete example, or a direct quotation:

| Pillar | Reference |
| --- | --- |
| Design calibration | [references/design-calibration.md](references/design-calibration.md) |
| Naming | [references/naming-cheatsheet.md](references/naming-cheatsheet.md) |
| SOLID | [references/solid.md](references/solid.md) |
| Test doubles | [references/test-doubles-uncle-bob.md](references/test-doubles-uncle-bob.md) and [references/test-doubles-taxonomy.md](references/test-doubles-taxonomy.md) |
| Twelve-Factor | [references/twelve-factors.md](references/twelve-factors.md) |

## How the pillars interlock

- **Calibration sets the dial for everything else.** SOLID, doubles, and Twelve-Factor each
  describe structure; calibration says how much of it the evidence justifies. An interface (DIP)
  is worth building when $p > p^* = \Delta C / \Delta A$ for the change it hides, or when it sits
  on a one-way door ($r \gg 1$). Below that threshold, the straightforward design wins and a
  tripwire records when to revisit.
- **Forces of change are SRP with a probability attached.** A boundary is justified today when
  two responsibilities have disjoint reasons to change ($F(a) \cap F(b) \approx \varnothing$).
  That is the Single Responsibility Principle, and it needs no future scenario because $p = 1$.
- **DIP draws the boundaries that test doubles stand on.** Dependency Inversion says high-level
  policy depends on an abstraction it owns; Uncle Bob says mock across architecturally significant
  boundaries and nowhere else. Those are the same lines. If you cannot find a clean place for a
  stub, the dependency has not been inverted yet.
- **Twelve-Factor backing services are those boundaries made concrete.** Databases, queues, caches,
  mail, and third-party APIs are attached resources (factor IV) reached through config (factor III).
  Each one is a seam that gets an interface (DIP), a hand-written stub or spy in unit tests, and one
  real integration test.
- **SRP decides what gets a name; the cheatsheet decides what the name is.** A class with one reason
  to change has a one-noun name. A method inside it drops the class's context
  (`MenuItem.handleClick`, not `handleMenuItemClick`). Doubles follow the same pattern:
  `StubReportRepository`, `SpyMailer`, so the kind and the role both read at a glance.
- **OCP and stateless processes both resist the same smell.** A growing `switch` on a type tag
  (OCP) and an in-memory cache that only works on one instance (factor VI) are each a place where a
  new requirement forces edits to working code instead of adding something alongside it.
- **Disposability needs ISP.** A process that must shut down in seconds on `SIGTERM` can only do so
  if its dependencies expose small, honest interfaces it can drain and close, not fat ones with
  hidden background work.

## Workflow

Run these stages in order when building; run the review checklist at the end when reviewing.

### 0. Calibrate (design calibration)

1. Name the decision and the candidate designs: straightforward $D_s$ versus future-proof $D_f$.
2. List the scenarios that would make $D_f$ pay and classify each: known ($p = 1$, in this release
   or the next scheduled feature), scheduled, plausible, or imagined ($p \approx 0$).
3. Estimate $\Delta C$ (build plus carry over readers and lifetime) and $\Delta A$ (retrofit cost
   if the scenario lands on $D_s$), scaled by irreversibility $r$ for schemas, public contracts,
   wire formats, and storage.
4. Compute $p^* = \Delta C / \Delta A$ first, then compare with $p$. Choose $D_f$ only if
   $p > p^*$. Otherwise choose the lowest design level whose precondition holds and record a
   tripwire: the observation that would push $p$ past $p^*$.
5. If you cannot yet see the solution, let it emerge through small increments; if you can, design
   it deliberately. Do not pretend not to know.

The remaining stages apply to whatever level calibration selected. A boundary justified by
independent forces of change passes calibration automatically.

### 1. Draw the boundaries (SOLID + Twelve-Factor)

1. List every external thing the code touches: database, HTTP, filesystem, clock, queue, SDK, mail.
   Each is a Twelve-Factor backing service and a DIP boundary.
2. Define one small interface per boundary, owned by the consumer, named for the role
   (`ReportRepository`, `Clock`, `PaymentGateway`). Keep each interface to the methods this client
   actually uses (ISP).
3. Read every per-deploy value (URLs, credentials, flags, ports) from the environment (factor III).
   Nothing environment-specific is hardcoded or branched on by environment name.
4. Give each module one reason to change (SRP). Business rules, persistence, formatting, and
   transport live in different units.
5. Wire concrete implementations once, at the entry point (composition root), never inside
   business logic.

### 2. Name everything (naming cheatsheet)

Run every identifier through the checklist: English; the codebase's one convention; Short,
Intuitive, Descriptive; no contractions; no duplicated context; reflects the expected result;
singular for one value, plural for collections.

Functions follow `prefix? + action + high context + low context?`. Pick the verb precisely:

| Verb | Meaning | Pairs with |
| --- | --- | --- |
| `get` | access or fetch data | |
| `set` / `reset` | assign a value / restore the initial value | |
| `remove` | take something out of a place | `add` |
| `delete` | erase something from existence | `create` |
| `compose` | build new data from existing data | |
| `handle` | react to an event; the callback verb | |

Booleans take `is` (state), `has` (possession), or `should` (conditional tied to an action).
Limits take `min`/`max`; transitions take `prev`/`next`. Context order carries meaning:
`shouldUpdateComponent` (you update it) vs `shouldComponentUpdate` (it updates itself).

### 3. Test with doubles at the boundaries (test doubles)

1. Inside a boundary, use real objects. Pull logic into pure functions so most tests need no
   double at all.
2. At each boundary pick the weakest double that works, stopping at the first yes:
   never called in this test → **dummy** (return `null` so misuse fails loudly);
   only its return value matters → **stub**;
   you must see that it was called → **spy**, with the assertion in the test;
   the double should verify itself → **mock**, usually only via a framework;
   it needs real, data-driven behaviour → **fake**, which then needs its own tests.
3. Write doubles by hand in a named directory (`test/doubles/`) so they get names and get reused.
   Reach for Mockito, Jest automocks, `unittest.mock`, or similar only for things a plain class
   cannot do (sealed or final types), and then lightly.
4. Assert on outcomes, not choreography. Verify only the interaction the test is about.
5. Keep at least one integration test per boundary against the real collaborator so doubles
   cannot drift from reality unnoticed.

### 4. Make it deployable (Twelve-Factor)

Confirm the service satisfies the twelve factors:

| # | Factor | Check |
| --- | --- | --- |
| I | Codebase | One repo, many deploys; shared code is a versioned dependency |
| II | Dependencies | Lockfile plus isolation; no undeclared system tools |
| III | Config | Per-deploy values in the environment; could the repo be open-sourced safely? |
| IV | Backing services | Swapping a resource changes only a URL in config |
| V | Build, release, run | Immutable artifact + config = release with an ID; rollback by pointing at an old release |
| VI | Processes | Stateless, share-nothing; no sticky sessions, no local disk as a store |
| VII | Port binding | Listens on `$PORT` with an embedded server |
| VIII | Concurrency | Scale by process type (web, worker, scheduler) under the platform's process manager |
| IX | Disposability | Fast start; `SIGTERM` drains in-flight work; jobs are idempotent |
| X | Dev/prod parity | Same backing service types and versions everywhere; deploy hours after writing |
| XI | Logs | Unbuffered event stream to stdout; the platform aggregates |
| XII | Admin processes | Migrations and consoles ship with the release and run in the same environment |

## Review checklist

When reviewing, score each pillar and report findings tagged by pillar. Rank by blast radius:
config and boundary problems first, naming last unless it blocks comprehension.

| Tag | Look for | Typical fix |
| --- | --- | --- |
| `[CAL]` | Interface, generic, plugin point, or config with no named scenario; justification is "what if" or "someday"; $x > x^*$ | Name the scenario and estimate $p$ against $p^* = \Delta C / \Delta A$; drop to the lowest justified level and set a tripwire. Or the reverse: $n \ge 3$ drifting duplicates with a known axis means $x < x^*$ |
| `[SRP]` | Class changes for unrelated reasons; I/O mixed with computation | Extract the secondary concern; inject it |
| `[OCP]` | `switch` on type tags repeated; every feature edits the same core file | Strategy or registration table |
| `[LSP]` | Overrides that throw; `instanceof` checks before using a subtype | Composition, split hierarchy, narrow base contract |
| `[ISP]` | 10+ method interfaces; empty implementations; stub-everything mocks | Role interfaces |
| `[DIP]` | `new ConcreteRepository()` inside a service; business logic importing an ORM or SDK | Interface next to the consumer; inject at the root |
| `[NAME]` | Contractions, duplicated context, `isX` then negated, invented verbs, plural/singular swap | Rename per the cheatsheet; note public-API breakage |
| `[DOUBLE]` | Mocks inside a boundary; mocks returning mocks; verifying every call; fake with no tests; no real-boundary test | Real object or pure function; move double to the boundary; add an integration test |
| `[12F-n]` | Hardcoded config, local state, file logs, no `SIGTERM` handling, dev/prod drift, migrations run by hand | The factor's rule; cite the factor number |

Report format:

```
[CAL] exporters/registry.ts:1 — plugin registry with one exporter (CSV).
  Why: no second format is known or scheduled; p ≈ 0.1 against p* = 10/30 ≈ 0.33; carry paid by every reader.
  Fix: inline CSV export (level 1); tripwire: introduce an Exporter interface when a second format is scheduled.

[DIP] OrderService.ts:18 — constructs StripeClient directly.
  Why: business logic now depends on a vendor SDK; tests need network; swapping providers edits core code.
  Fix: define PaymentGateway next to OrderService; inject StripeGateway at the composition root.

[DOUBLE] OrderServiceTest.ts:31 — mocks PriceCalculator, a same-module class.
  Why: test welded to how totals are computed; any refactor breaks it.
  Fix: use the real PriceCalculator; stub only PaymentGateway.

[12F-III] config/prod.ts:4 — database password committed.
  Why: secret in source; environments diverge by file.
  Fix: read DATABASE_URL from the environment; add .env.example; rotate the secret.

[NAME] cart.ts:42 — `onItmClk`.
  Why: contraction; unreadable at a glance.
  Fix: `onItemClick`.
```

Close with a ranked top-three list and an explicit note of what already follows the principles,
so the reader knows what to leave alone.

## Worked example: a new service endpoint

Request: "add an endpoint that emails a weekly report."

1. **Calibrate.** Two known boundaries (database, SMTP) with $p = 1$; one plausible scenario
   (a second delivery channel) with $p$ below $p^*$. Decision: interfaces for the two boundaries,
   no channel abstraction yet, tripwire "when a second channel is scheduled".
2. **Boundaries.** Report rows come from Postgres; email goes through SMTP. Define
   `ReportRepository` and `Mailer` interfaces next to the service. Read `DATABASE_URL` and
   `SMTP_URL` from the environment and construct `PostgresReportRepository` and `SmtpMailer` at
   the entry point.
3. **Names.** `ReportService.deliver(reportId)`; `ReportFormatter.compose(rows)`; the handler is
   `handleWeeklyReportRequest`. Boolean `hasRows`, not `isRowsExist`.
4. **Tests.** `StubReportRepository` returns two canned rows; `SpyMailer` records the message;
   `ReportFormatter` is real. One test asserts the sent body contains the formatted rows. One
   integration test runs the real repository against a disposable Postgres.
5. **Deploy.** Process type `web` binds `$PORT`; a `scheduler` process type triggers the weekly
   run; logs go to stdout as JSON; the migration adding the report table ships with the release
   and runs as an admin process.

## Judgement calls

- **Proportionality is calibration.** Scripts, prototypes, and notebooks need good names and
  little else: short lifetime $T$ and few readers $R$ make carry cheap but also make every
  future scenario improbable, so $x^*$ is low. Apply SOLID, doubles, and Twelve-Factor in
  proportion to $p$ and $r$, not to how serious the code feels. An interface with one
  implementation and no scenario behind it is $x > x^*$.
- **Ecosystem conventions win.** Framework idioms (React `handleX`, Django settings modules, Go
  `PascalCase` exports, Rails callbacks) override personal taste. Flag real risks, not deviations
  the framework intends.
- **Twelve-Factor is for network services.** For libraries and CLIs only Dependencies, Config, and
  Logs usually transfer. On Kubernetes, serverless, or edge runtimes keep the intent (immutable
  releases, env-driven config, stateless processes) over the letter.
- **Mockist codebases.** If the team deliberately practises outside-in, expectation-driven testing,
  respect it, but still push doubles toward boundaries and keep one real-collaborator test each.
- **Heuristics, not laws.** Uncle Bob's own caveat applies to all four pillars: violate a heuristic
  when you have sufficient reason, and say what the reason is in the code or the review.
