# Limitations

> **Phase 15 · LANGCHAIN · Topic 16**

## 1. Definition

Where LangChain's abstractions cost more than they save — hidden behaviour, debugging depth, API churn, and the mismatch between framework defaults and production requirements.

## 2. Simple Explanation

LangChain optimizes for getting something working quickly. Production optimizes for knowing exactly what happens and being able to change any part of it.

Those goals diverge, and where they diverge is the limitation.

## 3. How It Works

**The five that actually cost time:**

```
1. HIDDEN BEHAVIOUR
   The exact prompt, the document formatting, what happens on
   empty retrieval — all decided by the framework, all
   invisible without instrumentation.

2. DEBUGGING DEPTH
   Stack traces run through framework internals. Locating
   your own bug means reading someone else's code.

3. API CHURN
   LCEL replaced chain classes; agent APIs changed;
   packages split into core/community/partner. Published
   examples go stale in months.

4. DEFAULTS TUNED FOR DEMOS
   k=4, character-based chunk sizes, no relevance threshold,
   no abstention. Reasonable for a demo, wrong for banking.

5. DEPENDENCY WEIGHT
   A large transitive tree to review, patch, and justify in
   a security assessment.
```

## 4. Practical Example

**The concrete failure this produces:**

```
A team ships RAG on defaults. It works in the demo.

In production:
  · k=4 with no threshold means four chunks are always
    returned, relevant or not
  · no abstention path, so the model answers from weak
    context
  · the answer is confident, plausible, and wrong
  · nobody can say which prompt produced it, because the
    prompt lives inside the framework

Every one of those is a framework default, and none of
them errored.
```

**The position I'd actually take:**

```
USE           document loaders, text splitters
              provider adapters where the API is tedious
              LCEL for the generation step — streaming and
              retry are genuinely valuable

WRITE         retrieval with explicit filters and thresholds
              prompt assembly and document formatting
              the abstention decision
              the agent loop with budgets and authorization
              anything that appears in an audit

The split is: use it where the work is tedious and the
behaviour doesn't need to be inspectable. Write it where
a regulator might ask what happened.
```

**On the counter-argument:** writing it yourself means maintaining it, and a small team may genuinely be better off with a framework they don't fully control than with bespoke code they don't have time to maintain. That's a legitimate trade, and the answer depends on team size and regulatory exposure rather than on the framework being good or bad.

## 5. Why It Matters

- **Framework defaults are demo defaults**, and they fail silently in production.
- **Hidden behaviour conflicts with auditability**, which is non-negotiable in banking.
- **The maintenance counter-argument is real** — the answer is contextual.

## 6. Trade-offs / Failure Modes

| Limitation | Practical cost |
|---|---|
| **Hidden prompts** | Can't review what the model received |
| **Debugging depth** | Bugs take longer to locate |
| **API churn** | Upgrades break; examples go stale |
| **Demo defaults** | Silent quality failures in production |
| **Dependency weight** | Security review and patching burden |
| **Abstraction leaks** | Provider and store differences surface anyway |

**On version pinning:** minor releases have changed behaviour, so exact pinning with deliberate, tested upgrades is necessary rather than cautious. An unpinned LangChain dependency in a banking system is a change-control gap as much as a stability risk.

**On the fair assessment:** LangChain solved a real problem at a time when every LLM application was reimplementing the same plumbing. The integrations and ingestion utilities remain genuinely valuable. The criticism is about using its orchestration in contexts that require control — not about the project being poorly built.

## 7. Interview Answer

> "LangChain optimizes for getting something working quickly; production optimizes for knowing exactly what happens and being able to change any part of it. Where those goals diverge is where the limitations are.
>
> Five that cost real time. Hidden behaviour — the exact prompt, the document formatting, what happens on empty retrieval, all decided by the framework and invisible without instrumentation. Debugging depth — stack traces run through framework internals, so finding my own bug means reading someone else's code. API churn — LCEL replaced the chain classes, agent APIs changed, packages split, so published examples go stale in months. Defaults tuned for demos. And dependency weight, which in a bank means a security review burden.
>
> The concrete failure is a team shipping RAG on defaults. It works in the demo. In production, k equals four with no relevance threshold means four chunks are always returned whether or not they're relevant, there's no abstention path, so the model answers from weak context — confidently, plausibly, and wrong. And nobody can say which prompt produced it because the prompt lives inside the framework. Every one of those is a default, and none of them errored.
>
> So my position is a split. Use it for document loaders and text splitters, provider adapters, and LCEL for the generation step where streaming and retry are genuinely valuable. Write the retrieval with explicit filters and thresholds, the prompt assembly and document formatting, the abstention decision, and the agent loop with budgets and authorization. The rule is: use it where the work is tedious and the behaviour doesn't need to be inspectable, write it where a regulator might ask what happened.
>
> I'd give the counter-argument fairly though. Writing it yourself means maintaining it, and a small team may genuinely be better off with a framework they don't fully control than with bespoke code they don't have time to maintain. The right answer depends on team size and regulatory exposure, not on the framework being good or bad.
>
> And I'd be fair about the project too — it solved a real problem when every LLM application was reimplementing the same plumbing, and the integrations and ingestion utilities are genuinely valuable. The criticism is about where its orchestration is used, not about quality.
>
> One concrete practice: pin exact versions. Minor releases have changed behaviour, and in a bank an unpinned dependency is a change-control gap as much as a stability risk."

## 8. Likely Follow-ups

**Q: What's the most consequential limitation?**
Hidden behaviour. Not knowing the exact prompt sent, how documents were formatted, or what happens when retrieval returns nothing — those are the decisions that determine answer quality and the ones a regulator asks about, and they're invisible without instrumentation.

**Q: What goes wrong with the defaults?**
They're tuned for demos. k equals four with no relevance threshold and no abstention path means the model always receives chunks and always answers, even when nothing relevant was found. The result is confident wrong answers with nothing erroring to signal it.

**Q: Where would you still use it?**
Document loaders and text splitters, provider adapters, and LCEL for the generation step where streaming and retry genuinely help. Those are tedious to write, well tested, and don't need their internals inspected for an audit.

**Q: Is there a case for keeping the orchestration?**
Yes, and it's fair. Writing it yourself means maintaining it, and a small team may be better off with a framework they don't fully control than bespoke code they lack time to maintain. The answer depends on team size and regulatory exposure rather than on the framework's merits.

**Q: What practical precaution would you take?**
Pin exact versions and upgrade deliberately with tests. Minor releases have changed behaviour, and in a regulated environment an unpinned dependency is a change-control gap as well as a stability risk.

## 9. Common Mistakes

- Shipping framework defaults to production.
- Not knowing what prompt the framework actually sent.
- Leaving dependencies unpinned.
- Dismissing the framework entirely rather than splitting by use.
- Ignoring the maintenance cost of writing everything yourself.

## 10. What to Remember

- **Framework defaults are demo defaults** and fail silently in production.
- **Hidden prompts conflict with auditability.**
- **Use it for ingestion and adapters; write the query path.**
- **The maintenance counter-argument is legitimate** — it's contextual.
- **Pin exact versions** — behaviour has changed in minor releases.
