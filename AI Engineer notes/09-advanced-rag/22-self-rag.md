# Self-RAG

> **Phase 09 · ADVANCED RAG · Topic 22**

## 1. Definition

RAG where the model critiques its own process using explicit reflection signals — deciding whether retrieval is needed, whether retrieved passages are relevant, and whether its own generated output is supported by them. Introduced as a trained-model approach; commonly implemented as a prompted pipeline.

## 2. Simple Explanation

Corrective RAG checks the *retrieved documents*. Self-RAG also checks the *generated answer*.

The model asks itself three questions:
1. Do I need to retrieve for this?
2. Are these passages relevant?
3. Is what I just wrote actually supported by them?

If the answer to the third is no, it regenerates or abstains — catching hallucinations after the fact rather than only trying to prevent them.

## 3. How It Works

**The original paper (Asai et al., 2023)** trains a model to emit special "reflection tokens" inline:

| Token | Meaning |
|---|---|
| `[Retrieve]` | Retrieval is needed here |
| `[No Retrieve]` | Answer from parametric knowledge |
| `[Relevant]` / `[Irrelevant]` | This passage is/isn't useful |
| `[Supported]` / `[Partially]` / `[No Support]` | The generated claim is/isn't grounded |
| `[Useful: 1-5]` | Overall answer utility |

**The practical implementation** most teams build is a prompted pipeline achieving the same control flow without a custom-trained model:

```
query
  ↓
1. Decide: retrieve? ────no──▶ answer directly
  ↓ yes
2. Retrieve
  ↓
3. Grade passages for relevance  (= corrective RAG)
  ↓
4. Generate
  ↓
5. SELF-CRITIQUE: is each claim supported by the passages?
  ↓
  ├─ supported ────────▶ return
  └─ not supported ────▶ regenerate with stricter instruction,
                          or drop the claim, or abstain
```

**Step 5 is what distinguishes it from corrective RAG.**

## 4. Practical Example

**The verification step catching a real failure:**

```
Context: "Premier customers receive fee waivers on the first two
          international transfers per calendar month."

Generated: "Premier customers get unlimited free international transfers."

SELF-CRITIQUE:
  Claim: "unlimited free international transfers"
  Supported by context? NO — context says "first two per month."
  Verdict: [No Support]

  → Regenerate with: "The context states a specific limit. State it
     exactly."
  → "Premier customers receive fee waivers on their first two
     international transfers each calendar month."  [Supported]
```

**Cost:**

```
Standard RAG:     1 retrieval + 1 generation           ≈ 1.2s
Self-RAG:         1 retrieval + grading + generation
                  + critique (+ possible regeneration)  ≈ 3-5s

Roughly 3-4× latency, 3× cost.
```

**The practical compromise most systems land on:** run the critique **asynchronously** on a sample of traffic as a groundedness metric, rather than synchronously on every request. You get the measurement and the alerting without paying the latency on every query.

## 5. Why It Matters

- **It closes the loop on generation quality**, not just retrieval quality.
- **It's the mechanism behind groundedness measurement**, which is the key RAG quality metric.
- **The distinction from corrective RAG** — output critique versus input grading — is a clean conceptual point.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Latency and cost multiply** | Multiple LLM calls per query, plus possible regeneration |
| **Self-critique is unreliable** | A model evaluating its own output has a bias toward approving it |
| **Regeneration may not fix it** | The same model with the same context may produce the same error |
| **Over-critique** | Rejecting correct answers that are phrased differently from the source |
| **Unbounded loops** | Generate-critique-regenerate needs a hard limit |
| **The original requires a trained model** | The prompted version is an approximation, not the paper's method |

**On self-critique reliability:** a model judging its own output is measurably biased toward accepting it. Using a *different* model as the critic — ideally a smaller cheaper one, which is fine for a verification task — reduces that bias and costs less than a second call to the large model.

## 7. Interview Answer

> "Self-RAG is RAG where the model critiques its own process — deciding whether retrieval is needed, whether the retrieved passages are relevant, and crucially whether its own generated answer is actually supported by them.
>
> The distinction from corrective RAG is clean: corrective RAG grades the *inputs*, the retrieved documents. Self-RAG also grades the *output*. So it catches the case where retrieval was fine but the model overstated what the context said — turning 'fee waivers on the first two transfers per month' into 'unlimited free transfers.' That's a real and common failure that input grading can't catch.
>
> The original paper trains a model to emit reflection tokens inline. In practice most teams implement the same control flow as a prompted pipeline: decide, retrieve, grade, generate, critique, and regenerate or abstain if unsupported.
>
> The cost is three to four times the latency and around three times the cost, because you're making multiple LLM calls per query with possible regeneration. That's usually too much for a synchronous path.
>
> So the compromise I'd actually build is running the critique asynchronously on a sample of traffic as a groundedness metric, rather than synchronously on every request. I get the measurement and the alerting without taxing every query. Then I'd reserve synchronous critique for genuinely high-stakes answers.
>
> One implementation detail: I'd use a different, smaller model as the critic rather than the generating model. A model evaluating its own output is measurably biased toward approving it, and a small model is perfectly adequate for a verification task while costing less."

## 8. Likely Follow-ups

**Q: How is this different from corrective RAG?**
Corrective RAG grades the retrieved documents before generation — input quality. Self-RAG also grades the generated answer against those documents — output quality. They address different failures: corrective catches "we retrieved the wrong things," self-RAG catches "we retrieved the right things and then overstated them." A complete system does both.

**Q: Can a model reliably critique itself?**
Imperfectly. There's a documented bias toward accepting one's own output, so a model asked to verify its own answer approves it more often than an independent judge would. The practical fix is using a different model as the critic — and it can be smaller and cheaper, because verification against provided context is an easier task than generation.

**Q: Is the latency worth it?**
Usually not synchronously. Three to four times the response time is a significant product cost. I'd run the critique asynchronously on sampled traffic to produce a groundedness metric and alert on regressions, and apply it synchronously only where the stakes justify it — a regulatory answer, a figure that will be acted on. That gets most of the safety value for a fraction of the cost.

**Q: What happens if regeneration also fails?**
Bound it — one or two regeneration attempts, then abstain rather than returning an answer known to be unsupported. Looping until the critic approves risks the model eventually producing something vague enough to pass rather than something correct. Abstention with a note about what couldn't be verified is the safer terminal state.

**Q: How does this relate to groundedness measurement?**
It's the same mechanism applied differently. Groundedness is the metric — the fraction of claims supported by context. Self-RAG applies that check inline to gate the response; groundedness measurement applies it offline to track quality. The critique component is identical, so building one gives you the other nearly for free.

## 9. Common Mistakes

- Using the generating model as its own critic without accounting for self-preference bias.
- Running full synchronous critique on every query and accepting 4× latency.
- Unbounded generate-critique-regenerate loops.
- Conflating it with corrective RAG — input grading versus output verification.
- Presenting the prompted pipeline as the paper's method, which trains reflection tokens.

## 10. What to Remember

- **The model critiques its own output**, not just the retrieved inputs.
- **Corrective RAG grades inputs; Self-RAG also grades outputs.** Different failures.
- **3–4× latency and cost** synchronously — usually run it async on sampled traffic instead.
- **Use a different, smaller model as the critic** — self-evaluation is biased toward approval.
- **Bound regeneration attempts**, then abstain rather than looping.
