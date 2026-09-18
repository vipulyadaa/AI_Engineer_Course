# PII

> **Phase 26 · RESPONSIBLE AI & SECURITY · Topic 06**

## 1. Definition

Personally identifiable information — names, account numbers, addresses, identifiers — as it flows through an AI system's inputs, context, outputs, and stores, and the controls applied at each point.

## 2. Simple Explanation

PII enters from three directions: the customer's message, the retrieved documents, and the tool results. It then lands in logs, traces, caches, and checkpoints.

The design question is which points need redaction, which need access control, and which need both — because applying redaction everywhere breaks the system.

## 3. How It Works

```
WHERE PII ENTERS
  user message        "my account 12345678 was charged..."
  retrieved documents  a policy naming a customer
  tool results         account data by design

WHERE IT LANDS
  prompts → logs → traces → caches → checkpoints → backups

CONTROL PER POINT
  in the prompt      needed for the task — don't redact
  in logs/traces     redact or minimize
  in caches          include identity in the key
  in the eval set    redact where the value doesn't matter
  in the answer      only what this user may see
```

**You cannot redact PII from the working context** — the system needs the account number to answer about the account. Redaction belongs at the *storage* boundaries, not the processing ones.

## 4. Practical Example

**Google Cloud DLP as the mechanism, applied selectively:**

```
Cloud DLP can detect and redact or tokenize PII by info type.

WHERE TO APPLY IT
  · before writing prompts or responses to logs
  · before writing to the trace store
  · when sampling queries into the evaluation set
  · before sending anything to a third party

WHERE NOT TO
  · the live prompt — the model needs the identifiers
  · tool arguments in transit — the tool needs them
  · the answer to the authenticated customer about their
    own account

Applying it uniformly is the common mistake: it breaks the
system while feeling thorough.
```

**Tokenization over redaction where reversibility matters:**

```
REDACT      "account 12345678" → "account [REDACTED]"
            irreversible; fine for logs

TOKENIZE    "account 12345678" → "account TOK-9f3a"
            reversible with the key; preserves the ability
            to correlate the same account across records
            without storing the number

For audit trails and debugging, tokenization keeps
correlation possible while removing the raw identifier —
which is usually what you actually want.
```

**The image problem:**

```
PII in a scanned statement is PIXELS. Text-based DLP
doesn't see it.

So sending document images to a model means sending
unredacted PII, and the mitigation is processing location —
Vertex AI keeping it in-project — rather than redaction.

That's a real gap in most PII pipelines, and it's worth
naming because it isn't obvious.
```

**Output-side check:** before returning an answer, verify it contains no identifier belonging to anyone other than the authenticated user. That's cheap and it catches a cross-customer disclosure that retrieval filtering somehow let through.

## 5. Why It Matters

- **Redaction belongs at storage boundaries**, not in the working context.
- **Tokenization preserves correlation** while removing the raw identifier.
- **PII in images evades text-based DLP entirely** — a real and under-discussed gap.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Redacting the live prompt** | Breaks the task |
| **No redaction at log boundaries** | PII accumulates in logs and traces |
| **Redaction where tokenization was needed** | Loses correlation for audit |
| **PII in images unhandled** | Text DLP doesn't see pixels |
| **Cache keys without identity** | One customer's answer served to another |
| **Eval set with raw identifiers** | A customer data store nobody classifies |

**On detection reliability:** DLP-style detection is good on structured identifiers — account numbers, card numbers, national IDs — and weaker on names and free-text addresses. So it reduces exposure rather than eliminating it, and a design that assumes complete detection is over-confident. Access control remains the primary control; redaction is defence in depth.

**On the output check:** the strongest version is structural rather than pattern-based — assert that every identifier appearing in the answer was one the authenticated session already held or that a permitted tool returned. That's more reliable than pattern-matching for account-number shapes, and it catches identifiers the detector wouldn't recognize.

## 7. Interview Answer

> "PII enters from three directions — the customer's message, retrieved documents, and tool results — and lands in prompts, logs, traces, caches, checkpoints, and backups.
>
> The design point is that you cannot redact PII from the working context. The system needs the account number to answer a question about the account. So redaction belongs at the storage boundaries, not the processing ones — before writing to logs, before writing traces, when sampling queries into the evaluation set, and before sending anything to a third party. Applying it uniformly is the common mistake: it breaks the system while feeling thorough.
>
> On mechanism, Cloud DLP detects and redacts or tokenizes by info type. And I'd prefer tokenization over redaction where correlation matters — turning an account number into a stable token keeps the ability to correlate the same account across audit records without storing the number. For audit trails and debugging that's usually what you actually want, whereas irreversible redaction loses it.
>
> The gap I'd flag is images. PII in a scanned statement is pixels, and text-based DLP doesn't see it — so sending document images to a model means sending unredacted PII. The mitigation there is processing location, keeping it in-project on Vertex AI, rather than redaction. That's a real hole in most PII pipelines and it isn't obvious.
>
> I'd also add an output-side check: before returning an answer, verify it contains no identifier belonging to anyone other than the authenticated user. And the strongest version of that is structural rather than pattern-based — assert that every identifier in the answer was one the session already held or a permitted tool returned. That's more reliable than pattern-matching for account-number shapes, and it catches identifiers a detector wouldn't recognize.
>
> One honest limitation: DLP-style detection is good on structured identifiers like account and card numbers, and weaker on names and free-text addresses. So it reduces exposure rather than eliminating it. Access control stays the primary control — the data not being in the context at all — and redaction is defence in depth rather than the main line.
>
> And caches need identity in the key. A response cache keyed on a normalized query can serve one customer's answer to another, which is a disclosure caused by a performance optimization."

## 8. Likely Follow-ups

**Q: Where do you redact PII?**
At storage boundaries — logs, traces, evaluation sets, and anything leaving to a third party. Not in the live prompt or tool arguments, because the system needs the identifiers to do the task. Redacting uniformly breaks the system while feeling thorough.

**Q: Redaction or tokenization?**
Tokenization where correlation matters. A stable token for an account number lets you correlate the same account across audit records without storing the number, which is usually what you want for debugging and audit. Irreversible redaction is fine for general logs.

**Q: What about PII in images?**
Text-based DLP doesn't see pixels, so a scanned statement carries unredacted PII to the model. The mitigation is processing location — keeping it in-project on Vertex AI — rather than redaction. It's a real gap in most PII pipelines and easy to overlook.

**Q: How do you check the output?**
Structurally rather than by pattern. Assert that every identifier in the answer was one the authenticated session already held or that a permitted tool returned. That's more reliable than matching account-number shapes and it catches identifiers a detector wouldn't recognize.

**Q: Is DLP detection reliable?**
Good on structured identifiers like account and card numbers, weaker on names and free-text addresses. So it reduces exposure rather than eliminating it — access control remains the primary control, with the data simply not being in context, and redaction is defence in depth.

## 9. Common Mistakes

- Redacting the live prompt and breaking the task.
- No redaction at log and trace boundaries.
- Using irreversible redaction where correlation was needed.
- Assuming text DLP covers PII in document images.
- Cache keys without identity, serving answers across customers.

## 10. What to Remember

- **Redact at storage boundaries**, never in the working context.
- **Tokenize where correlation matters**; redact where it doesn't.
- **Image PII evades text DLP** — control processing location instead.
- **Check the output structurally** — identifiers must have provenance.
- **Detection is defence in depth**; access control is the primary line.
