# Test double taxonomy (distilled)

From Gerard Meszaros, *xUnit Test Patterns* (2007), chapter "Test Double", and Martin Fowler's
"Test Double" (2006) and "Mocks Aren't Stubs" (2007). Quotations reproduced for commentary (see
../LICENSE.md).

## Vocabulary

- **SUT**: system under test. **DOC**: depended-on component being replaced.
- **Indirect inputs**: what the SUT receives from a DOC (returns, exceptions). A double that
  controls them is a *control point*.
- **Indirect outputs**: calls the SUT makes on a DOC. A double that observes them is an
  *observation point*.

A Test Double "merely has to provide the same API as the real one so that the SUT thinks it is the
real one." Implement only what the test needs, not the whole interface.

## The five kinds (Fowler's wording)

| Kind | Definition |
| --- | --- |
| **Dummy** | "Passed around but never actually used. Usually they are just used to fill parameter lists." |
| **Stub** | "Provide canned answers to calls made during the test, usually not responding at all to anything outside what's programmed in for the test." |
| **Spy** | "Stubs that also record some information based on how they were called," e.g. an email service that counts messages sent. |
| **Mock** | "Pre-programmed with expectations which form a specification of the calls they are expected to receive"; may throw on unexpected calls and are "checked during verification." |
| **Fake** | "Actually have working implementations, but usually take some shortcut which makes them not suitable for production (an InMemoryTestDatabase is a good example)." |

Meszaros: a spy is "'just a' Test Stub with some recording capability" and its tests read like stub
tests; a mock puts "the emphasis on the verification of the indirect outputs" and "is used in a
fundamentally different way." A fake is used "for reasons other than verification," typically
because the real DOC is unavailable, too slow, or has side effects; replacing a database with
in-memory hash tables made his tests "run 50 times faster."

## When to use one

An untested requirement with no observation point; untested code with no control point; slow tests.
Guard rails: keep "at least one test that verifies it works without a Test Double"; never replace
"the parts of the SUT that we are trying to verify"; excessive doubles cause "Fragile Tests as a
result of Overspecified Software."

## Classical vs mockist

- **State verification** checks outputs or state after exercise; stubs and spies; assertion in the
  test. **Behaviour verification** checks the calls made; mocks; expectations set before, verified
  after.
- **Classical TDD** uses real objects where practical and doubles only where awkward (slow,
  non-deterministic, side-effecting). Tests survive refactoring.
- **Mockist TDD** (London school, *Growing Object-Oriented Software, Guided by Tests*) doubles
  every collaborator and designs outside-in through interaction expectations. More coupled to
  implementation; drives interface discovery.

Uncle Bob is classical, with a precise rule for where "awkward" starts: at architecturally
significant boundaries. His "write your own, name them, put them in a directory" answers
Meszaros's implementation questions (reusable or per-test, coded or generated, how installed) in
favour of reusable, hand-written, injected doubles.
