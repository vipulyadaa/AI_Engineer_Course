# Model Abuse

> **Phase 26 · RESPONSIBLE AI & SECURITY · Topic 12**

## 1. Definition

Using a system for purposes its operator didn't intend — free general-purpose LLM access, cost exhaustion, scraping the corpus, or probing for information — distinct from attacks that try to make it misbehave.

## 2. Simple Explanation

A banking assistant that answers any question is a free general-purpose LLM that someone else pays for.

That's the most common abuse, and it's a cost and reputation problem rather than a security breach — which means it needs different controls from injection or jailbreaks.

## 3. How It Works

```
ABUSE TYPES

OFF-PURPOSE USE     using it as a general chatbot
COST EXHAUSTION     deliberately expensive queries at volume
CORPUS SCRAPING     systematic extraction of internal
                    documentation
INFORMATION PROBING learning internal structure, product
                    details, or policy not meant to be public
AUTOMATED VOLUME    scripted traffic overwhelming capacity
```

**These aren't trying to break anything.** They're using the system as designed, at a scale or for a purpose nobody intended.

## 4. Practical Example

**Scope enforcement, which handles most of it:**

```
The single most effective control is answering only
in-scope questions.

  classify the query → is this about our products,
                       policies, or the customer's account?
  if not → decline politely and offer the in-scope topics

That's a classifier, not a prompt instruction, because a
prompt saying "only answer banking questions" is negotiable
and a classifier isn't.

It simultaneously handles off-purpose use, most cost
exhaustion, and a lot of probing — one control, several
abuse types.
```

**Corpus scraping, which is the interesting one:**

```
An attacker asking hundreds of systematic questions can
reconstruct a substantial portion of internal documentation.

Each individual question is legitimate. The pattern is not.

Detection is behavioural rather than per-request:
  · queries per session far above normal
  · systematic coverage — walking a topic space rather
    than asking about a problem
  · low follow-up rate — no conversation, just extraction
  · unusual breadth from one identity

Response: rate limiting per user, and alerting on the
pattern. You can't detect it in any single request, which
is what makes it distinct from the other abuse types.
```

**Cost controls that actually bound it:**

```
· per-user daily token budget — not just per request
· per-session step and token caps
· rate limits per identity, not per IP
· quota as a hard ceiling, since budget alerts arrive
  after the spend

The per-user daily budget is the one most often missing.
Per-request limits bound a single request and nothing stops
ten thousand of them.
```

## 5. Why It Matters

- **Scope enforcement handles most abuse types** with one control.
- **Scraping is only detectable behaviourally**, not per request.
- **Per-user daily budgets** are what bound cost; per-request limits don't.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Prompt-based scope restriction** | Negotiable |
| **Per-request limits only** | Ten thousand requests are all within limits |
| **Rate limiting by IP** | Trivially evaded; also blocks shared networks |
| **No behavioural detection** | Scraping looks like legitimate use |
| **Over-restrictive scope** | Blocks legitimate adjacent questions |
| **Budget alerts without quotas** | Notification after the money is spent |

**On over-restriction:** a scope classifier that's too tight declines legitimate questions — a customer asking about a related product, or phrasing a banking question unusually. The cost of false positives on a customer-facing assistant is real, so the classifier should be tuned with a bias toward answering, and declines should offer an alternative rather than just refusing.

**On what scraping actually costs:** if the corpus is internal product documentation, systematic extraction is a competitive intelligence problem rather than a customer data breach. Being precise about which it is matters — the response to a competitor mapping your product terms differs from the response to customer data exposure, and conflating them produces the wrong severity.

## 7. Interview Answer

> "Model abuse is using the system for purposes the operator didn't intend, rather than trying to make it misbehave. The most common form is off-purpose use — a banking assistant that answers any question is a free general-purpose LLM that someone else pays for. That's a cost and reputation problem, so it needs different controls from injection or jailbreaks.
>
> The single most effective control is scope enforcement: classify whether the query is about our products, policies, or the customer's account, and decline politely otherwise, offering the in-scope topics. That has to be a classifier rather than a prompt instruction, because a prompt saying 'only answer banking questions' is negotiable and a classifier isn't. And it handles off-purpose use, most cost exhaustion, and a lot of information probing at once — one control, several abuse types.
>
> The interesting one is corpus scraping. Someone asking hundreds of systematic questions can reconstruct a substantial portion of internal documentation, and each individual question is legitimate. The pattern isn't. So detection has to be behavioural rather than per-request: queries per session far above normal, systematic coverage that walks a topic space rather than asking about a problem, a low follow-up rate indicating extraction rather than conversation, and unusual breadth from one identity. You cannot detect it in any single request, which is what distinguishes it from the other abuse types.
>
> For cost, the control most often missing is a per-user daily token budget. Per-request limits bound one request and nothing stops ten thousand of them. I'd also rate limit per authenticated identity rather than per IP — IP-based limiting is trivially evaded and it blocks shared corporate networks, so it fails in both directions. And quotas rather than just budget alerts, because an alert arrives after the money is spent.
>
> Two things I'd get right. Over-restriction: a scope classifier that's too tight declines legitimate questions — a customer asking about a related product, or phrasing something unusually. False positives on a customer-facing assistant are a real cost, so I'd tune with a bias toward answering and make declines offer an alternative rather than just refusing.
>
> And I'd be precise about what scraping costs. If the corpus is internal product documentation, systematic extraction is a competitive intelligence problem, not a customer data breach. The response to a competitor mapping your product terms is different from the response to customer data exposure, and conflating them produces the wrong severity and the wrong escalation."

## 8. Likely Follow-ups

**Q: What's the most common abuse?**
Off-purpose use — treating a scoped assistant as a general-purpose LLM. It's a cost and reputation problem rather than a breach, which is why it needs scope enforcement rather than the controls you'd use against injection.

**Q: How do you enforce scope?**
With a classifier, not a prompt instruction. A prompt saying "only answer banking questions" is negotiable; a classifier on the query isn't. And it covers off-purpose use, cost exhaustion, and much of the probing simultaneously.

**Q: How do you detect corpus scraping?**
Behaviourally. Queries per session far above normal, systematic topic coverage rather than problem-driven questions, low follow-up rate, unusual breadth from one identity. No individual request looks wrong, which is exactly why per-request controls miss it.

**Q: What bounds cost?**
A per-user daily token budget, plus per-session caps, rate limits per authenticated identity, and quotas as a hard ceiling. Per-request limits bound a single request while ten thousand requests are each individually within limits, so they don't bound the total.

**Q: Is scraping a breach?**
Usually not, if the corpus is internal product documentation — it's a competitive intelligence problem. Being precise matters, because the response to a competitor mapping your product terms is different from the response to customer data exposure, and conflating them gets the severity wrong.

## 9. Common Mistakes

- Enforcing scope through a prompt instruction.
- Per-request limits with no per-user daily budget.
- Rate limiting by IP rather than authenticated identity.
- No behavioural detection, so scraping looks legitimate.
- Treating scraping and customer data exposure as the same severity.

## 10. What to Remember

- **Scope enforcement via a classifier** handles most abuse types at once.
- **Scraping is only detectable behaviourally** — no single request looks wrong.
- **Per-user daily budgets** bound cost; per-request limits don't.
- **Rate limit per identity**, not per IP.
- **Be precise about severity** — scraping documentation isn't a data breach.
