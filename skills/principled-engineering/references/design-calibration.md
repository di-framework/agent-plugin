# Design calibration (distilled formal model)

From the design-calibration skill: Sandro Mancuso's design inflection point stated as an
expected-cost optimization, with supporting ideas from Fowler, Metz, Parnas, Beck, Bezos, and
Ousterhout. Original text MIT (see ../LICENSE.md).

## Objects

$$
\begin{aligned}
x &\quad \text{design investment; discrete levels } \{0,1,2,3,4\} = \{\text{Inline},\text{Named},\text{Hidden},\text{Pluggable},\text{Platform}\} \\
i \in S,\ p_i &\quad \text{future scenarios and the certainty each occurs} \\
C(x) &= B(x) + K(x) + L(x) \quad \text{present cost: build, carry } (\kappa\,x\,R\,T), \text{ delay} \\
A_i(x) &\quad \text{future adaptation cost under scenario } i
\end{aligned}
$$

Carry is paid with certainty for the whole lifetime; adaptation only if the scenario occurs.

## Objective and inflection point

$$
J(x) = C(x) + \sum_i p_i A_i(x), \qquad x^* = \arg\min_x J(x), \qquad C'(x^*) = -\sum_i p_i A_i'(x^*)
$$

Invest until marginal present cost equals expected marginal future saving. $x < x^*$ is
under-engineered; $x > x^*$ is speculation (investment exceeds certainty).

## Certainty determines investment

$$
x^* = f(p), \qquad \frac{dx^*}{dp} > 0
$$

| $p$ | Evidence class | Consequence |
| --- | --- | --- |
| $\approx 0$ | imagined ("what if", "someday") | simplest design |
| $< p^*$ | plausible | straightforward wins |
| $> p^*$ | scheduled or strongly evidenced | design for it, proportionally |
| $1$ | known (this release, next scheduled feature) | design for it fully where $\Delta A > \Delta C$ |

## Discrete threshold

$$
\Delta C = C(D_f) - C(D_s), \qquad \Delta A = A(D_s) - A(D_f), \qquad
\text{choose } D_f \iff p > p^* = \frac{\Delta C}{\Delta A}
$$

Compute $p^*$ before estimating $p$. Example: $\Delta C = 10,\ \Delta A = 50 \Rightarrow p^* = 0.2$.

## Wrong abstraction

Per axis $j$: $\partial A_i / \partial x_j < 0$ only when axis $j$ matches scenario $i$, otherwise
$\ge 0$. Generality on an unevidenced axis adds expected repair cost. When an abstraction sprouts
parameters and conditionals per caller, the sign has flipped: inline it and re-observe.

## Reversibility

$$
A_i(x) = r_i\, a_i(x), \qquad p^* = \frac{\Delta C}{r_i\,\Delta a_i}
$$

One-way doors ($r \gg 1$: schema, public contract, wire format, storage, external integration)
justify design at lower certainty. Two-way doors ($r \approx 1$: internal code) are decided fast
and simple.

## Two uncertainties

Future uncertainty is the $p_i$. Solution uncertainty is a prior over the shape of $C$ and $A$.
With value of information $V = \mathbb{E}_M[\min_x J_M] - \min_x \mathbb{E}_M[J_M] \ge 0$:
$V > $ cost of delay $\Rightarrow$ let the design emerge (classicist TDD); $V \approx 0$ (solution
visible) $\Rightarrow$ design deliberately. Do not pretend not to know.

## Boundaries from forces of change

$$
\text{boundary justified now} \iff F(a) \cap F(b) \approx \varnothing
$$

Cohesion test: inlining collaborator $c$ into $u$ keeps cohesion $\Rightarrow$ composition; lowers
it $\Rightarrow$ aggregation (boundary). These have $p = 1$ and need no future scenario.

## Level preconditions

| Level | Precondition |
| --- | --- |
| 0 Inline | $n \le 1$ instances, no named axis |
| 1 Named | $n = 2$, or one named axis |
| 2 Hidden | known scenario on the axis, or independent forces of change, or $r \gg 1$ |
| 3 Pluggable | $\ge 2$ implementations existing or scheduled; axis confirmed by use (rule of three) |
| 4 Platform | levels 0 to 3 operated; many consumers amortize carry; broad variation with $p \approx 1$ |

Choose the lowest level whose precondition holds; levels are per decision. Same objective at
every scale: string, type, class, module, architecture, service.

## Tripwires

Commit to $x_0$; upgrade to $x_1$ when $P(i \mid o) > p^*$; downgrade when the scenario fails to
materialize by time $t$. Defer while expected information gain exceeds the cost of deciding later,
up to the last responsible moment.

## Release bound

For the release set $R$, $p_i = 1$: $x^*_{\text{release}} = \arg\min_x [C(x) + \sum_{i \in R} A_i(x)]$
is a lower bound on justified investment and usually all of it.

## Disagreement and review

$D^*(\theta_A) \ne D^*(\theta_B)$ when beliefs differ: argue about $p$, $\Delta C$, $\Delta A$, not
designs. Review tests: $Q_1$ which $i$? $Q_2$ what is $p_i$ (known, scheduled, plausible,
imagined)? $Q_3$ is $x > x^*$?

## Rule

Use what you know ($p = 1$ terms). Do not pay for what you merely imagine ($p \approx 0$ terms).
Design investment $\le$ certainty $\times$ expected future benefit.
