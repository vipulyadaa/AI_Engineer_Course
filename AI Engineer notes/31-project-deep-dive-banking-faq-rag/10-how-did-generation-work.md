# "How Did Generation Work?"

> **Phase 31 · PROJECT DEEP DIVE · Topic 10**
>
> ⚠️ **An answer framework.** Describe your actual prompt and configuration.

## 1. Definition

A question about the final step — how retrieved chunks became an answer. The distinguishing details are how documents were formatted into the prompt, what temperature was used and why, and what the model was forbidden to do.

## 2. Simple Explanation

Put the context and the question in a prompt, get an answer out.

What separates a considered answer is the document formatting — which most people treat as plumbing and which determines whether citation is possible at all.

## 3. How It Works

```
THE COMPONENTS

SYSTEM INSTRUCTION   the grounding rule, the abstention
                     rule, the prohibitions
CONTEXT FORMATTING   how retrieved chunks are presented
                     ← the underrated one
THE QUESTION         rewritten if it was a follow-up
GENERATION CONFIG    temperature, max output tokens
OUTPUT HANDLING      citations parsed, finish reason checked
```

## 4. Practical Example

**Document formatting, which determines whether citation works:**

```
DEFAULT — join chunks with newlines
  → the model can't cite anything specific, because there's
    nothing to refer to

BETTER
  [1] Source: gs://policies/fees-v4.2.pdf#page=12
      Effective: 2024-01-01
      <chunk text>

  [2] Source: ...

Three effects:
  · NUMBERING makes citation possible — the model can say
    "[2]" and it resolves
  · SOURCE URIs make citations verifiable by a human
  · EFFECTIVE DATES let the model prefer current policy and
    notice when two documents conflict by version

That formatting function does more for answer quality than
most prompt wording changes, and it's usually written once
and never revisited.
```

**Temperature, and the honest caveat:**

```
0 to 0.2 — the task is faithful reporting of retrieved
content, not creative variation. At higher temperature the
same question can produce different figures on different
runs, which is indefensible when the answer is a fee.

The caveat worth adding: temperature 0 isn't strictly
deterministic. Floating-point non-determinism in
distributed inference means identical requests can differ
slightly. So I wouldn't promise identical answers — the
promise worth making is that answers are grounded and
cited, which is stronger and actually holds.
```

**The system instruction's four rules:**

```
GROUNDING     answer using only the provided context
ABSTENTION    if the context doesn't contain the answer,
              say so
CITATION      cite the source for every factual claim
PROHIBITIONS  no financial advice, no guarantees, no
              figures not in the context

And the prohibitions need an output-side check as well,
because a prompt instruction is a request the model can be
argued out of — and an injection in retrieved content can
override it.
```

**Checking the finish reason:** a response truncated at max output tokens or blocked by a safety filter looks like an ordinary response otherwise. Treating a truncated answer as complete is a real and easily-missed bug.

## 5. Why It Matters

- **Document formatting determines whether citation is possible** — the underrated detail.
- **Temperature 0 isn't strictly deterministic** — worth being precise about.
- **Prohibitions need an output check**, not only a prompt instruction.

## 6. Trade-offs / Failure Modes

| Weak answer | Why |
|---|---|
| "We put the chunks in a prompt" | Misses the formatting decision |
| Default temperature | Different figures on different runs |
| Claiming temperature 0 is deterministic | Not strictly true |
| Prohibitions as prompt-only | A request the model can be argued out of |
| No finish reason check | Truncated answers read as complete |
| No max output tokens | Runaway generations |

**On inspecting the rendered prompt:** the single most useful habit is printing the fully assembled messages before debugging model behaviour. Most "the model got it wrong" investigations end at discovering the context was empty, truncated, or formatted so the documents were indistinguishable — and that's a one-line check.

**On the instruction that most reduces hallucination:** the grounding rule matters, but the abstention rule matters more. Without a stated permission to say "I don't have that", the model will produce something — filling a gap is its default behaviour. Giving it an explicit alternative is what makes abstention possible at all.

## 7. Interview Answer

> "[**Your setup.** The formatting detail is what distinguishes this answer.]
>
> "The system instruction had four rules: answer using only the provided context, say so if the context doesn't contain the answer, cite the source for every factual claim, and never give financial advice or guarantee an outcome.
>
> The part I'd emphasize is context formatting, because it's usually treated as plumbing and it determines whether citation works at all. The default — joining chunks with newlines — means the model has nothing specific to refer to. Instead each chunk was numbered, with its source URI including a page anchor and its effective date.
>
> That does three things. Numbering makes citation possible, so the model can say '[2]' and it resolves to something. Source URIs make citations verifiable — a human can open the document and check. And effective dates let the model prefer current policy and notice when two retrieved documents conflict by version. That formatting function did more for answer quality than most prompt wording changes, and it's the kind of thing written once and never revisited.
>
> Temperature was low — zero to 0.2 — because the task is faithful reporting of retrieved content rather than creative variation. At higher temperature the same question can produce different figures on different runs, which is indefensible when the answer is a fee.
>
> One caveat I'd add: temperature zero isn't strictly deterministic. Floating-point non-determinism in distributed inference means identical requests can differ slightly, so I wouldn't promise identical answers. The promise worth making is that answers are grounded and cited, which is stronger and actually holds.
>
> On the instruction that most reduces hallucination — the grounding rule matters, but the abstention rule matters more. Without an explicit permission to say 'I don't have that information', the model produces something, because filling a gap is its default behaviour. Giving it a stated alternative is what makes abstention possible at all.
>
> And I'd note that the prohibitions need an output-side check as well as a prompt instruction. A prompt is a request the model can be argued out of, and an injection in retrieved content can override it — a classifier on the output checks what was actually produced, which is a check rather than a request.
>
> Two operational details. Max output tokens set as a runaway guard, above the intended length rather than as a length control, since truncating mid-sentence is worse than a short answer. And always checking the finish reason — a response cut off at the token limit or blocked by a safety filter looks like an ordinary response otherwise, and treating a truncated answer as complete is an easily-missed bug.
>
> The habit I'd mention: print the fully rendered prompt before debugging model behaviour. Most 'the model got it wrong' investigations end at discovering the context was empty, truncated, or formatted so the documents were indistinguishable — and it's a one-line check."

## 8. Likely Follow-ups

**Q: How were the chunks formatted into the prompt?**
Numbered, with source URIs including page anchors and effective dates. Numbering makes citation resolvable, URIs make citations verifiable by a human, and dates let the model prefer current policy and notice version conflicts. Joining with newlines discards all three.

**Q: What temperature and why?**
Zero to 0.2, because the task is faithful reporting rather than creative variation — higher temperature means the same question can yield different figures on different runs. Though temperature zero isn't strictly deterministic, so I'd promise grounding rather than identical answers.

**Q: Which instruction reduces hallucination most?**
The abstention rule, more than the grounding rule. Without explicit permission to say "I don't have that information", the model produces something — filling a gap is its default. Giving it a stated alternative is what makes abstention possible.

**Q: Are prompt prohibitions enough?**
No. A prompt instruction is a request the model can be argued out of, and an injection in retrieved content can override it. Prohibitions on advice and guarantees need an output-side classifier — a check on what was produced rather than a request about what to produce.

**Q: What do you check on the response?**
The finish reason. A response truncated at the token limit or blocked by a safety filter looks like an ordinary response otherwise, so treating a truncated answer as complete is a real bug — and it's silent, which is what makes it easy to miss.

## 9. Common Mistakes

- Joining chunks with newlines and expecting citations to work.
- Default temperature for grounded answering.
- Claiming temperature 0 gives deterministic output.
- Prohibitions implemented only in the prompt.
- Not checking the finish reason.

## 10. What to Remember

- **Number chunks with source URIs and effective dates** — it's what makes citation work.
- **Temperature 0–0.2**, and be precise that it isn't strictly deterministic.
- **The abstention rule reduces hallucination more** than the grounding rule.
- **Prohibitions need an output check**, not just an instruction.
- **Print the rendered prompt** before debugging anything else.
