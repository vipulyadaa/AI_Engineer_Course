# "What Problem Did It Solve?"

> **Phase 31 · PROJECT DEEP DIVE · Topic 03**
>
> ⚠️ **An answer framework.** The structure is transferable; the problem is yours.

## 1. Definition

A question testing whether you understand the business problem or only the technical one. The distinguishing answer names who was affected, what it cost them, and why this solution rather than a simpler one.

## 2. Simple Explanation

The weak answer describes what the system does. The strong one describes what was wrong before.

If you can't state the problem without mentioning the technology, you've described a solution looking for one.

## 3. How It Works

```
THE FOUR ELEMENTS

WHO was affected        customers, support agents, or both
WHAT was happening      the observable problem
WHY it mattered         cost, risk, or experience
WHY NOT something simpler  better search, a better FAQ page,
                        more staff

The fourth is what shows the decision was considered.
```

## 4. Practical Example

**Stating the problem without the technology:**

```
WEAK
  "We built a RAG system to answer customer questions."
  → describes the solution

STRONG
  "Support agents were answering the same questions about
   fees and account terms repeatedly. Answers varied
   between agents because the information was spread across
   documents that were updated at different times, and
   customers sometimes got conflicting information."
  → describes the problem, and the inconsistency point
    explains why grounding and citation mattered before
    anyone asks
```

**The "why not something simpler" element:**

```
A better FAQ page doesn't work when:
  · the answer depends on the customer's product or tier
  · the information is spread across many documents
  · questions are phrased in ways that don't match headings

Better search doesn't work when:
  · users want an answer, not a document to read
  · the answer requires combining two sources

More staff doesn't work when:
  · the questions are repetitive enough that the cost is
    avoidable
  · consistency is the problem, and more people makes it
    worse

Naming which of these applied shows the alternatives were
considered rather than skipped.
```

**On honest scope:** if the system was an internal tool for support agents rather than customer-facing, that's a different and perfectly good problem — agents finding the right policy faster and answering consistently. Describing it accurately matters more than it sounding customer-facing.

## 5. Why It Matters

- **Stating the problem without the technology** shows it wasn't a solution seeking one.
- **"Why not something simpler"** is what shows the decision was considered.
- **The inconsistency angle** explains why grounding mattered, before being asked.

## 6. Trade-offs / Failure Modes

| Weak answer | Why |
|---|---|
| Describing what the system does | That's the solution, not the problem |
| No one named as affected | Abstract problems aren't real ones |
| No simpler alternatives considered | Suggests the tool came first |
| Inflating the scope | Collapses under a specific question |
| An invented business metric | The follow-up asks how it was measured |

**On metrics:** if you have a genuine number — deflection rate, time saved, volume handled — use it. If you don't, a qualitative statement is honest and sufficient. An invented figure is the most dangerous element in this answer because the immediate follow-up is how it was measured, and there's no recovering from that.

**On the consistency framing:** in banking, inconsistent answers are a compliance concern as well as an experience one — two customers asking the same question and receiving different fee information is a problem regardless of which answer was right. Framing it that way connects the project to why it mattered to the organization rather than only to users.

## 7. Interview Answer

> "[**Your own problem.** The structure below is the skeleton.]
>
> "[**Who**] were [**what was happening**]. For example — support agents were answering the same questions about fees and account terms repeatedly, and answers varied between agents because the information was spread across documents updated at different times. So customers sometimes received conflicting information about the same thing.
>
> That mattered for two reasons. There was a cost to handling repetitive questions that the documentation already answered. And there was a consistency problem — in banking, two customers asking the same question and getting different fee information is a compliance concern as well as an experience one, regardless of which answer was right.
>
> On why not something simpler: a better FAQ page doesn't solve it when [**your reason** — the answer depends on the customer's product or tier, or the information spans documents, or questions are phrased in ways that don't match headings]. Better search doesn't solve it when users want an answer rather than a document to read. And adding staff doesn't help with consistency — it makes it worse.
>
> The outcome was [**what actually changed** — with a number if you genuinely measured one].
>
> [**On scope, be accurate.** If this was an internal tool helping support agents find the right policy rather than a customer-facing assistant, say so. That's a good problem, and describing it precisely matters more than it sounding larger. An interviewer who discovers the scope was smaller than implied discounts everything else you said.]"

## 8. Likely Follow-ups

**Q: Who was the user?**
[**Your honest answer** — customers, support agents, or both.] An internal tool helping agents find the right policy faster is a legitimate and well-scoped problem, and describing it accurately is better than implying customer-facing scale.

**Q: Why not just improve the FAQ page?**
Because the answer often depends on the customer's product or tier, the information spans documents updated at different times, and questions get phrased in ways that don't match headings. A static page handles none of those.

**Q: Did you measure the impact?**
[**Honest answer.**] If you have a genuine number, give it and explain how it was measured. If you don't, say what changed qualitatively — an invented metric is the most dangerous thing in this answer, because "how did you measure that?" follows immediately.

**Q: Why was consistency a problem?**
Because two customers asking the same question and receiving different fee information is a compliance concern as well as an experience one, regardless of which answer was right. That's what makes grounding and citation requirements rather than nice-to-haves.

**Q: Was AI necessary?**
[**Your honest view.**] The defensible version names what a non-AI solution wouldn't have handled — tier-dependent answers, information spanning documents, or phrasing that doesn't match headings. If a better search would largely have worked, saying so is more credible than claiming otherwise.

## 9. Common Mistakes

- Describing the solution rather than the problem.
- No specific user named.
- No simpler alternatives considered.
- Inflating scope beyond what you built.
- Quoting a business metric you can't explain measuring.

## 10. What to Remember

- **State the problem without the technology** — if you can't, it was a solution seeking one.
- **Name who was affected** and what it cost them.
- **"Why not something simpler"** shows the decision was considered.
- **Consistency is a compliance angle** in banking, not just experience.
- **Describe the real scope** — an inflated one collapses under one question.
