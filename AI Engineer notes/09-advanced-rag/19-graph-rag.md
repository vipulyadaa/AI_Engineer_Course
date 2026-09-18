# Graph RAG

> **Phase 09 · ADVANCED RAG · Topic 19**

## 1. Definition

RAG over a knowledge graph of entities and relationships, rather than (or alongside) a flat collection of text chunks. It answers questions that depend on *connections* between facts — which vector similarity cannot represent.

## 2. Simple Explanation

Vector search finds chunks that are *similar* to your question. It has no notion of things being *connected*.

"Which products are affected by the regulation that changed in March?" requires following a chain: regulation → effective date → affected products. No single chunk contains that chain, and similarity search can't traverse it. A graph can.

## 3. How It Works

**Ingestion — building the graph:**

1. **Extract entities** from documents with an LLM — products, regulations, policies, people, dates.
2. **Extract relationships** — `Regulation-X` `AFFECTS` `Premier-Savings`; `Policy-3.2` `SUPERSEDES` `Policy-2.9`.
3. **Store in a graph database** (Neo4j, or a graph layer over your existing store).
4. **Keep chunk text linked** to its entities, so you can return source text.
5. **Optionally cluster and summarize communities** of related entities — this is the core of Microsoft's GraphRAG for corpus-level questions.

**Query:**

```
question → extract entities → locate them in the graph
                                    │
                                    ▼
                    traverse relationships (1-3 hops)
                                    │
                                    ▼
                    collect linked chunks → context → generate
```

**Hybrid is the practical form:** use the graph to find *which* entities and documents are relevant, then vector search within them for the actual passages.

## 4. Practical Example

**Where vector search structurally fails:**

```
Q: "Which of our products are affected by the fee regulation
    that changed in March 2026?"

VECTOR SEARCH:
  Retrieves chunks about fee regulations, and chunks about products.
  Neither states the connection — no single document says
  "Regulation 2026-04 affects Premier Savings, Premier Checking,
   and Business Current."
  The model has to guess, or says it doesn't know.

GRAPH:
  MATCH (r:Regulation {effective: '2026-03'})-[:AFFECTS]->(p:Product)
  RETURN p.name, r.summary
  → exact, complete, and traversable.
```

**The two question types graph RAG is for:**

| Type | Example | Why vectors fail |
|---|---|---|
| **Multi-hop relational** | "Which products does the regulation that superseded Policy 2.9 affect?" | The chain spans documents |
| **Global / corpus-level** | "What are the main themes across all our compliance documents?" | No chunk contains a corpus-wide summary |

That second type is what Microsoft's GraphRAG community-summarization addresses — it precomputes summaries of clusters in the graph so "global" questions have something to retrieve.

## 5. Why It Matters

- **It handles relational and global questions** that flat vector RAG structurally cannot.
- **It's the right answer when your domain is genuinely a graph** — regulatory dependencies, org structures, supply chains, code dependencies.
- **Knowing when it's *not* worth it** is the more common and more valuable judgment.

## 6. Trade-offs / Failure Modes

| Cost | Detail |
|---|---|
| **Expensive ingestion** | LLM entity and relationship extraction over the whole corpus |
| **Extraction quality is load-bearing** | A missed or wrong relationship silently breaks traversal |
| **Schema design** | You must decide what entities and relations exist — a real modeling effort |
| **Graph maintenance** | Document updates require re-extraction and graph reconciliation |
| **Another database** | Operational surface, expertise, and cost |
| **Often unnecessary** | Most RAG questions are lookups, not traversals |

**The honest position:** graph RAG is powerful and frequently over-applied. If your questions are "what's the fee for X," a graph adds enormous ingestion cost and operational complexity for nothing — a metadata filter answers the same question. It earns its cost when relationships between entities are genuinely the substance of the questions being asked.

**Entity resolution is the hard unsolved part.** "Premier Savings," "Premier Savings Account," and "PSA" must resolve to one node, or the graph fragments and traversal misses paths.

## 7. Interview Answer

> "Graph RAG builds a knowledge graph of entities and relationships from your documents and retrieves by traversing it, rather than only by vector similarity.
>
> The reason it exists is that vector search finds chunks similar to the question but has no notion of things being connected. If someone asks which products are affected by the regulation that changed in March, no single chunk states that chain — regulation, to effective date, to affected products. Similarity search retrieves chunks about regulations and chunks about products, and the model has to guess at the connection. A graph traversal answers it exactly.
>
> There's a second category too: global questions like 'what are the main themes across all our compliance documents.' No chunk contains a corpus-wide summary, so retrieval has nothing to return. Microsoft's GraphRAG addresses that by clustering the graph and precomputing community summaries.
>
> The costs are substantial. LLM entity and relationship extraction across the whole corpus at ingestion, a schema you have to design, a graph database to operate, and re-extraction on every document update. And entity resolution is genuinely hard — 'Premier Savings,' 'Premier Savings Account,' and 'PSA' have to resolve to one node or traversal silently misses paths.
>
> So my honest position is that it's powerful and frequently over-applied. If the questions are 'what's the fee for X,' a graph adds enormous cost for nothing — a metadata filter does the same job. I'd reach for it when relationships between entities are genuinely the substance of what's being asked, and I'd use the hybrid form: graph to find which entities and documents matter, then vector search within them for the actual passages."

## 8. Likely Follow-ups

**Q: When is graph RAG worth the cost?**
When the questions are genuinely relational — multi-hop dependencies, "what's connected to what," impact analysis — or when you need corpus-level synthesis that no single chunk supports. Regulatory dependency mapping, org structures, supply chains, and code dependency analysis are natural fits. Simple factual lookups are not.

**Q: What's the hardest part of building it?**
Entity resolution and relationship extraction quality. Different surface forms of the same entity must merge into one node, or the graph fragments and traversal misses paths — and that failure is silent. Relationship extraction is similarly fragile: an LLM that misses a relationship means those two nodes are simply unconnected, with no error anywhere.

**Q: How does it combine with vector search?**
The practical pattern is hybrid: use the graph to identify relevant entities and the documents attached to them, then vector search within that constrained set for the specific passages. The graph handles "which documents matter and how do they connect," and vector search handles "which passage answers this." Neither alone is sufficient for most real systems.

**Q: What is Microsoft's GraphRAG specifically?**
An implementation that extracts an entity graph, detects communities of densely connected entities, and generates LLM summaries for each community at multiple levels. Global questions are answered by retrieving and combining those community summaries rather than individual chunks. It targets the "no single chunk contains the answer" case that ordinary RAG can't handle at all.

**Q: How do you keep the graph current?**
Re-extract entities and relationships when a document changes, then reconcile — which means adding new edges, removing edges that no longer have support, and handling entities that have disappeared. That's meaningfully harder than re-embedding a chunk, because a single document's change can invalidate relationships that involve other documents. It's a real ongoing operational cost and the main reason I'd want the use case to justify it.

## 9. Common Mistakes

- Building a graph for a corpus where the questions are simple lookups.
- Underinvesting in entity resolution, so the graph fragments silently.
- Assuming graph replaces vector search rather than complementing it.
- Not planning for graph maintenance on document updates.
- Treating extraction quality as a solved problem — it's the load-bearing component.

## 10. What to Remember

- **Entities and relationships, traversed** — answers connection questions similarity can't.
- **Two use cases:** multi-hop relational questions, and global corpus-level synthesis.
- **Expensive:** LLM extraction at ingestion, schema design, a graph DB, re-extraction on updates.
- **Entity resolution is the hard part** and its failures are silent.
- **Frequently over-applied.** Use the hybrid form, and only when relationships are the substance of the questions.
