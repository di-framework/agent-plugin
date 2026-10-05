# Uncle Bob on test doubles (distilled)

From Robert C. Martin, "The Little Mocker" (14 May 2014) and "When to Mock" (10 May 2014), The
Clean Code Blog. Quotations and the canonical examples are reproduced for commentary (see
../LICENSE.md).

## The Little Mocker

"Mock" is slang for the whole family; the formal term is **Test Double**. Every example implements:

```java
interface Authorizer { Boolean authorize(String username, String password); }
```

**Dummy.** Passed in because a parameter is required; never used.
```java
class DummyAuthorizer implements Authorizer {
  public Boolean authorize(String u, String p) { return null; }
}
```
Returning `null` is "the best thing a Dummy can return": accidental use fails with a
`NullPointerException` instead of passing silently.

**Stub.** Returns a canned answer to drive the system down a path.
```java
class AcceptingAuthorizerStub implements Authorizer {
  public Boolean authorize(String u, String p) { return true; }
}
```
Why not log in for real? "You already know that login works... it takes time. And it requires
setup. And if there's a bug in login, your test will break. And, after all, it's an unnecessary
coupling." A `false` stub tests the unauthorized path.

**Spy.** A stub that records how it was called.
```java
class AcceptingAuthorizerSpy implements Authorizer {
  public boolean authorizeWasCalled = false;
  public Boolean authorize(String u, String p) { authorizeWasCalled = true; return true; }
}
```
Can count calls and capture arguments. Warning: "The more you spy, the tighter you couple your
tests to the implementation of your system. And that leads to fragile tests" (tests that "break for
reasons that shouldn't break a test").

**Mock (a "True Mock").** A spy that holds and verifies its own expectation.
```java
class AcceptingAuthorizerVerificationMock implements Authorizer {
  public boolean authorizeWasCalled = false;
  public Boolean authorize(String u, String p) { authorizeWasCalled = true; return true; }
  public boolean verify() { return authorizeWasCalled; }
}
```
"Mocks know what they are testing." They test behaviour: "what functions were called, with what
arguments, when, and how often." Moving the expectation into the double is a coupling, accepted
because "it makes it a lot easier to write a mocking tool" (JMock, EasyMock, Mockito).

**Fake.** A simplified implementation with real business behaviour; a simulator.
```java
class AcceptingAuthorizerFake implements Authorizer {
  public Boolean authorize(String u, String p) { return u.equals("Bob"); }
}
```
"Fakes have real business behavior; stubs do not." They "can get extremely complicated. So
complicated they need unit tests of their own. At the extremes the fake becomes the real system."

**Hierarchy.** "A Mock is a kind of spy, a spy is a kind of stub, and a stub is a kind of dummy. But
a fake isn't a kind of any of them."

**What he uses.** "Mostly I use stubs and spies. And I write my own, I don't often use mocking
tools." Dummies rarely; mocks only when a tool is in play; fakes "I haven't written one for over
thirty years." The IDE implements the interface in one step (a dummy); one edit makes a stub or
spy. Mocking tools bring "strange syntax" and "complications they add to my setups."

## When to Mock

Mocks give "isolation and introspection", but "like all power tools, mocks come with a cost."

**No mocks:** suites take "dozens of minutes, perhaps hours"; error paths and dangerous operations
(deleting files or tables) go untested; state machines cannot be fully walked; tests fail on network
timing, stray rows, modified config, memory pressure. "Slow, incomplete, and fragile."

**Too many mocks:** reflection-based tools are slow; "mocks that return other mocks"; setup "can get
extremely complicated"; tests "tightly coupled to implementation details"; an "explosion of
polymorphic interfaces" whose sole purpose is mocking. "This is over-abstraction and the dreaded
'design damage'."

**Goldilocks heuristics:**

1. **"Mock across architecturally significant boundaries, but not within those boundaries."** Mock
   the database, web server, and external services. Gains: speed, insensitivity to the mocked
   components' failures, every failure scenario testable, every state-machine path reachable, no
   mocks returning mocks. It also forces you to identify your real boundaries and "enforce them
   with polymorphic interfaces." "Good architectures are inherently testable."
2. **"Write your own mocks."** Restricted to boundaries, tools are rarely needed. Hand-written
   doubles are trivial with IDE support, get names and a directory so they are reused, make you
   design your mocking structure, and are "extremely fast" (no reflection). Tools can override
   sealed or final types, but that "comes at a significant cost": a DSL of "dots and parentheses."

**Conclusion.** "Mock sparingly. Find a way to test, design a way to test, your code so that it
doesn't require a mock. Reserve mocking for architecturally significant boundaries; and then be
ruthless about it." If you use a tool, "use it with a very light touch." And: "heuristics are just
guidelines, not rules. I violate my own heuristics when given sufficient reason."
