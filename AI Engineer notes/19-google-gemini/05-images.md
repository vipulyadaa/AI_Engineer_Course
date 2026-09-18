# Images

> **Phase 19 · GOOGLE GEMINI · Topic 05**

## 1. Definition

Gemini's image understanding — accepting images as input alongside text and reasoning about their content, layout, and any text they contain. Input only; image *generation* is a separate model family (Imagen).

## 2. Simple Explanation

You send an image and a question, and the model answers about what's in it.

For banking that mostly means documents: scanned statements, forms, cheques, and screenshots. The question is always whether Gemini or a purpose-built service is the right tool for that specific job.

## 3. How It Works

```python
response = model.generate_content([
    Part.from_uri("gs://bucket/cheque.png", mime_type="image/png"),
    "Extract the payee, amount, and date. Return null for any "
    "field that is not clearly legible.",
])
```

**Images are tokenized**, consuming a meaningful number of tokens each — so an image is not a cheap input, and a multi-page scanned document is expensive.

**Resolution matters.** Small text in a low-resolution scan may be illegible to the model, and it won't necessarily say so.

## 4. Practical Example

**The instruction that matters most for document images:**

```
"Return null for any field that is not clearly legible."

Without it, a model asked to extract an amount from a blurry
cheque will produce a plausible number. It has no strong
incentive to refuse, and the output looks identical to a
confident correct extraction.

For a banking system that's the difference between a
detectable gap and a silent wrong value.
```

**That instruction is the single highest-value detail here.**

**Where a specialized service is better:**

```
DOCUMENT AI
  · per-field confidence scores  ← the critical difference
  · deterministic schema output
  · cheaper per page at volume
  · purpose-built for known document types

Confidence scores are the point. Document AI tells you it's
62% sure about a field, so you can route low-confidence
extractions to human review. Gemini gives you an answer with
no calibrated confidence attached.

For anything where a wrong extraction has consequences,
that's decisive.
```

**Combining structured output with images:**

```python
generation_config=GenerationConfig(
    response_mime_type="application/json",
    response_schema=cheque_schema,     # nullable fields
)
```

Schema-constrained extraction from an image gives a fixed shape — but schema validity still isn't correctness, so nullable fields plus the legibility instruction remain necessary.

**Privacy:** identifiers in a scanned image are pixels, so text-based redaction pipelines don't see them. Sending document images means sending unredacted PII, which is another argument for Vertex AI keeping it in-project.

## 5. Why It Matters

- **The legibility instruction** turns silent wrong values into detectable gaps.
- **Per-field confidence scores** are why Document AI wins for consequential extraction.
- **Text redaction doesn't cover images**, which is a real privacy gap.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **No calibrated confidence** | Can't route uncertain extractions to review |
| **Plausible values from illegible input** | Silent wrong data |
| **Token cost per image** | Multi-page documents are expensive |
| **Resolution limits** | Small text may be unreadable |
| **PII as pixels** | Evades text redaction |
| **Non-deterministic extraction** | Without a response schema |

**On confidence:** asking the model to rate its own confidence produces a number, but not a calibrated one — it isn't reliably correlated with correctness. Where confidence matters for routing to human review, a service that provides calibrated per-field scores is the right choice, and that's a genuine capability difference rather than a preference.

**On verification:** for extraction that feeds a decision, extracting the same field twice — or cross-checking against a structured source — catches errors that single extraction won't. A cheque amount extracted from an image and reconciled against the transaction record is far safer than either alone.

## 7. Interview Answer

> "Gemini takes images as input and reasons about their content, layout, and any text they contain. Image generation is separate — that's Imagen. In banking, image input mostly means documents: scanned statements, forms, cheques, screenshots.
>
> The single highest-value detail is the instruction 'return null for any field that is not clearly legible.' Without it, a model asked to extract an amount from a blurry cheque produces a plausible number — it has no strong incentive to refuse, and the output looks identical to a confident correct extraction. That instruction turns a silent wrong value into a detectable gap, which is the difference that matters in a banking pipeline.
>
> On tool choice, Document AI is usually better for consequential extraction, and the reason is confidence scores. Document AI tells you it's sixty-two percent sure about a field, so you can route low-confidence extractions to human review. Gemini gives you an answer with no calibrated confidence attached — and asking the model to rate its own confidence produces a number that isn't reliably correlated with correctness. That's a genuine capability difference, not a preference.
>
> Document AI also gives deterministic schema output and is cheaper per page at volume. So for extracting known fields from known document types, that's the tool. Gemini is right for arbitrary questions about arbitrary documents, and for low-volume varied cases where building an extractor isn't worth it.
>
> If I'm using Gemini for extraction I'd combine it with structured output and a response schema so the shape is fixed — with nullable fields, since schema validity still isn't correctness.
>
> Two cautions. Images are token-expensive, so a multi-page scanned document is a large and costly input. And privacy: account numbers in a scan are pixels, so text-based redaction pipelines don't detect them — sending document images means sending unredacted PII, which is another reason Vertex AI keeping it in-project matters.
>
> For extraction feeding a decision, I'd cross-check — a cheque amount extracted from an image and reconciled against the transaction record is far safer than either source alone."

## 8. Likely Follow-ups

**Q: Gemini or Document AI for extraction?**
Document AI for consequential extraction, mainly because of per-field confidence scores — you can route uncertain fields to human review. It's also deterministic and cheaper per page at volume. Gemini fits arbitrary questions about arbitrary documents where building an extractor isn't justified.

**Q: What's the most important prompt detail?**
Instructing the model to return null for anything not clearly legible. Otherwise it produces a plausible value from a blurry image with no signal that it guessed, and the output is indistinguishable from a correct extraction.

**Q: Can you get confidence scores from Gemini?**
Not calibrated ones. You can ask it to rate its confidence and it will produce a number, but that number isn't reliably correlated with correctness. Where confidence drives routing to human review, that's a real reason to use a service providing calibrated per-field scores.

**Q: What's the privacy issue with images?**
Identifiers in a scan are pixels, so text-based redaction never sees them and unredacted PII goes to the model. That makes the Vertex AI versus Gemini API decision more consequential for image workloads than for text, since Vertex AI keeps it in-project.

**Q: How would you make extraction more reliable?**
Structured output with a response schema and nullable fields, the legibility instruction, and cross-checking against another source where possible — reconciling an extracted cheque amount against the transaction record catches errors that no single extraction will.

## 9. Common Mistakes

- Omitting the legibility instruction, getting plausible wrong values.
- Treating a model-stated confidence as calibrated.
- Using Gemini for high-volume known-field extraction.
- Assuming text redaction covers PII in images.
- Not using a response schema for extraction feeding downstream systems.

## 10. What to Remember

- **"Return null if not clearly legible"** — the highest-value instruction.
- **Document AI gives calibrated per-field confidence**; Gemini doesn't.
- **Images are token-expensive**; multi-page scans especially.
- **PII in images evades text redaction.**
- **Schema + nullable fields + cross-checking** for consequential extraction.
