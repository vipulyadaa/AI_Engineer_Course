# Production Agent Architecture

> **Phase 17 · AI AGENTS · Topic 30**

## 1. Definition

The complete shape of an agent system built to run in production: routing, bounded execution, tool-level authorization, state, observability, and human escalation — assembled so that unreliability is contained rather than distributed.

## 2. Simple Explanation

A production agent isn't a loop with tools. It's a loop with tools plus everything that makes it safe, affordable, debuggable, and recoverable.

The architecture's main job is ensuring most requests never reach the agent at all, and that the ones that do can't do damage.

## 3. How It Works

```
request
   │
   ▼
 AUTH ── identity, session scope, permissions
   │
   ▼
 ROUTER ── is this a known shape?
   ├── yes (80%) ──▶ FIXED PIPELINE ──▶ answer
   └── no  (20%)
         │
         ▼
      AGENT LOOP  ── budgets: steps, tokens, wall clock
         │           tools: scoped, user-authorized
         │           state: explicit, tool-written
         │           loop detection, error-as-result
         ▼
      needs a consequential action?
         ├── yes ──▶ HUMAN APPROVAL (suspend → resume → revalidate)
         └── no
              │
              ▼
      GROUNDING CHECK ── claims supported by retrieved context?
              │
              ▼
      answer + citations   │   or ABSTAIN → human handoff

Throughout: tracing, cost accounting, audit logging
```

## 4. Practical Example

**The decisions that define the architecture, with justification:**

```
1. ROUTE FIRST
   Most traffic is a known shape. Handling it deterministically
   is cheaper, faster, more reliable, and auditable.
   ~70% cost reduction and better reliability, from one decision.

2. BOUND EVERYTHING
   Steps, tokens, wall clock — enforced in code, degrading
   gracefully rather than cutting hard.

3. AUTHORIZE AT THE TOOL, AS THE USER
   The containment boundary. A compromised or confused agent
   reaches only what the user could reach anyway.

4. EXPLICIT STATE, TOOL-WRITTEN
   Verified facts in structured fields, not in the model's
   recollection. Enables validation, resumption, audit, handoff.

5. ABSTENTION AS A FIRST-CLASS OUTCOME
   "I can't determine this, let me transfer you" is a success,
   not a failure. Prevents loops and confident wrong answers.

6. HUMAN APPROVAL ON IRREVERSIBLE ACTIONS
   With enough evidence shown that the review is real.

7. OBSERVABILITY AT STEP GRANULARITY
   Agent failures aren't reproducible; capture or lose them.
```

**What I'd build first, in order:**

```
1. The fixed pipeline           — most traffic, immediately useful
2. Evaluation and golden set    — nothing after this is measurable
                                  without it
3. Observability                — before the agent, not after
4. The agent, narrowly scoped   — read-only tools only
5. Human approval + write tools — only once the read-only
                                  version is measurably reliable

Building the agent first and adding controls later is the
common path and it doesn't converge — you end up retrofitting
bounds onto something already in production.
```

## 5. Why It Matters

- **Routing is the single highest-value decision** for cost, latency, and reliability.
- **The architecture contains unreliability** rather than spreading it.
- **Build order matters** — evaluation and observability before the agent.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Agent-first design** | Controls retrofitted onto production |
| **No router** | Every request pays agent cost and variance |
| **Write tools too early** | Consequential actions before reliability is known |
| **No abstention path** | Loops and confident wrong answers |
| **Observability added later** | Early failures undiagnosable |
| **Evaluation after launch** | No baseline; changes unmeasurable |

**On what makes this defensible to a bank:** the agent handles a minority of traffic, holds read-only tools scoped to the authenticated user, cannot take irreversible action without human approval, abstains rather than guessing, and logs every step with an audit trail. The unreliability is real and it's bounded to a place where its consequences are acceptable.

**On the honest summary:** the goal isn't a maximally capable agent. It's a system where the deterministic parts handle most of the work and the probabilistic part is small, observable, and unable to cause harm.

## 7. Interview Answer

> "A production agent architecture is the loop plus everything that makes it safe, affordable, debuggable, and recoverable — and its main job is ensuring most requests never reach the agent at all.
>
> The shape: authentication establishing identity and session scope, then a router. If the request is a known shape — and most are — it goes through a fixed pipeline: retrieve, generate, cite, return. Deterministic, fast, cheap, auditable. That's about eighty percent of traffic in a banking FAQ context, and routing it away from the agent is roughly a seventy percent cost reduction with better reliability and lower latency, from one decision.
>
> The remaining twenty percent enters the agent loop, bounded on steps, tokens, and wall clock, with loop detection and errors returned as results rather than raised. Tools are scoped and authorized as the authenticated end user, which is the containment boundary — a confused or compromised agent reaches only what the user could reach anyway. State is explicit and written by tool results, not by the model, which is what makes validation, resumption, audit, and human handoff possible.
>
> Consequential actions go through human approval, with enough evidence shown that the review is real rather than a rubber stamp — and the agent suspends, resumes, and re-validates rather than acting on facts read before the wait.
>
> Before answering, a grounding check that every claim is supported by retrieved context. And abstention is a first-class outcome: 'I can't determine this, let me transfer you' is a success, not a failure. That's what prevents both loops and confident wrong answers.
>
> Throughout: step-level tracing, cost accounting, and audit logging — because agent failures aren't reproducible by re-running.
>
> On build order, I'd do the fixed pipeline first since it serves most traffic immediately, then evaluation and a golden set because nothing after that is measurable without it, then observability, then the agent with read-only tools only, and only add write tools and approval once the read-only version is measurably reliable. Building the agent first and adding controls later is the common path and it doesn't converge — you end up retrofitting bounds onto something already in production.
>
> What makes this defensible to a bank is that the unreliability is real and it's bounded. The agent handles a minority of traffic, holds read-only tools scoped to the user, can't take irreversible action without approval, abstains rather than guessing, and logs every step. The goal isn't a maximally capable agent — it's a system where the deterministic parts do most of the work and the probabilistic part is small, observable, and unable to cause harm."

## 8. Likely Follow-ups

**Q: What's the most important architectural decision?**
Routing — sending the majority of requests through a deterministic pipeline and reserving the agent for the minority that need it. It's roughly a seventy percent cost reduction with better latency and reliability, and it shrinks the surface where non-determinism can cause problems.

**Q: In what order would you build it?**
Fixed pipeline first since it serves most traffic, then evaluation and a golden set so everything afterwards is measurable, then observability, then a read-only agent, then write tools with human approval once the read-only version is provably reliable. Agent-first with controls retrofitted doesn't converge.

**Q: How do you bound the agent?**
Steps, tokens, and wall clock enforced in code, degrading gracefully by instructing the agent to conclude rather than cutting hard. Plus loop detection, per-tool retry caps, tools scoped and authorized as the end user, and an explicit abstention path so giving up is an available action.

**Q: What makes this acceptable in a regulated environment?**
The agent handles a minority of traffic with read-only, user-scoped tools, can't take irreversible action without human approval, abstains rather than guessing, and produces a step-level audit trail. The unreliability is acknowledged and bounded to where its consequences are tolerable.

**Q: What's the goal of the architecture?**
Not a maximally capable agent. A system where deterministic components handle most of the work and the probabilistic component is small, observable, bounded, and structurally unable to cause harm. Capability is constrained deliberately because the containment is what makes it shippable.

## 9. Common Mistakes

- Building the agent first and adding bounds afterwards.
- No router, so all traffic pays agent cost and variance.
- Adding write tools before read-only reliability is measured.
- Deferring evaluation and observability until after launch.
- Treating abstention as a failure rather than a valid outcome.

## 10. What to Remember

- **Route first** — most traffic should never reach the agent.
- **Bound steps, tokens, and wall clock**, degrading gracefully.
- **Authorize at the tool as the end user** — the containment boundary.
- **Abstention is a success**, and it prevents loops and confident errors.
- **Build pipeline → evals → observability → read-only agent → writes.**
