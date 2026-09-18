# "What If Documents Contain Malicious Instructions?"

> **Phase 31 · PROJECT DEEP DIVE · Topic 34**

## 1. Definition

An incident scenario: the corpus is already poisoned. The question is detection, containment, and blast-radius assessment — not the defences, which are a design question.

*[26](26-how-would-you-defend-against-prompt-injection.md) covers preventing this. This one starts from the assumption that it happened.*

## 2. Simple Explanation

A document in the index contains text that reads as an instruction, and the model has been following it.

The system isn't broken. It's working exactly as designed on data that was compromised — which changes what "fix it" means.

## 3. How It Works

```
INCIDENT RESPONSE, IN ORDER

1. CONTAIN     remove the document from retrieval now —
               a filter on document ID, not a re-index,
               because a re-index takes time you don't
               have
2. ASSESS      how long was it retrievable, which queries
               retrieved it, what answers went out
3. SWEEP       is it the only one? Scan the corpus for
               the same pattern and the same source
4. TRACE       how did it enter? Which ingestion path,
               which submitter, which approval step
5. NOTIFY      affected users may have acted on wrong
               information — in banking this is a
               compliance conversation, not an
               engineering one
6. HARDEN      close the path, then the class
```

**Step 2 is the one that distinguishes a real answer.** The engineering fix is easy; knowing who got a wrong answer is the part that matters in a regulated environment.

## 4. Practical Example

**Assessing the blast radius — and what makes it possible:**

```
The logs need to already contain retrieved chunk IDs per
request. If they do:

  query the logs for requests where the poisoned chunk
  ID appears in the retrieval set
  → the exact list of affected conversations, users,
    and answers

If they don't, the honest answer is "we can't tell which
users were affected", and in banking that escalates the
incident considerably — because the conservative
assumption becomes everyone who asked about that topic.

That is the strongest argument for logging retrieved
chunk IDs, and it's a logging decision made months
before the incident.
```

**Sweeping for others:**

```
SAME PATTERN    scan indexed chunk text for
                instruction-shaped language — imperatives
                directed at a system, references to
                instructions or rules, unusual formatting
                markers

SAME SOURCE     every document from the same submitter or
                the same ingestion path, on the assumption
                that one compromised source produced more
                than one

SAME WINDOW     documents ingested around the same time,
                since an attack is rarely a single file

GOLDEN SET      re-run it. An answer that changed with no
                deploy behind it is the signature of
                corpus poisoning, and it may reveal
                documents the text scan missed.
```

**Tracing entry, which determines the real fix:**

```
The question isn't "how do we detect this text" — it's
"how did an untrusted document reach the index without
review?"

  · a supplier submission auto-ingested
  · a shared drive many people can write to
  · a user upload path
  · a scanned document with hidden layers

The fix is at that path: source trust classification,
review gates for untrusted sources, and sanitization
on ingestion.

Fixing only the one document leaves the path open.
```

**The uncomfortable possibility:** it may not be malicious. A policy document containing "advisors should tell customers the fee is waived" is an instruction to staff, sitting legitimately in the corpus, that the model reads as an instruction to itself. That's not an attack — it's a structural weakness, and the fix is the same structural separation between instruction and data.

## 5. Why It Matters

- **Containment is a retrieval filter**, not a re-index — speed matters.
- **Blast radius needs logged chunk IDs**, decided months earlier.
- **Trace the entry path** — one document is a symptom.

## 6. Trade-offs / Failure Modes

| Mistake | Consequence |
|---|---|
| Re-indexing to remove it | Slow; the document stays live meanwhile |
| Fixing the one document only | The entry path stays open |
| Not assessing who was affected | A compliance failure, not just a technical one |
| Assuming it's a single document | One compromised source usually produced several |
| Assuming malice | May be legitimate staff-directed language |
| No retrieval logs | The blast radius becomes "everyone" |

**On the compliance dimension:** if customers received wrong information about fees or eligibility, the obligation is to identify and contact them — that's a regulatory requirement, not a product decision. An engineer's answer that stops at "we removed the document and added a filter" misses the half of the incident that a bank actually cares about.

**On hardening in two steps:** close the specific path first because it's fast, then close the class. The class-level fix is source trust classification plus output-side validation, and it's the one that matters, because the next injection won't use the same wording.

## 7. Interview Answer

> "I'd treat this as an incident rather than a bug, because the system isn't broken — it's working as designed on data that was compromised. That changes what fixing it means.
>
> First, contain. Remove the document from retrieval immediately with a filter on its document ID, not by re-indexing — a re-index takes time and the document stays live the whole time.
>
> Second, and this is the part that actually matters in banking: assess the blast radius. How long was it retrievable, which queries retrieved it, and what answers went out. That depends entirely on whether the logs already contain retrieved chunk IDs per request. If they do, I can query for every request where that chunk appears and get the exact list of affected conversations and users. If they don't, the honest answer is that we can't tell who was affected — and the conservative assumption becomes everyone who asked about that topic, which escalates the incident considerably.
>
> That's the strongest argument I know for logging retrieved chunk IDs, and it's a decision made months before you need it.
>
> Third, sweep, on the assumption that it isn't the only one. Scan indexed chunk text for instruction-shaped language. Check every document from the same submitter and the same ingestion path. Check documents ingested in the same window, because an attack is rarely a single file. And re-run the golden set — an answer that changed with no deploy behind it is the signature of corpus poisoning, and it can surface documents a text scan missed.
>
> Fourth, trace how it entered, because that determines the real fix. The question isn't how to detect that text — it's how an untrusted document reached the index without review. A supplier submission auto-ingested, a shared drive many people can write to, a user upload path, a scan with hidden layers. Fixing just the one document leaves the path open.
>
> Fifth — and this is the one engineers skip — notification. If customers received wrong information about fees or eligibility, identifying and contacting them is a regulatory obligation, not a product decision. An answer that stops at 'we removed the document and added a filter' misses the half of the incident a bank actually cares about.
>
> Then harden in two steps. Close the specific path, because it's fast. Then close the class — source trust classification, review gates on untrusted sources, ingestion-time sanitization, and output-side validation. The class fix is the one that matters, because the next injection won't use the same wording.
>
> One thing I'd check before concluding it's an attack: it might not be. A policy document saying 'advisors should tell customers the fee is waived' is an instruction to staff, sitting legitimately in the corpus, that the model reads as an instruction to itself. That's not malicious — it's a structural weakness, and the fix is the same separation between instruction and data."

## 8. Likely Follow-ups

**Q: How do you remove it quickly?**
A retrieval filter on the document ID, not a re-index. A rebuild takes time during which the document stays live, and containment speed is the whole point of the first step.

**Q: How do you know who was affected?**
By querying logs for requests where that chunk ID appears in the retrieval set — if retrieved chunk IDs were logged. If they weren't, the blast radius defaults to everyone who asked about the topic, which is a much larger incident.

**Q: How do you find others?**
Scan chunk text for instruction-shaped language, check every document from the same source and ingestion window, and re-run the golden set. A changed answer with no deploy behind it points at the corpus.

**Q: What's the real fix?**
Closing the entry path, then the class. One document is a symptom; the question is how an unreviewed untrusted document reached the index. Source trust classification and output validation are the class-level answer.

**Q: Could it be accidental?**
Yes. A policy document telling advisors what to say is a legitimate instruction to staff that the model reads as an instruction to itself. Not an attack, same structural cause, same fix.

## 9. Common Mistakes

- Re-indexing rather than filtering for containment.
- Stopping at the technical fix.
- Not assessing which users were affected.
- Assuming a single document.
- Skipping the notification obligation.

## 10. What to Remember

- **Contain with a filter**, not a re-index.
- **Logged chunk IDs determine the blast radius** — decided months earlier.
- **Sweep by source, pattern, and time window.**
- **Trace the entry path** — the document is the symptom.
- **Notification is a compliance obligation**, not an optional step.
