# Modular RAG

> **Phase 09 · ADVANCED RAG · Topic 03**

## 1. Definition

An architecture where RAG stages are independent, swappable components connected by explicit routing and control flow — rather than one fixed linear pipeline. It lets different query types take different paths through the system.

## 2. Simple Explanation

Naive RAG is one pipeline that every query goes through identically. Modular RAG says: different questions need different treatment.

"What's our wire fee?" needs a single retrieval. "Compare our fee structure to last year's and explain the change" needs decomposition, two retrievals, and synthesis. "Hi" needs no retrieval at all. Forcing all three through the same path wastes money on the simple ones and fails the complex ones.

## 3. How It Works

**The system becomes a graph of modules with a router deciding the path:**

```
                    ┌─────────┐
     query ────────▶│ ROUTER  │
                    └────┬────┘
           ┌─────────────┼─────────────┬──────────────┐
           ▼             ▼             ▼              ▼
     ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐
     │ No       │  │ Simple   │  │ Multi-   │  │ Structured│
     │ retrieval│  │ retrieve │  │ hop      │  │ (SQL/API) │
     │ (chat)   │  │ + rerank │  │ agentic  │  │           │
     └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬─────┘
          └─────────────┴─────────────┴──────────────┘
                              ▼
                        ┌──────────┐
                        │ Generate │
                        └──────────┘
```

**The module types:**

| Module | Responsibility | Swappable implementations |
|---|---|---|
| **Router** | Choose the path | Classifier, LLM, rules |
| **Query transform** | Rewrite, expand, decompose | None / rewrite / HyDE / multi-query |
| **Retriever** | Fetch candidates | Dense, BM25, hybrid, graph, SQL |
| **Filter** | ACL, date, type | Pre-retrieval metadata constraints |
| **Reranker** | Reorder for precision | Cross-encoder, LLM, none |
| **Compressor** | Fit the budget | Extractive, abstractive, none |
| **Generator** | Produce the answer | Small model, large model |
| **Verifier** | Check groundedness | NLI, LLM judge, rules |

## 4. Practical Example

**Routing by query type, with real cost consequences:**

```
Query classification → path → cost & latency

"hello"                    → no retrieval        → 0.3s   $0.0001
"what's the wire fee?"     → simple retrieve     → 1.2s   $0.002
"compare 2025 vs 2026 fees"→ decompose + 2 hops  → 3.8s   $0.012
"how many accounts opened  → text-to-SQL         → 0.9s   $0.003
 last month?"                (not vector search)

Without routing: every query takes the most expensive path.
At 100k queries/day, that's a large and entirely avoidable bill.
```

**That last row is the one worth raising:** some questions aren't retrieval questions at all. "How many accounts opened last month" is a SQL query against a database. Routing it to vector search over policy documents returns nothing useful no matter how good the retriever is.

**Implementation shape** — this is what [LangGraph](../16-langgraph/README.md) is for:

```python
graph.add_node("route",       classify_query)
graph.add_node("simple",      simple_retrieve)
graph.add_node("multi_hop",   agentic_retrieve)
graph.add_node("sql",         text_to_sql)
graph.add_node("generate",    generate_answer)
graph.add_node("verify",      check_groundedness)

graph.add_conditional_edges("route", pick_path,
    {"none": "generate", "simple": "simple",
     "complex": "multi_hop", "structured": "sql"})
graph.add_edge("simple",    "generate")
graph.add_edge("multi_hop", "generate")
graph.add_edge("sql",       "generate")
graph.add_conditional_edges("verify", lambda s:
    "retry" if s.groundedness < 0.7 else "done", {...})
```

## 5. Why It Matters

- **It's how RAG scales to a real product** with heterogeneous questions rather than one query shape.
- **It's a cost lever** — most queries are simple and shouldn't pay for the complex path.
- **Components become independently testable and replaceable**, which is what makes the system maintainable.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Router misclassifies** | Complex question takes the simple path and fails, or vice versa |
| **Unpredictable latency** | Different paths have very different response times; p99 becomes hard to reason about |
| **Debugging complexity** | Many paths means many failure modes; tracing is essential |
| **Premature modularity** | Building a routed graph before you have query volume or diversity to justify it |
| **Router itself is a cost** | An LLM classifier adds a call to every request; a small classifier is cheaper |
| **Hidden coupling** | Modules that look independent but share assumptions about chunk format |

**Router accuracy is the load-bearing risk.** If it misroutes 15% of queries, that's 15% taking a path that can't answer them. I'd measure router accuracy explicitly as its own metric, and design the fallback so a misroute degrades gracefully — a complex query on the simple path should abstain rather than answer badly.

## 7. Interview Answer

> "Modular RAG is an architecture where the stages are independent, swappable components connected by explicit routing, rather than one fixed linear pipeline. The premise is that different queries need different treatment.
>
> Concretely, 'hello' needs no retrieval. 'What's our wire fee' needs a single retrieval and rerank. 'Compare our fee structure to last year and explain the change' needs decomposition and multiple retrieval hops. And 'how many accounts opened last month' isn't a retrieval question at all — it's SQL against a database, and routing it to vector search over policy documents returns nothing useful regardless of retriever quality.
>
> Forcing all of those through one pipeline means the simple ones pay for the complex path and the complex ones fail. At a hundred thousand queries a day that's a large and entirely avoidable cost, plus worse quality on both ends.
>
> The implementation is a graph — a router node that classifies, several path nodes, and a shared generate node, with conditional edges. That's exactly what LangGraph is designed for, and I'd use it rather than hand-rolling control flow.
>
> The main risk I'd manage is router accuracy. If it misroutes fifteen percent of queries, that's fifteen percent taking a path that can't answer them. So I'd measure router accuracy as its own metric, and design fallbacks so a misroute degrades gracefully — a complex query on the simple path should abstain rather than confidently answer badly.
>
> I'd also be careful not to build this prematurely. If the query distribution is homogeneous, a routed graph is complexity for nothing."

## 8. Likely Follow-ups

**Q: How does the router decide?**
Options in increasing cost: rules and keyword heuristics, which are free and brittle; a small trained classifier, which is fast and cheap once you have labeled examples; or an LLM classifier, which is flexible and adds a call to every request. I'd start with an LLM classifier to bootstrap labels, then distill a small classifier for production once I have a few thousand labeled queries.

**Q: What happens when the router is wrong?**
It should degrade gracefully rather than fail silently. A complex query routed to the simple path should produce low retrieval confidence and trigger abstention or escalation to the complex path, rather than answering badly. I'd build that fallback explicitly — a confidence check after retrieval that can re-route.

**Q: When is modular RAG overkill?**
When the query distribution is homogeneous. If every question is a simple factual lookup against one corpus, a routed graph adds complexity, latency in the router, and failure modes for no benefit. I'd look at the actual query mix first — cluster production queries and see whether there genuinely are distinct types.

**Q: How do you test a modular system?**
Each module in isolation with its own eval set — router accuracy, retrieval recall, reranker improvement, groundedness — plus end-to-end tests per path. The isolation matters because end-to-end failures don't tell you which module broke. I'd also trace every request with the path taken, so production failures are diagnosable.

**Q: How does this relate to agentic RAG?**
Modular RAG is the architecture; agentic RAG is one path within it. The difference is who decides the control flow: in modular RAG a router picks among predefined paths deterministically, while in agentic RAG the model decides dynamically what to do next. Modular gives predictable latency and easier debugging; agentic handles genuinely open-ended questions. Most production systems want modular routing with an agentic path available for the hard cases.

## 9. Common Mistakes

- Building routing before there's query diversity to justify it.
- Not measuring router accuracy as its own metric.
- No graceful fallback when the router is wrong.
- Routing every query type to vector search, including ones that need SQL or an API.
- Treating modules as independent when they share assumptions about chunk format.

## 10. What to Remember

- **Swappable components plus a router**, not one fixed pipeline.
- **Different query types need different paths** — including no retrieval, and non-vector retrieval like SQL.
- **It's a cost lever** — simple queries shouldn't pay for the complex path.
- **Router accuracy is the load-bearing risk.** Measure it; design graceful fallbacks.
- **LangGraph is the natural implementation.** Don't build it before query diversity justifies it.
