# "How Did Your Graph Work?"

> **Phase 16 · LANGGRAPH · Topic 19**
>
> ⚠️ **An answer framework, not a script.** The structure and reasoning are
> the transferable part. Fill in your own project's specifics — and if your
> graph was simpler than the example, say so; that's a better answer than
> describing something you didn't build.

## 1. Definition

An open question testing whether you can explain an architecture clearly and justify its decisions. The interviewer wants the shape, the reasoning behind two or three choices, and evidence you know where it was weak.

## 2. Simple Explanation

Describe the path a request takes, then explain why it branches where it does.

The failure mode is narrating every node. A strong answer gives the shape in thirty seconds and then goes deep on the decisions that mattered.

## 3. How It Works

**The four-part structure:**

```
1. THE SHAPE      the path, in one breath
2. THE BRANCHES   where it diverges, and on what condition
3. TWO DECISIONS  choices you made and why
4. A WEAKNESS     what you'd change, or what it didn't handle
```

**Lead with the shape, not the node list.** "Retrieve, grade, and then either generate, rewrite and retry, or abstain" is a shape. Ten node names is a list.

## 4. Practical Example

**A graph worth being able to describe — adapt to yours:**

```
   entry → retrieve → grade ─┬─ generate → verify ─┬─ answer
                             │                     └─ regenerate ─┐
                             ├─ rewrite → retrieve ◀──────────────┘
                             └─ abstain → handoff
```

**The decisions worth explaining:**

```
GRADING AS A SEPARATE NODE
  Retrieval and the decision about whether retrieval was good
  enough are different concerns. Splitting them means the
  grading logic is a pure function of state — testable
  independently, and auditable.

REWRITE CAPPED AT TWO ATTEMPTS
  Bounded by a counter in state, not by the recursion limit.
  Past two, further rewrites rarely helped, and abstention
  was better than a third attempt at cost.

VERIFY BEFORE ANSWERING
  Every claim checked against retrieved context. Numbers get
  zero tolerance — if a fee figure isn't exactly supported,
  abstain rather than answer.

ABSTAIN AS A DECLARED TERMINAL NODE
  Not an error path. Reached by rule when the score is below
  the floor or claims are unsupported, and it produces a
  handoff rather than a failure.
```

**The weakness worth naming:**

```
Something honest, for example:

  "The rewrite loop reformulated the query but couldn't
   change source. A question that needed structured account
   data rather than documents would rewrite twice and then
   abstain, when the right move was a different tool
   entirely. Adding source selection to the routing function
   is what I'd do next."

That kind of answer demonstrates you understood the system's
limits, which is more convincing than a flawless description.
```

## 5. Why It Matters

- **The shape in one breath** shows you can communicate architecture.
- **Two decisions with reasons** shows design rather than assembly.
- **A named weakness** is the most credible part of the answer.

## 6. Trade-offs / Failure Modes

| Weak answer | Why |
|---|---|
| Listing every node | Detail without structure |
| No branch conditions | The interesting part is the branching |
| "It worked well" with no weakness | Sounds rehearsed |
| Describing a graph you didn't build | Follow-ups expose it immediately |
| Too much framework detail | They want your design, not LangGraph's API |

**On depth control:** give the shape, then pause. If they want a specific branch explained, they'll ask. Volunteering ten minutes of detail leaves no room for the follow-ups where you'd actually demonstrate depth.

**On scale honesty:** if the graph had five nodes and no human-in-the-loop, say so. A well-reasoned five-node graph with a clear explanation of why it didn't need more is a better answer than an inflated description that collapses under one specific question.

## 7. Interview Answer

> "The shape is: retrieve, grade the retrieval, then branch three ways — generate, rewrite and retry, or abstain. Generation is followed by a verification node, which can send it back to regenerate. Abstention routes to a human handoff.
>
> The decisions I'd call out:
>
> Grading as a separate node from retrieval. Those are different concerns — fetching documents, and deciding whether what came back is good enough. Splitting them meant the grading logic was a pure function of state, so I could unit-test every branch directly, and it's the piece that's easiest to explain to a reviewer.
>
> The rewrite loop capped at two attempts, bounded by a counter in state rather than the framework's recursion limit. Relying on the recursion limit means consuming the whole budget and then raising, which produces nothing. Two attempts, then abstain.
>
> And verification before answering, with zero tolerance on numbers. If a fee figure isn't exactly supported by a retrieved passage, abstain rather than answer — a wrong fee figure is worse for a customer than no answer.
>
> Abstention was a declared terminal node reached by rule, not an error path. That's the design point I'd emphasize: giving up is a legitimate outcome, and making it a first-class node is what stops the system generating from weak context.
>
> [**Your weakness goes here.** Something real — for example, if the rewrite loop could reformulate the query but not switch source, so a question needing structured account data would rewrite twice and abstain when a different tool was the right move. Naming a genuine limit is the most credible part of this answer, and it invites a good follow-up rather than a probing one.]"

## 8. Likely Follow-ups

**Q: Why was grading a separate node?**
Because retrieving documents and deciding whether they're good enough are different concerns. Separating them makes the grading logic a pure function of state — independently testable, and explainable to a reviewer without reference to the retrieval implementation.

**Q: How did you bound the rewrite loop?**
With a counter in state checked by the routing function, capped at two attempts. Relying on the framework's recursion limit means consuming the whole budget and then raising, which delivers nothing for the spend. After two, it routes to abstention.

**Q: What did verification check?**
That every factual claim was supported by a retrieved passage, with zero tolerance on numbers, dates, and eligibility conditions. If a fee figure wasn't exactly supported, the graph abstained rather than answering — an unsupported figure is worse for a customer than no answer.

**Q: Why is abstention a node rather than an error?**
Because giving up is a legitimate outcome, not a failure. Making it a declared terminal node reached by rule means the system has somewhere correct to go when retrieval fails, instead of generating from weak context because there was no alternative path.

**Q: What would you change?**
[Your own genuine answer. A real limitation you hit is far more convincing than a claim that it worked well — and it gives the interviewer something interesting to follow up rather than a reason to probe.]

## 9. Common Mistakes

- Listing nodes instead of describing the shape.
- Explaining the framework rather than your design decisions.
- Claiming no weaknesses.
- Over-answering and leaving no room for follow-ups.
- Describing a more complex graph than you actually built.

## 10. What to Remember

- **Shape in one breath**, then two decisions with reasons.
- **The branches are the interesting part** — explain the conditions.
- **Abstention as a declared node** is a strong design point to raise.
- **Name a genuine weakness** — it's the most credible thing you'll say.
- **Match the description to what you built.** Follow-ups find the gap.
