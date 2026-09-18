# Interview Questions: Model Garden

> **Phase 34 · GOOGLE-SPECIFIC INTERVIEW QUESTIONS · Topic 04**

## 1. Definition

Vertex AI's catalogue of first-party, open, and partner models. Interview questions about it are testing whether you'd use a specialized model where one fits, and whether you understand the cost model of self-deployment.

## 2. Simple Explanation

Model Garden is where you find models beyond Gemini and deploy them in your project.

The question worth answering well is what you'd actually deploy from it — and the strong answer is a cross-encoder reranker, not a bigger LLM.

## 3. How It Works

```
WHAT'S IN IT
  first-party   Gemini, Imagen, embedding models
  Google open   Gemma and variants
  partner       third-party commercial models
  open source   Hugging Face models

COST MODELS DIFFER
  hosted first-party    per token
  self-deployed         per uptime  ← the trap
```

**Self-deployed models bill for uptime, not requests.** An idle GPU endpoint bills continuously, which is the operational point the question usually probes.

## 4. Practical Example

**The answer that distinguishes:**

```
"What would you deploy from Model Garden?"

WEAK   "an open model to reduce cost" — usually wrong,
       since open models rarely match on generation and
       you've taken on hosting

STRONG "a cross-encoder reranker"

Why that's the right answer:
  · reranking is typically the largest single quality gain
    in a RAG pipeline
  · a cross-encoder does it better than any LLM, because
    it scores query and document jointly
  · it's a fraction of the cost and an order of magnitude
    faster
  · it's small, so a modest endpoint serves it

That's a specific, defensible deployment with a clear
justification — rather than a general claim about open
models being cheaper.
```

**The second-best answer is a trained classifier** for query routing — five to twenty milliseconds against a small LLM's hundred and fifty to three hundred, sitting in front of every request.

**The evaluation argument:**

```
Model Garden also means comparing a partner model against
Gemini doesn't require a new vendor assessment — it's
already inside the project's IAM and audit controls.

That removes weeks of procurement from what should be an
engineering decision, which is a real organizational
benefit worth naming.
```

**What to be careful about:**

```
· idle endpoints billing continuously — keep an inventory
  with owners and expiry
· open model licences, some restricting commercial use —
  needs checking before deployment, and deployment is
  frictionless enough that it gets skipped
· no support contract on a self-deployed model — fine for
  a reranker, a bigger commitment on the critical path
· open models rarely match frontier models on open-ended
  generation
```

## 5. Why It Matters

- **A cross-encoder reranker** is the specific defensible answer, not "an open model."
- **Self-deployed models bill per uptime** — the operational trap.
- **Evaluation without procurement** is a real organizational benefit.

## 6. Trade-offs / Failure Modes

| Weak answer | Why |
|---|---|
| "Open models are cheaper" | Rarely true once hosting is counted |
| No specific deployment named | Reads as unfamiliarity |
| Ignoring the uptime cost model | The operational point being tested |
| No mention of licensing | A real pre-deployment check |
| Claiming open models match on generation | Usually false |
| Using an LLM for reranking | The mistake the question often probes |

**On the cost comparison being honest:** a self-deployed model is cheaper at sustained high volume and more expensive at low or spiky volume, because you pay for uptime regardless. The break-even depends entirely on utilization, and asserting "self-hosting is cheaper" without that qualification signals not having operated one.

**On operational sprawl:** every self-deployed model is another thing to version, monitor, patch, and hold quota for. A reranker justifies that because the quality gain is large. Four specialized models each saving a little don't — the maintenance exceeds the benefit, and the decision should count operational cost rather than only inference cost.

## 7. Interview Answer

> "Model Garden is the catalogue — first-party Gemini and embedding models, Google's open models like Gemma, partner models, and open source — all deployable under the project's IAM and audit controls.
>
> If asked what I'd actually deploy from it, the answer is a cross-encoder reranker. That's specific and defensible: reranking is typically the largest single quality gain in a RAG pipeline, a cross-encoder does it better than any LLM because it scores query and document jointly rather than comparing independent embeddings, it's a fraction of the cost and an order of magnitude faster, and it's small enough that a modest endpoint serves it.
>
> The weak version of that answer is 'an open model to reduce cost', which is usually wrong — open models rarely match frontier models on open-ended generation, and you've taken on hosting to find that out.
>
> Second on my list would be a trained classifier for query routing. It sits in front of every request, and five to twenty milliseconds against a small LLM's hundred and fifty to three hundred is meaningful overhead removed from the fast path — plus it's usually more accurate once you have a few thousand labelled queries, because it's fit to your actual distribution.
>
> There's also an organizational benefit worth naming: comparing a partner model against Gemini doesn't require a new vendor assessment, because it's already inside the project's controls. That removes weeks of procurement from what should be an engineering decision.
>
> The operational point I'd make is the cost model. Self-deployed models bill for uptime, not per request — so an idle GPU endpoint bills continuously whether anything calls it or not. Model Garden makes deployment easy and forgetting equally easy, so I'd keep an endpoint inventory with owners and expiry dates.
>
> And I'd be honest about the economics: self-hosting is cheaper at sustained high volume and more expensive at low or spiky volume, because you're paying for uptime regardless. Asserting 'self-hosting is cheaper' without that qualification signals not having operated one.
>
> Two checks that get skipped because deployment is frictionless. Licensing — open models carry real terms, some restricting commercial use, and in a bank that needs checking before deployment. And support: a self-deployed model has no support contract, which is fine for a reranker and a bigger commitment for anything on the critical path.
>
> One thing I'd avoid: adding four specialized models each saving a little. Every one is another thing to version, monitor, patch, and hold quota for, and the maintenance exceeds the benefit. A reranker justifies it because the quality gain is large."

## 8. Likely Follow-ups

**Q: What would you deploy from Model Garden?**
A cross-encoder reranker. Reranking is typically the largest quality gain in a RAG pipeline, a cross-encoder does it better than any LLM by scoring query and document jointly, and it's faster and cheaper. That's specific and defensible.

**Q: Would you use an open model instead of Gemini?**
For narrow tasks like reranking or classification, yes — and I'd measure it. For open-ended generation, unlikely to match, and you've taken on hosting to find out. "Open models are cheaper" without qualification signals not having operated one.

**Q: What's the cost trap?**
Self-deployed models bill for uptime rather than per request, so an idle GPU endpoint bills continuously. Deployment is frictionless and forgetting is equally easy, which is why an endpoint inventory with owners and expiry is a real control.

**Q: When is self-hosting actually cheaper?**
At sustained high volume, where the uptime cost is amortized across many requests. At low or spiky volume it's more expensive, because you pay regardless of use. The break-even depends entirely on utilization and should be calculated rather than assumed.

**Q: What gets skipped before deployment?**
Licence terms, some of which restrict commercial use, and the support question — a self-deployed model has no support contract. Both get missed because deploying is a few clicks, which makes the friction of checking feel disproportionate.

## 9. Common Mistakes

- Answering "an open model to reduce cost" without specifics.
- Ignoring the per-uptime billing model.
- Claiming open models match frontier models on generation.
- Not checking licence terms before deploying.
- Adding specialized models whose maintenance exceeds the saving.

## 10. What to Remember

- **A cross-encoder reranker** is the specific defensible answer.
- **Self-deployed models bill per uptime** — inventory and expire them.
- **Break-even depends on utilization** — don't assert self-hosting is cheaper.
- **Evaluation without a new vendor assessment** is a real benefit.
- **Check licences and support** — frictionless deployment hides both.
