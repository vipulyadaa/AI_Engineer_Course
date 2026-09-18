# Design: Banking FAQ Assistant

> **Phase 28 · AI SYSTEM DESIGN · Topic 02**

## 1. Definition

A customer-facing assistant answering questions about banking products, fees, and policies from approved documentation — the constrained, regulated variant of an enterprise RAG system.

## 2. Simple Explanation

Most of the design is the same as enterprise RAG. What changes is what happens when the system isn't sure, and what it's forbidden to say.

A wrong fee figure a customer acts on is the failure that defines the design.

## 3. How It Works

```
request
  ▼
AUTHENTICATE ─ identity into immutable state
  ▼
CLASSIFY ───── in scope? simple or investigative?
  ├── out of scope ──▶ decline, offer in-scope topics
  ├── simple (~80%) ─▶ DETERMINISTIC PIPELINE
  └── investigative ─▶ AGENT (read-only tools, bounded)
  ▼
VERIFY ─────── per-claim grounding, zero tolerance on numbers
  ▼
OUTPUT CHECK ─ no advice, no guarantees, no other-customer PII
  ▼
answer + citations  │  or ABSTAIN → human handoff
```

**Classification is the highest-value node** — it sets cost, latency, reliability, and auditability for every request downstream.

## 4. Practical Example

**The prohibitions that shape the design:**

```
NO FINANCIAL ADVICE
  "Should I switch to Premier?" is a regulated activity.
  → output-side classifier, not a prompt rule

NO GUARANTEES
  "You'll definitely be approved" creates a liability.
  → output-side check for commitment language

NO UNSUPPORTED FIGURES
  A wrong fee is the failure that matters most.
  → zero-tolerance grounding check on numbers; abstain
    rather than answer

NO OTHER CUSTOMERS' DATA
  → pre-filtered retrieval, so it's never in context

Each is architectural. A prompt saying "never give advice"
is a request the model can be argued out of.
```

**Why abstention is a product decision, not just a technical one:**

```
The system will abstain on a meaningful share of questions.
That's correct behaviour — an unsupported answer about a fee
is worse than no answer.

But it has to be designed as a product experience:
  · phrased helpfully, not "I don't have that information"
  · with a route to a human, not a dead end
  · with the topic logged so the content gap gets closed

If abstention is an error message, the system feels broken
even when it's behaving correctly — and that's what drives
customers away, not the abstention itself.
```

**The tiered answer confidence:**

```
CONFIDENT      strong retrieval, verified, cited
               → answer directly

QUALIFIED      answer with the condition stated explicitly
               "for Standard accounts the fee is $45 — I
                can't confirm your account tier here"

ABSTAIN        weak retrieval or unverifiable claim
               → offer a handoff

That middle tier is the one most systems lack. It's the
honest answer when the general rule is known but the
customer-specific application isn't.
```

## 5. Why It Matters

- **The prohibitions are architectural**, not prompt instructions.
- **Abstention is a product experience**, and getting it wrong makes a correct system feel broken.
- **The qualified-answer tier** is the honest middle ground most systems lack.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Advice prohibition in the prompt only** | Negotiable |
| **Abstention phrased as an error** | Correct behaviour feels like failure |
| **No qualified-answer tier** | Binary answer-or-refuse |
| **General rule given to a specific question** | Passes every metric, answers nothing |
| **No effective-date filter** | Superseded fee cited as current |
| **Escalation without context** | The human starts from nothing |

**On the general-rule failure:** a customer asking "do I qualify for the waiver" receiving the general waiver policy is the most common serious quality problem — true, cited, and not an answer. It needs explicit detection (possessives and eligibility phrasing signal it) and routing to the investigative path, plus a golden-set metric scoring the general rule as zero rather than partial credit.

**On handoff quality:** when the system escalates, the human should receive the question, what was retrieved, what was established, and why it escalated — not just the transcript. Escalation that makes the customer repeat themselves converts a correct abstention into a bad experience, which undoes the reason for abstaining.

## 7. Interview Answer

> "Most of the design is standard enterprise RAG. What changes for banking is what happens when the system isn't sure, and what it's forbidden to say.
>
> The shape is: authenticate, writing identity into immutable state; classify for scope and complexity; route roughly eighty percent of traffic through a deterministic retrieve-generate-verify pipeline and the investigative minority through a bounded read-only agent; then per-claim verification, output checks, and either an answer with citations or abstention with a handoff.
>
> Classification is the highest-value node because it sets cost, latency, reliability, and auditability for everything downstream.
>
> The prohibitions shape the design and they're all architectural rather than prompt instructions. No financial advice — that's a regulated activity, so it's an output-side classifier. No guarantees, same. No unsupported figures, which means a zero-tolerance grounding check on numbers and abstaining rather than answering. And no other customers' data, which is pre-filtered retrieval so it's never in context to disclose. A prompt saying 'never give advice' is a request the model can be argued out of.
>
> The part I'd emphasize is abstention as a product decision. The system will abstain on a meaningful share of questions, and that's correct — an unsupported answer about a fee is worse than no answer. But it has to be designed as an experience: phrased helpfully rather than 'I don't have that information', with a route to a human rather than a dead end, and with the topic logged so the content gap gets closed. If abstention is an error message, the system feels broken even when it's behaving correctly — and that's what drives customers away, not the abstention itself.
>
> I'd also build a qualified-answer tier between confident and abstaining. 'For Standard accounts the fee is forty-five dollars, but I can't confirm your account tier here' is the honest answer when the general rule is known and the customer-specific application isn't. Most systems are binary — answer or refuse — and that middle tier is where a lot of real questions sit.
>
> Two failure modes I'd design against. The general-rule failure: someone asking 'do I qualify for the waiver' getting the general waiver policy. True, cited, and not an answer — and it passes every standard metric. It needs explicit detection, since possessives and eligibility phrasing signal it, routing to the investigative path, and a golden-set metric scoring the general rule as zero rather than partial credit.
>
> And handoff quality. When the system escalates, the human should get the question, what was retrieved, what was established, and why it escalated — not just a transcript. Escalation that makes the customer repeat themselves converts a correct abstention into a bad experience, which undoes the reason for abstaining in the first place."

## 8. Likely Follow-ups

**Q: What's different from generic enterprise RAG?**
The prohibitions and the abstention behaviour. No financial advice, no guarantees, no unsupported figures, no cross-customer data — all enforced architecturally. And abstention becomes a designed product experience rather than an error path, because it happens often by design.

**Q: Why are the prohibitions architectural?**
Because a prompt instruction is a request the model can be argued out of, and an injection in retrieved content can override it. An output-side classifier checks what was actually produced, which works regardless of how the model was persuaded.

**Q: What's the qualified-answer tier?**
The middle ground between answering confidently and abstaining — stating the general rule with the limitation made explicit. "For Standard accounts the fee is forty-five dollars, but I can't confirm your tier here." Most systems are binary and lose the many questions that sit there.

**Q: What's the most common serious failure?**
Answering a specific question with the general rule. It's true, cited, and passes every metric while not answering what was asked. Detection uses possessives and eligibility phrasing, and the golden set has to score it as zero rather than partial credit.

**Q: What makes abstention work as a product?**
Helpful phrasing, a route to a human rather than a dead end, and logging the topic so the content gap closes. And a handoff carrying the question, what was retrieved, and why it escalated — making the customer repeat themselves undoes the point of abstaining correctly.

## 9. Common Mistakes

- Advice and guarantee prohibitions implemented only in the prompt.
- Abstention phrased as an error message.
- No qualified-answer tier between confident and abstaining.
- Accepting a general-rule answer to a specific question.
- Escalating with a transcript rather than structured context.

## 10. What to Remember

- **Classification sets the economics** — most traffic on the deterministic path.
- **Prohibitions are output-side checks**, never prompt instructions.
- **Abstention is a product experience** — helpful, routed, logged.
- **Build a qualified-answer tier** — most systems are wrongly binary.
- **The general-rule answer** is the most common serious failure; score it zero.
