# "Why That Embedding Model?"

> **Phase 31 · PROJECT DEEP DIVE · Topic 11**
>
> ⚠️ **An answer framework.** The honest answer is often "it was the sensible
> default" — and saying that, then explaining what you'd measure, is stronger
> than inventing a comparison.

## 1. Definition

A question testing whether the choice was reasoned. The strong answer names the criteria that actually matter, and is honest about which of them you evaluated.

## 2. Simple Explanation

Most teams use a well-regarded default, and that's usually right. The question is whether you know what you'd compare if it mattered.

An invented benchmark comparison is the wrong risk to take, because the follow-up is always "what did you measure?"

## 3. How It Works

```
THE CRITERIA THAT ACTUALLY MATTER

DOMAIN FIT          does it handle your vocabulary
ASYMMETRIC SUPPORT  distinct query and document task types
DIMENSIONS          storage and search cost
CONTEXT LENGTH      does it fit your chunk size
MULTILINGUAL        if you serve multiple languages
DEPLOYMENT          hosted, or self-hosted for residency
VERSION STABILITY   pinnable, with a migration path

Public benchmark scores are notably NOT on that list as a
primary criterion — they measure general capability on
tasks that aren't yours.
```

## 4. Practical Example

**The honest default answer, done well:**

```
"text-embedding-005, because it's the current Vertex AI
 model and it integrates with the platform — same IAM,
 same audit trail, data stays in the project.

 The criteria I'd have compared on if it mattered are
 domain fit, asymmetric task type support, and dimensions.

 And the way I'd compare is a golden set: label the
 correct chunk for a set of real queries, index the corpus
 with each candidate model, and measure recall@k. Not
 benchmark scores — those measure general capability on
 tasks that aren't mine."

That's honest, it names the right criteria, and it
describes a real method.
```

**Why benchmarks are the wrong criterion:**

```
A model scoring higher on a public retrieval benchmark may
be no better at matching banking policy vocabulary to
customer phrasing.

The only benchmark that answers the question is a golden
set of your own queries with the correct chunks labelled —
and that's a labelling exercise, not a leaderboard lookup.

Saying that shows you know what the comparison actually
requires.
```

**The criterion most likely to decide it in banking:**

```
DEPLOYMENT AND RESIDENCY

A hosted embedding API means your document text leaves the
environment at ingestion — every chunk, once. For some
corpora that's a blocker regardless of quality.

Vertex AI keeps it in-project, which is why the platform
model often wins on a governance argument before a quality
one. Naming that reason is stronger than a quality claim
you didn't measure.
```

## 5. Why It Matters

- **Naming the right criteria** matters more than having compared models.
- **Public benchmarks aren't the criterion** — they measure other people's tasks.
- **Residency often decides it** in banking, before quality does.

## 6. Trade-offs / Failure Modes

| Weak answer | Why |
|---|---|
| "It scored well on MTEB" | Measures general capability, not your task |
| An invented comparison | "What did you measure?" follows |
| "It's what the tutorial used" | True and says nothing |
| No criteria named | Suggests none were considered |
| Ignoring residency | Often the deciding factor in banking |

**On what would change the choice:** a corpus with heavy domain-specific vocabulary the model handles poorly, a multilingual requirement, or a scale where dimensions become a real memory constraint. Naming the conditions that would trigger a re-evaluation is a good answer to "would you choose differently?" — it shows the decision has boundaries rather than being arbitrary.

**On fine-tuning the embedding model:** worth knowing it's an option — training on domain triples of query, relevant chunk, and irrelevant chunk — and worth saying you'd exhaust hybrid search first. Adding BM25 so exact product names match lexically is far cheaper than fine-tuning an embedding model and addresses most of the same problem.

## 7. Interview Answer

> "[**Your model and reason.** The honest version below is usually the right one.]
>
> "It was [**your model**] — [**your reason**]. If it was the platform default: text-embedding-005, because it's the current Vertex AI model and it integrates with the platform. Same IAM, same audit trail, and the document text stays in the project at ingestion.
>
> That last point is worth drawing out, because in banking it often decides the choice before quality does. A hosted third-party embedding API means every chunk of your corpus leaves the environment once, at ingestion. For some corpora that's a blocker regardless of how the model performs.
>
> [**If you didn't compare models, say so.**] I didn't run a formal comparison — it was the sensible default for the platform. But the criteria I'd compare on are domain fit, asymmetric task type support, dimensions, context length against my chunk size, and deployment model.
>
> And the method matters more than the criteria list. I'd compare on a golden set: label the correct chunk for a set of real queries, index the corpus with each candidate model, and measure recall at k. Not public benchmark scores — a model scoring higher on a general retrieval benchmark may be no better at matching banking policy vocabulary to how customers actually phrase questions. The only benchmark that answers the question is one built from your own queries, and that's a labelling exercise rather than a leaderboard lookup.
>
> What would make me revisit it: a corpus with heavy domain-specific vocabulary the model handles poorly, a multilingual requirement, or a scale where dimensions become a real memory constraint.
>
> And if domain vocabulary were the problem, I'd exhaust hybrid search before fine-tuning an embedding model. Adding BM25 so exact product names and clause references match lexically is far cheaper and addresses most of the same problem — fine-tuning on domain triples is a real option but it's a much larger commitment, and it needs redoing whenever the base model changes."

## 8. Likely Follow-ups

**Q: Did you compare models?**
[**Honest answer.**] If not, saying so and describing the method — golden set with labelled correct chunks, indexed under each candidate, measuring recall@k — is stronger than implying a comparison. The follow-up to an invented one is always "what did you measure?"

**Q: Why not choose on benchmark scores?**
Because they measure general capability on tasks that aren't yours. A model scoring higher on a public retrieval benchmark may be no better at matching banking policy vocabulary to customer phrasing, which is the only question that matters here.

**Q: What criteria would you use?**
Domain fit, asymmetric task type support, dimensions, context length against chunk size, multilingual support if relevant, and deployment model. In banking, deployment and residency often decide it before quality — a hosted API means the corpus leaves the environment at ingestion.

**Q: What would make you change models?**
Domain vocabulary the model handles poorly, a multilingual requirement, or scale where dimensions become a memory constraint. Naming the conditions that would trigger re-evaluation shows the decision has boundaries rather than being arbitrary.

**Q: Would you fine-tune an embedding model?**
Only after exhausting hybrid search. Adding BM25 so exact product names and clause references match lexically is far cheaper and addresses most of the same problem — fine-tuning on domain triples is a real option but a much larger commitment that needs redoing when the base model changes.

## 9. Common Mistakes

- Citing a public benchmark score as the reason.
- Inventing a model comparison.
- No criteria named at all.
- Ignoring the residency implication of a hosted embedding API.
- Reaching for fine-tuning before hybrid search.

## 10. What to Remember

- **"It was the sensible default" is a fine answer** — with the criteria named.
- **Public benchmarks measure other people's tasks.**
- **Compare on a golden set** with labelled correct chunks.
- **Residency often decides it** — the corpus leaves the environment at ingestion.
- **Hybrid search before fine-tuning** for domain vocabulary problems.
