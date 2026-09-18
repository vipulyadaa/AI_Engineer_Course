# Multi-Agent Systems

> **Phase 17 · AI AGENTS · Topic 16**

## 1. Definition

Several agents, each with its own tools, instructions, and scope, coordinating on a task. The justification has to be a real constraint that one agent can't satisfy — not that decomposition feels tidier.

## 2. Simple Explanation

Instead of one agent with thirty tools and a long prompt, several agents each with a narrow job and a handful of tools, plus something that routes between them.

The gain is focus per agent. The cost is coordination — and coordination is usually more expensive than the focus is worth.

## 3. How It Works

**Common topologies:**

```
SUPERVISOR      one agent delegates to specialists and
                assembles the result           ← most common
SEQUENTIAL      a fixed pipeline of agents — which is really
                a workflow with LLM stages
PEER            agents message each other directly — hardest
                to reason about and to bound
HIERARCHICAL    supervisors of supervisors — rarely justified
```

**The supervisor pattern dominates** because it keeps control flow in one place, which is the main thing that makes multi-agent systems debuggable at all.

## 4. Practical Example

**When multi-agent is genuinely justified:**

```
1. DIFFERENT PERMISSIONS
   An agent that can read account data and one that can
   initiate payments SHOULD be separate, because the blast
   radius differs. This is a real architectural reason.

2. TOOL COUNT
   Past ~20 tools, selection degrades. Splitting by domain
   keeps each agent's set small.

3. DIFFERENT MODELS
   A cheap model for classification, a strong one for
   reasoning — that's genuinely two agents.

4. ORGANIZATIONAL OWNERSHIP
   Different teams owning different capabilities, deployed
   independently.
```

**Point 1 is the strongest for banking** — separating by privilege is a security argument, not an aesthetic one.

**When it isn't justified:**

```
"A researcher agent, a writer agent, and an editor agent"

That's three LLM calls in sequence. It's a workflow with
three prompts. Calling them agents adds vocabulary, not
capability — and each handoff loses context.
```

**The cost that gets underestimated:**

```
Each handoff is a lossy summary. Agent A knows things it
doesn't pass to Agent B, because it summarized.

  one agent, 6 steps        → full context throughout
  three agents, 2 steps each → context lost at each boundary

Multi-agent systems fail in ways single agents don't:
information that existed somewhere in the system never
reached the agent that needed it.

Plus: more calls, higher latency, harder debugging, and
an error in agent A that agent B has no way to detect.
```

## 5. Why It Matters

- **Permission separation** is a genuine architectural reason, especially in banking.
- **Handoffs are lossy**, which is the failure mode single agents don't have.
- **Most multi-agent designs are workflows** with agent vocabulary attached.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Context loss at handoffs** | The characteristic multi-agent failure |
| **Coordination cost** | More calls, higher latency |
| **Debugging complexity** | Failures span agents |
| **Error propagation** | Downstream agents can't detect upstream errors |
| **Unbounded peer messaging** | Two agents can loop between each other |
| **Over-decomposition** | Agents for what a prompt section would do |

**On bounding the system as a whole:** each agent needs a step budget, and the *system* needs a global budget. Without one, a supervisor delegating to three agents that each delegate further can exceed any per-agent limit by an order of magnitude. Total calls and total tokens must be capped across the whole system, not per agent.

**On the honest default:** start with one agent. Split only when you hit a concrete constraint — a permission boundary, a tool count problem, a model-cost difference, or a team boundary. "It would be cleaner" isn't a constraint.

## 7. Interview Answer

> "A multi-agent system is several agents with their own tools, instructions, and scope, coordinating on a task. The supervisor pattern dominates — one agent delegating to specialists and assembling the result — because it keeps control flow in one place, which is what makes the system debuggable at all.
>
> I'd be direct that most multi-agent designs aren't justified. 'A researcher agent, a writer agent, and an editor agent' is three LLM calls in sequence — a workflow with three prompts. Calling them agents adds vocabulary, not capability, and each handoff loses context.
>
> That's the cost people underestimate. Each handoff is a lossy summary: agent A knows things it doesn't pass to agent B because it summarized. One agent doing six steps has full context throughout; three agents doing two steps each lose context at every boundary. Multi-agent systems fail in a way single agents don't — information existed somewhere in the system and never reached the agent that needed it. Plus more calls, higher latency, harder debugging, and errors that downstream agents have no way to detect.
>
> Where it is genuinely justified: different permissions, different tool counts, different models, or different team ownership. For banking the permission one is strongest — an agent that can read account data and one that can initiate payments should be separate, because the blast radius differs. That's a security argument, not an aesthetic one, and it's the case I'd lead with.
>
> Tool count is the other practical one: past about twenty tools selection accuracy degrades, so splitting by domain keeps each agent's set small enough to choose from reliably.
>
> One thing I'd insist on: a global budget, not just per-agent budgets. A supervisor delegating to three agents that each delegate further can exceed any per-agent limit by an order of magnitude. Total calls and total tokens have to be capped across the whole system.
>
> My default would be one agent, splitting only on a concrete constraint — a permission boundary, a tool count problem, a model cost difference, or a team boundary. 'It would be cleaner' isn't a constraint."

## 8. Likely Follow-ups

**Q: When is multi-agent justified?**
Different permission levels, where blast radius genuinely differs — that's the strongest reason. Also tool counts past roughly twenty where selection degrades, different models for different cost-quality needs, and different teams owning capabilities deployed independently. Not tidiness.

**Q: What's the characteristic failure?**
Context loss at handoffs. Each agent summarizes what it passes on, so information that existed in the system never reaches the agent that needed it. Single agents don't have this failure because context is continuous, and it's the main reason splitting is more expensive than it looks.

**Q: Which topology would you use?**
Supervisor — one agent delegating to specialists and assembling results. It keeps control flow in one place, which is what makes the system debuggable. Peer-to-peer messaging is much harder to reason about and to bound, and hierarchical supervisors are rarely justified.

**Q: How do you bound a multi-agent system?**
With a global budget across the whole system, not just per-agent limits. A supervisor delegating to agents that delegate further can exceed any per-agent cap by an order of magnitude, so total calls and total tokens need enforcing at the system level.

**Q: What's your default?**
One agent. I'd split only when hitting a concrete constraint — a permission boundary, a tool-count problem, a model-cost difference, or a team ownership boundary. Decomposition that just feels cleaner costs real context and latency without buying anything.

## 9. Common Mistakes

- Calling a sequential workflow a multi-agent system.
- Splitting for tidiness rather than a concrete constraint.
- Ignoring context loss at handoffs.
- Budgeting per agent without a global cap.
- Choosing peer messaging where a supervisor would be clearer.

## 10. What to Remember

- **Supervisor topology dominates** — control flow stays in one place.
- **Permission separation is the strongest justification**, especially in banking.
- **Handoffs are lossy** — the failure single agents don't have.
- **Budget globally**, not just per agent.
- **Default to one agent**; split only on a concrete constraint.
