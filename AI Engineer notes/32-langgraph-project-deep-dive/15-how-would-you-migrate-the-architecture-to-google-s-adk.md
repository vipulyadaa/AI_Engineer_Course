# "How Would You Migrate the Architecture to Google's ADK?"

> **Phase 32 · LANGGRAPH PROJECT DEEP DIVE · Topic 15**

## 1. Definition

A migration question comparing two orchestration models. The strong answer maps the concepts honestly, names what doesn't map cleanly, and is clear that the business case is the platform rather than the framework.

## 2. Simple Explanation

Both frameworks do the same job — orchestrate multi-step LLM work with state, tools, and control flow. They differ in how control flow is expressed and in what the surrounding platform gives you.

The reason to move is usually Vertex AI integration, not that ADK orchestrates better.

## 3. How It Works

```
THE CONCEPT MAPPING

LangGraph                 ADK
─────────────────────────────────────────────────
state schema         →    session state
node                 →    an agent, or a tool
                          invocation
conditional edge     →    agent transfer / routing
                          logic
checkpointer         →    session service
thread ID            →    session ID
tool                 →    tool with ToolContext
interrupt            →    callbacks + session
                          persistence
subgraph             →    a sub-agent

MAPS CLEANLY       state, sessions, tools, persistence
MAPS LESS CLEANLY  an explicit graph topology
```

## 4. Practical Example

**The difference that actually matters:**

```
LANGGRAPH  control flow is EXPLICIT — you draw the
           graph, and the edges are the logic

ADK        control flow is more AGENT-CENTRIC — you
           compose agents and sub-agents, and
           delegation drives the flow

CONSEQUENCE for a deterministic pipeline:
  a fixed sequence with conditional gates is very
  natural to express as a graph, and less natural to
  express as agent delegation

CONSEQUENCE for an agentic system:
  the reverse — agent composition is the natural shape,
  and expressing it as a graph is extra scaffolding

So the honest answer depends on which the workflow is.
A deterministic RAG pipeline is a graph-shaped problem;
a multi-agent system with delegation is an ADK-shaped
one.
```

**What genuinely improves on the platform:**

```
IDENTITY       ToolContext carries the invocation
               context, so tools can act with the END
               USER's identity rather than the service
               account's — which is the confused deputy
               problem solved at the framework level

ENFORCEMENT    a before-tool callback is a single place
               to enforce authorization, redaction, and
               argument validation across every tool.
               One choke point beats per-tool checks
               that drift.

DEPLOYMENT     Agent Engine as managed runtime —
               sessions, scaling, and tracing without
               running the infrastructure

GOVERNANCE     the same IAM, VPC-SC, CMEK, audit logs,
               and residency as the rest of Vertex AI

That governance line is the actual business case, the
same as any other Vertex migration.
```

**The migration sequence:**

```
1. BASELINE    the evaluation suite runs against the
               current system. Without it the migration
               is unmeasurable.
2. PORT TOOLS  tools are the most portable part —
               ordinary functions with schemas. Do them
               first, keep them framework-agnostic.
3. PORT STATE  map the state schema to session state,
               including what NOT to carry over
4. PORT FLOW   the hard part — re-express control flow
               as agent composition rather than
               translating edges one to one
5. EVALUATE    same suite, compare per category
6. SHADOW      both systems on live traffic, serve only
               the old one
7. CUT OVER

Step 4 is where a literal translation goes wrong. An
edge-for-edge port produces an awkward ADK system;
re-expressing the intent produces a natural one.
```

**The honest caveat:** prompts and tool descriptions usually need re-tuning, because how an agent decides to delegate depends on wording. And the interrupt and human-review flow needs rebuilding rather than porting — it's the piece most specific to each framework's model.

## 5. Why It Matters

- **Re-express the control flow**, don't translate edges one to one.
- **ToolContext solves the confused deputy** at the framework level.
- **The business case is the platform**, not better orchestration.

## 6. Trade-offs / Failure Modes

| Mistake | Consequence |
|---|---|
| Edge-for-edge translation | An awkward system fighting the framework |
| No baseline evaluation | The migration is unmeasurable |
| Assuming prompts transfer | Delegation behaviour depends on wording |
| Porting the interrupt flow literally | The piece most specific to each framework |
| Claiming ADK orchestrates better | It's a different model, not a superior one |
| Migrating a graph-shaped problem | Extra work for no gain |

**On whether to migrate at all:** if the workflow is a deterministic pipeline and there's no platform requirement pulling it, the honest answer is not to. Naming that condition is stronger than describing the migration enthusiastically — the conditions that justify it are wanting Agent Engine as a managed runtime, needing the Vertex governance layer, or the system genuinely becoming multi-agent.

**On the part that's framework-independent:** retrieval, chunking, embeddings, the index, evaluation, and the prompts' substance are all outside the orchestration layer. That's most of the system, and it means the migration is smaller than it sounds — which is worth saying, because it reframes the risk.

## 7. Interview Answer

> "The concepts map fairly directly, so I'd start there and then get to where they don't.
>
> State schema maps to session state. A node maps to either an agent or a tool invocation. The checkpointer maps to the session service and the thread ID to a session ID. Tools map to tools, with ToolContext available. Subgraphs map to sub-agents.
>
> What maps less cleanly is the explicit graph topology. LangGraph makes control flow explicit — you draw the graph and the edges are the logic. ADK is more agent-centric, where you compose agents and sub-agents and delegation drives the flow.
>
> That difference cuts both ways. A deterministic pipeline with conditional gates is very natural as a graph and less natural as agent delegation. A multi-agent system with delegation is the reverse. So the honest answer depends on which one the workflow actually is — and a deterministic RAG pipeline is a graph-shaped problem.
>
> Which leads to what I'd say about whether to migrate at all: if it's a deterministic pipeline and there's no platform requirement pulling it, I wouldn't. The conditions that justify it are wanting Agent Engine as a managed runtime, needing the Vertex governance layer, or the system genuinely becoming multi-agent.
>
> On what improves — two things I'd call out specifically.
>
> ToolContext carries the invocation context, so tools can act with the end user's identity rather than the service account's. That's the confused deputy problem solved at the framework level rather than something I have to thread through manually, and in banking it's a real advantage.
>
> And the before-tool callback gives a single enforcement point across every tool — authorization, redaction, argument validation in one place. One choke point is much better than per-tool checks that drift apart over time.
>
> Beyond that it's the usual platform case: the same IAM, VPC Service Controls, CMEK, audit logging, and residency as the rest of Vertex AI. That governance line is the actual business case, the same as any other Vertex migration — not that ADK orchestrates better.
>
> On sequencing: baseline the evaluation suite against the current system first, because without it the migration is unmeasurable. Port the tools next — they're the most portable part, ordinary functions with schemas, and worth keeping framework-agnostic anyway. Then map state to session state, including deciding what not to carry over. Then the control flow, which is the hard part.
>
> And that's where a literal translation goes wrong. Porting edge for edge produces an awkward system fighting the framework; re-expressing the intent as agent composition produces a natural one. That's a rewrite of the orchestration layer, not a translation.
>
> Then evaluate on the same suite per category, shadow both systems on live traffic serving only the old one, and cut over.
>
> Two caveats I'd be honest about. Prompts and tool descriptions need re-tuning, because how an agent decides to delegate depends on the wording. And the interrupt and human-review flow needs rebuilding rather than porting — it's the piece most specific to each framework's model.
>
> And the reframing that matters for the risk assessment: retrieval, chunking, embeddings, the index, and the evaluation suite are all outside the orchestration layer. That's most of the system, so the migration is smaller than it sounds."

## 8. Likely Follow-ups

**Q: What doesn't map cleanly?**
The explicit graph topology. LangGraph puts control flow in edges; ADK expresses it through agent composition and delegation. A deterministic pipeline is graph-shaped, so re-expressing it as delegation is the real work.

**Q: What does ADK give you that's genuinely better?**
ToolContext carrying end-user identity, which solves the confused deputy at the framework level, and the before-tool callback as a single enforcement point for authorization and validation across every tool.

**Q: Would you migrate a deterministic pipeline?**
Not without a reason. The conditions that justify it are wanting Agent Engine as managed runtime, needing the Vertex governance layer, or the system becoming genuinely multi-agent — otherwise it's work with no return.

**Q: Why not translate edge for edge?**
Because it produces a system that fights the framework. Re-expressing the control flow as agent composition gives a natural design; a literal port gives awkward scaffolding around a shape ADK doesn't want to express.

**Q: How big is the migration really?**
Smaller than it sounds. Retrieval, chunking, embeddings, the index, and the evaluation suite are all outside the orchestration layer — it's the orchestration and the human-review flow that get rewritten.

## 9. Common Mistakes

- Translating edges one to one.
- Claiming ADK orchestrates better rather than differently.
- Migrating without a baseline evaluation.
- Assuming prompts and tool descriptions transfer unchanged.
- Porting the interrupt flow rather than rebuilding it.

## 10. What to Remember

- **Concepts map; topology doesn't** — re-express, don't translate.
- **ToolContext solves the confused deputy** at the framework level.
- **The before-tool callback** is a single enforcement point.
- **The business case is the platform**, not the orchestration model.
- **Most of the system is outside orchestration** — the migration is smaller than it sounds.
