# Interview Questions: Vertex AI Search

> **Phase 34 · GOOGLE-SPECIFIC INTERVIEW QUESTIONS · Topic 05**

## 1. Definition

Google's fully managed search and RAG offering — documents in, retrieval and often generation out. Interview questions about it test whether you can articulate what managed retrieval costs you in control.

## 2. Simple Explanation

Point it at documents and get working retrieval in days. That's genuinely valuable.

The question is what you give up, and whether those things matter for your use case. In banking, some of them do.

## 3. How It Works

```
WHAT IT HANDLES
  parsing, chunking, embedding, indexing, retrieval, and
  often generation — end to end

WHAT YOU GIVE UP
  chunking strategy          ← the biggest quality lever
  relevance thresholds       ← enables abstention
  hybrid search tuning       ← exact identifiers
  reranking choice
  embedding model and pinning
  failure diagnosability
```

**The threshold is the one that's blocking rather than limiting.** Without a visible relevance score and a settable floor, you cannot abstain — and abstention isn't a preference in banking.

## 4. Practical Example

**The four-control test, which turns preference into requirement:**

```
Does the managed option give me:

1. CHUNKING CONTROL — a fee schedule that's a table needs
   different treatment from prose policy
2. RELEVANCE THRESHOLD — without it, abstention is
   unimplementable
3. PRE-FILTERING in the engine — post-filtering leaks and
   silently under-retrieves
4. HYBRID RETRIEVAL — clause references and product codes
   carry almost no semantic signal

If yes to all four, I'd use it — I have no interest in
building a pipeline for its own sake.

Where it doesn't, the gap is in exactly the properties
that make the system defensible, which is why it matters
more than the convenience.
```

**That checklist is the answer**, because it converts "managed versus custom" from a preference into a requirements test an interviewer can follow.

**The sequencing recommendation:**

```
Start with the managed option to prove the use case, and
build the golden set while doing it — which is needed
either way.

Then measure. If it meets the recall and abstention bar,
keep it. If not, the golden set shows exactly which query
types fail, which justifies the custom build with evidence
rather than as an architectural preference.

Nothing is wasted, and the decision becomes measured.
```

**On diagnosability:** with a custom pipeline a bad answer traces to parsing, chunking, embedding, retrieval, or generation. With a managed black box you know retrieval returned the wrong thing and not why — which turns improvement into guesswork and makes an incident review hard to conclude.

## 5. Why It Matters

- **The four-control test** turns the managed-versus-custom question into a requirements check.
- **No threshold means no abstention** — blocking rather than limiting.
- **Start managed, measure, then decide** makes the build evidence-based.

## 6. Trade-offs / Failure Modes

| Weak answer | Why |
|---|---|
| "Managed is easier so we'd use it" | No consideration of the controls |
| "We'd always build custom" | Preference, not requirement |
| No mention of abstention | The blocking limitation |
| Ignoring the diagnosability cost | Incident reviews become guesswork |
| Underestimating custom maintenance | A real ongoing commitment |
| Not keeping source documents yourself | Migration becomes reconstruction |

**On the migration cost:** moving from managed to custom means re-ingesting the corpus. Keeping source documents and metadata in your own GCS bucket from the start makes that a re-index rather than a reconstruction — a day-one decision that's hard to retrofit and cheap to make.

**On not over-building:** the custom pipeline is a genuine ongoing commitment — chunking to maintain, embedding versions to manage, thresholds to recalibrate, hybrid weighting to tune. For a team without capacity to own that, a managed option that mostly works beats a custom one that's poorly maintained. Saying that demonstrates judgment rather than enthusiasm for building.

## 7. Interview Answer

> "Vertex AI Search is fully managed — point it at documents and get parsing, chunking, embedding, indexing, retrieval, and often generation. Days to working, which is genuinely valuable.
>
> The question is what you give up, and I'd answer it as a four-control test rather than a preference.
>
> One: chunking strategy, which is the biggest quality lever — a fee schedule that *is* a table needs completely different treatment from prose policy, and a generic chunker handles neither well. Two: relevance thresholds. Three: pre-filtering applied in the engine, because post-filtering both leaks and silently under-retrieves. Four: hybrid retrieval, because clause references and product codes carry almost no semantic signal and dense retrieval misses them.
>
> If the managed option gives me all four, I'd use it — I have no interest in building a pipeline for its own sake. Where it doesn't, the gap is in exactly the properties that make the system defensible.
>
> The threshold is the one I'd call blocking rather than limiting. Without a visible relevance score and a settable floor, I cannot decide to abstain — the system always answers, including from weak context. And abstention isn't a preference in banking; an unsupported answer about a fee is worse than no answer. So that's a requirement rather than a tuning wish.
>
> The other cost is diagnosability. With a custom pipeline a bad answer traces to parsing, chunking, embedding, retrieval, or generation. With a managed black box I know retrieval returned the wrong thing and not why — which turns improvement into guesswork and makes an incident review difficult to conclude.
>
> What I'd actually recommend is sequencing. Start with the managed option to prove the use case, and build the golden set while doing it, since it's needed either way. Then measure. If it meets the recall and abstention bar, keep it. If not, the golden set shows exactly which query types fail, which justifies the custom build with evidence rather than as an architectural preference. Nothing is wasted.
>
> Two things I'd add. Keep source documents and metadata in your own GCS bucket from the start, so a migration is a re-index rather than a reconstruction. That's a day-one decision that's cheap to make and hard to retrofit.
>
> And I'd be honest that a custom pipeline is a real ongoing commitment — chunking to maintain, embedding versions to manage, thresholds to recalibrate, hybrid weighting to tune. For a team without capacity to own that, a managed option that mostly works beats a custom one that's poorly maintained."

## 8. Likely Follow-ups

**Q: How do you decide managed versus custom?**
A four-control test: chunking strategy, relevance thresholds, pre-filtering in the engine, and hybrid retrieval. If the managed option provides all four, use it. Where it doesn't, the gap is in the properties that make the system defensible.

**Q: Which limitation is blocking?**
The relevance threshold. Without a visible score and a settable floor, abstention is unimplementable — the system always answers, including from weak context. In banking that's a requirement rather than a preference, so it rules the option out rather than constraining it.

**Q: What else do you lose?**
Diagnosability. A custom pipeline lets you trace a bad answer to parsing, chunking, embedding, retrieval, or generation. A managed black box tells you retrieval was wrong and not why, which turns improvement into guesswork and complicates incident reviews.

**Q: What would you actually recommend?**
Start managed to prove the use case while building the golden set, then measure. If it meets the bar, keep it; if not, the golden set shows which query types fail and justifies the custom build with evidence. Nothing is wasted either way.

**Q: What's the argument against building custom?**
Ongoing maintenance — chunking, embedding versions, threshold recalibration, hybrid weighting. For a team without capacity to own that, a managed option that mostly works beats a poorly maintained custom one. That's judgment rather than enthusiasm for building.

## 9. Common Mistakes

- Choosing by preference rather than a requirements test.
- Not identifying abstention as the blocking limitation.
- Ignoring the diagnosability cost.
- Not keeping source documents in your own storage.
- Underestimating the maintenance burden of a custom pipeline.

## 10. What to Remember

- **Four controls:** chunking, thresholds, pre-filtering, hybrid.
- **No threshold means no abstention** — blocking in banking.
- **Diagnosability is the second cost** — black-box failures can't be localized.
- **Start managed, measure, then decide** — evidence over preference.
- **Keep source documents yourself** so migration is a re-index.
