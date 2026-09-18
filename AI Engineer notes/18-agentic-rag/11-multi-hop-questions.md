# Multi-Hop Questions

> **Phase 18 · AGENTIC RAG · Topic 11**

## 1. Definition

Questions whose answer requires chaining facts across several retrievals, where each step's search target only becomes known after the previous step's result. They are the clearest case that single-shot RAG cannot handle.

## 2. Simple Explanation

"Does my account qualify for the waiver that applies to pre-2020 accounts?"

To answer it you need the waiver rule, then your account's opening date, then a comparison. You can't search for the opening date until you know the rule cares about it.

## 3. How It Works

```
HOP 1   retrieve the rule
        → "waivers apply to Premier/Private tiers on accounts
           opened before 2020, max 2 per calendar month"
HOP 2   NOW you know what facts matter
        → tier? opening date? waivers used?
HOP 3   compare and conclude

The second query is a FUNCTION of the first result. That's
the defining property.
```

**Why single retrieval can't work:** the query embedding represents the question as asked. The documents needed at hop 2 aren't semantically close to that question — the opening date record has nothing in common with a question about waivers. No amount of tuning closes that gap.

## 4. Practical Example

**Recognizing a multi-hop question before answering it:**

```
SIGNALS
  · a possessive tied to a general rule — "my", "our"
  · comparison between two things
  · conditional phrasing — "if", "qualify", "eligible"
  · a rule referenced without its parameters
  · two entities that wouldn't co-occur in one document

"What's the wire fee?"                       single-hop
"What's MY wire fee?"                        multi-hop (tier)
"Do I qualify for the waiver?"               multi-hop (rule +
                                             several facts)
"Why was I charged more than the schedule?"  multi-hop
```

**The possessive is the highest-signal marker** in a banking context — it converts a general policy question into one requiring account-specific facts, which is a hop.

**The characteristic failure:**

```
Single-shot RAG on "do I qualify for the waiver?" retrieves
the waiver policy and answers:

  "Waivers apply to Premier and Private tier accounts opened
   before 2020, limited to two per calendar month."

That's TRUE, RELEVANT, WELL-CITED — and it doesn't answer
the question. The customer asked whether THEY qualify.

This is the failure worth being able to describe, because
it looks like success on every grounding metric. Faithfulness
passes, citations are correct, and the answer is wrong for
the user's actual need.
```

**Evaluating for it:** a golden set needs multi-hop cases labelled as such, with the expected answer being the *specific determination*, not the general rule. A general-rule answer should score zero, not partial credit.

## 5. Why It Matters

- **It's the clearest structural limit** of single-shot RAG.
- **The failure looks like success** on standard grounding metrics.
- **The possessive is a cheap, high-signal detector** for routing.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Answering with the general rule** | True, cited, doesn't answer the question |
| **Cost and latency** | Several rounds, several LLM calls |
| **Error propagation** | A wrong fact at hop 1 invalidates everything |
| **Unbounded hops** | Chains that don't converge |
| **Missing the multi-hop signal** | Routed to the single-shot path |

**On error propagation:** if hop 1 retrieves a superseded version of the waiver rule, every subsequent hop is correct reasoning over a wrong premise, and the final answer is confidently wrong with a clean citation. Effective-date filtering at every hop matters more here than in single-shot RAG, because the error is amplified rather than visible.

**On presenting the answer:** for a multi-hop determination I'd show the chain — the rule, each fact retrieved, and the conclusion. That lets the customer verify the reasoning, and it's also what an auditor needs. A bare "yes, you qualify" is less useful and less defensible.

## 7. Interview Answer

> "A multi-hop question requires chaining facts across retrievals, where each step's search target only becomes known after the previous result. 'Do I qualify for the waiver that applies to pre-2020 accounts' needs the waiver rule first, then the account's tier and opening date and waivers used, then a comparison. You can't search for the opening date until you know the rule cares about it.
>
> Single retrieval can't handle it structurally. The query embedding represents the question as asked, and the documents needed at hop two aren't semantically close to that question — an account opening date record has nothing in common with a question about waivers. No tuning closes that gap.
>
> The failure is worth describing precisely because it looks like success. Single-shot RAG on 'do I qualify for the waiver' retrieves the policy and answers 'waivers apply to Premier and Private tier accounts opened before 2020, limited to two per month'. That's true, relevant, and well-cited. Faithfulness passes, citations are correct — and it doesn't answer the question. The customer asked whether *they* qualify. Every standard grounding metric says this is a good answer.
>
> For detection, the highest-signal marker in banking is the possessive. 'What's the wire fee' is single-hop; 'what's *my* wire fee' is multi-hop, because it needs the tier. Other signals are comparisons, conditional phrasing like 'qualify' or 'eligible', and rules referenced without their parameters.
>
> Two things I'd get right. Error propagation — if hop one retrieves a superseded version of the rule, every later hop is correct reasoning over a wrong premise, and the answer is confidently wrong with a clean citation. So effective-date filtering matters more at every hop here than it does in single-shot RAG, because the error is amplified rather than visible.
>
> And presentation — for a determination I'd show the chain: the rule, each fact retrieved, and the conclusion. That lets the customer verify the reasoning and it's what an auditor needs. A bare 'yes, you qualify' is less useful and less defensible.
>
> On evaluation, the golden set needs multi-hop cases labelled as such, where the expected answer is the specific determination. A general-rule answer should score zero, not partial credit — otherwise the metric rewards exactly the failure."

## 8. Likely Follow-ups

**Q: Why can't single-shot RAG answer multi-hop questions?**
Because the documents needed at the second hop aren't semantically close to the original question. An account opening date record shares nothing with a question about waiver eligibility, so no query embedding of the original question retrieves it. It's structural, not a tuning problem.

**Q: What does the failure look like?**
A true, relevant, well-cited answer stating the general rule instead of the specific determination. That's what makes it dangerous — faithfulness passes, citations are correct, and every standard grounding metric says the answer is good while the customer's actual question went unanswered.

**Q: How do you detect a multi-hop question?**
Possessives tying a general rule to the user's situation are the highest-signal marker in banking — "my fee" rather than "the fee." Also comparisons, conditional phrasing like qualify or eligible, and rules referenced without their parameters.

**Q: What's the main risk in multi-hop chains?**
Error propagation. A wrong or superseded fact at the first hop makes every subsequent step correct reasoning over a bad premise, producing a confidently wrong answer with clean citations. Effective-date filtering at every hop matters more here than in single-shot retrieval.

**Q: How would you evaluate it?**
With multi-hop cases explicitly labelled in the golden set, where the expected answer is the specific determination rather than the general rule. A general-rule response should score zero — giving it partial credit rewards precisely the failure the evaluation is meant to catch.

## 9. Common Mistakes

- Accepting a general-rule answer as correct for a specific question.
- Trusting faithfulness metrics that pass on this failure.
- Not detecting possessives as a multi-hop signal.
- Omitting effective-date filtering on intermediate hops.
- Returning a bare determination without the reasoning chain.

## 10. What to Remember

- **Each hop's query depends on the previous result** — structurally beyond single retrieval.
- **The failure passes every grounding metric** — true, cited, and wrong for the question.
- **Possessives are the high-signal detector** in banking.
- **Errors propagate and amplify** — filter by effective date at every hop.
- **Show the chain**, and score general-rule answers as zero.
