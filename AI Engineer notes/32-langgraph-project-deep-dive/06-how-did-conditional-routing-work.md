# "How Did Conditional Routing Work?"

> **Phase 32 · LANGGRAPH PROJECT DEEP DIVE · Topic 06**
>
> ⚠️ **An answer framework.** Describe your actual routing decisions. Where
> the decision is *computed* is the distinguishing point.

## 1. Definition

A question about how the workflow chose its next step. The insight worth landing is the separation between computing a decision (in a node) and acting on it (in an edge).

*Related: [05](05-what-were-your-edges.md) covers the graph shape. This is about the decisions themselves.*

## 2. Simple Explanation

A conditional edge is a function that reads state and returns the name of the next node. It's ordinary code.

The design question is where the information it reads comes from — and the answer should be "a node already computed it," not "the routing function works it out."

## 3. How It Works

```
THE SEPARATION

NODE           computes and records the decision inputs
               (scores, verification result, policy flag)
EDGE FUNCTION  reads those fields, returns a node name

WHY IT MATTERS

  · the decision is CHECKPOINTED, so a resumed workflow
    routes the same way it would have
  · the decision is VISIBLE in state, so you can see
    why it branched two weeks later
  · routing is DETERMINISTIC and unit-testable
  · an expensive computation isn't repeated if the edge
    is evaluated again

An edge function that computes something is hiding work
where it can't be observed.
```

## 4. Practical Example

**The three routing decisions and what drives each:**

```
1. RELEVANCE GATE — a number
   assess_relevance node writes top_score
   edge: top_score < threshold → "abstain"
                        else   → "generate"

   Deterministic, cheap, fully explainable.

2. VERIFICATION GATE — a model result, recorded first
   verify node writes {grounded: bool, failed_claims: []}
   edge: grounded              → "check_policy"
         attempts < max        → "retrieve"
         else                  → "abstain"

   The model call is in the NODE. The edge only reads
   the result — so re-evaluating the edge costs nothing
   and always gives the same answer.

3. INTENT CLASSIFICATION — the expensive one
   classify node writes intent
   edge: routes on the label

   Worth noting: a cheap heuristic handles most of it.
   Account-specific questions, out-of-domain questions,
   and prohibited topics are largely keyword- and
   pattern-detectable, and only the ambiguous remainder
   needs a model. That keeps most requests off an extra
   LLM call.
```

**The failure mode worth naming:**

```
A ROUTING DECISION WITH NO DEFAULT

  def route(state):
      if state["status"] == "ok":     return "generate"
      if state["status"] == "weak":   return "abstain"
      # no else

A status value nobody anticipated returns None, and the
graph errors at a point that has nothing to do with the
cause.

Every routing function needs an explicit default, and
the default should be the SAFE branch — abstain or
escalate, not continue. In banking, the unknown case
should never fall through to "answer the customer".
```

**On routing by model output:** if the routing label comes from an LLM, it can return something outside the expected set. Constraining it to an enum via structured output helps, and validating against the known set before routing — with an unrecognized label going to the safe default — is what makes it reliable rather than hopeful.

## 5. Why It Matters

- **Compute in nodes, act in edges** — decisions get checkpointed and become visible.
- **Every routing function needs an explicit default**, and it should be the safe branch.
- **Cheap heuristics before model classification** keeps most requests off an extra call.

## 6. Trade-offs / Failure Modes

| Weak answer | Why |
|---|---|
| "An if statement picks the next node" | True and says nothing |
| Model calls inside the edge function | Hidden work, non-deterministic, uncheckpointed |
| No default branch | A None return errors far from the cause |
| Default routes to "continue" | Unknown states reach the customer |
| Unvalidated model-produced labels | Routes to a node that doesn't exist |
| Routing on a value no node recorded | Can't explain the decision later |

**On explainability:** because every routing input is a state field and state is checkpointed, "why did it abstain on this request?" is answerable from the checkpoint rather than from logs. In a regulated context that's the difference between an audit you can satisfy and one you can't — and it's a direct consequence of computing decisions in nodes.

**On too many branches:** a routing function with six outcomes is usually a sign that one decision is doing several jobs. Splitting into two sequential decisions — is it in scope, then is it answerable — is easier to test and easier to explain than a single function with a long conditional chain.

## 7. Interview Answer

> "[**Your decisions.** The compute-in-node point is the distinguishing one.]
>
> "There were three conditional routes: a relevance gate, a verification gate, and an intent classification at the front.
>
> The principle I held to across all of them is that the decision is computed in a node and the edge only reads it. The edge function is ordinary Python — read a field, return a node name.
>
> That separation buys four things. The decision is checkpointed, so a resumed workflow routes the same way it would have. It's visible in state, so I can see why it branched on a specific request two weeks later. Routing is deterministic and unit-testable. And an expensive computation isn't repeated if the edge is evaluated again.
>
> Concretely, the verification gate: the verify node makes the model call and writes a result — grounded true or false, plus which claims failed. The edge just reads that. If I'd put the model call in the edge function instead, the routing would be slow, non-reproducible, able to fail in a place with no retry handling, and invisible in the checkpoint.
>
> The relevance gate is the simplest — the assess node writes the top retrieval score, and the edge compares it to the threshold. Deterministic, cheap, and fully explainable to someone asking why the system abstained.
>
> Intent classification at the front is the expensive one, and the thing worth saying is that a cheap heuristic handles most of it. Account-specific questions, out-of-domain questions, and prohibited topics are largely detectable by keyword and pattern, so only the ambiguous remainder needs a model call. That keeps most requests off an extra LLM round trip.
>
> The failure mode I'd flag is a routing function with no default. If it handles the statuses you thought of and falls off the end for one you didn't, it returns None and the graph errors at a point with no obvious connection to the cause. So every routing function gets an explicit default — and in banking the default should be the safe branch. Abstain or escalate, never continue. An unknown state should not fall through to answering the customer.
>
> Related: if a routing label comes from a model, it can return something outside the expected set. I'd constrain it with structured output and then validate against the known set before routing, with anything unrecognized going to the safe default.
>
> And the payoff of computing decisions in nodes is explainability. Because every routing input is a checkpointed state field, 'why did it abstain on this request' is answerable from the checkpoint rather than from logs I hoped to have added — which in a regulated context is the difference between an audit you can satisfy and one you can't."

## 8. Likely Follow-ups

**Q: Why not compute the decision in the edge?**
Because it hides work where it can't be observed. Computing in a node means the decision is checkpointed, visible in state, deterministic on replay, and not repeated if the edge is re-evaluated.

**Q: What happens on an unexpected state?**
Without an explicit default the function returns None and the graph errors somewhere unrelated to the cause. Every routing function needs a default, and it should be the safe branch — abstain or escalate.

**Q: How do you handle a model-produced routing label?**
Constrain it to an enum with structured output, then validate against the known set before routing. Anything unrecognized goes to the safe default rather than to a node name that may not exist.

**Q: Do you need a model to classify intent?**
Usually only for the ambiguous remainder. Account-specific, out-of-domain, and prohibited-topic questions are largely detectable by keyword and pattern, which keeps most requests off an extra LLM call.

**Q: How do you explain a routing decision after the fact?**
From the checkpoint. Every input to a routing function is a state field, and state is persisted — so "why did it abstain" is answerable from stored state rather than from logs.

## 9. Common Mistakes

- Model calls inside conditional edge functions.
- No default branch in a routing function.
- A default that continues rather than escalating.
- Routing on model output without validating the label.
- Routing on values no node recorded, so decisions can't be explained.

## 10. What to Remember

- **Compute in nodes, act in edges** — checkpointed and visible.
- **Explicit default on every routing function**, and make it safe.
- **Validate model-produced labels** before routing on them.
- **Heuristics first**, model classification only for the ambiguous cases.
- **Checkpointed decisions are the audit answer.**
