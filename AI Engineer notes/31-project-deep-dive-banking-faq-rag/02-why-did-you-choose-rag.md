# "Why Did You Choose RAG?"

> **Phase 31 · PROJECT DEEP DIVE · Topic 02**
>
> ⚠️ **An answer framework.** The reasoning transfers; the specifics are yours.

## 1. Definition

A question testing whether you chose RAG for a reason or because it's the default pattern. The strong answer names the alternatives and says why each was wrong for this problem.

## 2. Simple Explanation

RAG is the obvious answer, which is exactly why the question is asked.

What distinguishes a considered choice is being able to say what you'd have done otherwise — and why fine-tuning, a longer prompt, and plain search were each inadequate.

## 3. How It Works

```
THE ALTERNATIVES, AND WHY EACH FAILS

FINE-TUNING          the problem was KNOWLEDGE, not behaviour
                     → tuned facts can't be updated without
                       re-tuning, and can't be cited

EVERYTHING IN PROMPT the corpus exceeds any context window,
                     and cost scales with every request
                     → and no access control

PLAIN KEYWORD SEARCH returns documents, not answers; misses
                     paraphrases
                     → though sometimes it's the better
                       product

NO AI AT ALL         a better FAQ page, better search
                     → worth having considered
```

**Naming the citation argument is what makes the fine-tuning answer strong**, because it's a structural reason rather than a quality one.

## 4. Practical Example

**The decisive argument in banking:**

```
A fact learned through fine-tuning has no source. The model
states the fee and there's nothing to point at.

A fact retrieved from the fee schedule cites the fee
schedule, with a version and a section.

In a regulated environment where an answer must be
traceable to an approved document, tuning facts is
structurally wrong regardless of how well it performs.

That argument doesn't depend on measuring anything, which
is why it's the one to lead with.
```

**The honest boundary — when RAG wasn't the answer:**

```
If the question had been "make the model write in our tone"
or "classify tickets into our forty internal categories",
that's behaviour, and tuning or prompting would fit.

RAG supplies knowledge; tuning teaches behaviour.
Confusing those is the expensive mistake, and being able
to state the distinction shows the choice was reasoned
rather than default.
```

**The search alternative, taken seriously:**

```
If users needed to READ the source — a compliance officer
finding the applicable policy — search returning ranked
documents is the better product. They don't want a
paraphrase.

RAG is right when users need an answer. Naming that
distinction shows you considered the product question,
not just the technical one.
```

## 5. Why It Matters

- **Naming the alternatives** is what distinguishes a choice from a default.
- **The citation argument against tuning** is structural, not a quality claim.
- **Considering plain search** shows the product question was asked.

## 6. Trade-offs / Failure Modes

| Weak answer | Why |
|---|---|
| "RAG is the standard approach" | A default, not a decision |
| "Fine-tuning is expensive" | True and not the real reason |
| No alternatives mentioned | Suggests none were considered |
| Not distinguishing knowledge from behaviour | The core confusion |
| Ignoring the search option | Misses the product question |

**On the updatability argument:** a fee changes and the corpus is re-indexed — the system reflects it immediately. A tuned model would need re-tuning, data curation, re-validation, and a redeploy. For a domain where content changes regularly, that difference is decisive on its own, separate from the citation argument.

**On being honest about the decision process:** if RAG was chosen because it was the obvious pattern and the reasoning became clear afterwards, that's a normal and defensible answer. "It was the default and here's why it turned out to be right" is more credible than implying a formal evaluation of four options that didn't happen.

## 7. Interview Answer

> "The problem was that the model didn't know our documentation — our fee schedules, product terms, and policies. That's a knowledge problem, and it's worth being precise about, because it rules out the main alternative immediately.
>
> Fine-tuning teaches behaviour; retrieval supplies knowledge. If I'd tuned the model on our fee schedule, the facts would be absorbed imperfectly, they couldn't be updated without re-tuning, and — decisively — they couldn't be cited. A fact learned through tuning has no source: the model states the fee and there's nothing to point at. A fact retrieved from the fee schedule cites the fee schedule with a version and a section.
>
> In a regulated environment where an answer has to be traceable to an approved document, tuning facts is structurally wrong regardless of how well it performs. That's the argument I'd lead with, because it doesn't depend on measuring anything.
>
> The updatability point is nearly as strong. A fee changes, the corpus is re-indexed, and the system reflects it. A tuned model would need data curation, re-tuning, re-validation, and a redeploy — for a domain where content changes regularly that's decisive on its own.
>
> On putting everything in the prompt — the corpus exceeds any context window, cost would scale with every request, and there's no access control, since the model would see documents the user isn't entitled to with nothing but its discretion preventing disclosure.
>
> And I'd take the search option seriously, because it's the one people skip. If users needed to read the source — a compliance officer finding the applicable policy — then search returning ranked documents is the better product; they don't want a paraphrase. RAG is right when users need an answer rather than the document. Asking that question is the product decision, not just the technical one.
>
> [**If your decision process was less formal than this, say so.** 'RAG was the obvious pattern and the reasoning became clear as we built it' is a normal and defensible answer. Implying a formal evaluation of four options that didn't happen is worse than describing what actually occurred.]"

## 8. Likely Follow-ups

**Q: Why not fine-tune?**
Because the problem was knowledge, not behaviour. Tuned facts are absorbed imperfectly, can't be updated without re-tuning, and can't be cited — and in a regulated environment where answers must trace to an approved document, that last one is disqualifying regardless of accuracy.

**Q: When would fine-tuning have been right?**
If the problem were behaviour — a consistent output format, a domain-specific classification taxonomy, or a tone requirement. Tuning teaches behaviour; retrieval supplies knowledge. Confusing those is what makes teams spend months on the wrong solution.

**Q: Why not put everything in the prompt?**
The corpus exceeds any context window, cost scales with every request, and there's no access control — the model would see documents the user isn't entitled to, with only its discretion preventing disclosure. That last point applies even at small corpus sizes.

**Q: Would plain search have worked?**
For users who need to read the source, yes — and it would arguably be better, since a compliance officer wants the policy rather than a paraphrase. RAG is right when users need an answer. That's a product question worth having asked explicitly.

**Q: What would have changed the decision?**
A corpus small and static enough to fit in a prompt, or a requirement that was about behaviour rather than knowledge. Also a user base that needed to read sources rather than receive answers — that would point at search rather than generation.

## 9. Common Mistakes

- Answering "RAG is the standard approach."
- Citing cost as the main reason against fine-tuning.
- Not distinguishing knowledge from behaviour.
- Ignoring the plain-search alternative.
- Implying a formal options evaluation that didn't happen.

## 10. What to Remember

- **Name the alternatives** — that's what makes it a decision.
- **Tuned facts can't be cited** — structural, not a quality argument.
- **Updatability** is nearly as strong: re-index versus re-tune.
- **Tuning teaches behaviour; retrieval supplies knowledge.**
- **Take search seriously** — sometimes it's the better product.
