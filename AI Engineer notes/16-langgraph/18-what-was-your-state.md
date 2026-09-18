# "What Was Your State?"

> **Phase 16 · LANGGRAPH · Topic 18**
>
> ⚠️ **This is an answer framework, not a script.** The structure and the
> reasoning below are what makes an answer strong. Fill the specifics with
> your own project — never recite details you didn't build.

## 1. Definition

An interview question probing whether you designed state deliberately or accepted a default. The interviewer is checking for three things: a clear schema, a rule about who writes what, and awareness of reducers.

## 2. Simple Explanation

A weak answer describes fields. A strong answer explains the *organizing principle* — why the state has the shape it has, and what would break if it didn't.

The differentiator is usually the write-authority rule: which fields come from tools and which from the model.

## 3. How It Works

**The four-part structure:**

```
1. THE GROUPS      what categories of field exist and why
2. WRITE AUTHORITY who is allowed to write each group
3. REDUCERS        which fields accumulate and why
4. A DECISION      something you'd do differently, or a
                   constraint that shaped it
```

**Part 4 is what separates a designed answer from a described one.** Naming a trade-off you made — or a mistake you corrected — is more convincing than a clean schema with no history.

## 4. Practical Example

**A state design that answers the question well — adapt the specifics to yours:**

```python
class State(TypedDict):
    # IDENTITY — set at entry, never written by a node
    user_id: str
    session_id: str
    tenant_id: str

    # TASK
    original_question: str          # kept verbatim, never rewritten
    query: str                      # the current, possibly rewritten query

    # VERIFIED FACTS — written only by retrieval/tool nodes
    documents: list
    top_score: float
    account_tier: str | None

    # CONTROL — what routing functions read
    attempts: Annotated[int, add]
    tokens_used: Annotated[int, add]

    # ACCUMULATING
    messages: Annotated[list, add]
    errors:   Annotated[list, add]

    # OUTPUT
    answer: str | None
    citations: list[str]
    abstained: bool
```

**The three points to make about it:**

```
IDENTITY IS IMMUTABLE
  Nodes can't write user_id or tenant_id. Every retrieval
  filters on them, so if a node could change them, a prompt
  injection influencing that node could change whose data
  is accessed.

FACTS COME FROM TOOLS, NOT THE MODEL
  If the tier lookup returned "Premier", that value goes in
  directly. The model's later restatement isn't the source
  of truth — that's what makes it safe to route on.

ORIGINAL QUESTION KEPT VERBATIM
  Separate from the working query. It's the anchor that
  prevents drift across rewrite loops, and it's what
  reranking scores against.
```

**On reducers, the point worth making:** `errors` needs an add reducer because parallel branches each returning an error would otherwise overwrite each other — two of three failures vanishing, non-deterministically depending on timing.

## 5. Why It Matters

- **The question tests design intent**, not recall of field names.
- **Write authority is the differentiating point** most candidates don't raise.
- **A named trade-off or correction** makes the answer credible.

## 6. Trade-offs / Failure Modes

| Weak answer | Why it's weak |
|---|---|
| Listing fields | Describes, doesn't explain |
| "We used MessagesState" | Accepted a default, designed nothing |
| No write-authority rule | Facts and model output indistinguishable |
| No mention of reducers | Suggests parallel branches were never used |
| No trade-off named | Sounds like a diagram, not a system |

**On admitting a change:** saying "we started with everything in messages and split out verified facts after a bug where the model restated the tier wrongly" is stronger than a clean design with no history. It shows the schema was driven by something real.

**On not overreaching:** if the project's state was simple, say so and explain why that was appropriate. Describing a sophisticated schema you didn't build is the failure mode this question is designed to expose — follow-ups go straight to the details.

## 7. Interview Answer

> "I'd organize it in five groups, and the organizing principle is who's allowed to write each one.
>
> Identity — user, session, tenant — set at entry and never written by a node. That's a security property: every retrieval filters on them, so if a node could modify them, a prompt injection influencing that node's output could in principle change whose data gets accessed. Making them immutable removes that path.
>
> Task — the original question kept verbatim, separate from the current working query. That separation matters because the query gets rewritten in the refinement loop, and the original is what prevents drift and what reranking scores against.
>
> Verified facts — documents, scores, account tier — written only by nodes that called a tool or retrieval, never parsed from model text. If the tier lookup returned Premier, that value goes in directly. That's what makes it safe for routing functions to read.
>
> Control fields — attempts, tokens used — which the routing functions check for termination.
>
> And output — answer, citations, whether it abstained.
>
> On reducers, the one worth calling out is errors. Parallel branches each returning an error would overwrite each other without an add reducer, so two of three failures vanish, and non-deterministically depending on timing. That's the kind of thing that only appears once you add fan-out to a working graph.
>
> [**Here you add your own**: the constraint that shaped it, or the thing you'd change. For example — if you started with everything in `messages` and split out verified facts after hitting a bug, say that. A schema with a history behind it is more credible than a clean one presented as obvious, and interviewers follow up on specifics.]"

## 8. Likely Follow-ups

**Q: Who writes to state?**
Tool and retrieval nodes write verified facts; the model's output doesn't populate fact fields. That distinction is what makes state trustworthy enough for routing functions to make decisions on, and it prevents a hallucination from becoming a recorded fact.

**Q: Why keep the original question separate?**
Because the working query gets rewritten during refinement loops, and without an unchanged anchor the system drifts from what was actually asked. It's also what final reranking should score against, rather than the rewritten query.

**Q: Which fields have reducers and why?**
Accumulating ones — messages, errors, and counters. Errors especially, because parallel branches each returning an error overwrite each other without an add reducer, so failures disappear non-deterministically depending on which branch finishes last.

**Q: Why is identity immutable?**
Every retrieval and tool call filters on user and tenant. If a node could write those fields, a prompt injection influencing that node's output could redirect which customer's data is accessed. Setting them at entry and never allowing node writes closes that path structurally.

**Q: What would you change?**
[Your own answer. A genuine one — a field you'd have separated earlier, a reducer you added after a bug, state you'd have kept smaller. Interviewers value a real correction over a claim that nothing needed changing.]

## 9. Common Mistakes

- Listing fields without explaining the organizing principle.
- Not having a write-authority rule.
- Claiming a design more sophisticated than what you built.
- No mention of reducers, implying parallel branches were never used.
- Presenting the schema as obvious rather than arrived at.

## 10. What to Remember

- **Five groups:** identity, task, verified facts, control, output.
- **Write authority is the differentiating point** — tools write facts, not the model.
- **Identity immutable** — a security property, not tidiness.
- **Original question kept verbatim**, separate from the working query.
- **Name a real trade-off or correction** — and never claim what you didn't build.
