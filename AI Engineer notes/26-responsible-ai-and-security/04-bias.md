# Bias

> **Phase 26 · RESPONSIBLE AI & SECURITY · Topic 04**

## 1. Definition

Systematic skew in a system's behaviour. In a RAG system it enters through three distinct routes — the corpus, the retrieval, and the model — and each has a different owner and a different fix.

> Fairness (the outcome) is in [03-fairness.md](03-fairness.md). This topic is where the skew comes from.

## 2. Simple Explanation

"The model is biased" is usually the wrong diagnosis for a RAG system. The model is generating from what it was given.

If the corpus documents one product thoroughly and another sparsely, or retrieval favours formally-worded queries, the skew was introduced before generation.

## 3. How It Works

**Three sources, three owners:**

| Source | What it looks like | Owner |
|---|---|---|
| **Corpus bias** | Some topics documented far better than others | Content team |
| **Retrieval bias** | Some phrasings or languages retrieve worse | Engineering |
| **Model bias** | Assumptions in generated prose | Model provider; mitigated by prompting |

```
Diagnosing which one:
  · same question, formal vs colloquial phrasing → retrieval
  · answer quality varies by topic, not phrasing → corpus
  · the retrieved context is good and the generated prose
    still carries an assumption → model
```

**That diagnostic is the useful part**, because the three fixes are unrelated and applying the wrong one wastes months.

## 4. Practical Example

**Corpus bias, which is the most common and least discussed:**

```
A bank's retail products are documented thoroughly — dozens
of pages, updated quarterly. A product used mainly by
recent-migrant customers has a two-page summary from 2021.

Result: questions about the first product get good answers;
questions about the second get thin ones or abstentions.

That is not a model problem and no amount of retrieval
tuning fixes it. It's a content coverage problem, and the
fix is documentation.

The engineering contribution is MAKING IT VISIBLE: cluster
failing queries and abstentions by topic, and hand the
ranked gap list to the team that owns the content.
```

**Model bias in generated prose:**

```
Even with correct retrieved context, generated wording can
carry assumptions — defaulting to particular pronouns,
assuming a customer has a fixed address, assuming
familiarity with banking terminology.

Mitigation is prompt-level and genuinely works here:
  · instruct plain language, no assumed prior knowledge
  · instruct neutral phrasing where a detail isn't in context
  · never infer customer circumstances not in the retrieved
    data

That last one matters most — inferring circumstances is
where an assumption becomes a statement about a person.
```

**Measuring it:**

```
· per-topic answer quality → corpus gaps
· same question, several phrasings → retrieval sensitivity
· same context, check generated prose for assumptions →
  model contribution

Three separate measurements. A single "bias score" would
tell you nothing actionable.
```

## 5. Why It Matters

- **Three sources with different owners** — diagnosing which one is the whole job.
- **Corpus bias is the most common** and the least likely to be a model fix.
- **Making gaps visible** is engineering's contribution to a content problem.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Blaming the model** | Wrong fix; months wasted |
| **Corpus gaps unmeasured** | Invisible, so never addressed |
| **One aggregate bias score** | Not actionable |
| **Retrieval sensitivity untested** | Phrasing effects unknown |
| **Inferring customer circumstances** | An assumption becomes a statement |
| **Fixing prose while the corpus is thin** | Cosmetic |

**On the boundary of what engineering can fix:** retrieval bias and prose-level assumptions are engineering problems. Corpus bias is not — the system cannot be more equitable than the documentation it serves. The honest position is that the system surfaces the gap and the content owner closes it, and claiming otherwise misrepresents what the architecture can do.

**On abstention as a signal:** a topic with a high abstention rate is usually a coverage gap rather than a retrieval failure. That makes abstention rate per topic one of the most useful bias diagnostics available, and it's free — you're already logging the outcome.

## 7. Interview Answer

> "'The model is biased' is usually the wrong diagnosis for a RAG system, because the model is generating from what it was given. Skew enters through three distinct routes with different owners.
>
> Corpus bias — some topics documented far better than others. Retrieval bias — some phrasings or languages retrieving worse. And model bias — assumptions in the generated prose itself.
>
> Diagnosing which one is most of the work. If the same question phrased formally and colloquially gets different quality, that's retrieval. If quality varies by topic rather than by phrasing, that's corpus. If the retrieved context is good and the generated prose still carries an assumption, that's the model. Three unrelated fixes, so applying the wrong one wastes months.
>
> Corpus bias is the most common and the least discussed. A bank's retail products might be documented across dozens of pages updated quarterly, while a product used mainly by recent-migrant customers has a two-page summary from 2021. Questions about the first get good answers; questions about the second get thin ones or abstentions. No amount of retrieval tuning fixes that — it's a documentation problem.
>
> Engineering's contribution there is making it visible: cluster failing queries and abstentions by topic and hand the ranked gap list to the team that owns the content. And abstention rate per topic is a particularly useful diagnostic, because a topic with a high abstention rate is usually a coverage gap rather than a retrieval failure — and it's free, since you're already logging the outcome.
>
> For model bias in prose, prompt-level mitigation genuinely works: instruct plain language with no assumed prior knowledge, neutral phrasing where a detail isn't in the context, and — the one that matters most — never infer customer circumstances that aren't in the retrieved data. That last one is where an assumption becomes a statement about a person.
>
> On measurement, I'd keep the three separate: per-topic answer quality for corpus gaps, the same question in several phrasings for retrieval sensitivity, and checking generated prose for assumptions given identical context for the model contribution. A single aggregate bias score would tell you nothing actionable.
>
> And I'd be honest about the boundary. Retrieval bias and prose assumptions are engineering problems I can fix. Corpus bias isn't — the system cannot be more equitable than the documentation it serves. It surfaces the gap; the content owner closes it."

## 8. Likely Follow-ups

**Q: Where does bias enter a RAG system?**
Three places with different owners — the corpus, where some topics are documented better than others; retrieval, where some phrasings or languages match worse; and the model, in the assumptions carried by generated prose. The fixes are unrelated, so diagnosis matters more than detection.

**Q: How do you tell which source it is?**
Same question in formal versus colloquial phrasing isolates retrieval. Quality varying by topic rather than phrasing points at the corpus. Good retrieved context with an assumption still appearing in the prose points at the model. Three tests, three different fixes.

**Q: What's the most common source?**
Corpus bias — uneven documentation coverage across products and topics. It's the least discussed because it isn't a model problem and no retrieval tuning fixes it. Engineering's job there is making the gap visible, not closing it.

**Q: What's a cheap diagnostic?**
Abstention rate per topic. A topic with a high abstention rate is usually a coverage gap rather than a retrieval failure, and you're already logging the outcome — so it costs nothing and points directly at which documentation needs work.

**Q: What can't engineering fix?**
Corpus bias. The system can't be more equitable than the documentation it serves. Retrieval sensitivity and prose-level assumptions are fixable; coverage gaps require the content owner to write the missing documentation, and claiming otherwise misrepresents the architecture.

## 9. Common Mistakes

- Diagnosing corpus or retrieval bias as model bias.
- Reporting a single aggregate bias score.
- Never testing retrieval sensitivity to phrasing.
- Letting the model infer customer circumstances not in context.
- Tuning prose while the underlying coverage gap remains.

## 10. What to Remember

- **Three sources:** corpus, retrieval, model — different owners, different fixes.
- **Diagnose before fixing** — phrasing test, topic test, context-held test.
- **Corpus bias is most common** and isn't an engineering fix.
- **Abstention rate per topic** is a free coverage-gap diagnostic.
- **Never infer customer circumstances** not present in retrieved data.
