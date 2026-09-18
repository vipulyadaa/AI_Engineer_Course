# What Is RAG?

> **Phase 08 · RAG FUNDAMENTALS · Topic 01**

## 1. Definition

Retrieval-Augmented Generation: fetch relevant documents at query time and put them in the LLM's prompt, so the answer is grounded in your data rather than in the model's frozen training weights. Retrieval happens at inference; no parameters change.

## 2. Simple Explanation

An LLM is a closed-book exam taker — it answers from memory, and when memory fails it confabulates fluently. RAG turns it into an open-book exam: you hand it the relevant pages before it answers.

The model doesn't *learn* your documents. It reads them, in the prompt, for that one request. Next request, the context is gone.

## 3. How It Works

Two phases, and separating them matters:

**Ingestion (offline, done once per document):**
1. Load documents → parse to text → clean.
2. Split into **chunks** sized to be retrievable and to fit in context.
3. **Embed** each chunk into a vector with an embedding model.
4. Store vectors plus text plus metadata in a **vector index**.

**Query (online, per request):**
5. Embed the user's question with the *same* embedding model.
6. **Retrieve** the top-k nearest chunks by vector similarity (often plus keyword search).
7. **Construct the context** — assemble chunks into the prompt with instructions.
8. **Generate** — the LLM answers using that context, ideally with citations.

```
INGEST:  docs → parse → chunk → embed → vector store
QUERY:   question → embed → retrieve top-k → prompt → LLM → answer + citations
```

## 4. Practical Example

**Banking FAQ assistant.** User asks *"What's the fee for an international wire transfer?"*

```
1. Embed the question                        → [0.021, -0.14, ...]  (768-dim)
2. Search the index of 4,200 policy chunks   → top 4 by cosine similarity
3. Top chunk: "Fees Schedule §3.2 — Outgoing international wire: $45
   for retail accounts, $25 for Premier..."
4. Prompt:
     "Answer using ONLY the context below. Cite the section.
      If the context doesn't contain the answer, say so.
      <context>...</context>
      Question: What's the fee for an international wire transfer?"
5. LLM: "$45 for retail accounts, $25 for Premier (Fees Schedule §3.2)."
```

**Why this beats the alternatives:** the fee changed last month. A fine-tuned model would still have the old number baked into its weights. RAG served the new one as soon as the document was re-indexed.

## 5. Why It Matters

- **It solves the knowledge problem** — private data, data newer than the training cutoff, and data that changes frequently.
- **It makes answers auditable.** You can cite the source chunk, which is often a hard requirement in banking, legal, and healthcare.
- **It's cheaper and faster to update than fine-tuning** — re-index a document in seconds versus a retraining cycle.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Retrieval misses** | If the right chunk isn't in the top-k, no prompt engineering recovers it. Retrieval recall upper-bounds answer quality |
| **Irrelevant context distracts** | Too many chunks dilute the signal and can pull the model off-topic |
| **Stale index** | Documents updated but not re-embedded → confidently serving last year's policy |
| **Hallucination despite context** | The model can still ignore the context or blend it with its parametric knowledge |
| **Added latency and cost** | Embedding + search + a longer prompt. Typically 200–800ms overhead |
| **Prompt injection via documents** | Retrieved text is untrusted input; a malicious document can carry instructions |

**The first diagnostic when a RAG answer is wrong:** *was the correct chunk retrieved at all?* That splits a retrieval problem from a generation problem immediately, and they have completely different fixes.

## 7. Interview Answer

> "RAG is retrieval-augmented generation — you fetch relevant documents at query time and put them in the prompt, so the model answers from your data rather than from its frozen weights.
>
> Mechanically there are two phases. Offline ingestion: load documents, chunk them, embed each chunk, store the vectors. Online query: embed the question, retrieve the top-k nearest chunks, build a prompt with that context, and generate.
>
> The key thing is that nothing is learned. The model reads the documents in the prompt for that one request. That's why RAG is the right tool when knowledge changes — if a fee schedule updates, I re-index one document and the next answer is correct, whereas a fine-tuned model would still have the old number in its weights.
>
> It also gives auditability, which matters a lot in banking. I can cite the source chunk, so a compliance reviewer can verify the answer against the policy document.
>
> The thing I'd emphasize is that RAG is mostly a retrieval problem wearing a generation costume. The generation step is a hosted model I don't control much. Nearly all the quality I do control is in parsing, chunking, embedding, and retrieval. So when an answer is wrong, my first question isn't 'is the LLM bad' — it's 'was the right chunk in the top-k at all.' That's a recall measurement, and it separates a retrieval bug from a generation bug immediately."

## 8. Likely Follow-ups

**Q: RAG or fine-tuning?**
Different problems. RAG changes what the model *knows* — it injects facts at inference. Fine-tuning changes how the model *behaves* — format, tone, task structure. If the failure is "it doesn't know our 2026 fee schedule," that's RAG, and fine-tuning would be an expensive way to bake in facts that go stale. If the failure is "it knows the answer but won't produce our required JSON reliably," that's fine-tuning or better prompting. They compose: fine-tune for behavior, retrieve for knowledge.

**Q: Why not just put all the documents in the prompt?**
Sometimes you can, and with long-context models that's a real option for small corpora. But cost and latency scale with prompt length, quality degrades when the relevant fact is buried in a very long context, and most corpora are far larger than any context window. Retrieval is a relevance filter that keeps the prompt small, cheap, and focused.

**Q: Does RAG eliminate hallucination?**
No, it reduces it. The model can still ignore the provided context, blend it with parametric knowledge, or extrapolate beyond what the chunk says. You reduce that further with explicit instructions to use only the context, citation requirements, and a groundedness check on the output — but it's a mitigation, not a guarantee.

**Q: What's the hardest part of building a RAG system?**
Retrieval quality, and specifically the ingestion decisions upstream of it — document parsing and chunking. A badly parsed PDF or a chunk that splits a table in half is unrecoverable downstream. In my experience more RAG failures trace to parsing and chunking than to the embedding model or the LLM.

**Q: How do you know your RAG system is working?**
Measure the stages separately, because they fail differently. Retrieval: recall@k on a held-out set of questions with known correct sources. Generation: groundedness, meaning the fraction of claims in the answer actually supported by the retrieved context. Measuring only end-to-end answer quality tells you something's wrong without telling you where.

## 9. Common Mistakes

- Saying RAG "trains" or "teaches" the model your documents — nothing is learned.
- Treating it as a generation problem when it's mostly a retrieval problem.
- Debugging the prompt when the right chunk was never retrieved.
- Claiming it eliminates hallucination.
- Forgetting that retrieved document text is untrusted input.

## 10. What to Remember

- **Retrieve at query time, put it in the prompt. No parameters change.**
- **Two phases:** offline ingestion (parse → chunk → embed → index), online query (embed → retrieve → prompt → generate).
- **Retrieval recall upper-bounds answer quality** — if the chunk isn't there, nothing downstream fixes it.
- **RAG for knowledge, fine-tuning for behavior.** They compose.
- **First diagnostic on a wrong answer:** was the right chunk retrieved?
