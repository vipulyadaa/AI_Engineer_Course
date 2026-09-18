# AI Safety

> **Phase 26 · RESPONSIBLE AI & SECURITY · Topic 02**

## 1. Definition

Preventing an AI system from producing outputs or taking actions that cause harm. In an enterprise context this means the harms specific to the domain — not the general harm categories a model provider's filters cover.

## 2. Simple Explanation

Model safety filters catch hate speech, violence, and explicit content. Those are real and they're not your problem.

Your problem is the harms particular to banking: giving regulated financial advice, guaranteeing an outcome, stating a wrong fee confidently, or disclosing someone else's data. No provider filter catches any of those.

## 3. How It Works

```
PROVIDER SAFETY FILTERS      general harm categories
                             → necessary, insufficient

DOMAIN SAFETY CONTROLS       the harms that matter here
  · grounding verification   → no unsupported claims
  · abstention               → no answering from weak context
  · output classification    → no advice, no guarantees
  · pre-filtered retrieval   → no cross-customer disclosure
  · tool limits              → no unauthorized actions
  · human approval           → no irreversible actions alone
```

**The gap between the two lists is where the engineering is.** Everything in the second list is something you build.

## 4. Practical Example

**Banking-specific harms, ranked by consequence:**

```
1. WRONG FINANCIAL INFORMATION
   "Your fee is $25" when it's $45. The customer acts on it.
   Control: grounding verification with zero tolerance on
   numbers, plus effective-date filtering.

2. REGULATED FINANCIAL ADVICE
   "You should move to the Premier account." That's a
   regulated activity requiring qualification.
   Control: an output-side classifier, not a prompt rule.

3. GUARANTEED OUTCOMES
   "You'll definitely be approved." Creates an expectation
   the bank may not meet, and potentially a liability.
   Control: output-side check for guarantee language.

4. CROSS-CUSTOMER DISCLOSURE
   Another customer's data in an answer.
   Control: pre-filtered retrieval — the data is never in
   context to disclose.

5. UNAUTHORIZED ACTION
   A transfer or account change the customer didn't
   authorize.
   Control: tool availability, user-scoped authorization,
   human approval.
```

**The pattern across all five: the control is architectural, not a prompt instruction.** A prompt saying "never give financial advice" is a request the model can be talked out of; a classifier on the output is a check it can't.

**Safety filters can also block legitimate content:**

```
Fraud prevention procedures, anti-money-laundering controls,
debt collection policy, and sanctions screening can trigger
"dangerous content" classifiers.

So thresholds need testing against real domain content
before launch, and loosening should be narrow and per
category with documented reasoning — broadly disabling
filters removes protection that was working.
```

## 5. Why It Matters

- **Provider filters cover general harms**, not the ones specific to your domain.
- **Every domain control is architectural**, not a prompt instruction.
- **Legitimate banking content can trigger filters**, so thresholds need testing.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Provider filters as the whole story** | Domain harms uncovered |
| **Prompt rules for prohibitions** | A request the model can be talked out of |
| **No output-side classification** | Advice and guarantees reach customers |
| **Untested filter thresholds** | Legitimate compliance queries blocked |
| **Safety checks only on the agent path** | The simple path can harm too |
| **No abstention** | Answers from weak context |

**On where the checks run:** safety checks belong on every path that produces a customer-facing answer, not only inside an agent branch. A deterministic RAG pipeline still generates text and can still produce an unsupported figure or advice-like phrasing — assuming it's safe because it's simple is a common and consequential error.

**On severity-tiered responses:** not every safety signal warrants the same action. An unsupported number means abstain. Advice-like phrasing means rewrite or abstain. Cross-customer data in context means fail the request and alert, because that's a control failure upstream rather than a generation problem.

## 7. Interview Answer

> "Model provider safety filters catch hate speech, violence, and explicit content. Those are necessary and they're not the harms that matter in banking.
>
> The harms that matter here are: wrong financial information a customer acts on, regulated financial advice, guaranteed outcomes, cross-customer disclosure, and unauthorized actions. No provider filter catches any of those.
>
> And the pattern across all five is that the control is architectural rather than a prompt instruction. A prompt saying 'never give financial advice' is a request the model can be talked out of. A classifier on the output is a check it can't.
>
> Concretely: wrong information is controlled by grounding verification with zero tolerance on numbers, plus effective-date filtering at retrieval so a superseded fee schedule is never the source. Financial advice and guaranteed outcomes are controlled by an output-side classifier. Cross-customer disclosure is controlled by pre-filtered retrieval, so the data is never in the context to disclose — which is stronger than instructing the model not to mention it. And unauthorized actions are controlled by tool availability, user-scoped authorization, and human approval on anything irreversible.
>
> Two things I'd get right that are commonly missed.
>
> First, safety checks belong on every path producing a customer-facing answer, not only inside an agent branch. A deterministic RAG pipeline still generates text and can still produce an unsupported figure or advice-like phrasing. Assuming the simple path is safe because it's simple is a consequential error.
>
> Second, responses should be severity-tiered. An unsupported number means abstain. Advice-like phrasing means rewrite or abstain. But cross-customer data appearing in context means fail the request and alert — because that's a control failure upstream in retrieval filtering, not a generation problem, and treating it as something to suppress at the output hides a breach.
>
> On provider filters specifically, I'd also flag that they can block legitimate banking content — fraud prevention procedures, anti-money-laundering controls, debt collection policy, and sanctions screening can read as dangerous content to a general classifier. So thresholds need testing against real domain content before launch, and any loosening should be narrow, per category, with documented reasoning. Broadly disabling filters removes protection that was working."

## 8. Likely Follow-ups

**Q: What do provider safety filters not cover?**
The domain harms — wrong financial information, regulated advice, guaranteed outcomes, cross-customer disclosure, and unauthorized actions. Those don't map to any general harm category, so every one of them needs a control you build.

**Q: Why isn't a prompt instruction sufficient?**
Because a prompt is a request the model can be argued out of, and an injection in retrieved content can override it. An output-side classifier checks what was actually produced, which is a check rather than a request — and that difference is the whole point.

**Q: Where should safety checks run?**
On every path producing a customer-facing answer, including a simple deterministic pipeline. That path still generates text and can still produce an unsupported figure or advice-like phrasing — assuming it's safe because it's simple is a common mistake.

**Q: Should every safety signal trigger the same response?**
No. An unsupported number means abstain. Advice-like phrasing means rewrite or abstain. Cross-customer data in context means fail and alert, because that indicates a retrieval filtering failure upstream — suppressing it at the output would hide a breach rather than prevent one.

**Q: Do provider filters cause problems in banking?**
Yes — fraud prevention, anti-money-laundering, debt collection, and sanctions content can trigger dangerous-content classifiers and block legitimate queries. Thresholds need testing against real domain content before launch, with any loosening narrow, per category, and documented.

## 9. Common Mistakes

- Treating provider filters as the complete safety story.
- Implementing prohibitions as prompt instructions only.
- Running safety checks only on the agent path.
- Applying a single response to every safety signal.
- Not testing filter thresholds against real banking content.

## 10. What to Remember

- **Provider filters cover general harms**; domain harms are yours to control.
- **Five banking harms:** wrong info, advice, guarantees, disclosure, unauthorized action.
- **Controls are architectural**, never prompt instructions alone.
- **Check every path**, including the simple deterministic one.
- **Tier the response** — cross-customer data means fail and alert, not suppress.
