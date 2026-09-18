# ADK vs LangChain

> **Phase 21 · GOOGLE ADK · Topic 17**

## 1. Definition

A comparison at different levels: LangChain is a broad toolkit of components — loaders, splitters, adapters, chains — while ADK is an agent framework with a deployment story. They overlap less than the question implies.

## 2. Simple Explanation

They aren't really alternatives. LangChain's most valuable parts are ingestion utilities; ADK's are agent abstractions and managed deployment.

Using LangChain's document loaders and splitters to build a corpus, then an ADK agent to serve it, is a coherent combination rather than a contradiction.

## 3. How It Works

```
LANGCHAIN
  document loaders, text splitters      ← genuinely strong
  provider adapters
  LCEL chain composition
  AgentExecutor                          ← superseded
  callbacks and tracing

ADK
  agent, tools, sessions, state
  workflow agents (sequential, parallel, loop)
  callbacks as control points
  Agent Engine deployment                ← the differentiator
  Vertex AI integration
```

**The overlap is only in the agent layer**, and that's the part of LangChain that's weakest and has largely moved to LangGraph anyway.

## 4. Practical Example

**The combination that makes sense:**

```
INGESTION — LangChain
  document loaders handling PDF, DOCX, HTML, GCS
  text splitters with structure-aware, token-aware chunking

  These are genuinely good, well tested, and would
  otherwise be reimplemented badly. Loading a directory of
  banking PDFs with multi-column layouts, tables, headers,
  and encoding issues is days of work solved by a loader
  and a splitter.

SERVING — ADK
  agent, tools, callbacks for authorization and audit,
  Agent Engine for deployment

  With the query path written explicitly rather than
  through a framework chain, because thresholds, filters,
  and abstention need to be visible.
```

**That split follows the ingestion/query boundary** — ingestion is batch, inspectable, and rerunnable, so framework convenience is fine there. The query path is what customers experience and regulators ask about.

**Where LangChain's agent layer loses:**

```
AgentExecutor gives a loop with iteration limits and
parsing error handling. It doesn't give budgets,
authorization, loop detection, persistence, or audit — and
its own guidance points to LangGraph for anything beyond a
simple loop.

ADK's callbacks give a designed place for authorization and
audit across every tool, and Agent Engine gives deployment.
On the agent layer specifically, ADK is the stronger choice.
```

**Where ADK doesn't compete at all:**

```
ADK isn't trying to be a document loading and chunking
library, and it shouldn't be. That part of LangChain has
no ADK equivalent and doesn't need one.
```

## 5. Why It Matters

- **They overlap only in the agent layer** — the question is narrower than it sounds.
- **LangChain's ingestion utilities plus an ADK agent** is a coherent combination.
- **ADK is stronger on the agent layer**; LangChain is stronger on ingestion.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Treating it as either/or** | Misses the natural combination |
| **LangChain agents in production** | Superseded even by its own guidance |
| **Framework chains on the query path** | Hides thresholds, filters, abstention |
| **Two dependency trees** | Both need security review and patching |
| **API churn in both** | Pin versions tightly |

**On the dependency cost:** using both means two dependency trees to review, patch, and justify in a security assessment. In a bank that's real work, and it's an argument for using LangChain narrowly — the loaders and splitters — rather than pulling in the full framework for two utilities.

**On the query path:** regardless of framework, I'd write retrieval, filtering, prompt assembly, and the abstention decision explicitly. Those are the things a reviewer needs to see and a regulator might ask about, and hiding them inside a chain abstraction works against that in either framework.

## 7. Interview Answer

> "They aren't really alternatives, because they operate at different levels. LangChain is a broad toolkit — document loaders, text splitters, provider adapters, chain composition. ADK is an agent framework with a deployment story. The overlap is only in the agent layer.
>
> And on that overlap, ADK is stronger. LangChain's AgentExecutor gives a loop with iteration limits and parsing error handling but no budgets, authorization, loop detection, persistence, or audit — and LangChain's own guidance points to LangGraph for anything beyond a simple loop. ADK's callbacks give a designed place for authorization and audit across every tool, and Agent Engine gives managed deployment.
>
> Where ADK doesn't compete at all is ingestion. It isn't trying to be a document loading and chunking library and shouldn't be. LangChain's loaders and splitters are genuinely good — loading a directory of banking PDFs with multi-column layouts, tables, headers, and encoding issues is days of work solved by a loader and a splitter, and I'd otherwise reimplement it badly.
>
> So the combination that makes sense is LangChain for ingestion and ADK for serving. That follows the ingestion-versus-query-path boundary: ingestion is batch, inspectable, and rerunnable, so framework convenience is fine there. The query path is what customers experience and regulators ask about.
>
> And on the query path specifically — regardless of framework — I'd write retrieval, filtering, prompt assembly, and the abstention decision explicitly rather than through a chain abstraction. Those are the things a reviewer needs to see, and hiding them inside a composed chain works against that in either framework.
>
> One honest cost of the combination: two dependency trees to review, patch, and justify in a security assessment. In a bank that's real work, and it's an argument for using LangChain narrowly — just the loaders and splitters — rather than pulling in the full framework for two utilities."

## 8. Likely Follow-ups

**Q: Are they really alternatives?**
Only in the agent layer. LangChain is a broad toolkit whose strongest parts are ingestion utilities; ADK is an agent framework with a deployment story. Using LangChain's loaders and splitters with an ADK agent is coherent rather than contradictory.

**Q: Which is better for agents?**
ADK, on that layer. LangChain's AgentExecutor provides a loop with iteration limits but no budgets, authorization, loop detection, persistence, or audit — and its own guidance points elsewhere. ADK's callbacks and Agent Engine deployment address exactly those gaps.

**Q: What would you keep from LangChain?**
Document loaders and text splitters. Handling multi-column PDFs, tables, headers, encoding issues, and structure-aware token-counted chunking is days of work solved by well-tested utilities that ADK doesn't try to provide and shouldn't.

**Q: Would you use LangChain's chains on the query path?**
No — I'd write retrieval, filtering, prompt assembly, and abstention explicitly. Those are what a reviewer needs to see and a regulator might ask about, and a composed chain hides them. That applies in either framework rather than being a LangChain criticism specifically.

**Q: What's the cost of using both?**
Two dependency trees to review, patch, and justify in a security assessment, which in a bank is real work. That's an argument for using LangChain narrowly — the loaders and splitters only — rather than adopting the full framework for two utilities.

## 9. Common Mistakes

- Framing it as an either/or choice.
- Using LangChain's AgentExecutor in production.
- Hiding the query path inside framework chains.
- Adopting the full LangChain framework for two ingestion utilities.
- Ignoring the dependency review cost of running both.

## 10. What to Remember

- **They overlap only in the agent layer** — different levels otherwise.
- **ADK is stronger on agents; LangChain on ingestion.**
- **LangChain loaders + ADK serving** is the coherent combination.
- **Write the query path explicitly** in either framework.
- **Two dependency trees is a real cost** — use LangChain narrowly.
