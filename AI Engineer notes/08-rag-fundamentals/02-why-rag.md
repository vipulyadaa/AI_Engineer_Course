# Why RAG?

> **Phase 08 · RAG FUNDAMENTALS · Topic 02**

## 1. Definition

RAG exists because an LLM's knowledge is frozen at training time, generic, unattributable, and impossible to permission. Retrieval fixes all four by supplying facts at inference instead of baking them into weights.

## 2. Simple Explanation

Four things an LLM alone cannot do for a business:

1. **Know your private data** — it was never trained on your policy documents.
2. **Know recent facts** — training has a cutoff.
3. **Cite a source** — it can't tell you where an answer came from.
4. **Respect permissions** — it can't know that this user may see the HR policy and that one may not.

RAG addresses all four with the same mechanism: fetch the right documents at query time.

## 3. How It Works

The four problems and how retrieval solves each:

| Problem | Without RAG | With RAG |
|---|---|---|
| **Private data** | Model has never seen it | Index it; retrieve at query time |
| **Staleness** | Knowledge frozen at cutoff | Re-index a document → next answer is current |
| **No attribution** | "Trust me" | Cite the chunk and section |
| **No access control** | All-or-nothing | Filter retrieval by the user's permissions |

**The update-cost argument is the one that usually wins:**

```
Fee schedule changes.

Fine-tuning:  prepare data → retrain → evaluate → deploy   (days, and the old
                                                            fact is still in
                                                            the weights competing)
RAG:          re-index one document                         (seconds)
```

## 4. Practical Example

**When RAG is the right call vs. when it isn't:**

| Requirement | Right tool | Why |
|---|---|---|
| "Answer from our 12,000 policy documents" | **RAG** | Private, large, changes often |
| "Always respond in this exact JSON schema" | **Fine-tuning / structured output** | Behavior, not knowledge |
| "Adopt our brand tone of voice" | **Fine-tuning or a system prompt** | Behavior |
| "Use last week's rate table" | **RAG** | Post-cutoff knowledge |
| "Explain what a mortgage is" | **Neither** — the base model knows | Don't add a retrieval hop for general knowledge |
| "Only show a user documents they're cleared for" | **RAG with pre-filtering** | Only retrieval can enforce this |

That last row is worth stating in an interview: **access control is architecturally impossible with fine-tuning.** Once a fact is in the weights, every user gets it. With retrieval you filter the candidate set by the caller's permissions before the model ever sees anything.

## 5. Why It Matters

- **It's the standard architecture for enterprise LLM applications**, and the reason is economic as much as technical — updating an index is orders of magnitude cheaper than retraining.
- **Auditability is often a hard requirement**, not a nice-to-have, in banking, legal, and healthcare.
- **It decouples knowledge from the model**, so you can swap the LLM without re-doing your knowledge work.

## 6. Trade-offs / Failure Modes

| Cost | Detail |
|---|---|
| **Latency** | Embedding + vector search + a longer prompt. Typically 200–800ms added |
| **Per-query cost** | Retrieved context inflates input tokens on every single call |
| **Infrastructure** | Vector store, ingestion pipeline, re-indexing jobs, monitoring — real operational surface |
| **New failure modes** | Retrieval misses, stale index, conflicting documents, prompt injection via documents |
| **Quality ceiling is your corpus** | If the answer isn't documented anywhere, RAG can't invent it |

**When RAG is the wrong answer:** general-knowledge questions the base model already handles, tasks that are about output *format* rather than facts, and corpora small enough to fit entirely in a long context window — where retrieval adds a failure mode for no benefit.

## 7. Interview Answer

> "RAG exists because an LLM's knowledge has four limitations that matter in an enterprise: it's frozen at the training cutoff, it doesn't include your private data, it can't cite a source, and it can't respect access permissions.
>
> Retrieval fixes all four with one mechanism — fetch the right documents at query time instead of baking facts into weights.
>
> The argument that usually wins is update cost. If a fee schedule changes, RAG means re-indexing one document, which takes seconds. Fine-tuning means preparing data, retraining, evaluating, and deploying — days — and the old fact is still in the weights competing with the new one. Facts that change belong in retrieval.
>
> The one I'd highlight because people miss it is access control. That's architecturally impossible with fine-tuning: once a fact is in the weights, every user gets it. With retrieval I filter the candidate set by the caller's permissions before the model sees anything. In a banking context that's not a nice-to-have, it's a launch requirement.
>
> And I'd be clear about when RAG is the wrong answer. General knowledge the base model already has doesn't need a retrieval hop. Output format problems are prompting or fine-tuning problems, not retrieval problems. And if the corpus genuinely fits in a long context window, retrieval adds a failure mode for no benefit."

## 8. Likely Follow-ups

**Q: Long-context models are getting huge. Does that make RAG obsolete?**
No, for three reasons. Cost and latency scale with prompt length, so stuffing a million tokens into every request is expensive in a way retrieval isn't. Quality degrades when the relevant fact is buried in a very long context. And most enterprise corpora are far larger than any context window — twelve thousand documents doesn't fit regardless. What long context does change is that chunks can be larger and you can retrieve more of them, which makes RAG easier rather than unnecessary.

**Q: What's the ROI argument for RAG over fine-tuning?**
Update cost and model independence. Re-indexing is seconds versus a retraining cycle of days. And your knowledge work is decoupled from the model, so when a better LLM ships you swap it without redoing anything — whereas a fine-tune is tied to its base model and has to be redone.

**Q: Can you use both?**
Yes, and it's often right. Fine-tune for behavior — output format, domain tone, a specific task structure — and retrieve for knowledge. The mistake is using fine-tuning to inject facts, because those go stale in the weights and you can't audit or permission them.

**Q: What can't RAG fix?**
Anything not documented in your corpus. If the answer doesn't exist in writing anywhere, retrieval returns the nearest irrelevant thing and the model may confabulate around it. RAG's quality ceiling is your documentation quality, and that's often the real finding of a RAG project — it surfaces gaps in the knowledge base.

**Q: How do you justify the added latency?**
By measuring it against the alternative. An answer that's wrong because the model used a stale fact costs more than 400ms. And a lot of the latency is controllable — cache embeddings for repeated queries, retrieve fewer and better chunks, run retrieval in parallel with any other prep. In practice retrieval overhead is small next to generation time for a non-trivial answer.

## 9. Common Mistakes

- Framing RAG as a replacement for fine-tuning rather than a solution to a different problem.
- Using RAG for general knowledge the base model already has.
- Claiming long context makes RAG obsolete.
- Forgetting the access-control argument, which is the strongest one in a regulated domain.
- Ignoring that RAG's ceiling is your documentation quality.

## 10. What to Remember

- **Four problems RAG solves:** private data, staleness, no attribution, no access control.
- **Update cost is the winning argument** — re-index in seconds vs. retrain in days.
- **Access control is impossible with fine-tuning.** Once it's in the weights, everyone gets it.
- **RAG for knowledge, fine-tuning for behavior.** They compose.
- **RAG's ceiling is your corpus** — it can't answer what nobody documented.
