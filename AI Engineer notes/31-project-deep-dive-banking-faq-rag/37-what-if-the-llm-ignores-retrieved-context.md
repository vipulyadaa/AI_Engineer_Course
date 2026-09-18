# "What If the LLM Ignores Retrieved Context?"

> **Phase 31 · PROJECT DEEP DIVE · Topic 37**

## 1. Definition

A debugging scenario where the answer doesn't reflect the retrieved documents. The first move is to verify the premise, because most of the time the context wasn't actually there.

## 2. Simple Explanation

"The model ignored the context" is usually wrong. The context was empty, truncated, contradicted itself, or the model attended to the wrong part of it.

Genuine disregard for provided context is real but rarer than the diagnosis suggests.

## 3. How It Works

```
CHECK IN THIS ORDER

1. WAS THERE CONTEXT?
   print the fully rendered prompt. Empty or truncated
   context explains most cases immediately.

2. WAS THE ANSWER IN IT?
   the model may be faithfully reporting a chunk that
   doesn't contain what you expected

3. WHERE IN THE CONTEXT WAS IT?
   lost-in-the-middle — content buried in a long context
   gets less attention than the ends

4. DID PARAMETRIC KNOWLEDGE CONFLICT?
   when the corpus contradicts what the model "knows",
   it can favour its own prior

5. WAS THE INSTRUCTION CLEAR?
   grounding stated as a preference rather than a
   constraint

6. IS AN INJECTION OVERRIDING IT?
   text in a retrieved chunk instructing otherwise
```

**Step 1 resolves most of these.** Printing the rendered prompt is a one-line check that ends a surprising share of investigations.

## 4. Practical Example

**The parametric-conflict case, which is the genuinely hard one:**

```
Corpus: "The international transfer fee is $45."
Model's prior: transfer fees are typically $15-$30.

The retrieved figure is outside what the model considers
normal, and it may soften it, hedge it, or substitute
something more typical.

This is worst for:
  · unusual or bank-specific policies
  · figures that differ from industry norms
  · recently changed values

WHICH MEANS the failure concentrates exactly on the
content that most needs to come from the documents —
proprietary and recently changed policy. The things
everyone knows are the things the model gets right
without retrieval anyway.
```

**Fixes, in order of effect:**

```
1. FEWER, BETTER CHUNKS
   Reranking so five high-relevance chunks replace
   twenty mixed ones. Less competing content, and the
   relevant text lands where attention is strongest.
   This is usually the biggest improvement.

2. ORDERING
   Highest-scoring chunks at the start of the context,
   or at both ends. Cheap, and it directly addresses
   lost-in-the-middle.

3. INSTRUCTION AS CONSTRAINT
   "If the context contains a figure, use that figure
   exactly, even if it differs from what you expect. Do
   not substitute a more typical value."
   Naming the specific failure works better than a
   general instruction to be grounded.

4. STRUCTURED OUTPUT
   Requiring a quoted supporting passage alongside each
   claim forces the model to locate the text rather
   than recall it — and makes the failure visible when
   the quote doesn't support the claim.

5. OUTPUT VALIDATION
   Extract figures from the answer, check each appears
   in the retrieved context. Deterministic, cheap, and
   it catches exactly this failure.
```

**Point 5 is the one to lead with in banking**, because it doesn't depend on the model behaving — it checks what came out.

## 5. Why It Matters

- **Verify the premise first** — usually the context wasn't there.
- **Parametric conflict concentrates on proprietary and recently-changed policy.**
- **Numeric validation against the context** catches it deterministically.

## 6. Trade-offs / Failure Modes

| Mistake | Consequence |
|---|---|
| Not checking the rendered prompt | Debugging a model that received nothing |
| Assuming it's a prompting problem | The fix is usually retrieval or ordering |
| Piling on stronger instructions | Diminishing returns; it's a request |
| Ignoring position in the context | Lost-in-the-middle goes unaddressed |
| Not considering injection | A security incident diagnosed as a quality issue |

**On why more instruction doesn't scale:** each additional emphatic instruction adds less than the last, and a very long system instruction competes with itself for attention. Beyond a point, the answer is structural — fewer chunks, better ordering, output validation — rather than more words.

**On the security overlap:** a model that consistently ignores retrieved context for one topic may be following an instruction inside a retrieved chunk. If the behaviour is topic-specific rather than general, inspecting those chunks for injected text is worth doing before concluding it's a model quality problem.

## 7. Interview Answer

> "The first thing I'd do is verify the premise, because in most cases the model didn't ignore the context — the context wasn't there.
>
> So: print the fully rendered prompt. Empty context from a fetch that returned nothing, or context truncated because it exceeded the window, explains a surprising share of these investigations. It's a one-line check and it ends most of them.
>
> If the context was there, the next question is whether the answer was actually in it — the model may be faithfully reporting a chunk that doesn't contain what I assumed it did.
>
> Then position. Models attend less reliably to content in the middle of a long context than at either end, so with a large k the relevant chunk can land in the weak zone. That's not the model ignoring the context, it's the context being arranged badly.
>
> The genuinely hard case is parametric conflict — when the corpus contradicts what the model's training suggests. If the documents say the international transfer fee is forty-five dollars and the model's prior is that transfer fees are fifteen to thirty, it may soften it, hedge it, or substitute something more typical.
>
> What makes that important is where it concentrates: unusual or bank-specific policies, figures that differ from industry norms, and recently changed values. Which is exactly the content that most needs to come from the documents. The things everyone knows are the things the model gets right without retrieval anyway.
>
> On fixes, in order of effect. First, fewer and better chunks — reranking so five high-relevance chunks replace twenty mixed ones. Less competing content, and the relevant text lands where attention is strongest. That's usually the biggest single improvement, and it's a retrieval fix rather than a prompting one.
>
> Second, ordering — highest-scoring chunks at the start, or at both ends. Cheap and directly addresses the position problem.
>
> Third, instruction as a constraint rather than a preference, and naming the specific failure: if the context contains a figure, use that figure exactly, even if it differs from what you'd expect, and don't substitute a more typical value. That works better than a general instruction to be grounded.
>
> Fourth, structured output requiring a quoted supporting passage alongside each claim. That forces the model to locate the text rather than recall it, and it makes the failure visible when the quote doesn't support the claim.
>
> And fifth, which is the one I'd lead with in banking — output validation. Extract the figures from the answer and check each one appears in the retrieved context. It's deterministic, it's cheap, and it catches exactly this failure without depending on the model having behaved.
>
> One thing I'd rule out before concluding it's a quality problem: if the behaviour is specific to one topic rather than general, it could be an injection — text inside a retrieved chunk instructing the model to answer differently. That's a security incident, and it looks identical to a quality issue from the outside.
>
> And I'd avoid the instinct to keep adding stronger instructions. Each one adds less than the last, and a very long system instruction competes with itself for attention. Past a point the fix is structural, not verbal."

## 8. Likely Follow-ups

**Q: What's the first thing you'd check?**
The fully rendered prompt. Empty or truncated context explains most of these, and it's a one-line check — debugging model behaviour before confirming what the model received is wasted effort.

**Q: When does the model genuinely override the context?**
When the retrieved content conflicts with its training prior — unusual policies, figures outside industry norms, recently changed values. Which is precisely the content that most needs to come from the documents.

**Q: What's the most effective fix?**
Fewer, better chunks via reranking. Less competing content and better positioning does more than stronger instructions, and it's a retrieval change rather than a prompt change.

**Q: How do you catch it reliably?**
Output validation — extract figures from the answer and check each appears in the retrieved context. Deterministic, cheap, and it doesn't depend on the model having behaved correctly.

**Q: Could it be a security issue?**
Yes. If the behaviour is topic-specific rather than general, a retrieved chunk may contain an injected instruction. That's an incident, and from the outside it looks exactly like a quality problem.

## 9. Common Mistakes

- Not inspecting the rendered prompt first.
- Treating it as a prompting problem by default.
- Adding progressively stronger instructions.
- Ignoring chunk position in the context.
- Missing the injection possibility.

## 10. What to Remember

- **Print the rendered prompt first** — usually the context was missing.
- **Parametric conflict hits proprietary and changed policy** hardest.
- **Fewer, better chunks** beats stronger instructions.
- **Validate figures against the context** — deterministic and cheap.
- **Topic-specific disregard** may be an injection, not a quality issue.
