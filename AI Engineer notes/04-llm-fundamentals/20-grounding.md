# Grounding (LLM View)

> **Phase 04 · LLM FUNDAMENTALS · Topic 20**

## 1. Definition

Constraining an LLM's output to be supported by provided evidence rather than by its parametric knowledge. It's both an architectural approach — supply the facts — and a measurable property: the fraction of claims the evidence supports.

## 2. Simple Explanation

An ungrounded model answers from what it absorbed during training: possibly outdated, possibly wrong, definitely uncitable.

A grounded model answers from evidence you supplied at inference. Everything it says traces to something you can point at, which is what makes the answer auditable.

## 3. How It Works

**Three layers, all required:**

```
1. SUPPLY EVIDENCE    retrieval puts the supporting facts in the context
                      ← nothing else works if this fails
2. CONSTRAIN          prompt: "use only the context"; abstain if absent;
                      cite every factual claim
3. VERIFY             check the output — the instruction is a request,
                      not a guarantee
```

**Grounding vs. related terms:**

| Term | Means |
|---|---|
| **Grounding** | Output supported by provided evidence |
| **Faithfulness** | Same thing; the RAGAS-framework term |
| **Groundedness** | Same thing; Vertex AI's metric name |
| **Attribution** | Which specific source supports which claim |
| **Citation** | The user-visible mechanism for attribution |

**On Google Cloud specifically:** Vertex AI exposes grounding as a first-class feature — grounding with Google Search, grounding with your own Vertex AI Search data store — and groundedness as a built-in evaluation metric in the Gen AI Evaluation Service. Worth naming in a Google interview.

## 4. Practical Example

**The prompt pattern that does the constraining:**

```
Answer using ONLY the information in <context>.

- If the context does not contain the answer, say "I don't have
  information about that in our documentation" and stop.
- Cite the source number for every factual claim, like [1].
- Quote exact figures and dates rather than paraphrasing.
- If sources conflict, prefer the later effective date and note it.

<context>
[1] Retail Fees Schedule § 3.2 (effective 2026-01-01)
International wire transfers: $45 retail, $25 Premier.
</context>
```

**The abstention clause is the single highest-value line.** Without it, models answer out-of-scope questions anyway, confidently.

**Verification, because the instruction isn't a guarantee:**

```
INLINE (every request, free):
  every monetary figure in the answer appears in a cited chunk
  every citation number resolves to a retrieved chunk

ASYNC (sampled ~5%):
  LLM judge, claim-level, required to quote supporting evidence
  → the tracked groundedness metric
```

**What grounding does and doesn't fix:**

| Fixes | Doesn't fix |
|---|---|
| Stale knowledge | Bad retrieval — garbage in, grounded garbage out |
| No access to private data | Poisoned corpus — grounded in false evidence |
| Unciteable answers | Overstating what the evidence says |
| Out-of-scope confidence (with abstention) | Reasoning errors over correct evidence |

**That second column matters:** a system can be perfectly grounded and wrong, if the evidence it's grounded in is wrong. Grounding shifts the trust question from the model to the corpus — it doesn't eliminate it.

## 5. Why It Matters

- **It's the core value proposition of RAG** — answers traceable to sources.
- **It's the compliance-facing property** in banking, where "where did this come from" is a required answer.
- **Knowing what it doesn't fix** — bad or poisoned evidence — is the mature view.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Grounded in wrong evidence** | Garbage in, grounded garbage out |
| **Grounded but irrelevant** | Faithfully summarizing the wrong context |
| **Over-constraining** | Model refuses to synthesize across provided sources |
| **Unvalidated citations** | A wrong citation is worse than none |
| **Assuming the instruction worked** | Measure groundedness; don't assume |
| **Over-abstention** | Safe and useless |

**On over-constraining:** "use only the context" taken too literally can make a model refuse to combine two provided chunks into an answer. The better phrasing permits reasoning *across the supplied sources* while forbidding facts from outside them.

**On the trust shift:** grounding moves the question from "do I trust the model" to "do I trust the corpus." That's usually a much better position — corpora are auditable and governable in ways model weights aren't — but it makes corpus governance a security concern, which is exactly the retrieval-poisoning problem.

## 7. Interview Answer

> "Grounding means constraining the output to be supported by provided evidence rather than by the model's parametric knowledge. It's both an architecture — supply the facts at inference — and a measurable property: the fraction of claims the evidence supports.
>
> It takes three layers and all of them are needed. Retrieval has to put the supporting evidence in the context; nothing else works if that fails. The prompt has to constrain the model to use only that context and abstain when it can't — and the abstention clause is the single highest-value line, because without it models answer out-of-scope questions anyway, confidently. And then verification, because the prompt instruction is a request, not a guarantee.
>
> For verification I'd run two tiers. Inline on every request, check that every monetary figure in the answer appears in a cited chunk and every citation resolves — free, deterministic, and it catches the highest-consequence errors in banking. Then a sampled LLM judge asynchronously for the tracked groundedness metric, required to quote its supporting evidence per claim.
>
> On Google Cloud, Vertex AI exposes grounding as a first-class feature — grounding with Google Search or with your own Vertex AI Search data store — and groundedness as a built-in metric in the Gen AI Evaluation Service.
>
> The thing I'd be clear about is what grounding doesn't fix. It fixes stale knowledge, lack of access to private data, and unciteable answers. It doesn't fix bad retrieval — garbage in, grounded garbage out — or a poisoned corpus, where the model is faithfully grounded in false evidence. So grounding shifts the trust question from the model to the corpus. That's usually a much better position, because corpora are auditable and governable in ways model weights aren't, but it makes corpus governance a security concern rather than just a content one."

## 8. Likely Follow-ups

**Q: How do you actually ground a model?**
Three layers: retrieval supplies the evidence, the prompt constrains the model to use only it with an explicit abstention clause and per-claim citation requirement, and verification checks the output. All three are needed — the prompt instruction alone is a request the model may not honour.

**Q: Can a grounded answer still be wrong?**
Yes, in two ways. Grounded in wrong evidence — if the corpus contains a false document, the model faithfully cites it. And grounded but irrelevant — faithfully summarizing context that doesn't address the question. That's why context relevance and answer relevance are measured alongside groundedness.

**Q: What's the highest-value part of the prompt?**
The abstention clause — telling the model to say it doesn't know when the context doesn't contain the answer. Without it, models answer out-of-scope questions anyway and do it confidently, which is the worst failure because it's indistinguishable from a correct answer to the user.

**Q: How do you verify grounding?**
Two tiers. Inline on every request: exact-figure matching against cited chunks and citation resolution, both free and deterministic. Sampled asynchronously: an LLM judge doing claim-level verification with required evidence quotes, producing the tracked groundedness metric. Full claim-level judging on every request is too expensive.

**Q: What does grounding change about where trust sits?**
It moves the question from "do I trust the model" to "do I trust the corpus." That's usually a better position, since corpora are auditable, versionable, and governable in ways model weights aren't. But it makes corpus governance a security concern — source allowlisting, write controls, provenance — which is the retrieval-poisoning problem.

## 9. Common Mistakes

- Assuming the grounding instruction worked without measuring.
- Over-constraining so the model won't synthesize across provided sources.
- Not validating that citations support their claims.
- Treating grounding as sufficient when the corpus itself may be wrong.
- Omitting the abstention clause.

## 10. What to Remember

- **Three layers:** retrieval supplies evidence, prompt constrains, verification checks.
- **The abstention clause is the highest-value line** in the prompt.
- **Verify in two tiers:** free inline figure checks + sampled LLM judge.
- **Grounded ≠ correct** — bad or poisoned evidence produces grounded wrong answers.
- **It shifts trust from the model to the corpus**, making corpus governance a security concern.
