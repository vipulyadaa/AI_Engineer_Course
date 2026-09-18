# Answer Relevance

> **Phase 12 · RAG EVALUATION · Topic 06**

## 1. Definition

Whether the generated answer actually addresses the question asked. It's independent of whether the answer is faithful to the context or factually correct — an answer can be grounded, accurate, and still not answer the question.

## 2. Simple Explanation

Faithfulness asks "did the answer stay within the evidence?" Answer relevance asks "did the answer respond to what was asked?"

Those come apart more often than people expect. A model handed context about international transfer *fees* and asked about transfer *timing* may produce a perfectly grounded answer about fees — faithful, accurate, and useless.

## 3. How It Works

**The standard measurement approach:**

```
1. Give an LLM judge the question and the answer (NOT the context)
2. Ask: does this answer address the question?
3. Score, with a rubric
```

**A more robust variant — reverse-question generation:**

```
1. From the ANSWER alone, generate the question it appears to answer
2. Embed both the generated question and the original question
3. Similarity between them = answer relevance

  Original:  "How long do international transfers take?"
  Answer:    "International transfers cost $45 for retail accounts."
  Generated: "What does an international transfer cost?"
  → low similarity → low answer relevance ✅ correctly detected
```

This approach is harder to game and doesn't require the judge to hold both texts in mind simultaneously.

**The three metrics and what each isolates:**

| Metric | Question | Catches |
|---|---|---|
| **Context relevance** | Was the retrieved context relevant? | Retrieval failure |
| **Faithfulness** | Is every claim supported by context? | Hallucination |
| **Answer relevance** | Does the answer address the question? | Off-target generation |

## 4. Practical Example

**Where relevance fails while faithfulness passes:**

```
Q: "How long does an international transfer take?"

Retrieved context: the fee schedule (retrieval brought the wrong thing)

Answer: "International transfers cost $45 for retail accounts
         and $25 for Premier."

Faithfulness:      1.0  ✅ every claim is in the context
Context relevance: low  ❌ the context didn't address timing
Answer relevance:  low  ❌ the answer didn't address timing

Without answer relevance, faithfulness alone would report this
as a success.
```

**Other patterns answer relevance catches:**

```
Partial answer:
  Q: "What are the fees and the processing time?"
  A: "The fee is $45."                        ← half the question

Over-hedged non-answer:
  Q: "What's the wire fee?"
  A: "Fees vary depending on several factors including account
      type, destination, and transfer method."  ← no actual answer

Correct abstention (should NOT be penalized):
  Q: "What's our cryptocurrency policy?"
  A: "I don't have information about that."     ← the right answer
```

**That last case needs special handling** — a correct abstention is a good outcome, not an irrelevant answer. Evaluate abstentions separately rather than scoring them as failures.

## 5. Why It Matters

- **It's the metric that catches faithful-but-useless answers**, which faithfulness alone reports as success.
- **It detects partial answers** — a common failure on multi-part questions.
- **It's measurable without ground-truth answers**, using only the question and the response.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Abstentions scored as irrelevant** | A correct "I don't know" is a success, not a failure |
| **Judge rewards verbosity** | Longer answers can seem more responsive without being so |
| **Doesn't check correctness** | A confidently wrong answer can be perfectly relevant |
| **Hedging passes** | A vague non-answer may score as "addressing the question" |
| **Judge cost** | An LLM call per evaluated answer |
| **Measured alone** | Relevant-but-hallucinated is equally bad |

**The key limitation to state:** answer relevance says nothing about correctness. "The international wire fee is $200" is perfectly relevant to a question about the wire fee and completely wrong. That's what faithfulness is for — the two metrics are orthogonal and both are needed.

## 7. Interview Answer

> "Answer relevance is whether the generated answer actually addresses the question asked. It's independent of faithfulness and of correctness.
>
> Those come apart more often than people expect. If retrieval brings back the fee schedule when someone asked about transfer timing, the model may produce a perfectly grounded answer about fees — faithfulness scores 1.0, every claim is supported, and the answer is useless. Faithfulness alone would report that as a success.
>
> The measurement approach I like is reverse-question generation: from the answer alone, generate the question it appears to answer, then compare that to the original question by embedding similarity. If the answer is about fees and the question was about timing, the generated question won't match. It's harder to game than asking a judge directly, and it doesn't require ground-truth answers.
>
> It also catches partial answers — someone asks about fees and processing time, and the answer covers only fees — and over-hedged non-answers that technically mention the topic without answering.
>
> Two things I'd handle carefully. Correct abstentions shouldn't be penalized: 'I don't have information about that' for an out-of-scope question is the right answer, not an irrelevant one, so I'd evaluate abstentions separately. And answer relevance says nothing about correctness — 'the wire fee is two hundred dollars' is perfectly relevant and completely wrong. That's what faithfulness is for. The two are orthogonal and you need both."

## 8. Likely Follow-ups

**Q: How does this differ from faithfulness?**
Faithfulness measures whether claims are supported by the context — it catches hallucination. Answer relevance measures whether the response addresses the question — it catches off-target answers. They're orthogonal: an answer can be faithful and irrelevant, or relevant and hallucinated. Both are needed.

**Q: How do you measure it without ground-truth answers?**
Reverse-question generation. From the answer alone, have a model generate the question it appears to answer, then compare that to the original question by embedding similarity. Low similarity means the answer addressed something else. It needs no reference answer, which makes it cheap to apply to production traffic.

**Q: How do you handle abstentions?**
Evaluate them separately. A correct abstention on an out-of-scope question is a success, and scoring it as an irrelevant answer would penalize exactly the behavior you want. I'd classify responses as answer vs. abstention first, then measure relevance only on answers, and measure abstention appropriateness as its own metric.

**Q: Can an answer be relevant and wrong?**
Yes, and that's the key limitation. "The international wire fee is two hundred dollars" is fully relevant to a question about the wire fee and completely incorrect. Answer relevance measures topical alignment, not truth. Faithfulness measures support by evidence. Neither alone establishes correctness.

**Q: What does low answer relevance usually indicate?**
Most often a retrieval problem — the context didn't contain what the question needed, so the model answered about what it did have. So I'd check context relevance first when answer relevance drops. It can also indicate a prompt problem, where the instruction doesn't emphasize addressing the specific question, or partial answering on multi-part questions.

## 9. Common Mistakes

- Penalizing correct abstentions as irrelevant answers.
- Measuring faithfulness alone and missing faithful-but-useless answers.
- Treating relevance as evidence of correctness.
- Letting a verbose hedge pass as a relevant answer.
- Not checking context relevance first when answer relevance drops.

## 10. What to Remember

- **Does the answer address the question?** Independent of faithfulness and of correctness.
- **Catches faithful-but-useless answers** that faithfulness reports as success.
- **Reverse-question generation** measures it without ground-truth answers.
- **Evaluate abstentions separately** — a correct "I don't know" is a success.
- **Relevant ≠ correct.** Pair it with faithfulness.
