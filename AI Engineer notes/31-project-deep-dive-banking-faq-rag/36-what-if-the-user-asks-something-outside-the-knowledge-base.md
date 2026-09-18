# "What If the User Asks Something Outside the Knowledge Base?"

> **Phase 31 · PROJECT DEEP DIVE · Topic 36**

## 1. Definition

A scenario about out-of-scope questions. The design point is that "outside the knowledge base" has several distinct causes, and treating them identically produces a system that refuses things it could have answered.

*Related: [15](15-how-did-you-handle-irrelevant-results.md) covers the retrieval mechanism. This one is about the categories and the response.*

## 2. Simple Explanation

Not every unanswerable question is unanswerable for the same reason. Some are genuinely outside the corpus, some are account-specific, some are phrased in words the corpus doesn't use, and some shouldn't be answered at all.

Each needs a different response, and a single "I don't know" for all of them is a poor product.

## 3. How It Works

```
THE CATEGORIES

OUT OF DOMAIN        "what's the weather"
                     → politely redirect

OUT OF CORPUS        a real banking question the
                     documents don't cover
                     → abstain, route to a human, and
                       LOG IT as a content gap

ACCOUNT-SPECIFIC     "what's MY balance"
                     → a different system entirely; the
                       corpus will never contain it
                     → route, don't abstain

VOCABULARY MISMATCH  the corpus covers it, in different
                     words
                     → NOT unanswerable; a retrieval
                       failure wearing a costume

PROHIBITED           "should I invest my savings in X"
                     → refuse on policy, not on
                       retrieval. Different mechanism.
```

**The vocabulary case is the trap.** It looks identical to out-of-corpus from the score alone, and treating it as such hides a fixable retrieval problem.

## 4. Practical Example

**Distinguishing vocabulary mismatch from a real gap:**

```
User: "What does it cost to send money abroad?"
Corpus: "International Transfer Fee Schedule"

Dense retrieval usually handles that. But:

User: "What's the charge for a SWIFT MT103?"

Low scores, because that identifier carries little
semantic signal — yet the corpus does cover it.

SIGNALS THAT IT'S VOCABULARY, NOT A GAP:
  · BM25 finds something dense retrieval didn't
  · a rewritten or expanded query scores much better
  · the same topic appears in the corpus under a
    different name

WHICH IS WHY the response to a low score shouldn't be
immediate abstention. Try query expansion and a lexical
pass first — abstaining on a question the corpus answers
is the more embarrassing failure.
```

**Why account-specific questions matter disproportionately:**

```
"What's my balance?" is a large share of real traffic for
a banking assistant, and it's not a knowledge-base
question at all.

Treating it as out-of-corpus produces "I don't have that
information", which is unhelpful and slightly absurd —
the bank obviously has it.

The right handling is a classifier that recognizes
account-specific intent and routes to authenticated
account services or to a human, rather than sending it
down the retrieval path at all.

Naming this category is what shows the answer comes from
thinking about a banking product rather than about RAG.
```

**What a good refusal contains:**

```
1. A CLEAR STATEMENT that the answer isn't available
   from the policy documents
2. WHAT IS NEARBY — related topics the corpus does
   cover, which often turn out to be what was wanted
3. A ROUTE FORWARD — an advisor, a phone number, a
   handoff

And silently: LOG IT. A cluster of unanswerable questions
on one topic is a content gap, and that's the most
directly actionable output of the whole system — the fix
is writing a document.

An out-of-scope question is product feedback. A system
that discards it is throwing away its best signal.
```

## 5. Why It Matters

- **Several distinct causes** need different responses.
- **Vocabulary mismatch masquerades** as an out-of-corpus gap.
- **Unanswered-question clusters are content gaps** — the best product signal available.

## 6. Trade-offs / Failure Modes

| Mistake | Consequence |
|---|---|
| One "I don't know" for every case | Poor product, wasted signal |
| Abstaining on vocabulary mismatch | Refusing questions the corpus answers |
| No account-specific routing | Absurd refusals on common questions |
| Not logging unanswered questions | The content gap is never closed |
| Policy refusals handled as retrieval failures | The wrong mechanism, and inconsistent |
| Refusal without a route forward | A dead end |

**On the two-sided risk:** abstaining too readily is as damaging as answering wrongly, just less visibly. Users who get refused on answerable questions stop using the system, and that shows up as declining traffic rather than as a quality metric. Which is why the abstention rate needs an expected range in both directions.

**On prohibited questions:** "should I invest in this fund" isn't a retrieval problem — the corpus may well contain relevant material. It's a policy boundary, enforced by intent classification and by an output-side check, and keeping it separate from the retrieval-based abstention path keeps both behaving predictably.

## 7. Interview Answer

> "The first thing I'd say is that 'outside the knowledge base' covers several different situations, and treating them identically makes for a bad product.
>
> Out of domain — someone asks about the weather. Politely redirect.
>
> Out of corpus — a genuine banking question the documents don't cover. Abstain, route to a human, and log it, because that's a content gap.
>
> Account-specific — 'what's my balance'. That's a large share of real traffic for a banking assistant and it isn't a knowledge-base question at all. Treating it as out-of-corpus gives you 'I don't have that information', which is unhelpful and slightly absurd, because the bank obviously has it. The right handling is intent classification that routes to authenticated account services or a human, without going down the retrieval path at all.
>
> Vocabulary mismatch — and this is the trap. The corpus covers the topic under different words. Someone asks about the charge for a SWIFT MT103; that identifier carries almost no semantic signal so dense retrieval scores low, but the corpus does answer it. From the score alone it looks exactly like an out-of-corpus gap.
>
> So the response to a low score shouldn't be immediate abstention. Try query expansion and a lexical pass first — if BM25 finds something dense retrieval didn't, or a rewritten query scores much better, it was a retrieval failure wearing a costume. Abstaining on a question the corpus answers is the more embarrassing failure of the two.
>
> And prohibited questions — 'should I invest my savings in this fund'. That's not a retrieval problem; the corpus may well contain relevant material. It's a policy boundary, enforced by intent classification and an output-side check, and I'd keep it on a separate path from retrieval-based abstention so both behave predictably.
>
> On what a refusal should contain: a clear statement that the answer isn't in the policy documents, what related topics are covered — which often turns out to be what the person actually wanted — and a route forward, an advisor or a handoff. A bare 'I don't know' is a dead end.
>
> And silently, log it. A cluster of unanswerable questions on one topic is a content gap, and that's the most directly actionable output of the whole system, because the fix is writing a document rather than tuning a parameter. An out-of-scope question is product feedback, and a system that discards it is throwing away its best signal.
>
> The risk to hold in mind is that this cuts both ways. Abstaining too readily is as damaging as answering wrongly, just less visibly — users refused on answerable questions stop using the system, and that shows up as declining traffic rather than as a quality metric. So the abstention rate needs an expected range in both directions."

## 8. Likely Follow-ups

**Q: How do you tell a vocabulary mismatch from a real gap?**
Try a lexical pass and query expansion. If BM25 finds something dense retrieval missed, or a rewritten query scores much better, the corpus covers it — it was a retrieval failure that looked like a gap from the score alone.

**Q: What about "what's my balance"?**
Different system entirely. Intent classification routes it to authenticated account services rather than retrieval, because "I don't have that information" is an absurd response to a question the bank can obviously answer.

**Q: What should a refusal say?**
That the answer isn't in the policy documents, what related topics are covered, and a route to a human. The nearby-topics part often turns out to be what the person actually wanted.

**Q: What do you do with unanswered questions?**
Log and cluster them. A cluster on one topic is a content gap, and the fix is writing a document — the most directly actionable output the system produces.

**Q: Isn't abstaining always safe?**
No. Refusing answerable questions drives users away, and it shows up as declining traffic rather than as a quality metric. Abstention rate needs an expected range in both directions.

## 9. Common Mistakes

- A single refusal response for every cause.
- Abstaining on vocabulary mismatch.
- No routing for account-specific questions.
- Discarding unanswered questions.
- Handling policy refusals through the retrieval path.

## 10. What to Remember

- **Five categories**, five responses — not one "I don't know".
- **Vocabulary mismatch looks like a gap** — try lexical and expansion first.
- **Account-specific questions route**, they don't abstain.
- **Log unanswered questions** — clusters are content gaps.
- **Over-abstaining fails invisibly**, as declining usage.
