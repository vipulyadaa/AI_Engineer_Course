# Relevance

> **Phase 22 · AI EVALUATION · Topic 08**

## 1. Definition

Whether the answer addresses what was actually asked. Distinct from groundedness — an answer can be fully supported by the retrieved context and still not answer the question.

## 2. Simple Explanation

Groundedness asks whether the answer is supported. Relevance asks whether it's responsive.

A system can return a true, well-cited statement of the general policy when the customer asked whether *they* qualify. Grounded, and not an answer.

## 3. How It Works

```
THREE RELEVANCE MEASURES, often conflated:

CONTEXT RELEVANCE   is the retrieved context relevant to
                    the query?           → retrieval quality
ANSWER RELEVANCE    does the answer address the query?
                                         → generation quality
ANSWER COMPLETENESS does it address ALL parts of a
                    multi-part query?    → the one most missed
```

**Measuring them separately localizes the failure.** Poor context relevance is a retrieval problem; poor answer relevance with good context is a generation or prompt problem.

## 4. Practical Example

**The failure that passes groundedness:**

```
Q: "Do I qualify for the international transfer fee waiver?"

A: "Fee waivers apply to Premier and Private tier accounts
    opened before 2020, limited to two per calendar month."
    [fee schedule v4.2 §3.4]

Groundedness:  PASS — fully supported
Relevance:     FAIL — the customer asked about themselves

This is the multi-hop failure, and it's the single most
common serious quality problem in RAG systems — because
every standard metric says the answer is good.
```

**Scoring it so it's caught:**

```
For a specific question, score the answer:
  2  a specific determination — "yes, you qualify, one
     waiver remaining this month"
  1  partial — some relevant facts, no determination
  0  the general rule only

Scoring the general rule as ZERO rather than partial credit
is the point. Partial credit rewards exactly the failure
the metric exists to catch.
```

**Completeness on multi-part questions:**

```
Q: "What's the wire fee, does it differ for Premier, and
    are there monthly waivers?"

An answer covering only the first part is relevant and
incomplete. Measuring relevance without completeness
scores it well.

So: for multi-part questions, score coverage per sub-
question. An answer addressing one of three is 0.33, not
"relevant".
```

**Over-answering is also a relevance failure:** a response that answers the question and then volunteers three paragraphs about related products is less relevant, harder to read, and in banking risks stating something that wasn't asked for and wasn't verified.

## 5. Why It Matters

- **Three distinct measures** — context, answer, and completeness — localize different failures.
- **The general-rule answer** is the most common serious RAG failure and it passes groundedness.
- **Scoring it as zero, not partial**, is what makes the metric catch it.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Conflating the three measures** | Failure can't be localized |
| **Partial credit for general-rule answers** | Rewards the failure |
| **No completeness scoring** | Partial answers to multi-part questions pass |
| **Over-answering unmeasured** | Unrequested, unverified content |
| **Judged without the question type** | A general answer is correct for a general question |

**On question type dependence:** "what is the waiver policy" *should* get the general rule — that's a correct and relevant answer. "Do I qualify" should not. So relevance scoring needs the question type as an input, or it will penalize correct general answers and reward wrong specific ones.

**On the connection to architecture:** a consistently low relevance score on specific questions usually means the system lacks the multi-hop capability to answer them, not that the prompt is wrong. That points at routing and iterative retrieval rather than at wording, which is why localizing the failure matters more than the score itself.

## 7. Interview Answer

> "Relevance is whether the answer addresses what was actually asked, and it's distinct from groundedness — an answer can be fully supported and still not be responsive.
>
> I'd separate three measures that often get conflated. Context relevance: is the retrieved context relevant to the query, which is retrieval quality. Answer relevance: does the answer address the query, which is generation quality. And answer completeness: does it address all parts of a multi-part query, which is the one most often missed.
>
> Measuring them separately localizes the failure. Poor context relevance is a retrieval problem; poor answer relevance with good context is a generation or prompt problem. An aggregate relevance score tells you neither.
>
> The failure I'd highlight is the general-rule answer. Someone asks 'do I qualify for the fee waiver' and the system answers 'waivers apply to Premier and Private tier accounts opened before 2020, limited to two per calendar month,' with a correct citation. Groundedness passes — it's fully supported. Relevance fails, because they asked about themselves. That's the multi-hop failure, and it's the single most common serious quality problem in RAG systems precisely because every standard metric says the answer is good.
>
> To catch it, I'd score a specific question as two for a specific determination, one for relevant facts without a determination, and zero for the general rule only. Scoring the general rule as zero rather than partial credit is the point — partial credit rewards exactly the failure the metric exists to catch.
>
> For multi-part questions I'd score coverage per sub-question. An answer addressing one of three is 0.33, not 'relevant.'
>
> One thing that makes this subtle: relevance scoring needs the question type as an input. 'What is the waiver policy' *should* get the general rule — that's correct and relevant. 'Do I qualify' should not. Without the question type, the metric penalizes correct general answers and rewards wrong specific ones.
>
> And I'd connect it to architecture. A consistently low relevance score on specific questions usually means the system lacks the multi-hop capability to answer them, not that the prompt is wrong. That points at routing and iterative retrieval rather than at wording — which is why localizing the failure matters more than the score itself.
>
> One more: over-answering is also a relevance failure. A response that answers the question then volunteers three paragraphs about related products is harder to read and, in banking, risks stating something unrequested and unverified."

## 8. Likely Follow-ups

**Q: How does relevance differ from groundedness?**
Groundedness asks whether claims are supported; relevance asks whether the answer is responsive. A true, well-cited statement of the general policy in response to "do I qualify" is grounded and irrelevant — supported by the context and not an answer to the question.

**Q: What's the most common relevance failure?**
Answering a specific question with the general rule. It passes groundedness, citation accuracy, and answer-relevance checks that don't account for specificity, which is exactly why it's the most common serious quality problem in RAG systems.

**Q: How do you score it so that failure is caught?**
Zero for a general-rule answer to a specific question, one for relevant facts without a determination, two for a specific determination. Partial credit for the general rule rewards the failure the metric was built to detect.

**Q: Why do you need the question type?**
Because "what is the waiver policy" should get the general rule and "do I qualify" shouldn't. Without question type as an input, the metric penalizes correct general answers and rewards wrong specific ones — it measures the wrong thing in both directions.

**Q: What does a persistent relevance failure indicate?**
Usually an architectural gap rather than a prompt problem. Consistently low relevance on specific questions means the system can't do the multi-hop retrieval those questions require, which points at routing and iterative retrieval rather than at wording.

## 9. Common Mistakes

- Conflating context relevance, answer relevance, and completeness.
- Giving partial credit to general-rule answers.
- Not scoring coverage on multi-part questions.
- Scoring relevance without knowing the question type.
- Treating a relevance failure as a prompt problem when it's architectural.

## 10. What to Remember

- **Grounded but not responsive** is a real and common failure.
- **Three measures:** context relevance, answer relevance, completeness.
- **General rule to a specific question scores zero**, not partial.
- **Score sub-question coverage** on multi-part queries.
- **Question type is an input** — without it the metric misjudges both ways.
