# "How Would You Redesign It for Enterprise Scale?"

> **Phase 31 · PROJECT DEEP DIVE · Topic 40**

## 1. Definition

The capstone question. It tests whether you know that enterprise scale is mostly an organizational and governance problem, and that the interesting parts are the ones that don't appear on an architecture diagram.

## 2. Simple Explanation

A pilot serves one team from one document set. An enterprise system serves many business units, with different corpora, different permissions, different regulators, and different people who can change the documents.

The technical components barely change. What changes is everything around them.

## 3. How It Works

```
WHAT ACTUALLY CHANGES

CORPUS OWNERSHIP     many teams own documents, with
                     different quality and update cadence
PERMISSIONS          real entitlement complexity, enforced
                     in the index
GOVERNANCE           approval before a document becomes
                     answerable; an audit trail for every
                     answer
CHANGE CONTROL       prompt, model, and config changes
                     become releases with evaluation gates
FAILURE ISOLATION    one team's bad ingestion must not
                     degrade another's answers
COST ATTRIBUTION     spend allocated to business units,
                     or nobody controls it

WHAT DOESN'T CHANGE
  the retrieval pipeline. Chunk, embed, retrieve, rerank,
  generate, verify — it's the same at 10 documents and
  10 million.
```

**That last point is the one worth making explicitly**, because it reframes the whole answer: the scaling problem isn't the pipeline.

## 4. Practical Example

**The architecture shift that carries the most weight:**

```
FROM  one corpus, one pipeline, one endpoint

TO    a PLATFORM with per-domain knowledge bases

  each domain owns its corpus, its ingestion config,
  its evaluation set, and its quality metrics

  a shared retrieval and generation service

  a ROUTER classifying the query to a domain

Two reasons this is the right shape:

1. FAILURE ISOLATION — a bad ingestion in the mortgages
   corpus doesn't degrade card queries

2. OWNERSHIP — the mortgage team owns mortgage answer
   quality, which is the only arrangement where content
   gaps actually get fixed. Centralized content
   ownership doesn't scale past a few domains, because
   the central team can't judge whether an answer is
   right.

The router becomes a critical component: misrouting sends
a query to a corpus that can't answer it, which looks
exactly like a content gap.
```

**Governance, which is where most of the new work is:**

```
DOCUMENT APPROVAL   a document isn't answerable until
                    approved. A staging index where new
                    content is evaluated before it's
                    promoted.

ANSWER AUDIT        every answer reconstructible —
                    which chunks, which document
                    versions, which model, which prompt
                    version. This is why you version
                    prompts and pin models: not for
                    engineering tidiness, for the
                    question "why did the system tell
                    this customer that?"

CHANGE CONTROL      prompt and model changes go through
                    evaluation gates like code, because
                    a prompt change is a behaviour change
                    to a customer-facing system

MODEL RISK          regulated institutions have model
                    risk management obligations. An LLM
                    answering customer questions falls
                    under them — documented validation,
                    periodic review, defined ownership.

That last one is the item most engineers have never
heard of, and naming it signals you've thought about
banking specifically rather than scale generically.
```

**Human oversight as a designed component:**

```
Not a fallback — a designed part of the system:

  · confidence-based escalation to an advisor
  · a review queue for low-confidence and
    high-consequence answers
  · a feedback loop where advisor corrections become
    golden-set entries
  · clear disclosure that it's an automated system

At enterprise scale, the humans are part of the
architecture, and the interesting design question is what
routes to them and how their corrections flow back.
```

**What I'd resist:** the instinct to make it agentic. Adding tools and multi-step planning multiplies the failure surface and the injection blast radius. For a Q&A system over policy documents, a well-built retrieval pipeline with abstention and verification is more reliable than an agent, and reliability compounds multiplicatively — ten steps at 95% each is 60% end to end.

## 5. Why It Matters

- **The pipeline doesn't change** — governance and ownership do.
- **Per-domain knowledge bases** give failure isolation and real ownership.
- **Model risk management** is a genuine obligation in a regulated institution.

## 6. Trade-offs / Failure Modes

| Mistake | Consequence |
|---|---|
| Answering with infrastructure only | Misses where enterprise difficulty lives |
| One corpus for all business units | No isolation, no ownership, no gap-closing |
| Centralized content ownership | Doesn't scale; gaps never get fixed |
| No answer audit trail | Can't answer the question a regulator asks |
| Prompt changes outside change control | Behaviour changes ship unreviewed |
| Making it agentic for its own sake | Multiplied failure surface, worse reliability |

**On the organizational reality:** the hardest part of an enterprise rollout is usually getting document owners to maintain their content. A RAG system makes documentation quality visible for the first time, and that surfaces years of accumulated inconsistency. Planning for that — a content quality dashboard per domain, gaps surfaced to owners — is what makes the difference between a system that improves and one that plateaus.

**On sequencing:** this is a multi-year shape, not a redesign to do at once. Domain separation and governance first because they're structural and hard to retrofit; routing, cost attribution, and human-in-the-loop refinement after. Saying which parts come first is a better answer than describing the end state.

## 7. Interview Answer

> "I'd start by saying what doesn't change, because it reframes the question. The retrieval pipeline is the same at ten documents and ten million — chunk, embed, retrieve, rerank, generate, verify. Enterprise scale isn't a pipeline problem.
>
> What changes is everything around it: corpus ownership, permissions, governance, change control, failure isolation, and cost attribution.
>
> The main architectural shift is from one corpus and one pipeline to a platform with per-domain knowledge bases. Each domain — cards, mortgages, business banking — owns its corpus, its ingestion configuration, its evaluation set, and its quality metrics, sitting on a shared retrieval and generation service, with a router classifying queries to a domain.
>
> Two reasons that's the right shape. Failure isolation — a bad ingestion in the mortgages corpus doesn't degrade card queries. And ownership: the mortgage team owns mortgage answer quality, which is the only arrangement where content gaps actually get fixed. Centralized content ownership doesn't scale past a few domains because the central team can't judge whether an answer is correct.
>
> That makes the router a critical component, because a misroute sends a query to a corpus that can't answer it — and that looks exactly like a content gap.
>
> Then governance, which is where most of the new work is. Document approval, so a document isn't answerable until it's been reviewed — a staging index where new content is evaluated before promotion. An answer audit trail, so any past answer is reconstructible: which chunks, which document versions, which model, which prompt version. That's why you version prompts and pin models — not for engineering tidiness, but for the question 'why did the system tell this customer that?'
>
> Change control, so prompt and model changes go through evaluation gates like code, because a prompt change is a behaviour change to a customer-facing system.
>
> And model risk management, which is the one most engineers haven't encountered. Regulated institutions have obligations around models used in customer-facing decisions — documented validation, periodic review, defined ownership. An LLM answering customer policy questions falls under that, and it's a real constraint on how fast anything ships.
>
> I'd also design the humans in rather than treating them as a fallback: confidence-based escalation to an advisor, a review queue for low-confidence and high-consequence answers, and a feedback loop where advisor corrections become golden-set entries. At this scale the humans are part of the architecture.
>
> What I'd resist is making it agentic. Adding tools and multi-step planning multiplies the failure surface and the injection blast radius, and reliability compounds multiplicatively — ten steps at ninety-five percent each is about sixty percent end to end. For Q&A over policy documents, a well-built retrieval pipeline with abstention and verification is more reliable than an agent.
>
> The honest organizational point: the hardest part is usually getting document owners to maintain their content. A RAG system makes documentation quality visible for the first time and surfaces years of accumulated inconsistency. A content quality dashboard per domain, with gaps surfaced to owners, is what separates a system that improves from one that plateaus.
>
> And on sequencing — this is a multi-year shape, not one redesign. Domain separation and governance first, because they're structural and hard to retrofit. Routing, cost attribution, and human-in-the-loop refinement after."

## 8. Likely Follow-ups

**Q: What doesn't change at enterprise scale?**
The retrieval pipeline. Chunk, embed, retrieve, rerank, generate, verify is the same at any size. The difficulty moves to governance, ownership, and isolation — which is why an infrastructure-only answer misses the question.

**Q: Why per-domain knowledge bases?**
Failure isolation and ownership. A bad mortgage ingestion shouldn't degrade card answers, and the mortgage team is the only group that can judge whether a mortgage answer is right — centralized content ownership doesn't scale.

**Q: What's model risk management?**
A regulatory obligation around models used in customer-facing contexts — documented validation, periodic review, defined ownership. An LLM answering policy questions falls under it, and it constrains release velocity in a way most engineers don't anticipate.

**Q: Would you make it agentic?**
No, not for this. Tools and planning multiply the failure surface and the injection blast radius, and reliability compounds multiplicatively. A retrieval pipeline with abstention and verification is more reliable for Q&A over policy documents.

**Q: What's the hardest part in practice?**
Getting document owners to maintain content. The system makes documentation quality visible for the first time and surfaces years of inconsistency — a per-domain content quality dashboard is what turns that into improvement rather than a plateau.

## 9. Common Mistakes

- Answering purely in infrastructure terms.
- One shared corpus across all business units.
- No audit trail or prompt versioning.
- Treating prompt changes as outside change control.
- Adding agentic complexity without a reason.

## 10. What to Remember

- **The pipeline doesn't change** — governance and ownership do.
- **Per-domain knowledge bases**: isolation plus real ownership.
- **Audit trail is why you version prompts and pin models.**
- **Model risk management** is a real regulated obligation.
- **Resist agentic complexity** — reliability compounds multiplicatively.
