# Gemini Agents

> **Phase 19 · GOOGLE GEMINI · Topic 15**

## 1. Definition

Building agents on Gemini — using its function calling as the decision mechanism inside a loop you control, with the framework choice (ADK, LangGraph, or custom) being separate from the model choice.

## 2. Simple Explanation

Gemini provides the model half of an agent: it decides which function to call and with what arguments.

Everything else — the loop, budgets, authorization, state, observability — is yours regardless of which framework you use. The model doesn't provide those and no framework provides all of them.

## 3. How It Works

```
Gemini gives you:
  · function calling with structured arguments
  · parallel function calls in one response
  · a reasoning/thinking capability on some tiers
  · long context for accumulated history

You provide:
  · the loop and its termination conditions
  · step, token, and wall-clock budgets
  · tool authorization as the end user
  · explicit state separate from the conversation
  · loop detection and abstention
  · per-step tracing and audit
```

**Framework options on Google Cloud:** ADK (Google's, Vertex AI Agent Engine deployment), LangGraph (persistence and interrupts), or custom. Model choice and framework choice are independent.

## 4. Practical Example

**What Gemini specifically brings to agent design:**

```
PARALLEL FUNCTION CALLS
  Three independent lookups returned in one response,
  executed concurrently. Turns three sequential rounds into
  one — a direct latency reduction that's often unused.

THINKING / REASONING TIERS
  Better decisions per step on models supporting it, at the
  cost of more generated tokens before anything happens.
  Worth it for planning steps, wasteful for mechanical
  tool selection.

LONG CONTEXT
  Accumulated agent history fits without aggressive
  truncation — though context still grows every step, so
  the cost argument for trimming remains.
```

**Model tiering within the agent:**

```
tool selection, mechanical steps  → Flash-class
planning, complex reconciliation  → Pro-class
classification, routing           → smallest tier

An agent that uses the flagship for every step pays
several times more than one that tiers, for no measurable
gain on the mechanical steps.
```

**The banking design position:**

```
Most traffic on a deterministic path; the agent for the
minority that needs it. Read-only tools by default. Tools
authorized as the end user. Irreversible actions behind a
human approval interrupt. Abstention as a first-class
outcome. Per-step audit.

None of that comes from Gemini. The model is the decision
mechanism; the governance is architecture.
```

## 5. Why It Matters

- **Parallel function calls** are Gemini's most directly useful agent feature.
- **Model tiering within the agent** is a large and commonly missed cost saving.
- **Governance is architecture**, not a model capability.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Expecting the model to provide governance** | It doesn't |
| **One tier for every step** | Several times the necessary cost |
| **Parallel calls executed sequentially** | Avoidable latency |
| **Long context as a reason not to trim** | Cost still grows per step |
| **Thinking enabled on mechanical steps** | Tokens and latency for no gain |
| **Framework choice conflated with model choice** | They're independent |

**On thinking modes:** more reasoning improves decisions and costs generation time before any action happens. For a planning step that's worth it; for selecting between four obvious tools it isn't. Applying it per step type rather than globally is the tuning that matters.

**On long context in agents:** it removes the hard constraint of running out of window, but every step still appends reasoning and tool results, and every token is re-sent. So the cost argument for trimming old reasoning and truncating tool results is unchanged — long context makes the failure less abrupt, not less expensive.

## 7. Interview Answer

> "Gemini provides the model half of an agent — function calling with structured arguments, parallel calls, reasoning on some tiers, and long context. Everything else is mine regardless of framework: the loop and its termination conditions, budgets, tool authorization, explicit state, loop detection, abstention, and per-step tracing.
>
> That's the framing I'd lead with, because governance is architecture rather than a model capability, and no framework provides all of it either.
>
> What Gemini specifically brings that's useful for agents: parallel function calls are the strongest. Three independent lookups returned in one response and executed concurrently turns three sequential rounds into one, which is a direct latency reduction — and it's commonly unused because the natural implementation loops over the calls one at a time.
>
> Thinking modes give better decisions per step on models supporting them, at the cost of generated tokens before anything happens. That's worth it for a planning step and wasteful for selecting between four obvious tools, so I'd apply it per step type rather than globally.
>
> And I'd tier models within the agent — smallest tier for classification and routing, Flash-class for tool selection and mechanical steps, Pro-class for planning and complex reconciliation. An agent using the flagship for every step pays several times more than one that tiers, with no measurable gain on the mechanical steps. That's a large and commonly missed saving.
>
> On long context in agents: it removes the hard constraint of running out of window, but every step still appends reasoning and tool results and every token is re-sent. So the argument for trimming old reasoning and truncating tool results is unchanged — long context makes the failure less abrupt, not less expensive.
>
> On framework, ADK is Google's with Vertex AI Agent Engine deployment, LangGraph gives persistence and interrupts, or custom. That's independent of choosing Gemini — I'd pick the framework on whether I need durable resumption and human approval interrupts, not on which model I'm using.
>
> And the banking position regardless of all of it: most traffic on a deterministic path, the agent for the minority that needs it, read-only tools by default, authorization as the end user, irreversible actions behind a human approval interrupt, abstention as a first-class outcome, and per-step audit."

## 8. Likely Follow-ups

**Q: What does Gemini provide for agents?**
Function calling with structured arguments, parallel function calls, reasoning modes on some tiers, and long context. It provides the decision mechanism — the loop, budgets, authorization, state, observability, and abstention are yours regardless of framework.

**Q: What's the most useful agent feature?**
Parallel function calls. Independent lookups returned together and executed concurrently collapse several sequential rounds into one, which is a direct latency reduction. It's frequently unused because the obvious implementation processes calls one at a time.

**Q: Should you use one model tier throughout an agent?**
No. Smallest tier for classification and routing, Flash-class for tool selection and mechanical steps, Pro-class for planning and complex reconciliation. Using the flagship everywhere costs several times more with no measurable gain on the simple steps.

**Q: Does long context solve the agent context problem?**
It removes the hard limit but not the cost. Every step still appends reasoning and tool results, and every token is re-sent on the next call. So trimming old reasoning and truncating tool results remains necessary — long context makes the failure gradual rather than abrupt.

**Q: How do you choose a framework?**
Independently of the model. ADK for Google-native deployment via Vertex AI Agent Engine, LangGraph if durable resumption and human approval interrupts matter, or custom if neither does. The decision is about persistence and interrupts, not about which model you're calling.

## 9. Common Mistakes

- Expecting the model or framework to provide governance.
- Using one model tier for every agent step.
- Executing parallel function calls sequentially.
- Treating long context as a reason not to manage accumulated history.
- Enabling thinking modes on mechanical steps.

## 10. What to Remember

- **Gemini is the decision mechanism**; governance is architecture.
- **Parallel function calls** collapse rounds — the most useful feature.
- **Tier models within the agent** — a large, commonly missed saving.
- **Long context reduces abruptness, not cost** — still trim.
- **Framework choice is independent** of model choice.
