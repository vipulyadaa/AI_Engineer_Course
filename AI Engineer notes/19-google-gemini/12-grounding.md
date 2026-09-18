# Grounding

> **Phase 19 · GOOGLE GEMINI · Topic 12**

## 1. Definition

Constraining a model's answer to information from a specified source, and providing attribution back to it. On Vertex AI this means grounding with Google Search, with Vertex AI Search over your own data, or with your own retrieval pipeline.

## 2. Simple Explanation

An ungrounded model answers from what it learned in training. A grounded model answers from sources you supplied, and tells you which ones.

For banking, grounding isn't a quality feature — it's the requirement. An answer about a fee must come from the fee schedule, and must be traceable to it.

## 3. How It Works

```
THREE GROUNDING SOURCES on Vertex AI:

  GOOGLE SEARCH        public web, with source links
                       → wrong for a closed-corpus system

  VERTEX AI SEARCH     your indexed corpus, managed
                       → legitimate, less retrieval control

  YOUR OWN RETRIEVAL   your pipeline, context in the prompt
                       → maximum control
```

**Grounding has two halves and both matter:** constraining the answer to the source, and attributing claims back to it. A system that retrieves well but can't cite is only half grounded.

## 4. Practical Example

**What grounding actually requires in a banking system:**

```
1. RETRIEVAL from an approved, permission-filtered corpus
2. AN INSTRUCTION to use only that context
3. CITATION per claim, resolvable to a specific passage
4. ABSTENTION when the context doesn't contain the answer
5. VERIFICATION that each claim is actually supported

Points 4 and 5 are the ones systems miss. Retrieval plus an
instruction is not grounding — the model can still produce
plausible detail the context didn't contain, and without
verification nothing catches it.
```

**Gemini's grounding metadata** returns grounding supports linking response segments to sources, which is what makes citation resolvable rather than a model-generated string.

**Grounding is not the same as correctness:**

```
An answer can be perfectly grounded in a document that is
itself superseded.

  retrieved: fee schedule v3.1 (expired 2023)
  answer:    "$35" — faithfully grounded, and wrong

Grounding guarantees the answer traces to a source. It
guarantees nothing about whether that source should have
been used.

So effective-date filtering at retrieval is a separate,
equally necessary control. Groundedness metrics pass this
case happily.
```

**That distinction is the substantive point** — grounding and freshness are orthogonal controls and neither substitutes for the other.

## 5. Why It Matters

- **Grounding is the requirement in banking**, not a quality improvement.
- **Attribution is half of it** — retrieval without resolvable citation isn't grounded.
- **Grounded ≠ correct** — a superseded source grounds an answer perfectly.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Grounded in a stale document** | Faithful and wrong |
| **Citations not resolvable** | Model-generated strings nobody can check |
| **No abstention path** | Generates from weak context |
| **No verification step** | Unsupported claims reach the user |
| **Web grounding in a closed corpus** | Unvetted sources |
| **Partial grounding** | Some claims supported, others not |

**On partial grounding — the realistic failure:** an answer where three claims are supported and one isn't looks entirely grounded, because the citations are real and most of it checks out. That's why per-claim verification matters more than an overall groundedness score: the unsupported claim is usually the specific figure the customer will act on.

**On citation resolvability:** a citation must point at something a human can open and check — a document, a version, a section, ideally a page anchor. A citation reading "the fee schedule" is unverifiable and therefore worthless as evidence, even though it looks like attribution.

## 7. Interview Answer

> "Grounding means constraining the answer to specified sources and attributing claims back to them. On Vertex AI that can be Google Search, Vertex AI Search over your own corpus, or your own retrieval pipeline — and for a closed-corpus banking system, web grounding is wrong by definition.
>
> The point I'd make first is that grounding has two halves and both matter. Constraining the answer to the source, and attributing claims back to it. A system that retrieves well but can't produce a resolvable citation is only half grounded — and a citation has to point at something a human can open and check: a document, a version, a section, ideally a page anchor. 'The fee schedule' is unverifiable and therefore worthless as evidence, even though it looks like attribution.
>
> In practice grounding needs five things: retrieval from an approved permission-filtered corpus, an instruction to use only that context, per-claim citation, abstention when the context doesn't contain the answer, and verification that each claim is actually supported. The last two are what systems miss — retrieval plus an instruction isn't grounding, because the model can still produce plausible detail the context didn't contain, and without verification nothing catches it.
>
> The distinction I'd emphasize most is that grounded doesn't mean correct. An answer can be perfectly grounded in a document that's superseded — retrieved fee schedule version 3.1 from 2023, answered thirty-five dollars, faithfully grounded and wrong. Grounding guarantees the answer traces to a source; it guarantees nothing about whether that source should have been used. So effective-date filtering at retrieval is a separate and equally necessary control, and groundedness metrics pass that failure happily.
>
> The realistic failure mode is partial grounding — three claims supported, one not. It looks entirely grounded because the citations are real and most of it checks out. That's why per-claim verification matters more than an overall groundedness score, and it matters specifically because the unsupported claim is usually the figure the customer will act on."

## 8. Likely Follow-ups

**Q: What are the grounding options on Vertex AI?**
Google Search for public web, Vertex AI Search over your own indexed corpus, or your own retrieval pipeline placing context in the prompt. For a closed-corpus banking system, web grounding is wrong by definition — the requirement is answering from approved documentation.

**Q: Does grounding guarantee correctness?**
No. An answer can be perfectly grounded in a superseded document — faithful to the source and wrong for the customer. Grounding and freshness are orthogonal controls, so effective-date filtering at retrieval is separately necessary, and groundedness metrics pass this failure.

**Q: What makes a citation useful?**
Resolvability. It must point at something a human can open and check — document, version, section, ideally a page anchor. A citation reading "the fee schedule" looks like attribution but can't be verified, which makes it worthless as evidence in an audit.

**Q: What's partial grounding?**
An answer where most claims are supported and one isn't. It looks fully grounded because the citations are real, which is why it's dangerous — and the unsupported claim is typically the specific figure the customer acts on. Per-claim verification catches it; an overall score doesn't.

**Q: Is retrieval plus an instruction enough?**
No. The model can still produce plausible detail the retrieved context didn't contain. Grounding needs an abstention path when the context doesn't answer the question, and a verification step confirming each claim is supported — otherwise the instruction is a request the model can quietly ignore.

## 9. Common Mistakes

- Treating retrieval plus an instruction as grounding.
- Producing citations that can't be resolved to a passage.
- Assuming groundedness implies the answer is current.
- Scoring groundedness overall rather than per claim.
- Using web grounding where the corpus is closed.

## 10. What to Remember

- **Two halves:** constrain to the source, and attribute back to it.
- **Grounded ≠ correct** — a superseded document grounds an answer perfectly.
- **Citations must be resolvable** to a document, version, and section.
- **Abstention and verification** are what turn retrieval into grounding.
- **Verify per claim** — partial grounding looks complete.
