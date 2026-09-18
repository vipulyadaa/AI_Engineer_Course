# PII in RAG

> **Phase 14 · RAG SECURITY · Topic 09**

## 1. Definition

Personally identifiable information appearing in indexed documents, queries, answers, or logs. Handling it requires deciding at ingestion whether it's redacted, tokenized, or retained with access control — and each choice has different consequences.

## 2. Simple Explanation

PII shows up in a RAG system in four places, and they need different treatment:

1. **In documents** — customer names in a case file
2. **In queries** — "what's the balance on account 4471-8823?"
3. **In answers** — the model repeats what it retrieved
4. **In logs** — everything above, written down

The key question at ingestion is whether the PII *is* the content or is incidental to it, because that determines whether you can redact it.

## 3. How It Works

**The three handling strategies:**

| Strategy | What it does | When |
|---|---|---|
| **Redaction** | Replace with a placeholder | PII is incidental — an example in a policy doc |
| **Tokenization** | Replace with a reversible token | Authorized users need re-identification |
| **Retain + access control** | Keep it; enforce entitlement at retrieval | PII *is* the record's substance |

```
Policy document:
  "For example, if customer John Smith (acct 4471-8823) requests..."
  → PII is incidental. REDACT at ingestion. Nothing is lost.

Customer case file:
  "Account 4471-8823, held by J. Smith, disputed transaction on..."
  → PII IS the record. Redacting makes it useless.
  → Retain, and enforce user-level access control at retrieval.
```

**Detection, by type:**

```
Structured (account numbers, IBANs, card numbers, national IDs)
  → regex + checksum validation. High precision.

Unstructured (names, addresses, free-text disclosures)
  → NER model, or an LLM pass. Lower precision, needs review.

Google Cloud: Cloud DLP provides both, with a large built-in
infoType catalogue and de-identification transforms.
```

## 4. Practical Example

**Query-side PII, which people forget:**

```
User asks: "why was the transfer from account 4471-8823 rejected?"

That query contains PII and it flows into:
  · the embedding API call        → a third party sees it
  · the LLM call                  → a third party sees it
  · application logs              → operators see it
  · the query cache               → persisted
  · analytics and eval datasets   → propagated further

Controls:
  · redact before logging
  · check the provider's data-handling terms and residency
  · avoid persisting raw queries; store hashes for dedup
```

**The redaction-breaks-retrieval problem:**

```
Document redacted: "Account [REDACTED] disputed a transaction."
Query:             "what happened with account 4471-8823?"

→ The account number no longer exists in the index, so BM25
  can't match it and the document is unfindable by its identifier.

If users search by identifier, redaction breaks the use case.
That's the argument for tokenization or access control instead.
```

## 5. Why It Matters

- **It's a regulatory requirement** — GDPR, DPA, and banking-specific rules, not a best practice.
- **The redaction-vs-retention choice is a product decision**, and getting it wrong either leaks or breaks the use case.
- **Query-side PII flows to third-party APIs**, which is a residency and contractual question, not just a technical one.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Redacting PII that IS the content** | The record becomes useless |
| **Not redacting incidental PII** | Unnecessary exposure with no benefit |
| **Ignoring query-side PII** | Flows to embedding and LLM providers, and into logs |
| **Redaction breaking identifier search** | Users can't find records by account number |
| **Detection false negatives** | Unstructured PII — names, free text — is hard |
| **Right-to-erasure** | Deleting a customer's data means finding every chunk |
| **Logs retaining PII** | Often the largest exposure by volume |

**Right to erasure is the operational requirement people underestimate.** A deletion request means finding and removing every chunk derived from that person's data — which requires customer ID in chunk metadata, or you're scanning the whole corpus. Designing for it up front is far cheaper than retrofitting.

**On detection precision:** structured PII detection is reliable. Unstructured detection — names, addresses in free text — has meaningful false-negative rates. I'd treat it as one layer, combined with access control rather than relied upon alone.

## 7. Interview Answer

> "PII in RAG shows up in four places: indexed documents, queries, answers, and logs. The decision to make at ingestion is whether the PII is the content or is incidental to it, because that determines whether you can redact.
>
> If a policy document contains an example customer name, that's incidental — redact it and nothing is lost. If it's a customer case file, the PII *is* the record, and redacting makes it useless. So that case needs retention with user-level access control at retrieval instead.
>
> There's a trap with redaction that's worth knowing: if you redact an account number from the document, users can no longer find that record by searching for the account number. BM25 has nothing to match. So if searching by identifier is part of the use case, redaction breaks it and tokenization or access control is the right answer.
>
> The surface people forget is the query side. 'Why was the transfer from account 4471-8823 rejected' contains PII, and that query flows to the embedding API, to the LLM provider, into application logs, into the query cache, and into analytics. So I'd redact before logging, store query hashes rather than raw text, and check the provider's data-handling and residency terms — that's a contractual question, not just a technical one.
>
> On Google Cloud I'd use Cloud DLP for detection and de-identification, which has a large built-in infoType catalogue for structured PII. Unstructured detection — names and addresses in free text — has real false-negative rates, so I'd treat it as one layer combined with access control rather than relying on it alone.
>
> And the operational requirement people underestimate is right to erasure. Deleting a customer's data means finding every chunk derived from it, which requires customer ID in chunk metadata. Designing for that up front is far cheaper than retrofitting."

## 8. Likely Follow-ups

**Q: Redact, tokenize, or retain?**
Depends on whether the PII is incidental or substantive. Incidental — an example name in a policy document — should be redacted, since nothing is lost. Substantive — a customer case file — has to be retained with access control, because redacting destroys the record's value. Tokenization sits between, when authorized users need re-identification.

**Q: What's the problem with redaction?**
It breaks identifier search. If you redact an account number from a document, BM25 has nothing to match when a user searches for that account number, so the record becomes unfindable by its own identifier. That's a real use-case break, and it's why access control is often the better answer for substantive PII.

**Q: What about PII in queries?**
It flows to the embedding API, the LLM provider, application logs, caches, and analytics — a much wider blast radius than people expect. I'd redact before logging, store hashes rather than raw query text, and verify the provider's data-handling and residency terms contractually, since in banking that's a compliance question.

**Q: How do you handle right to erasure?**
By designing for it: store customer or subject IDs in chunk metadata so a deletion request maps to a specific set of chunks. Without that, erasure means scanning the entire corpus to find derived content. It also applies to caches, logs, and evaluation datasets, which are easy to forget.

**Q: How reliable is PII detection?**
Structured PII — account numbers, IBANs, card numbers — is reliably detected with regex plus checksum validation. Unstructured PII like names and addresses in free text has meaningful false-negative rates even with NER or an LLM pass. So detection is one layer; access control is the layer that doesn't depend on catching everything.

## 9. Common Mistakes

- Redacting PII that constitutes the record's substance.
- Ignoring query-side PII flowing to third-party APIs and logs.
- Redacting identifiers users need to search by.
- Relying on unstructured PII detection alone without access control.
- Not designing for right-to-erasure, making deletion a corpus-wide scan.

## 10. What to Remember

- **Four surfaces:** documents, queries, answers, logs.
- **Is the PII incidental or substantive?** That determines redact vs. access control.
- **Redaction breaks identifier search** — a real use-case cost.
- **Query-side PII flows to third-party APIs** — a residency and contractual issue.
- **Design for right-to-erasure up front:** subject IDs in chunk metadata, including caches and logs.
