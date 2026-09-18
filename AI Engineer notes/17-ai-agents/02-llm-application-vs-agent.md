# LLM Application vs Agent

> **Phase 17 · AI AGENTS · Topic 02**

## 1. Definition

An LLM application uses a model inside a control flow you wrote. An agent lets the model determine the control flow. The line is whether the model's output changes *which code runs next*.

## 2. Simple Explanation

Ask one question: can the model change what happens next?

If the model produces text that gets returned or stored, it's an application — the model is a function you call. If the model's output selects the next action from a set of options, it's an agent — the model is a controller.

## 3. How It Works

```
LLM APPLICATION
  retrieve(query) ─▶ prompt(context) ─▶ llm() ─▶ return

  Fixed sequence. The model fills in text.

AGENT
  loop:
     action = llm(history)          ← the model CHOOSES
     if action is final: break
     result = execute(action)
     history.append(result)

  Sequence determined at runtime by the model.
```

**The spectrum between them:**

| | Model's role |
|---|---|
| **Plain call** | Generate text |
| **RAG pipeline** | Generate text over retrieved context |
| **Routing** | Choose among N fixed branches ← the boundary |
| **Tool-calling loop** | Choose actions until done |
| **Multi-agent** | Choose actions and delegate to other agents |

**Routing is where it becomes ambiguous**, and that's fine — it's a spectrum, and saying so is more accurate than forcing a binary.

## 4. Practical Example

**The same task at three points on the spectrum:**

```
"What's the fee on my last international transfer?"

APPLICATION
  retrieve fee docs → prompt → answer
  Always identical. Cannot access the transaction.

ROUTED APPLICATION
  classify intent → {account query | policy query | handoff}
  → run that branch
  The model picks a branch, but each branch is fixed code.

AGENT
  model decides: fetch transaction? check tier? read policy?
  in whatever order, reacting to what it finds
  Path varies per request.
```

**Cost and reliability differ sharply:**

```
                 LLM calls   Latency     Determinism
Application          1       ~2s         High
Routed               2       ~3s         High
Agent              3-10      ~6-20s      Low

An agent is roughly 5× the cost and latency. It has to be
buying something specific to justify that.
```

**The design advice I'd actually give:** start with the simplest thing on the spectrum that handles your cases, and move right only when you hit something the current level genuinely can't express. Most teams start at "agent" and spend months getting back to reliability they'd have had at "routed application."

## 5. Why It Matters

- **It's the first architecture decision**, and it determines cost, latency, and testability.
- **The spectrum framing** is more accurate than a binary and reads as experience.
- **Starting simple and moving right** is the advice that actually holds up.

## 6. Trade-offs / Failure Modes

| Choice | Risk |
|---|---|
| **Agent when an application would do** | 5× cost, non-determinism, hard to test |
| **Application when an agent is needed** | Can't handle cases requiring branching |
| **Routing with too many branches** | Becomes an unmaintainable switch |
| **Mixing paradigms unclearly** | Nobody knows what determines behaviour |

**On testing — the practical difference:** an application can be tested with fixed inputs and expected outputs. An agent's path varies, so tests must assert on outcomes and invariants rather than on the trace: did it reach a correct answer, did it stay within budget, did it never call a tool it shouldn't. That's a genuinely harder testing problem and it's worth naming as a cost.

**On the hybrid that usually wins:** a fixed pipeline for the 90% of requests that follow a known shape, escalating to an agent only for the rest. You get application economics on the common path and agent capability where it's needed, and the escalation condition is explicit rather than implicit.

## 7. Interview Answer

> "The question I'd ask is whether the model can change what happens next. If it produces text that gets returned or stored, it's an application — the model is a function I call. If its output selects the next action, it's an agent — the model is a controller.
>
> It's really a spectrum rather than a binary. A plain call, then a RAG pipeline, then routing where the model picks among fixed branches, then a tool-calling loop, then multi-agent. Routing is where it becomes ambiguous, and I'd say so rather than forcing a clean line.
>
> The costs differ sharply. An application is one LLM call, maybe two seconds, highly deterministic. An agent is three to ten calls, six to twenty seconds, and low determinism. Roughly five times the cost and latency — so it has to be buying something specific.
>
> Concretely: if someone asks about a fee on their last international transfer, an application retrieves the fee documentation and answers generically, and can't reach the actual transaction. An agent can fetch the transaction, check the customer's tier, read the policy, and react to what it finds. That's worth five times the cost when the path genuinely depends on intermediate results, and isn't otherwise.
>
> The testing difference is worth naming as a real cost. An application is tested with fixed inputs and expected outputs. An agent's path varies, so tests assert on outcomes and invariants instead — did it reach a correct answer, stay within budget, never call a tool it shouldn't. That's a harder problem.
>
> My actual advice is to start at the simplest point on the spectrum that handles your cases and move right only when you hit something the current level genuinely can't express. Most teams start at 'agent' and spend months getting back to reliability they'd have had at 'routed application'.
>
> And the hybrid usually wins: a fixed pipeline for the ninety percent of requests with a known shape, escalating to an agent for the rest. Application economics on the common path, agent capability where it's needed, and the escalation condition explicit rather than implicit."

## 8. Likely Follow-ups

**Q: What's the dividing line?**
Whether the model's output determines which code runs next. If it produces text that gets returned, it's an application. If it selects an action from a set and the system executes it, it's an agent. Routing sits on the boundary, which is genuinely ambiguous rather than a failure of the definition.

**Q: What does an agent cost relative to an application?**
Roughly five times in both LLM calls and latency — three to ten calls against one, and six to twenty seconds against two. Plus non-determinism and a much harder testing story. That's the bar the added capability has to clear.

**Q: How do you test an agent?**
On outcomes and invariants rather than execution traces, since the path varies. Did it reach a correct answer, did it stay within its step and token budget, did it avoid tools it shouldn't touch, did it abstain when it should. Asserting on a specific sequence of calls makes tests brittle for no benefit.

**Q: What architecture would you actually recommend?**
A hybrid. A fixed pipeline handling the majority of requests that follow a known shape, escalating to an agent only for the ones that need it. That gives application economics on the common path and agent capability where it's genuinely required, with an explicit escalation condition.

**Q: Why do teams over-reach for agents?**
Because the capability is appealing and the cost is invisible until production. The steps in most tasks are known in advance, so the flexibility isn't used — and what's paid for instead is non-determinism, latency, and a harder debugging story. Starting simple and moving right avoids that.

## 9. Common Mistakes

- Treating the distinction as binary rather than a spectrum.
- Choosing an agent without identifying what branching it enables.
- Testing agents by asserting on the exact tool-call sequence.
- Not accounting for the cost and latency multiple.
- Building a pure agent where a hybrid handles most traffic more cheaply.

## 10. What to Remember

- **Can the model change what runs next?** That's the dividing line.
- **It's a spectrum:** call → RAG → routing → tool loop → multi-agent.
- **Agents cost ~5× in calls and latency** and lose determinism.
- **Test agents on outcomes and invariants**, not on the trace.
- **Start simple, move right only when forced** — and prefer the hybrid.
