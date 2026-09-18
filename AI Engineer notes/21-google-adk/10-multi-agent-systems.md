# Multi-Agent Systems (ADK)

> **Phase 21 · GOOGLE ADK · Topic 10**

## 1. Definition

Composing several ADK agents — as sub-agents in a workflow, or exposed as tools to a coordinating agent — with shared session state and declared delegation paths.

> Multi-agent design generally is in [17-ai-agents/16-multi-agent-systems.md](../17-ai-agents/16-multi-agent-systems.md). This is ADK's implementation.

## 2. Simple Explanation

In ADK, other agents are either sub-agents inside a workflow agent, or tools the coordinating agent can call.

The useful property is that they share session state, which removes most of the context-loss problem that makes multi-agent systems fragile elsewhere.

## 3. How It Works

```python
accounts = Agent(name="accounts", model=FLASH,
                 instruction="Account information. Read-only. "
                             "If asked about payments, return failed.",
                 tools=[get_balance, get_tier, get_transactions])

payments = Agent(name="payments", model=FLASH,
                 instruction="Payment operations. Requires approval.",
                 tools=[initiate_transfer, cancel_payment])

coordinator = Agent(name="coordinator", model=FLASH,
                    instruction="Route to the right specialist...",
                    tools=[AgentTool(accounts), AgentTool(payments)])
```

**Shared session state** means a specialist reads what's already established rather than being told about it in a summary.

## 4. Practical Example

**The justification that holds — permission separation:**

```
accounts agent    read-only tools
payments agent    transactional tools, behind human approval

That separation means a compromised or confused accounts
agent structurally cannot move money — the capability
doesn't exist in its tool set, so no prompt injection or
misunderstanding can produce it.

That's containment by tool availability, which is a real
control rather than an instruction the model might ignore.
It's the strongest reason to split, and in banking usually
the only one that's needed.
```

**What shared state fixes:**

```
In a typical multi-agent system every handoff is a lossy
summary — the coordinator knows things it doesn't pass on,
and information that existed in the system never reaches
the agent that needed it.

With shared session state the specialist reads the
established facts directly. That removes most of the
characteristic multi-agent failure.

The caveat: shared state means every agent can read
everything, including facts fetched for another
specialist's purpose. Where sensitivity differs, that needs
deliberate scoping rather than assuming shared is safe.
```

**Where splitting isn't justified:**

```
"A retrieval agent, a reasoning agent, and a writing agent."

That's a SequentialAgent with three steps. Calling them
agents adds vocabulary rather than capability, and each
boundary is somewhere information can be lost.

The tests for a genuine split are: different permissions,
a tool count past fifteen to twenty, different models, or
different team ownership. Tidiness isn't one.
```

## 5. Why It Matters

- **Permission separation** is the justification that holds, and it's containment by tool availability.
- **Shared session state** removes most of the handoff context-loss problem.
- **Shared state also means everyone reads everything** — scope deliberately.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Splitting without a constraint** | Complexity for no capability |
| **Flat shared state** | Every agent reads everything |
| **Coordinator loops** | Delegating repeatedly without progress |
| **Budgets per agent** | Total unbounded |
| **Specialists improvising out of scope** | Plausible wrong answers |
| **Debugging across agents** | Traces span several agents |

**On out-of-scope improvisation:** a specialist asked something outside its remit will attempt an answer with the tools it has unless explicitly told not to. "If asked about payments, return failed with a note — do not improvise" is a load-bearing instruction, because a plausible wrong answer from a specialist is one the coordinator is likely to accept.

**On coordinator loops:** a coordinator that delegates, receives a result, and delegates to the same specialist again can cycle. It needs to track in state which specialists have run and what they returned, and terminate when none can contribute further — the same convergence problem as any loop, but easy to miss because delegation looks like progress.

## 7. Interview Answer

> "In ADK other agents are either sub-agents inside a workflow agent, or exposed as tools to a coordinating agent via AgentTool. Either way they share session state.
>
> That shared state is the technical advantage. In a typical multi-agent system every handoff is a lossy summary — the coordinator knows things it doesn't pass on, and information that existed somewhere never reaches the agent that needed it. With shared session state the specialist reads the established facts directly, which removes most of that characteristic failure.
>
> The caveat is that shared state means every agent can read everything, including facts fetched for another specialist's purpose. Where sensitivity differs that needs deliberate scoping rather than assuming shared is safe.
>
> The justification for splitting at all is permission separation. An accounts agent with read-only tools and a payments agent with transactional tools behind human approval means a compromised or confused accounts agent structurally cannot move money — the capability doesn't exist in its tool set, so no prompt injection or misunderstanding can produce it. That's containment by tool availability, a real control rather than an instruction the model might ignore. In banking it's usually the only justification needed.
>
> Where splitting isn't justified is 'a retrieval agent, a reasoning agent, and a writing agent'. That's a SequentialAgent with three steps — calling them agents adds vocabulary rather than capability, and each boundary is somewhere information can be lost. The real tests are different permissions, a tool count past fifteen to twenty, different models, or different team ownership.
>
> Two things I'd get right. Specialists need an explicit instruction to refuse out of scope — 'if asked about payments, return failed with a note, do not improvise.' Without it a specialist attempts an answer with whatever tools it has, and a plausible wrong answer from a specialist is one the coordinator is likely to accept.
>
> And coordinator loops. A coordinator that delegates, gets a result, and delegates to the same specialist again can cycle. It needs to track in state which specialists have run and what they returned, terminating when none can contribute further. It's the same convergence problem as any loop but easy to miss, because delegation looks like progress."

## 8. Likely Follow-ups

**Q: How do you compose agents in ADK?**
As sub-agents inside a workflow agent, or exposed as tools to a coordinator via AgentTool. Both share session state, which is what distinguishes it from frameworks where each handoff is a lossy summary.

**Q: What justifies splitting into multiple agents?**
Permission separation, primarily — a read-only accounts agent and a transactional payments agent means the read agent structurally cannot move money. Also tool counts past fifteen to twenty, different models, or different team ownership. Not tidiness.

**Q: What does shared state fix and what does it risk?**
It fixes handoff context loss, since specialists read established facts directly rather than receiving a summary. It risks over-exposure, because every agent can read everything including facts fetched for another purpose — so sensitive values need deliberate scoping.

**Q: How do you stop a coordinator looping?**
Track in state which specialists have run and what they returned, and terminate when none can contribute further. It's the same convergence problem as any loop, but it's easy to overlook because delegating to a specialist looks like making progress.

**Q: What instruction do specialists need?**
An explicit refusal for out-of-scope requests — return failed with a note rather than improvising. Otherwise a specialist attempts an answer with whatever tools it has, and a plausible wrong answer from a specialist is one the coordinator will likely accept and pass on.

## 9. Common Mistakes

- Splitting for tidiness rather than a permission or tool-count constraint.
- Assuming shared state is safe regardless of sensitivity.
- Budgets per agent rather than across the system.
- No explicit out-of-scope refusal instruction for specialists.
- Coordinators with no loop-termination condition.

## 10. What to Remember

- **Sub-agents or AgentTool** — both share session state.
- **Permission separation is the justification** — containment by tool availability.
- **Shared state fixes handoff loss** but exposes everything to everyone.
- **Instruct specialists to refuse out of scope**, not improvise.
- **Coordinators need a termination condition** — delegation looks like progress.
