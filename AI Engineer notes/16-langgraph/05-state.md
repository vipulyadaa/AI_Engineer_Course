# State

> **Phase 16 · LANGGRAPH · Topic 05**

## 1. Definition

The typed object every node reads and updates, and the thing that gets checkpointed. Its schema defines what the graph knows, and how updates merge is defined per field by reducers.

## 2. Simple Explanation

State is the graph's shared memory. Every node receives it and returns changes to it.

The design decision people miss is *how* updates merge. By default a returned field replaces the old value — but for lists like messages you usually want appending, which is what reducers control.

## 3. How It Works

```python
from typing import Annotated
from operator import add

class State(TypedDict):
    # identity — set once, never overwritten
    user_id: str
    session_id: str

    # task
    question: str
    query: str                          # possibly rewritten

    # accumulating
    messages: Annotated[list, add]      # ← appends
    attempts: Annotated[int, operator.add]

    # replacing (default)
    documents: list
    top_score: float
    answer: str | None
```

**`Annotated[list, add]` is the reducer.** Without it, a node returning `{"messages": [new_msg]}` replaces the whole history with one message — a silent and confusing bug.

**With it**, the returned list is appended, which is what a conversation or an accumulating log needs.

## 4. Practical Example

**Designing state for a banking RAG graph:**

```
IDENTITY        user_id, session_id, tenant_id
                set at entry, never written by a node
VERIFIED FACTS  account_tier, transaction, waivers_used
                written ONLY by tool/retrieval nodes
CONTROL         attempts, tokens_used, tools_called
                what routing functions read
OUTPUT          answer, citations, abstained, escalated

The separation matters: identity is authoritative and
immutable; verified facts come from tools, not from model
output; control fields drive routing; output is the result.
```

**The rule that matters most:** verified facts are written by nodes that called a tool, never parsed from model text. If `get_customer_tier` returned "Premier", that goes into state directly — the model's later restatement of it is not the source of truth.

**Why parallel branches need reducers:**

```
Three parallel nodes each return {"errors": [...]}.

Without a reducer, the last one to complete wins and the
other two errors vanish — silently, and non-deterministically
depending on timing.

With Annotated[list, add], all three accumulate.

This is a real concurrency bug that only appears with
parallel edges, which makes it easy to introduce later when
adding fan-out to a working graph.
```

**State size:** everything in state is checkpointed on every node. Keeping full document text in state means writing it repeatedly. Storing document IDs and fetching content when needed keeps checkpoints small — which matters for both cost and resume speed.

## 5. Why It Matters

- **Reducers control merge behaviour**, and the default replaces rather than appends.
- **Verified facts written by tool nodes** is what makes state trustworthy.
- **Parallel branches without reducers lose updates** — a timing-dependent bug.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Missing reducer on accumulating fields** | Updates replace instead of appending |
| **Parallel writes without reducers** | Silent, non-deterministic loss |
| **Model output written into fact fields** | Hallucinations become recorded facts |
| **Large payloads in state** | Every checkpoint writes them |
| **Schema changes** | In-flight checkpoints can't resume |
| **No separation of identity and mutable fields** | Identity can be overwritten |

**On schema versioning:** a checkpoint written under one schema may not resume after a field is added or renamed. For graphs that can be suspended for hours awaiting approval, that spans deploys — so the schema needs a version field and a migration path, or in-flight sessions break on every release.

**On identity fields:** user and tenant IDs should be set at entry and never written by a node. If a node can modify `user_id`, then a prompt injection that influences a node's output could in principle change whose data is accessed. Treating identity as immutable removes that path entirely.

## 7. Interview Answer

> "State is the typed object every node reads and updates, and it's what gets checkpointed. The design decision people miss is how updates merge. By default a returned field replaces the old value, so a node returning a single message replaces the whole conversation history — a silent and confusing bug. Reducers fix that: annotating a list field with an add reducer makes returned values append instead.
>
> For a banking RAG graph I'd structure state in four groups. Identity — user, session, tenant — set at entry and never written by a node. Verified facts like account tier and transaction details. Control fields like attempts and tokens used, which routing functions read. And output — answer, citations, whether it abstained or escalated.
>
> The rule that matters most is that verified facts are written by nodes that called a tool, never parsed from model text. If the tier lookup returned Premier, that value goes into state directly; the model's later restatement isn't the source of truth. That's what makes state trustworthy enough to route on.
>
> Identity being immutable is a security property, not just tidiness. If a node could modify user_id, then a prompt injection influencing that node's output could in principle change whose data gets accessed. Treating identity as set-once removes that path entirely.
>
> Reducers matter most with parallel branches, and it's a bug that appears later. Three parallel nodes each returning an errors list — without a reducer, the last to complete wins and the other two errors vanish, silently and non-deterministically depending on timing. That only shows up when you add fan-out to a working graph, which makes it an easy regression to introduce.
>
> Two practical points. State size — everything in state is checkpointed at every node, so keeping full document text there means writing it repeatedly. I'd store document IDs and fetch content when needed.
>
> And schema versioning. A checkpoint written under one schema may not resume after a field is added or renamed, and for graphs suspended for hours awaiting approval that spans deploys. So the schema needs a version field and a migration path, or in-flight sessions break on every release."

## 8. Likely Follow-ups

**Q: What are reducers?**
Per-field merge functions. By default a returned value replaces the existing one; an add reducer on a list appends instead. Without one, a node returning a single message replaces the entire conversation history, which is a silent and hard-to-spot bug.

**Q: Who writes verified facts into state?**
Nodes that called a tool or retrieval — never nodes parsing model text. If the tier lookup returned Premier, that value goes in directly. Letting model output populate fact fields turns hallucinations into recorded facts and makes routing on state unsafe.

**Q: Why do parallel branches need reducers?**
Because without one, concurrent writes to the same field mean the last to complete wins and the others vanish — silently and depending on timing. Three parallel nodes each reporting an error would leave you with one. It's a regression that appears when fan-out is added to a working graph.

**Q: Should identity fields be mutable?**
No. User, session, and tenant IDs should be set at entry and never written by a node. If a node could modify them, a prompt injection influencing that node's output could in principle redirect whose data is accessed. Immutability removes that path.

**Q: What about state size?**
Everything in state is checkpointed at every node, so large payloads get written repeatedly. Storing document IDs and fetching content when needed keeps checkpoints small, which matters for storage cost and for how fast a resume is.

## 9. Common Mistakes

- Omitting reducers on accumulating fields.
- Adding parallel edges without checking reducers exist.
- Writing model output into verified-fact fields.
- Keeping full document text in state.
- Changing the schema without versioning, breaking in-flight checkpoints.

## 10. What to Remember

- **Reducers define merge behaviour** — the default replaces, not appends.
- **Tool nodes write verified facts**, never model output.
- **Identity is set at entry and immutable** — a security property.
- **Parallel writes without reducers lose data** non-deterministically.
- **Keep state small** and version the schema for resumable graphs.
