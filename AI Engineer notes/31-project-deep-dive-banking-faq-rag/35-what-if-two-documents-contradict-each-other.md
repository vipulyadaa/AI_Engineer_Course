# "What If Two Documents Contradict Each Other?"

> **Phase 31 · PROJECT DEEP DIVE · Topic 35**

## 1. Definition

A scenario about conflicting sources in the retrieved context. The important recognition is that contradiction is usually a *data governance* problem surfaced by the system, not a failure of the system.

## 2. Simple Explanation

Two chunks say different things about the same fee. The model receives both and has to pick — and it has no basis for picking, so it picks arbitrarily or averages them into something neither document says.

The fix isn't smarter prompting. It's giving the system the information needed to resolve the conflict, or recognizing it can't be resolved and saying so.

## 3. How It Works

```
CLASSIFY THE CONFLICT FIRST — the fixes differ entirely

VERSION       same policy, different editions
              → RESOLVABLE by effective date. Should
                never have been retrievable together.

SCOPE         both correct, different populations —
              retail vs Premier, EU vs UK
              → NOT a contradiction; a missing qualifier
                in the query or the chunk

AUTHORITY     a policy document vs a marketing page
              → RESOLVABLE by source precedence

GENUINE       two current, in-scope, equally authoritative
              documents that disagree
              → NOT resolvable by the system. This is a
                data problem, and the right behaviour is
                to surface it, not to choose.
```

**Most apparent contradictions are the first two**, and both are preventable upstream.

## 4. Practical Example

**The scope case, which is the most common and the least recognized:**

```
chunk A: "The international transfer fee is $45."
chunk B: "The international transfer fee is $25."

Not a contradiction. A is retail, B is Premier tier — and
the tier qualifier was in a section heading that chunking
discarded.

So the contradiction was MANUFACTURED by chunking, and
the fix is upstream: breadcrumb enrichment putting the
section path into the embedded text, so each chunk
carries its own scope.

This is why a contradiction incident usually ends in the
chunking code rather than the prompt.
```

**The mechanism that resolves version conflicts:**

```
Effective dates on every chunk, plus a query-time filter
for currently-effective content.

  effective_from / effective_to / version

With that, superseded editions simply aren't retrievable
and the conflict never reaches the model.

Without it, you're asking the model to work out which of
two documents is current from the text alone — which it
can only do if the text happens to say.
```

**Handling the genuine case honestly:**

```
Two current, equally authoritative documents that
disagree. The system should NOT pick.

  "Our documents give conflicting information on this.
   The retail fee schedule states $45 and the product
   guide states $40. Please confirm with an advisor."

Three reasons this is right:
  · it's true
  · silently choosing one means a customer acts on
    information that may be wrong, and there's no
    record that the system knew of a conflict
  · it flags a documentation defect to the people who
    can fix it

And it should raise an alert, because the value of the
system detecting a contradiction is mostly in the
documents getting corrected.
```

**Detecting them proactively:** contradictions can be found before a user finds them — cluster chunks by topic, and within each cluster check for conflicting numeric claims. A corpus-wide consistency scan as part of ingestion surfaces conflicts at the point they're introduced, which is far cheaper than discovering them through a customer complaint.

## 5. Why It Matters

- **Classify first** — version, scope, authority, and genuine have different fixes.
- **Most contradictions are manufactured by chunking** losing the scope qualifier.
- **On a genuine conflict, surface it** rather than choosing.

## 6. Trade-offs / Failure Modes

| Mistake | Consequence |
|---|---|
| Prompting the model to "pick the most reliable" | It has no basis; the choice is arbitrary |
| Treating every conflict as a version issue | Misses the scope case, which is more common |
| Silently choosing one | A customer acts on possibly-wrong information |
| No effective dates | Superseded policy stays retrievable |
| Averaging or merging | Produces a figure in neither document |
| No alert on detection | The documentation defect persists |

**On precedence as a partial answer:** a source-authority ranking — system of record beats handbook beats intranet page — resolves the authority case cleanly and is worth having. It doesn't resolve the genuine case, where two documents at the same authority level disagree, and applying it there just hides the conflict behind a rule.

**On why this is a governance problem:** a RAG system over a corpus with internal contradictions is surfacing something that was already true and previously invisible. That's a useful outcome, and framing it that way — the system found a documentation defect — is a better response than treating it as a model failure to be prompted away.

## 7. Interview Answer

> "I'd classify the conflict first, because four different things look like contradiction and they have entirely different fixes.
>
> Version conflict — the same policy in two editions. That's resolvable by effective date, and really those two chunks should never have been retrievable together in the first place.
>
> Scope conflict — both documents correct, different populations. One chunk says the international transfer fee is forty-five dollars, another says twenty-five. That's not a contradiction: one is retail and one is Premier tier, and the tier qualifier was in a section heading that chunking discarded. So the contradiction was manufactured by the chunking strategy, and the fix is upstream — breadcrumb enrichment putting the section path into the embedded text so each chunk carries its own scope. That's why a contradiction incident usually ends in the chunking code rather than the prompt.
>
> Authority conflict — a policy document versus a marketing page. Resolvable with a source precedence ranking: system of record beats handbook beats intranet page.
>
> And genuine conflict — two current, in-scope, equally authoritative documents that disagree. That one is not resolvable by the system, and I think the right behaviour is to surface it rather than to choose.
>
> So the answer becomes something like: our documents give conflicting information on this, the retail fee schedule states forty-five and the product guide states forty, please confirm with an advisor. Three reasons that's right — it's true, silently choosing one means a customer may act on wrong information with no record that the system knew of the conflict, and it flags a documentation defect to the people who can actually fix it. It should also raise an alert, because most of the value of detecting a contradiction is in the documents getting corrected.
>
> What I wouldn't do is instruct the model to pick the most reliable source. It has no basis for that judgement, so the choice is effectively arbitrary — and the worse version is when it merges the two into a figure that appears in neither document.
>
> The mechanism that prevents most of this is effective dates on every chunk plus a query-time filter for currently-effective content, so superseded editions aren't retrievable and the version conflict never reaches the model at all.
>
> And I'd detect these proactively rather than waiting for a user. Cluster chunks by topic and check within each cluster for conflicting numeric claims — a corpus-wide consistency scan at ingestion surfaces conflicts when they're introduced, which is much cheaper than finding out through a complaint.
>
> The framing I'd end on: a RAG system over a corpus with internal contradictions is surfacing something that was already true and previously invisible. That's a governance finding, not a model failure."

## 8. Likely Follow-ups

**Q: Which type is most common?**
Scope — two correct statements about different populations, where the qualifier was lost in chunking. It looks like a contradiction and it's actually a chunking defect, which is why breadcrumb enrichment fixes more contradictions than any prompt change.

**Q: Should the model pick one?**
Not on a genuine conflict. It has no basis for the judgement, so the choice is arbitrary and the customer may act on wrong information with no record that a conflict existed. Surfacing it is both honest and useful.

**Q: How do you prevent version conflicts?**
Effective dates on every chunk and a query-time filter for currently-effective content. Superseded editions stop being retrievable, so the conflict never reaches the model.

**Q: Can you find them before users do?**
Yes — cluster chunks by topic and check for conflicting numeric claims within each cluster. Running that at ingestion catches conflicts when they're introduced rather than through a complaint.

**Q: What about source precedence?**
It cleanly resolves the authority case — system of record over handbook over intranet page — and it's worth having. It doesn't resolve two equally authoritative documents disagreeing; applying it there hides the conflict behind a rule.

## 9. Common Mistakes

- Treating all conflicts as the same problem.
- Instructing the model to choose the more reliable source.
- Missing that most conflicts are chunking-induced scope loss.
- Silently resolving a genuine conflict.
- No alert, so the documentation defect persists.

## 10. What to Remember

- **Four types** — version, scope, authority, genuine — with different fixes.
- **Scope conflicts are chunking defects** — breadcrumbs fix them.
- **Effective dates prevent version conflicts** reaching the model.
- **Surface a genuine conflict**; don't choose.
- **It's a governance finding**, and the alert is the point.
