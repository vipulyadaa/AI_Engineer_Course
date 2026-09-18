# Checkpoints

> **Phase 16 · LANGGRAPH · Topic 09**

## 1. Definition

The individual saved snapshots of state, written after each node. A thread's checkpoints form an ordered history that can be listed, inspected, resumed from, or branched from.

## 2. Simple Explanation

A checkpoint is one saved state, tagged with where in the graph it was taken.

The history is what makes it useful: you can see the state after every step, resume from the latest, or go back to an earlier one and take a different path.

## 3. How It Works

```python
config = {"configurable": {"thread_id": tid}}

app.get_state(config)              # latest checkpoint
app.get_state_history(config)      # all of them, newest first

# resume from a specific earlier checkpoint
app.invoke(None, {"configurable": {
    "thread_id": tid,
    "checkpoint_id": earlier_id,
}})

# modify state before resuming
app.update_state(config, {"query": corrected_query})
```

**Three capabilities:** inspect, resume, and time-travel — resuming from an earlier checkpoint, which creates a branch rather than overwriting history.

## 4. Practical Example

**Where checkpoint history earns its place:**

```
1. DEBUGGING
   Step through the state after each node to see exactly
   where a value became wrong. Far better than logs, because
   it's the actual state, not a rendering of it.

2. HUMAN CORRECTION
   A reviewer sees the agent used a wrong query, corrects it
   via update_state, and resumes. The work before that point
   isn't lost.

3. AUDIT
   "What did the system know when it decided X?" answered by
   the checkpoint immediately before that node.

4. BRANCHING
   Resume from the same earlier checkpoint with different
   parameters to compare outcomes — useful for evaluation.
```

**`update_state` is powerful and needs controls:**

```
It writes directly into a persisted thread, bypassing every
node and routing rule.

In banking:
  · restrict who can call it
  · never expose it through a customer-facing path
  · audit every call — who changed which field, from what
    to what, and why
  · consider making identity fields non-updatable, since a
    modified user_id would change whose data is accessed

It's an operator tool, not an application mechanism, and
treating it otherwise is a real risk.
```

**That distinction is the important one** — the same feature that makes human correction possible is an arbitrary state-write primitive.

**Checkpoint size:** each checkpoint holds the whole state. A graph carrying full document text writes that at every node, so a ten-node run stores ten copies. Storing document IDs and fetching content on demand keeps checkpoints small — which affects storage cost, write latency, and resume speed together.

## 5. Why It Matters

- **Checkpoint history is the best debugging artifact** — actual state, not a log rendering.
- **Time-travel enables correction and comparison** without losing prior work.
- **`update_state` is an operator primitive** that needs access control and audit.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Large state per checkpoint** | Multiplied by node count |
| **Unbounded history** | Grows with every run |
| **`update_state` unrestricted** | Arbitrary state writes bypassing the graph |
| **Resuming a stale checkpoint** | Acting on facts that have since changed |
| **Schema drift** | Old checkpoints unreadable after a change |
| **Checkpoint data in scope for erasure** | Deletion must reach every checkpoint |

**On stale checkpoints:** resuming from a checkpoint taken hours earlier means acting on facts read then. A balance, a tier, or a permission may have changed. Re-validating time-sensitive facts on resume — rather than trusting what the checkpoint holds — is the control, and it's easy to omit because resumption feels like continuation.

**On erasure:** a deletion request must remove the customer's data from *every* checkpoint in *every* thread, not just the latest. That's a real implementation requirement, and a system that only deletes current state leaves the data in history.

## 7. Interview Answer

> "A checkpoint is one saved state snapshot, written after each node and tagged with where in the graph it was taken. A thread's checkpoints form an ordered history you can inspect, resume from, or branch from.
>
> Where the history earns its place is debugging. Stepping through the state after each node shows exactly where a value became wrong — and it's better than logs because it's the actual state, not a rendering someone chose to write. For a system where behaviour varies per run, that's the difference between diagnosing and guessing.
>
> It also enables human correction. A reviewer who sees the agent used a wrong query can update the state and resume, without losing the work before that point. And for audit, 'what did the system know when it decided X' is answered by the checkpoint immediately before that node.
>
> The thing I'd put controls around is update_state. It writes directly into a persisted thread, bypassing every node and routing rule — so it's an arbitrary state-write primitive. In banking I'd restrict who can call it, never expose it through a customer-facing path, audit every call with who changed which field from what to what and why, and make identity fields non-updatable, since a modified user_id would change whose data gets accessed. It's an operator tool, not an application mechanism.
>
> Two things I'd handle carefully. Resuming a stale checkpoint — if it was taken hours ago, the balance or tier or permission may have changed since. Re-validating time-sensitive facts on resume rather than trusting what the checkpoint holds is the control, and it's easy to skip because resumption feels like continuation.
>
> And erasure. A deletion request has to remove the customer's data from every checkpoint in every thread, not just the latest state. A system that only deletes current state leaves the data sitting in history, which is exactly the kind of gap an audit finds.
>
> On size — each checkpoint holds the whole state, so a graph carrying full document text writes it at every node. Ten nodes, ten copies. Storing document IDs and fetching content on demand keeps checkpoints small, which improves storage cost, write latency, and resume speed together."

## 8. Likely Follow-ups

**Q: What can you do with checkpoint history?**
Inspect the state after every node, resume from the latest, resume from an earlier one to branch, and modify state before resuming. Those cover debugging, human correction, audit, and comparing outcomes under different parameters.

**Q: Why is checkpoint history better than logs for debugging?**
Because it's the actual state rather than a rendering someone chose to write. You see every field after every node, including the ones nobody thought to log — which matters most for the bugs you didn't anticipate.

**Q: What's the risk with `update_state`?**
It writes arbitrary state into a persisted thread, bypassing every node and routing rule. That makes it an operator primitive needing restricted access, full audit of who changed what, and non-updatable identity fields — a modified user ID would change whose data is accessed.

**Q: What about resuming an old checkpoint?**
Time-sensitive facts may be stale — a balance, tier, or permission read hours ago. Re-validating them on resume rather than trusting the checkpoint is the control. It's commonly omitted because resumption feels like continuation rather than a fresh decision.

**Q: How does erasure interact with checkpoints?**
A deletion request must remove the customer's data from every checkpoint in every thread, not just current state. History is a full copy of everything the state ever held, so a system deleting only the latest checkpoint leaves the data behind.

## 9. Common Mistakes

- Exposing `update_state` through application paths.
- Resuming without re-validating time-sensitive facts.
- Deleting only current state on an erasure request.
- Carrying full document text in state, multiplying checkpoint size.
- Unbounded checkpoint history with no retention policy.

## 10. What to Remember

- **A checkpoint per node**, forming an inspectable, resumable history.
- **Best debugging artifact available** — actual state, not logs.
- **`update_state` is an operator primitive** — restrict and audit it.
- **Re-validate time-sensitive facts on resume.**
- **Erasure must reach every checkpoint**, not just the latest.
