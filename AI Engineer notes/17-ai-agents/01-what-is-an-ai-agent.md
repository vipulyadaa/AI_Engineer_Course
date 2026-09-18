# What Is an AI Agent?

> **Phase 17 · AI AGENTS · Topic 01**

## 1. Definition

A system where an LLM decides what actions to take, executes them via tools, observes the results, and repeats until the task is done. The defining property is that **control flow is decided by the model**, not fixed by code.

## 2. Simple Explanation

In a normal LLM application, you write the steps: retrieve, then prompt, then return. The model fills in text at the points you chose.

In an agent, the model chooses the steps. It decides whether to search, which tool to call, whether the result was sufficient, and when to stop. Your code provides the tools and the loop; the model drives.

## 3. How It Works

```
     ┌──────────────────────────────┐
     │  LLM: what should I do next? │◀────┐
     └──────────────┬───────────────┘     │
                    ▼                     │
          tool call? ──no──▶ final answer │
                    │yes                  │
                    ▼                     │
             execute the tool             │
                    │                     │
                    ▼                     │
          append the result to context ───┘
```

**Four components:**

```
1. MODEL       decides the next action
2. TOOLS       what it can actually do
3. LOOP        run, observe, feed back, repeat
4. TERMINATION when to stop — answer, budget, or failure
```

**Point 4 is the one people leave out**, and it's where agents fail in production.

## 4. Practical Example

**Where an agent earns its cost:**

```
"Why was my international transfer charged $45 when I'm a
 Premier customer?"

A fixed pipeline retrieves fee documentation and answers
generically.

An agent can:
  1. look up the customer's tier              → Premier
  2. fetch the transaction                    → $45 charged
  3. check the fee policy                     → Premier = $25
  4. check waiver eligibility                 → 3rd this month,
                                                only 2 waived
  5. reconcile: the tier was misapplied
  6. answer with the specific discrepancy

Step 5 is only reachable because steps 2 and 3 disagreed —
the path depended on intermediate results, which is exactly
what a fixed pipeline can't express.
```

**When NOT to use an agent:**

```
If the steps are known in advance, WRITE THEM.

  · deterministic
  · debuggable
  · cheaper — one LLM call instead of six
  · faster
  · testable

Most "agent" projects are workflows wearing a costume. The
decision rule is whether the STEPS depend on intermediate
results. If they don't, an agent adds cost, latency, and
non-determinism for nothing.
```

**That judgment is what distinguishes a considered answer** from enthusiasm about agents.

## 5. Why It Matters

- **It's the current frontier** of LLM application architecture, and heavily interviewed.
- **The agent-versus-workflow judgment** is what separates engineering from hype.
- **Termination and budget** are where agents actually fail in production.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Non-deterministic** | The same input can take different paths |
| **Expensive** | Every loop iteration is a full LLM call |
| **Slow** | Latency is the sum of all iterations |
| **Hard to test** | The execution path isn't fixed |
| **Infinite loops** | Without a hard step cap |
| **Compounding errors** | A wrong step 2 poisons everything after it |
| **Tool damage** | A model deciding to act means it can act wrongly |

**On compounding errors:** if each step is 95% reliable, ten steps is 0.95¹⁰ ≈ 60%. Agent reliability degrades multiplicatively with path length, which is the strongest argument for keeping agents shallow and constraining what they can do.

**On permissions:** an agent acts with whatever authority its tools have. The tools must enforce the *end user's* permissions, not the service account's — otherwise the agent becomes a privilege-escalation path. In banking that's the first design question, not a later hardening step.

## 7. Interview Answer

> "An AI agent is a system where the LLM decides what actions to take, executes them via tools, observes the results, and repeats until done. The defining property is that control flow is decided by the model rather than fixed in code.
>
> The contrast makes it clearer. In a normal LLM application I write the steps — retrieve, prompt, return — and the model fills in text at points I chose. In an agent the model chooses the steps: whether to search, which tool, whether the result was enough, when to stop.
>
> Four components: the model deciding, the tools defining what it can do, the loop feeding results back, and termination — which is the one people leave out and where agents actually fail in production.
>
> Where an agent earns its cost is when the path depends on intermediate results. Say a customer asks why they were charged forty-five dollars on an international transfer as a Premier customer. A fixed pipeline retrieves the fee documentation and answers generically. An agent can look up their tier, fetch the transaction, check the policy, check waiver eligibility, notice that the tier was misapplied, and answer with the specific discrepancy. That last step is only reachable because two earlier lookups disagreed — a fixed pipeline can't express that.
>
> But I'd be direct that most agent projects are workflows wearing a costume. If the steps are known in advance, write them — deterministic, debuggable, cheaper at one LLM call instead of six, faster, and testable. The decision rule is whether the steps depend on intermediate results. If they don't, an agent adds cost, latency, and non-determinism for nothing.
>
> The failure mode I'd design around is compounding error. If each step is ninety-five percent reliable, ten steps is about sixty percent. Reliability degrades multiplicatively with path length, which is the argument for keeping agents shallow and tightly constrained.
>
> And in a banking context the first design question is permissions. An agent acts with whatever authority its tools have, so the tools must enforce the end user's permissions rather than the service account's — otherwise the agent is a privilege escalation path."

## 8. Likely Follow-ups

**Q: What makes something an agent rather than a pipeline?**
The model decides control flow. In a pipeline the steps are written in code and the model fills in text; in an agent the model chooses which tool to call, whether the result was sufficient, and when to stop. If the sequence is fixed regardless of what comes back, it's a pipeline.

**Q: When shouldn't you use an agent?**
Whenever the steps are known in advance. A written workflow is deterministic, debuggable, cheaper, faster, and testable. Most agent projects are workflows in disguise, and the agent adds non-determinism and cost without buying the flexibility it charges for.

**Q: What's the main reliability problem?**
Compounding error. Per-step reliability multiplies, so ninety-five percent across ten steps is about sixty percent end to end. That's why production agents are kept shallow, why step budgets matter, and why verifying intermediate results is worth the extra call.

**Q: How do agents fail in production?**
Infinite loops without a step cap, compounding errors down a long path, tool calls with wrong arguments, and cost or latency blowing out because every iteration is a full LLM call. Termination conditions and budgets are the controls, and they're the part most often missing.

**Q: What's the security concern?**
An agent acts with whatever authority its tools hold. If tools run as a service account rather than enforcing the end user's permissions, the agent becomes a privilege escalation path — a user can reach data they couldn't otherwise. That has to be designed in from the start, not added later.

## 9. Common Mistakes

- Calling a fixed pipeline an agent.
- Proposing an agent where a workflow would do.
- Omitting termination conditions and step budgets.
- Ignoring that per-step reliability compounds.
- Letting tools run with service-account rather than user permissions.

## 10. What to Remember

- **The model decides control flow** — that's the definition.
- **Model, tools, loop, termination** — and termination is the neglected one.
- **Use an agent only when steps depend on intermediate results.**
- **Reliability compounds multiplicatively** — 0.95¹⁰ ≈ 60%.
- **Tools must enforce the end user's permissions**, not the service account's.
