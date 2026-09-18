# Cross-Lingual Embeddings

> **Phase 06 · EMBEDDINGS · Topic 17**

## 1. Definition

Embeddings that place text with the same meaning near each other **regardless of language**, so a query in one language retrieves documents in another. They're produced by multilingual models trained on parallel or aligned multilingual data.

## 2. Simple Explanation

A cross-lingual embedding model puts "international wire fee" and "frais de virement international" close together in the same space.

That means one index serves many languages. A French query retrieves English documents, with no translation step.

## 3. How It Works

```
Trained on aligned multilingual data so that translations
land near each other in a SHARED vector space:

  "wire transfer fee"        ┐
  "frais de virement"        ├─ all cluster together
  "Überweisungsgebühr"       ┘

Contrastive objective with translation pairs as positives.
```

**Multilingual vs. cross-lingual — a distinction worth making:**

| | Multilingual | Cross-lingual |
|---|---|---|
| Handles multiple languages | ✅ | ✅ |
| Query in language A retrieves docs in language B | ⚠️ Sometimes | ✅ Trained for it |

A model can handle several languages while keeping them in separate regions of the space, which supports monolingual retrieval per language but not cross-language matching. Check the model card for explicit cross-lingual claims.

## 4. Practical Example

**The architectural choice for a multilingual corpus:**

```
OPTION A — cross-lingual embeddings, one index
  · one corpus, any query language
  · no translation step, no translation errors
  · quality varies by language, often weaker for low-resource ones
  · one index to maintain

OPTION B — translate everything to English, one English index
  · use a stronger monolingual English model
  · translation errors compound into retrieval errors
  · translation cost at ingestion, or at query time
  · citations point at translations, not originals ← a real problem
    in a regulated context where the original is authoritative

OPTION C — per-language indexes, route by detected language
  · best per-language quality
  · N indexes; documents only in one language aren't findable
    from another
  · language detection becomes a failure point
```

**For banking, Option A is usually right** — with the caveat that citations must point at the original-language document, which Option B breaks.

**The tokenization cost is a real fairness issue:**

```
Tokenizers are trained predominantly on English, so the same
meaning costs 2-3× more tokens in Hindi or Thai.

That means those users:
  · consume context faster
  · cost more per request
  · may hit chunk-size limits with less content

It's a cost and fairness consideration worth surfacing
explicitly in a multilingual product.
```

**Quality is uneven across languages** — high-resource languages are substantially better served than low-resource ones. Evaluate per language rather than assuming uniform quality from an aggregate benchmark.

## 5. Why It Matters

- **It enables one index for a multilingual corpus**, which is architecturally much simpler than the alternatives.
- **The citation problem with translation** is the argument that usually decides it in a regulated context.
- **Per-language quality variance and tokenization cost** are real issues an aggregate benchmark hides.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Assuming multilingual means cross-lingual** | Check the model card explicitly |
| **Uneven quality across languages** | Evaluate per language, not in aggregate |
| **Code-switching** | Mixed-language text within one chunk handled unevenly |
| **Tokenization cost disparity** | 2–3× more tokens for some scripts |
| **Translation-based approaches breaking citation** | The original is what an auditor needs |
| **Language detection failures** | Short queries are hard to classify reliably |

**On evaluation:** an aggregate multilingual benchmark score hides that a model may be strong in five languages and weak in twenty. I'd build a per-language eval set for the languages I actually serve and measure recall separately for each — the variance is usually larger than expected.

**On the citation point:** if documents are translated at ingestion and the index holds translations, citations point at text that isn't the authoritative source. In banking, where a compliance reviewer needs to verify against the original policy document, that's usually disqualifying — which is a strong practical argument for cross-lingual embeddings over a translation pipeline.

## 7. Interview Answer

> "Cross-lingual embeddings place text with the same meaning near each other regardless of language, so a French query can retrieve English documents from one shared index without any translation step.
>
> The distinction worth making is multilingual versus cross-lingual. A model can handle several languages while keeping them in separate regions of the space — that supports monolingual retrieval per language but not cross-language matching. Cross-lingual specifically means it was trained with translation pairs as positives so equivalents align. I'd check the model card for an explicit cross-lingual claim rather than inferring it from language support.
>
> Architecturally there are three options for a multilingual corpus. Cross-lingual embeddings with one index. Translate everything to English and use a stronger monolingual model. Or per-language indexes with routing.
>
> For banking I'd usually take the first, and the deciding argument is citations. If you translate documents at ingestion, the index holds translations and citations point at text that isn't the authoritative source. A compliance reviewer needs to verify against the original policy document, so that's typically disqualifying regardless of the quality argument for a stronger English model.
>
> Two issues an aggregate benchmark hides. Quality varies substantially across languages — a model can be strong in five and weak in twenty — so I'd build a per-language eval set for the languages I actually serve and measure each separately. And tokenization cost: tokenizers are trained predominantly on English, so the same meaning costs two to three times more tokens in Hindi or Thai. That means those users consume context faster, cost more per request, and may hit chunk-size limits with less content. It's a real cost and fairness consideration worth surfacing rather than discovering later.
>
> The other failure mode is code-switching — mixed-language text within a single chunk, which is common in some markets and handled unevenly by most models."

## 8. Likely Follow-ups

**Q: Multilingual or cross-lingual — what's the difference?**
Multilingual means the model handles several languages. Cross-lingual means a query in one language retrieves documents in another, which requires training with translation pairs so equivalents align in a shared space. A model can be multilingual without being cross-lingual, so check the model card rather than assuming.

**Q: Should you translate documents instead?**
Usually not in a regulated context, because citations then point at translations rather than the authoritative original — a compliance reviewer needs to verify against the source document. Translation also introduces errors that compound into retrieval errors, and adds cost. The quality argument for a stronger English model rarely outweighs the citation problem.

**Q: Is quality uniform across languages?**
No — high-resource languages are substantially better served than low-resource ones, and an aggregate multilingual benchmark hides that variance. I'd build a per-language eval set for the languages I actually serve and measure recall separately for each, because the spread is usually larger than expected.

**Q: What's the tokenization issue?**
Tokenizers are trained predominantly on English, so non-Latin scripts fragment into more tokens — the same meaning can cost two to three times more in Hindi or Thai. Those users consume context faster, cost more per request, and may hit chunk-size limits with less actual content. It's a cost and fairness issue worth surfacing.

**Q: What about code-switching?**
Mixed-language text within a single chunk — common in some markets — and handled unevenly by most models, since it's underrepresented in training data. I'd test it explicitly if it's realistic for my users rather than assuming a multilingual model handles it, and consider language-aware chunking if it's prevalent.

## 9. Common Mistakes

- Assuming multilingual implies cross-lingual.
- Evaluating with an aggregate score instead of per language.
- Translating documents at ingestion, breaking citation to the original.
- Not accounting for tokenization cost disparity in multilingual products.
- Ignoring code-switching in markets where it's common.

## 10. What to Remember

- **Same meaning, different languages, nearby vectors** — one index serves all.
- **Multilingual ≠ cross-lingual.** Check the model card explicitly.
- **Translation breaks citation to the authoritative original** — usually disqualifying in banking.
- **Evaluate per language** — aggregate scores hide large variance.
- **Non-English costs 2–3× more tokens** — a real cost and fairness issue.
