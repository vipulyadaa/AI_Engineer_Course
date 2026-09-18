# Persistence

> **Phase 16 · LANGGRAPH · Topic 08**

## 1. Definition

Saving graph state durably so execution can survive process restarts, span human approval waits, and resume from where it stopped. It's the feature that most justifies using LangGraph rather than writing a loop.

## 2. Simple Explanation

Without persistence, an agent lives in memory for the duration of one request. If the process restarts, or a human takes two hours to approve something, the work is gone.

With persistence, state is written after each node to a durable store, and execution can be picked up later — in a different process, on a different machine.

## 3. How It Works

```python
from langgraph.checkpoint.postgres import PostgresSaver

app = graph.compile(checkpointer=PostgresSaver(conn))

config = {"configurable": {"thread_id": session_id}}
app.invoke({"question": q}, config)      # persists as it runs
app.invoke(None, config)                 # resumes where it stopped
```

**The `thread_id` is the identity of the execution.** Everything about persistence — resumption, history, concurrency — keys on it.

**Checkpoints are written after each node**, so the resume granularity is node boundaries, which is also why node idempotency matters.

## 4. Practical Example

**What persistence enables that matters in banking:**

```
1. HUMAN APPROVAL SPANNING HOURS
   The graph interrupts, state persists, a human approves
   the next morning, execution resumes. No held connection,
   no in-memory session.

2. SURVIVING DEPLOYS
   A rolling restart doesn't lose in-flight work.

3. MULTI-TURN CONVERSATIONS
   Each turn resumes the same thread, with prior state intact.

4. AUDIT AND REPLAY
   The checkpoint history IS a record of what the system
   knew at each step — better evidence than a log.
```

**Point 4 is underrated.** A checkpoint sequence shows the state after every node, so you can reconstruct exactly what was known when a decision was made. That's an audit artifact that comes free with the feature.

**The thread_id security issue:**

```
thread_id is a string in the config. If it comes from client
input, a user can resume ANOTHER user's thread and read
their state.

  · derive thread_id server-side from the authenticated
    session
  · verify on resume that state["user_id"] matches the
    authenticated user, and refuse otherwise

The second check matters because it defends even if the
first is bypassed — and state contains customer data, so
the failure is a breach rather than a bug.
```

**Checkpoint storage is a customer data store:** it holds conversation content, retrieved documents, and account facts. It needs encryption, access control, a retention policy, and a deletion path for erasure requests. Treating it as internal framework infrastructure is a compliance gap.

## 5. Why It Matters

- **Persistence is the feature worth adopting a framework for** — it's genuinely hard to build.
- **Checkpoint history is an audit artifact** that comes free.
- **`thread_id` must be server-derived and verified** — otherwise it's a breach path.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Client-supplied thread_id** | Cross-user state access |
| **Checkpoint store outside retention policy** | Compliance gap |
| **Large state** | Written at every node; storage and latency cost |
| **Schema changes** | In-flight checkpoints can't resume |
| **Non-idempotent nodes** | Re-run on resume, duplicating side effects |
| **Unbounded checkpoint history** | Grows indefinitely without pruning |

**On storage backends:** in-memory is for development only. Postgres or a managed equivalent is the production choice, and in a GCP context the store should live in-project rather than in a hosted third-party service — the same residency argument that applies to tracing.

**On history growth:** every node in every run writes a checkpoint, so a busy system accumulates them quickly. A retention policy — keep full history for recent threads, prune to the final state for older ones — keeps storage bounded while preserving the audit value where it matters.

## 7. Interview Answer

> "Persistence saves graph state durably after each node, so execution survives process restarts, spans human approval waits, and resumes where it stopped. It's the feature that most justifies using LangGraph rather than writing the loop myself — the loop is twenty lines, but resumable durable execution is genuinely hard to build correctly.
>
> Concretely it enables four things that matter in banking. Human approval spanning hours, with no held connection and no in-memory session. Surviving deploys, so a rolling restart doesn't lose in-flight work. Multi-turn conversations resuming the same thread with prior state intact. And audit — the checkpoint history is a record of exactly what the system knew after every node, which is better evidence than a log and comes free with the feature.
>
> The security issue I'd guard hardest is thread_id. It's just a string in the config, so if it comes from client input a user can resume another user's thread and read their state. Two defences: derive it server-side from the authenticated session, and on resume verify that the user_id stored in state matches the authenticated user, refusing otherwise. The second check matters because it holds even if the first is bypassed — and state contains customer data, so the failure is a breach rather than a bug.
>
> The checkpoint store itself is a customer data store. It holds conversation content, retrieved documents, and account facts, so it needs encryption, access control, a retention policy, and a deletion path for erasure requests. Treating it as internal framework infrastructure is an easy compliance gap to create.
>
> Two operational points. In-memory checkpointing is development only; Postgres or a managed equivalent for production, and in a GCP context in-project rather than a hosted third-party service — the same residency argument as tracing.
>
> And history growth. Every node in every run writes a checkpoint, so a busy system accumulates them fast. I'd keep full history for recent threads and prune older ones to their final state, which bounds storage while preserving audit value where it's actually needed."

## 8. Likely Follow-ups

**Q: What does persistence enable?**
Resumption across process restarts, human approvals spanning hours, multi-turn conversations with intact state, and an audit record of what the system knew after each node. It's the capability that would be genuinely hard to build yourself, unlike the agent loop.

**Q: What's the security risk?**
Client-supplied thread IDs. It's just a string in the config, so if a user can name it they can resume someone else's thread and read their state. Derive it server-side from the authenticated session, and verify on resume that the stored user ID matches the authenticated user.

**Q: Is the checkpoint store subject to data rules?**
Yes — it holds conversation content, retrieved documents, and account facts, so it's a customer data store needing encryption, access control, retention limits, and a deletion path. Treating it as framework infrastructure rather than customer data is a compliance gap.

**Q: How does it interact with node design?**
Resume granularity is node boundaries, so a node can re-run after a resume from a checkpoint taken before it completed. Anything with side effects needs an idempotency key, or an email, database write, or payment happens twice.

**Q: How do you keep checkpoint storage bounded?**
A retention policy — full history for recent threads, pruned to final state for older ones. Every node of every run writes a checkpoint, so a busy system grows quickly, and pruning preserves the audit value where it's needed while bounding cost.

## 9. Common Mistakes

- Accepting thread IDs from client input.
- Not verifying the authenticated user against stored state on resume.
- Using in-memory checkpointing in production.
- Excluding the checkpoint store from retention and erasure policies.
- Non-idempotent side-effecting nodes that duplicate work on resume.

## 10. What to Remember

- **Durable state after each node** — the feature worth using a framework for.
- **Checkpoint history is a free audit artifact.**
- **Derive `thread_id` server-side and verify the user on resume.**
- **The checkpoint store is a customer data store.**
- **Resume re-runs nodes** — side effects need idempotency keys.
