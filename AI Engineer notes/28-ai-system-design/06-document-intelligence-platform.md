# Design: Document Intelligence Platform

> **Phase 28 · AI SYSTEM DESIGN · Topic 06**

## 1. Definition

A system that extracts structured data from documents at volume — statements, forms, contracts, identity documents — where the output feeds downstream systems rather than a human reader.

## 2. Simple Explanation

RAG answers questions about documents. Document intelligence turns documents into fields.

The difference matters: an answer can be hedged, but a field is either populated correctly or it isn't, and whatever consumes it will act on the value.

## 3. How It Works

```
INGEST      documents arrive (upload, scan, email, batch)
CLASSIFY    which document type is this?
EXTRACT     per-type field extraction with confidence
VALIDATE    format, business rules, cross-field consistency
ROUTE       high confidence → downstream system
            low confidence → human review queue
            failed         → exception handling
FEEDBACK    human corrections improve the extractors
```

**The confidence-based routing is the design.** Everything else is standard; what makes it work in production is knowing which extractions to trust.

## 4. Practical Example

**Tool choice, which is the first decision:**

```
DOCUMENT AI for known types at volume
  · per-field confidence scores  ← the decisive capability
  · deterministic schema output
  · cheaper per page at scale
  · specialized processors for forms, invoices, IDs

GEMINI for arbitrary or low-volume types
  · no per-type processor needed
  · handles unusual layouts
  · no calibrated confidence  ← the limitation

THE COMBINATION, usually best:
  Document AI extracts fields with confidence;
  Gemini handles the cases Document AI flags as low
  confidence, or reasons over the extracted structure
```

**Confidence is the decisive capability** because it drives routing, and routing is what makes the system operable at volume.

**The confidence threshold as a business decision:**

```
threshold too high → most documents go to human review;
                     no automation benefit
threshold too low  → wrong values reach downstream systems

The right threshold comes from the cost asymmetry:
  cost of a human review    ≈ a few minutes
  cost of a wrong value     depends entirely on the field

So thresholds should be PER FIELD, not per document:
  account number   → very high threshold; wrong is severe
  amount           → very high
  customer name    → high
  date             → moderate
  description text → low

One global threshold treats an account number like a
description field, which is wrong in both directions.
```

**That per-field point is the substantive contribution.**

**The human review loop:**

```
Reviewers correct low-confidence extractions. Those
corrections should:
  · feed back as training data for the extractors
  · be reviewed before use, never auto-promoted
  · surface systematic errors — if one field is corrected
    80% of the time, that's a processor problem, not a
    document problem

That last signal is how the platform improves rather than
just operating.
```

## 5. Why It Matters

- **Confidence-based routing is the design** — it's what makes volume operable.
- **Per-field thresholds**, because the cost of a wrong value varies enormously.
- **Correction rate per field** is how systematic extractor problems surface.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **One global confidence threshold** | Treats account numbers like descriptions |
| **No confidence at all** | Can't route; everything is trusted or reviewed |
| **Auto-promoting corrections to training** | A poisoning path |
| **No cross-field validation** | Individually plausible, jointly impossible |
| **Poor scan quality unhandled** | Plausible values from illegible input |
| **Review queue unbounded** | Backlog grows silently |

**On cross-field validation:** individual fields can each be plausible while being jointly impossible — a transaction date after the statement date, a total that doesn't match the line items, an account number failing its checksum. These checks are deterministic, cheap, and catch errors that per-field confidence doesn't, because confidence is per field by construction.

**On illegible input:** a model asked to extract an amount from a blurry scan will produce a plausible number. The instruction to return null when a field isn't clearly legible is essential, and so is treating "null" as a routing signal to human review rather than as a missing value to be defaulted.

## 7. Interview Answer

> "RAG answers questions about documents; document intelligence turns documents into fields. That difference matters because an answer can be hedged, but a field is either populated correctly or it isn't, and whatever consumes it will act on the value.
>
> The pipeline is ingest, classify the document type, extract fields per type with confidence, validate, and then route: high confidence straight to the downstream system, low confidence to a human review queue, failures to exception handling. Corrections feed back to improve the extractors.
>
> That confidence-based routing is the design. Everything else is standard, and what makes the system operable at volume is knowing which extractions to trust.
>
> Which drives the tool choice. Document AI for known types at volume, because it gives per-field confidence scores, deterministic schema output, and specialized processors. Gemini for arbitrary or low-volume types where building a processor isn't worth it — but it doesn't give calibrated confidence, and asking a model to rate its own confidence produces a number that isn't reliably correlated with correctness. Usually I'd combine them: Document AI extracts with confidence, and Gemini handles the cases Document AI flags as low confidence.
>
> The point I'd emphasize is that thresholds should be per field, not per document. The cost of a wrong value varies enormously — an account number or an amount being wrong is severe, a description field being wrong is usually recoverable. So account numbers and amounts get a very high threshold, dates moderate, free-text descriptions low. One global threshold treats an account number like a description field, which is wrong in both directions: too much human review on harmless fields, and too little on consequential ones.
>
> Two things that catch errors confidence doesn't. Cross-field validation — individually plausible fields can be jointly impossible, like a transaction date after the statement date, a total not matching the line items, or an account number failing its checksum. Those checks are deterministic and cheap, and per-field confidence can't catch them by construction.
>
> And illegible input. A model asked to extract an amount from a blurry scan produces a plausible number, so the instruction to return null when a field isn't clearly legible is essential — and null has to be a routing signal to human review, not a missing value something downstream defaults.
>
> On the feedback loop: corrections should be reviewed before use rather than auto-promoted, since an automated path from correction to training data is a poisoning vector. And the correction rate per field is the signal worth watching — if one field is corrected eighty percent of the time, that's a processor problem rather than a document problem, and that's how the platform improves rather than just operating."

## 8. Likely Follow-ups

**Q: Document AI or Gemini?**
Document AI for known types at volume, because per-field confidence scores drive the routing that makes the system operable. Gemini for arbitrary or low-volume types. Usually both — Document AI extracts with confidence, Gemini handles what it flags as uncertain.

**Q: How do you set the confidence threshold?**
Per field, from the cost of a wrong value. Account numbers and amounts get a very high threshold because being wrong is severe; description fields get a low one. A single global threshold is wrong in both directions — too much review on harmless fields, too little on consequential ones.

**Q: What does confidence not catch?**
Jointly impossible combinations. Each field can be individually plausible while the transaction date is after the statement date, the total doesn't match the line items, or the account number fails its checksum. Cross-field validation is deterministic, cheap, and catches exactly that.

**Q: How do you handle illegible input?**
Instruct the extractor to return null when a field isn't clearly legible, and treat null as a routing signal to human review rather than a missing value to default. Without that instruction the model produces a plausible number from a blurry scan with nothing indicating it guessed.

**Q: How does the platform improve over time?**
Through the correction rate per field. If one field is corrected eighty percent of the time, that's a processor problem rather than a document problem. Corrections also feed training data — reviewed before use, never auto-promoted, since that path is a poisoning vector.

## 9. Common Mistakes

- A single global confidence threshold.
- No cross-field validation.
- Treating null extractions as missing values rather than review signals.
- Auto-promoting human corrections into training data.
- Using a model without calibrated confidence for high-volume extraction.

## 10. What to Remember

- **Confidence-based routing is the design** — it makes volume operable.
- **Per-field thresholds**, derived from the cost of a wrong value.
- **Cross-field validation** catches what per-field confidence can't.
- **Null means route to review**, not default the value.
- **Correction rate per field** surfaces systematic extractor problems.
