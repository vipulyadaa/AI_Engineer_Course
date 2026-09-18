# Design: Multi-Agent System

> **Phase 28 · AI SYSTEM DESIGN · Topic 09**

## 1. Definition

A system where several agents with distinct scopes coordinate on a task. The design question is almost always whether it should be multi-agent at all — and usually the honest answer is that a single agent or a workflow would do.

## 2. Simple Explanation

Splitting one agent into five feels like good decomposition. It usually isn't.

Each boundary between agents loses context, and the coordination costs more than the focus gains. The exception is when the split is a containment boundary rather than an organizational one.

## 3. How It Works

```
THE JUSTIFICATIONS THAT HOLD

1. PERMISSION SEPARATION   ← the strong one
   read-only agent vs transactional agent; a compromise of
   one structurally cannot do what the other can

2. TOOL COUNT
   past ~15-20 tools, selection accuracy degrades

3. DIFFERENT MODELS
   cheap classification vs expensive reasoning

4. TEAM OWNERSHIP
   independently deployed capabilities

THE JUSTIFICATION THAT DOESN'T
   "a researcher agent, a writer agent, an editor agent"
   → that's a workflow with three prompts
```

**Supervisor topology dominates** because it keeps control flow in one place, which is the only thing that makes multi-agent systems debuggable.

## 4. Practical Example

**The containment argument, which is the real reason:**

```
accounts_agent    read-only tools only
payments_agent    transactional tools, behind approval

A compromised or confused accounts agent CANNOT move money.
Not because it's instructed not to — because the capability
doesn't exist in its tool set.

That's containment by tool availability, and it's a real
control rather than a request. It's also the only
justification that survives "why not just use one agent
with all the tools?"
```

**The cost people underestimate — context loss at handoffs:**

```
One agent, six steps → full context throughout
Three agents, two steps each → context lost at each boundary

The supervisor knows things it doesn't pass on, because it
summarized. Information that existed somewhere in the
system never reaches the agent that needed it.

That's a failure mode single agents simply don't have.

Frameworks with SHARED STATE (ADK sessions, LangGraph
state) reduce it substantially — the specialist reads
established facts rather than being told about them.
```

**Bounding the system:**

```
A supervisor with 10 steps calling sub-agents with 10 steps
each is 100 model calls worst case.

So the budget lives in SHARED STATE and decrements across
the whole tree — per-agent limits multiply rather than bound.

And the supervisor needs a termination condition: track
which specialists have run and what they returned, and stop
when none can contribute. Delegation looks like progress,
which is why supervisor loops are easy to miss.
```

## 5. Why It Matters

- **Permission separation is the only justification that survives scrutiny.**
- **Context loss at handoffs** is a failure single agents don't have.
- **Budgets must span the tree** — per-agent limits multiply.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Splitting for tidiness** | Complexity with no capability gain |
| **Context loss at handoffs** | Information never reaches the agent needing it |
| **Per-agent budgets** | Total unbounded |
| **Supervisor loops** | Delegation looks like progress |
| **Specialists improvising out of scope** | Plausible wrong answers accepted |
| **Debugging across agents** | Traces span several agents |

**On out-of-scope improvisation:** a specialist asked something outside its remit will attempt an answer with the tools it has unless explicitly instructed to refuse. "If asked about payments, return failed with a note — do not improvise" is load-bearing, because a plausible wrong answer from a specialist is one the supervisor is likely to accept and pass on as authoritative.

**On the honest default:** start with one agent. Split only on a concrete constraint — a permission boundary, a tool count problem, a model cost difference, or a team boundary. The decomposition that feels cleaner costs real context and latency without buying anything, and it's much easier to split later than to merge back.

## 7. Interview Answer

> "The design question is almost always whether it should be multi-agent at all, and usually the honest answer is that a single agent or a workflow would do. Splitting one agent into five feels like good decomposition, and each boundary loses context while the coordination costs more than the focus gains.
>
> The justification that survives scrutiny is permission separation. An accounts agent with read-only tools and a payments agent with transactional tools behind approval means a compromised or confused accounts agent structurally cannot move money — not because it's instructed not to, but because the capability doesn't exist in its tool set. That's containment by tool availability, a real control rather than a request, and it's the only justification that answers 'why not just use one agent with all the tools?'
>
> The others are practical rather than architectural: tool count past fifteen to twenty where selection degrades, different models for cheap classification versus expensive reasoning, and different teams owning independently deployed capabilities.
>
> What doesn't justify it is 'a researcher agent, a writer agent, an editor agent.' That's a workflow with three prompts — calling them agents adds vocabulary rather than capability, and each boundary is somewhere information gets lost.
>
> Which is the cost people underestimate. One agent doing six steps has full context throughout; three agents doing two steps each lose context at every boundary. The supervisor knows things it doesn't pass on because it summarized, and information that existed somewhere never reaches the agent that needed it. That's a failure mode single agents simply don't have. Frameworks with shared state — ADK sessions, LangGraph state — reduce it substantially, because the specialist reads established facts rather than being told about them.
>
> On topology, supervisor dominates because it keeps control flow in one place, which is the only thing making these systems debuggable.
>
> Two things I'd get right on bounding. A supervisor with ten steps calling sub-agents with ten steps each is a hundred model calls worst case, so the budget has to live in shared state and decrement across the whole tree — per-agent limits multiply rather than bound.
>
> And the supervisor needs a termination condition: track which specialists have run and what they returned, and stop when none can contribute. Delegation looks like progress, which is why supervisor loops are easy to miss.
>
> One more: specialists need an explicit instruction to refuse out of scope rather than improvise. A plausible wrong answer from a specialist is one the supervisor is likely to accept and pass on as authoritative.
>
> My default would be one agent, splitting only on a concrete constraint — and it's much easier to split later than to merge back."

## 8. Likely Follow-ups

**Q: When is multi-agent actually justified?**
Permission separation primarily — a read-only agent and a transactional one, where a compromise of the first structurally cannot do what the second can. Also tool counts past fifteen to twenty, different model tiers, or different team ownership. Not tidiness.

**Q: What's the cost people underestimate?**
Context loss at handoffs. The supervisor summarizes what it passes on, so information that existed somewhere in the system never reaches the agent needing it. Single agents don't have that failure mode, and shared-state frameworks reduce but don't eliminate it.

**Q: How do you bound the system?**
A budget in shared state decrementing across the whole tree, because per-agent limits multiply — a supervisor with ten steps calling sub-agents with ten each is a hundred calls. Plus a supervisor termination condition tracking which specialists have run.

**Q: Why do supervisor loops happen?**
Because delegation looks like progress. A supervisor routes to a specialist, gets a result, and routes to the same one again without anything obviously wrong. It needs to track what each specialist returned and terminate when none can contribute further.

**Q: What's your default?**
One agent. Split only on a concrete constraint — permission boundary, tool count, model cost, team ownership. Decomposition that just feels cleaner costs real context and latency, and it's far easier to split later than to merge back.

## 9. Common Mistakes

- Splitting for organizational tidiness rather than containment.
- Per-agent budgets in a nested tree.
- No supervisor termination condition.
- Specialists improvising outside their scope.
- Calling a sequential workflow a multi-agent system.

## 10. What to Remember

- **Permission separation is the justification that survives** — containment by tool availability.
- **Handoffs lose context** — a failure single agents don't have.
- **Supervisor topology** keeps control flow debuggable.
- **Budget across the tree**, not per agent.
- **Default to one agent**; splitting later is easier than merging back.
