# "Explain Your Project"

> **Phase 31 · PROJECT DEEP DIVE · Topic 01**
>
> ⚠️ **An answer framework, not a script.** The structure below is what makes
> this answer work. Fill every specific with your own project — and where your
> system was simpler than the example, say so. A modest system described
> accurately beats an impressive one that collapses under one follow-up.

## 1. Definition

The opening question of most interviews, and the one that sets the agenda for the next thirty minutes. Everything you mention becomes a candidate for follow-up, so what you include is a deliberate choice.

## 2. Simple Explanation

You have roughly ninety seconds before the interviewer starts steering. Use them to establish the problem, the shape of the solution, one thing that was hard, and the outcome.

Then stop. The follow-ups are where you actually demonstrate depth, and leaving room for them is the point.

## 3. How It Works

```
THE FOUR-PART STRUCTURE

1. PROBLEM       what was broken, for whom, and why it
                 mattered            (~15 seconds)
2. APPROACH      the shape of the solution, not the stack
                 list               (~25 seconds)
3. HARD PART     one genuine difficulty and how you resolved
                 it                 (~30 seconds)
4. OUTCOME       what changed, with a number if you have one
                                    (~15 seconds)

Then stop.
```

**Part 3 is what the interviewer remembers.** A project described without a difficulty sounds like a tutorial.

## 4. Practical Example

**What each part should contain:**

```
PROBLEM
  Who was asking what, and what happened before. "Customer
  support handled a high volume of repetitive questions
  about fees and account policies, and answers varied by
  agent."
  → establishes why RAG rather than a chatbot, before you're
    asked

APPROACH
  The shape: "a retrieval system over approved product
  documentation, with the answer generated only from
  retrieved content and cited back to the source document."
  → not "we used LangChain, Chroma, and OpenAI" — the stack
    invites stack questions, the shape invites design ones

HARD PART — choose deliberately, because it sets the agenda
  Good candidates:
    · chunking, because the documents were structured
    · retrieval failing on exact identifiers until hybrid
      search was added
    · getting the system to abstain rather than answer
      from weak context
    · a wrong answer in testing that traced to a parsing
      problem, not the model

OUTCOME
  A number if you have one. If you don't, a qualitative
  outcome stated honestly beats an invented metric — and
  an invented metric is the single most dangerous thing to
  put in this answer, because the follow-up is always
  "how did you measure that?"
```

**Choosing the hard part is the strategic decision**, because you're selecting the topic for the next ten minutes. Pick the one you can go three questions deep on.

## 5. Why It Matters

- **It sets the agenda** — everything you mention invites follow-up.
- **The hard part is what's remembered**, and it's the topic you're choosing.
- **An invented metric is the most dangerous element** — the follow-up is immediate.

## 6. Trade-offs / Failure Modes

| Weak answer | Why |
|---|---|
| A stack list | Invites tool questions rather than design ones |
| No difficulty mentioned | Sounds like a tutorial |
| Five minutes long | Leaves no room for follow-ups |
| An unmeasured metric | "How did you measure that?" |
| Overstating scope | Collapses under one specific question |
| Starting with the technology | The problem is what makes it interesting |

**On honesty about scale:** if the corpus was a few hundred documents and traffic was modest, say so. An interviewer who asks "how many documents?" and hears a number inconsistent with everything else will discount the whole answer. A small system described precisely, with the reasoning behind each decision, demonstrates more than an inflated one.

**On what to leave out deliberately:** anything you can't discuss three questions deep. Mentioning a reranker you configured once invites questions about cross-encoders, candidate counts, and recall measurement. If that's not ground you're solid on, leave it out — the answer doesn't need to be complete, it needs to be defensible.

## 7. Interview Answer

> "[**Your own version of this.** The structure below is the skeleton — replace every specific with yours.]
>
> "The problem was that [**who**] were asking a high volume of repetitive questions about [**what domain**], and [**what was wrong** — answers varied, response times were slow, agents spent time on questions the documentation already answered].
>
> The approach was a retrieval system over [**your corpus**]. The key property is that the answer is generated only from retrieved content and cited back to the source document — so it can't invent a figure, and anyone can check where an answer came from. That mattered because [**why grounding was the requirement in your context**].
>
> The part that turned out to be hard was [**one genuine difficulty**]. [**Two or three sentences on what went wrong and what you changed.**] — For example, if it was chunking: 'the documents were structured with sections and sub-sections, and naive fixed-size chunking split rules away from their conditions. A chunk would say a fee was waived without the sentence saying for which customers. Moving to structure-aware chunking and prefixing the section path into the text before embedding fixed both the retrieval and the interpretation.'
>
> The outcome was [**what changed** — and a number if you genuinely measured one; a qualitative statement if you didn't]."
>
> **Then stop.** The silence is deliberate — it hands the interviewer the choice of where to go, and everything you said is ground you can defend.

## 8. Likely Follow-ups

**Q: Why RAG rather than fine-tuning?**
Because the problem was knowledge, not behaviour. The model didn't know our fee schedule, and tuning wouldn't fix that reliably — tuned facts can't be updated without re-tuning and can't be cited, which in a banking context is disqualifying regardless of accuracy.

**Q: How big was the corpus?**
[**Your honest number.**] And the follow-up is usually what that implied — a few hundred documents means retrieval quality depends on chunking and the embedding model rather than on index architecture, which is worth saying because it shows you know what scale does and doesn't change.

**Q: What was the hardest part?**
[**The one you chose in part 3.**] Be ready to go three questions deep on it — what you tried first, why it didn't work, what you changed, and how you knew it improved.

**Q: How did you know it was working?**
[**Honest answer.**] If you had a golden set, describe it. If you evaluated by sampling and reading answers, say that — it's a legitimate method at small scale, and describing it accurately is stronger than implying a rigour you didn't have.

**Q: What would you do differently?**
The question every interviewer asks, and the one where a real answer lands best. Something you genuinely learned — evaluation earlier, chunking differently, abstention designed in from the start rather than added.

## 9. Common Mistakes

- Leading with the technology stack.
- No genuine difficulty mentioned.
- Talking for five minutes.
- Quoting a metric you can't explain measuring.
- Mentioning components you can't discuss in depth.

## 10. What to Remember

- **Four parts:** problem, approach, hard part, outcome — then stop.
- **The hard part sets the agenda** — choose one you can defend three questions deep.
- **Describe the shape, not the stack** — it invites better questions.
- **Never quote an unmeasured number** — the follow-up is immediate.
- **A modest system described precisely** beats an inflated one.
