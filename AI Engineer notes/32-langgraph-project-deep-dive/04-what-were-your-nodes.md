# "What Were Your Nodes?"

> **Phase 32 · LANGGRAPH PROJECT DEEP DIVE · Topic 04**
>
> ⚠️ **An answer framework.** Describe your actual nodes. The granularity
> reasoning is what distinguishes the answer from a list.

## 1. Definition

A question about decomposition. Listing the nodes is the easy part; explaining why the boundaries fall where they do is the answer.

## 2. Simple Explanation

A node is a function that takes state and returns the fields it changed. That's the whole contract.

The design question is how finely to split the work — and the right answer comes from where you need to branch, retry, or resume, not from what feels tidy.

## 3. How It Works

```
A REALISTIC NODE SET

  classify_intent     route or reject early
  rewrite_query       resolve follow-ups to standalone
  retrieve            dense + lexical, filtered
  rerank              cross-encoder over candidates
  assess_relevance    scores vs threshold → abstain?
  generate            the answer
  verify              groundedness check
  check_policy        advice/guarantee classifier
  human_review        interrupt point
  finalize            format, attach citations, log

THE GRANULARITY RULE

  Split where you need to BRANCH, RETRY, or RESUME.
  Merge everything else.

  Each boundary costs a checkpoint write. Splitting for
  tidiness buys latency and storage and nothing else.
```

## 4. Practical Example

**Why the boundaries land where they do:**

```
SPLIT  retrieve | rerank
       because reranking may be skipped when the
       candidate set is small — that's a branch

SPLIT  generate | verify
       because verification failure loops back to
       generate — that's a retry edge, and it has to
       be a boundary to be a target

SPLIT  check_policy | human_review
       because the interrupt has to happen at a node
       boundary — you cannot pause mid-function

MERGE  query embedding into retrieve
       nothing ever branches between them, and
       splitting adds a checkpoint for no reason
```

**The contract that keeps nodes debuggable:**

```
A node should:
  · read state, do ONE thing, return ONLY changed fields
  · be independently testable — given a state dict,
    assert on the output dict, no graph needed
  · be IDEMPOTENT where possible, because a resumed
    workflow can re-execute the node that was in flight
    when the process died

The idempotency point is the one people miss. If a node
writes to an external system, a crash-and-resume can run
it twice — so either make the write idempotent with a
deterministic key, or record completion in state before
the resume point.
```

**The failure that makes nodes hard to debug:**

```
A node that returns the WHOLE state instead of just its
changes.

  bad:   return {**state, "answer": text}
  good:  return {"answer": text}

Returning everything defeats the reducers — fields that
should merge get overwritten with the value this node
happened to read at entry, which in a parallel branch
means clobbering another branch's work with stale data.

It looks harmless and it's the second most common bug
after missing reducers.
```

**On node size:** a node doing ten things is a function with extra steps and no benefit — you can't retry part of it, branch inside it, or see where it failed. A workflow of twenty trivial nodes is twenty checkpoint writes. Both extremes are wrong, and the rule that resolves it is branch/retry/resume boundaries.

## 5. Why It Matters

- **Split at branch, retry, and resume points** — not for tidiness.
- **Return only changed fields**, or reducers get defeated.
- **Idempotency matters** because resume can re-run the in-flight node.

## 6. Trade-offs / Failure Modes

| Weak answer | Why |
|---|---|
| Listing nodes with no reasoning | The list isn't the answer |
| One node doing everything | No retry granularity, no visibility |
| Twenty trivial nodes | Checkpoint overhead for nothing |
| Returning the full state | Defeats reducers; clobbers parallel branches |
| Non-idempotent external writes | Resume duplicates the side effect |
| Nodes that can't be tested alone | The main benefit of the structure, lost |

**On testing:** the strongest practical argument for well-bounded nodes is that each becomes a pure-ish function testable without the graph — build a state dict, call the node, assert on what it returned. That's an ordinary unit test, and it means most of the workflow's logic is covered without orchestration in the test path.

**On where LLM calls live:** one model call per node, at most. A node making three sequential model calls can't be retried partially, can't branch between them, and takes the sum of their latencies with no checkpoint in between — so a crash loses all three.

## 7. Interview Answer

> "[**Your nodes.** The granularity reasoning is the substance.]
>
> "The nodes were roughly: classify the intent, rewrite the query into a standalone form, retrieve, rerank, assess whether the results clear the relevance threshold, generate, verify groundedness, check policy, a human review step, and finalize.
>
> But the list isn't really the answer — the granularity reasoning is. My rule was to split where I need to branch, retry, or resume, and merge everything else. Each boundary costs a checkpoint write, so splitting for tidiness buys latency and storage and nothing in return.
>
> Concretely: retrieve and rerank are separate because reranking gets skipped when the candidate set is small — that's a branch. Generate and verify are separate because verification failure loops back to generate, and a retry target has to be a node boundary. Policy check and human review are separate because an interrupt can only happen at a boundary — you can't pause mid-function.
>
> Whereas query embedding lives inside the retrieve node, because nothing ever branches between them and splitting would add a checkpoint for no reason.
>
> The contract I held nodes to: read state, do one thing, return only the fields that changed. That last part matters more than it sounds. A node returning the whole state — spreading the input and adding one key — defeats the reducers, because fields that should merge get overwritten with whatever the node read at entry. In a parallel branch that means clobbering another branch's work with stale data. It looks harmless and it's probably the second most common bug in LangGraph after missing reducers.
>
> The other thing I'd design for is idempotency, because a resumed workflow can re-execute the node that was in flight when the process died. If a node writes to an external system, a crash and resume runs it twice — so either the write needs a deterministic idempotency key, or completion gets recorded in state before the resume point.
>
> I also kept it to at most one model call per node. A node making three sequential LLM calls can't be retried partially, can't branch between them, and a crash loses all three with no checkpoint in between.
>
> And the practical payoff of all this is testing: each node is a function you can test without the graph. Build a state dict, call it, assert on what came back. That's an ordinary unit test, and it means most of the workflow's logic is covered without orchestration in the test path."

## 8. Likely Follow-ups

**Q: How did you decide node granularity?**
Split where you need to branch, retry, or resume; merge everything else. Each boundary is a checkpoint write, so splitting for readability costs latency and storage with nothing in return.

**Q: What should a node return?**
Only the fields it changed. Returning the whole state defeats reducers — merge fields get overwritten with the value read at entry, which in a parallel branch clobbers the other branch's work.

**Q: Why does idempotency matter?**
Because resume can re-execute the node that was in flight when the process died. Any external write needs a deterministic idempotency key, or a crash turns into a duplicated side effect.

**Q: Why one LLM call per node?**
Partial retry, branching between calls, and checkpointing between them. Three sequential calls in one node means a crash loses all three and you can't retry just the one that failed.

**Q: How do you test nodes?**
Individually, without the graph — construct a state dict, call the node, assert on the returned dict. That's the main practical benefit of the boundaries, and it keeps orchestration out of most tests.

## 9. Common Mistakes

- Listing nodes without explaining the boundaries.
- Returning the full state from a node.
- One node doing several model calls.
- Splitting into trivial nodes for tidiness.
- Non-idempotent external writes.

## 10. What to Remember

- **Branch, retry, resume** — the granularity rule.
- **Return only changed fields** or reducers break.
- **Idempotency**, because resume re-runs the in-flight node.
- **One model call per node** at most.
- **Nodes are unit-testable without the graph** — that's the payoff.
