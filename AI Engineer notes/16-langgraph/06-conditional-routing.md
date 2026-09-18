# Conditional Routing

> **Phase 16 · LANGGRAPH · Topic 06**

## 1. Definition

Choosing the next node at runtime by evaluating a function over the current state. It's how a graph expresses decisions while keeping the set of possible destinations declared and fixed.

## 2. Simple Explanation

After a node runs, a routing function looks at the state and returns which branch to take. The graph maps that return value to a node.

The model can influence the decision — through values it put in state — but it can't choose a destination that wasn't declared.

## 3. How It Works

```python
def after_grading(state: State) -> str:
    if state["top_score"] >= 0.55 and len(state["documents"]) >= 2:
        return "generate"
    if state["attempts"] < MAX_ATTEMPTS:
        return "rewrite"
    return "abstain"

g.add_conditional_edges("grade", after_grading, {
    "generate": "generate",
    "rewrite":  "rewrite",
    "abstain":  "abstain_node",
})
```

**Three properties worth noticing:**

```
· every branch is reachable and declared
· the function is a pure function of state — testable
· no LLM call, so it's free, fast, and deterministic
```

## 4. Practical Example

**The decision hierarchy I'd apply:**

```
1. DETERMINISTIC RULE over state        ← first choice
   thresholds, counters, flags, presence checks

2. CLASSIFIER (small model, structured output)
   when the decision needs to interpret text — intent
   routing, question-type detection

3. FULL LLM REASONING                   ← last resort
   only when the decision genuinely requires judgment over
   the whole context

Most routing decisions people implement at level 3 belong at
level 1. A threshold comparison doesn't need a model.
```

**Where a model-based router IS appropriate:**

```
"Is this a simple factual lookup or a multi-part
 investigative question?"

That needs to read and interpret the question — a rule can't
do it reliably. A small model with structured output
returning one of three enum values is the right tool.

But I'd still make the OUTPUT constrained to declared
options, so the model chooses among branches rather than
producing a destination.
```

**Routing for the banking abstention path:**

```
if state["top_score"] < FLOOR:              → abstain
if state["unsupported_claims"]:             → abstain
if state["requires_approval"]:              → human_review
if state["action_is_irreversible"]:         → human_review

These are the safety branches, and they should be
deterministic rules evaluated BEFORE any model-influenced
routing — so a model can't route around a safety check.
```

**That ordering is the important design point:** safety conditions are checked first, in code, and they take precedence over whatever the model would prefer.

## 5. Why It Matters

- **Deterministic rules over state** are free, testable, and auditable.
- **Model routing should still return declared enum options**, not destinations.
- **Safety branches evaluated first, in code**, prevent routing around checks.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **LLM calls for threshold decisions** | Cost and non-determinism for nothing |
| **Unreachable branches** | Declared but never returned — dead code |
| **Missing default** | Unhandled state combinations |
| **Safety checks after model routing** | Can be bypassed |
| **Routing logic sprawling** | Long if-chains harder to read than a graph |
| **Uncalibrated thresholds** | Routing fires wrongly in both directions |

**On threshold calibration:** a routing function comparing `top_score` to 0.55 is only as good as that number. It must come from labelled score distributions for your embedding model and corpus — a value copied from elsewhere routes correct answers to abstention or weak context to generation, and neither failure is visible from the routing code.

**On unreachable branches:** a mapping entry the routing function never returns is dead code that looks like a handled case. Testing every declared branch — asserting that some state produces each return value — catches it and is cheap to do given routing functions are pure.

## 7. Interview Answer

> "Conditional routing evaluates a function over the current state to choose the next node, with the graph mapping return values to declared destinations. The model can influence the decision through values it put in state, but it can't choose a destination that wasn't declared — that's what keeps paths enumerable.
>
> The hierarchy I'd apply: a deterministic rule over state first — thresholds, counters, flags. A small classifier with structured output second, when the decision needs to interpret text. Full LLM reasoning last, only when it genuinely requires judgment over the whole context. Most routing decisions people implement with a model call belong at the first level; a threshold comparison doesn't need a model.
>
> Where a model router is right is something like 'is this a simple factual lookup or a multi-part investigative question' — that needs to read and interpret the question and a rule can't do it reliably. But I'd still constrain the output to declared enum options, so the model chooses among branches rather than producing a destination.
>
> The design point I'd emphasize is ordering for safety branches. Checks like 'top score below the floor, abstain', 'unsupported claims present, abstain', 'action is irreversible, human review' should be deterministic rules evaluated before any model-influenced routing. That way the model can't route around a safety check — it only gets to decide among the paths that remain after the safety conditions have been applied.
>
> Two things I'd watch. Threshold calibration — a comparison against 0.55 is only as good as that number, and it has to come from labelled score distributions for our embedding model and corpus. A value copied from elsewhere routes correct answers to abstention or weak context to generation, and neither failure is visible from reading the routing code.
>
> And unreachable branches. A mapping entry the routing function never returns is dead code that looks like a handled case. Since routing functions are pure functions of state, testing that some state produces each declared return value is cheap and catches it."

## 8. Likely Follow-ups

**Q: Should routing use an LLM?**
Rarely. A deterministic rule over state is free, fast, testable, and auditable, and most routing decisions — thresholds, counters, presence checks — are expressible that way. A small classifier is right when the decision needs to interpret text; full LLM reasoning should be the last resort.

**Q: How do you keep safety checks from being bypassed?**
Evaluate them first, in code, before any model-influenced routing. Abstention on low scores, abstention on unsupported claims, human review on irreversible actions — those are deterministic rules applied up front, so the model only chooses among what remains.

**Q: What if a model does the routing?**
Constrain its output to declared enum options rather than letting it name a destination. It then chooses among branches you approved, which preserves the enumerable-paths property even though the choice itself is model-driven.

**Q: How do you validate the routing?**
Test every declared branch — assert that some state produces each return value. Routing functions are pure functions of state, so that's cheap, and it catches unreachable branches that look like handled cases but are actually dead code.

**Q: What makes a threshold-based route reliable?**
Calibration. The threshold has to come from labelled score distributions for your specific embedding model and corpus. A copied value routes correct answers to abstention or weak context to generation, and neither shows up as a bug in the routing code itself.

## 9. Common Mistakes

- Using an LLM call for a threshold comparison.
- Evaluating safety checks after model-influenced routing.
- Letting a model produce a destination rather than an enum option.
- Leaving unreachable branches in the mapping.
- Using an uncalibrated relevance threshold in routing.

## 10. What to Remember

- **Routing functions are pure functions of state** — testable and free.
- **Rule first, classifier second, LLM last.**
- **Safety branches evaluated first, in code** — so they can't be bypassed.
- **Model routers return declared enum options**, not destinations.
- **Test every branch**; calibrate every threshold.
