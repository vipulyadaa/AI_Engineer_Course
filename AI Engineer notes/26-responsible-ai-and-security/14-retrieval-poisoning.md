# Retrieval Poisoning

> **Phase 26 · RESPONSIBLE AI & SECURITY · Topic 14**

## 1. Definition

Getting malicious or misleading content into the retrievable corpus so it influences answers. For a RAG system that doesn't fine-tune, this is the live poisoning threat — the corpus is the attack surface, not the training data.

## 2. Simple Explanation

If an attacker can add a document to what your system retrieves, they can influence what it says.

That content might carry an injection instruction, or it might simply be wrong — and the second is harder to detect because nothing about it looks malicious.

## 3. How It Works

```
TWO PAYLOADS

INSTRUCTION      "ignore previous instructions and ..."
                 → indirect prompt injection; defended by
                   tool limits and authorization

MISINFORMATION   "the international transfer fee is $15"
                 → no instruction, no anomaly, just a wrong
                   fact that retrieves well and gets cited

ENTRY POINTS
  user-submitted content ingested into the corpus
  internal wikis and shared drives anyone can edit
  third-party feeds
  a compromised internal account
  documents uploaded through a support channel
```

**The misinformation payload is the harder problem.** An injection can be bounded by tool limits; a plausible wrong fact is indistinguishable from a correct one at retrieval time and passes every groundedness check.

## 4. Practical Example

**The misinformation attack, which is under-discussed:**

```
An attacker gets a document into the corpus stating a
lower fee than the real one.

  · it's well-written, topically relevant, retrieves well
  · the answer citing it is GROUNDED — the context says it
  · groundedness passes, citation accuracy passes,
    relevance passes
  · the customer is told the wrong fee and acts on it

No tool was misused. No instruction was followed. Every
metric is green.

The only defences are upstream:
  · source allowlisting — content enters only from
    approved, controlled locations
  · document-level approval before ingestion
  · authority precedence — for a fee question, the fee
    schedule outranks any other document type
  · conflict detection — two sources giving different
    figures should abstain and escalate, not pick one
```

**Authority precedence and conflict detection are the substantive controls**, because they don't rely on recognizing the document as malicious.

**Source allowlisting as the primary defence:**

```
Ingest from named, controlled locations only — specific
GCS prefixes, a document management system with approval
workflow — never a crawl.

That single control eliminates most entry points, and it's
the same control that data governance requires for
compliance. One decision, two purposes.
```

**Why internal sources aren't safe:**

```
A wiki page anyone in the organization can edit is not a
vetted source. Internal origin says nothing about review.

The threat model has to include an insider or a compromised
internal account — which is exactly the case that
"it's internal, therefore trusted" misses.
```

## 5. Why It Matters

- **It's the live poisoning threat** for a RAG system that doesn't tune.
- **The misinformation payload passes every metric** — no anomaly to detect.
- **Source allowlisting is the primary defence** and doubles as a governance control.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Crawled ingestion** | Uncontrolled entry points |
| **Internal sources assumed vetted** | Insider and account-compromise threat |
| **No authority precedence** | A wrong document outranks the right one |
| **No conflict detection** | The system silently picks a source |
| **Relying on injection detection** | Misses the misinformation payload |
| **User-uploaded content in the corpus** | A direct attack path |

**On conflict detection as a control:** if the fee schedule says $45 and another retrieved document says $15, the correct behaviour is to surface the conflict and escalate rather than pick one. That's implementable — compare numeric claims across retrieved chunks and flag disagreement — and it catches poisoning without needing to identify which document is malicious.

**On detection after the fact:** a poisoned corpus is detectable through the golden set. If a fixed set of questions with known-correct answers suddenly produces different results and nothing changed on your side, either the model changed or the corpus did. That's another argument for a stable golden core, and it's a reason to run it on a schedule rather than only at deploy.

## 7. Interview Answer

> "Retrieval poisoning is getting malicious or misleading content into the retrievable corpus. For a RAG system that doesn't fine-tune, this is the live poisoning threat — the corpus is the attack surface, not the training data.
>
> There are two payloads and the second is harder. An instruction payload is indirect prompt injection — 'ignore previous instructions and do X' — and that's bounded by tool limits and user-scoped authorization, so a successful injection can only reach what the user could reach anyway.
>
> The misinformation payload is the under-discussed one. A document stating a lower fee than the real one is well-written, topically relevant, and retrieves well. The answer citing it is genuinely grounded — the context does say that. Groundedness passes, citation accuracy passes, relevance passes, and the customer is told the wrong fee and acts on it. No tool was misused, no instruction followed, and every metric is green.
>
> So the defences have to be upstream. Source allowlisting is the primary one: ingest only from named controlled locations — specific GCS prefixes, a document management system with an approval workflow — never a crawl. That eliminates most entry points, and it's the same control data governance requires for compliance. One decision, two purposes.
>
> Beyond that, two controls that don't rely on recognizing the document as malicious. Authority precedence: for a fee question, the fee schedule outranks any other document type, so a poisoned support note can't win against the authoritative source. And conflict detection: if two retrieved sources give different figures, the correct behaviour is to surface the conflict and escalate rather than silently pick one. That's implementable — compare numeric claims across retrieved chunks and flag disagreement — and it catches poisoning without needing to identify which document is bad.
>
> I'd also insist that internal sources aren't automatically vetted. A wiki page anyone in the organization can edit is not a reviewed source, and internal origin says nothing about review. The threat model has to include an insider or a compromised internal account, which is exactly what 'it's internal, therefore trusted' misses.
>
> One detection mechanism worth having: a fixed golden set run on a schedule. If known-correct answers suddenly change and nothing changed on our side, either the model changed or the corpus did. That's another argument for keeping a stable golden core and running it continuously rather than only at deploy."

## 8. Likely Follow-ups

**Q: How is this different from data poisoning?**
Data poisoning corrupts training data; retrieval poisoning corrupts the corpus retrieved at query time. For a system using a hosted model without fine-tuning, retrieval poisoning is the threat that actually applies — the training data isn't yours to poison.

**Q: What's the harder payload?**
Misinformation rather than injection. A plausible wrong fact retrieves well, produces a genuinely grounded answer, and passes groundedness, citation, and relevance checks. There's no anomaly to detect, whereas an injection at least has tool limits bounding its consequences.

**Q: What's the primary defence?**
Source allowlisting — ingesting only from named, controlled locations with document-level approval, never a crawl. It eliminates most entry points, and it's the same control governance requires, so it serves compliance and security at once.

**Q: What catches poisoning without identifying the document?**
Authority precedence and conflict detection. The fee schedule outranking other document types for fee questions means a poisoned note can't win. And flagging when two retrieved sources give different figures, then escalating rather than picking one, catches disagreement without judging which is malicious.

**Q: Is internal content safe?**
No. A wiki or shared drive anyone can edit isn't a vetted source, and internal origin says nothing about review. The threat model needs to include insiders and compromised internal accounts, which is precisely what assuming internal means trusted overlooks.

## 9. Common Mistakes

- Crawling sources rather than allowlisting.
- Assuming internal content is vetted.
- No authority precedence, so any document can outrank the right one.
- Silently resolving conflicts between sources.
- Relying on injection detection, which misses misinformation entirely.

## 10. What to Remember

- **The corpus is the attack surface** for a system that doesn't tune.
- **Misinformation passes every metric** — grounded, cited, and wrong.
- **Source allowlisting** is the primary defence and doubles as governance.
- **Authority precedence and conflict detection** work without identifying the bad document.
- **A scheduled golden set** detects a poisoned corpus after the fact.
