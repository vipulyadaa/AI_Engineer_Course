# Retrieval Poisoning (Security View)

> **Phase 14 · RAG SECURITY · Topic 07**

## 1. Definition

Inserting content into the corpus that is crafted to rank highly for target queries and to supply false information as *evidence*. Unlike injection, it contains no instructions — the model behaves correctly and grounds its answer in attacker-controlled facts.

## 2. Simple Explanation

Injection attacks the model's obedience. Poisoning attacks the model's evidence.

The poisoned document looks entirely legitimate. It uses the right vocabulary, matches the document style, and states something false. The model retrieves it, grounds its answer in it, and cites it. Every generation-side safety check passes.

## 3. How It Works

```
1. Identify a target query      "what's the wire transfer limit?"
2. Craft a plausible document   right vocabulary, right style,
                                designed to rank
3. State the false fact         "daily limit: $500,000"
4. Get it into the corpus       wiki, shared drive, upload, crawl
5. Model retrieves, grounds,    groundedness = 1.0
   cites it                     citation resolves correctly
```

**Why the generation-side stack doesn't help:**

| Check | Result |
|---|---|
| Groundedness | ✅ passes — the answer IS grounded |
| Citation validation | ✅ passes — the citation DOES support the claim |
| Injection scanning | ✅ passes — no instructions present |
| Hallucination detection | ✅ passes — nothing was fabricated by the model |

**All the controls are on the ingestion and corpus-governance side:**

```
1. SOURCE ALLOWLISTING    index only from controlled locations
2. WRITE CONTROLS         who can create content in those locations
3. PROVENANCE METADATA    author, source system, review status
4. AUTHORITY WEIGHTING    official > reviewed > user-generated
5. CHANGE REVIEW          approval before indexing, for sensitive topics
6. CORROBORATION          flag when a retrieved fact contradicts
                          other indexed sources
```

## 4. Practical Example

**Provenance metadata is what makes authority weighting possible:**

```json
{
  "source_system":  "confluence-open",
  "authority_tier": "user_generated",   // official | reviewed | user_generated
  "author":         "u-8891",
  "review_status":  "unreviewed",
  "topic_tags":     ["limits", "wire_transfer"]   // sensitive topic
}
```

**Tiered answering by topic sensitivity:**

```
High-stakes topics (limits, fees, regulatory guidance):
  · answer ONLY from authority_tier = "official"
  · if no official source covers it → abstain

General informational topics:
  · any tier acceptable, official boosted in ranking

That's a policy decision expressed as a retrieval filter, and it
converts a broad corpus into a safe one for the queries that matter.
```

**Corroboration as detection:**

```
If the top-ranked chunk asserts a fact that contradicts other
indexed sources on the same topic → flag.

Catches poisoning AND genuine content inconsistency with one check,
and both are worth surfacing.
```

## 5. Why It Matters

- **It defeats the entire generation-side safety stack**, which is where most RAG safety effort goes.
- **The controls are corpus governance**, not model or prompt engineering.
- **The consequence in banking is direct** — a wrong limit or fee acted upon.

## 6. Trade-offs / Failure Modes

| Weakness | Detail |
|---|---|
| **Broad ingestion** | Every reachable source is attack surface |
| **No provenance** | Official policy and a wiki page are indistinguishable |
| **No authority weighting** | User-generated content competes equally |
| **Crawled web content** | Highest risk — unreviewed third-party input |
| **No corroboration check** | Contradicting documents go unnoticed |
| **Over-restriction** | Allowlisting only official sources loses useful content |

**The breadth-versus-safety tension:** the safest corpus is small and reviewed; the most useful is broad. Tiering resolves it — index broadly, weight by authority, and require official-tier sources for high-stakes topics. That gives coverage where it's harmless and rigor where it matters.

**On insider risk:** poisoning doesn't require an external attacker. An employee with write access to a wiki that's indexed can do it, deliberately or by mistake — a well-meaning but wrong "updated procedure" page has the same effect as a malicious one. Write controls and review are the answer to both.

## 7. Interview Answer

> "Retrieval poisoning is inserting content into the corpus crafted to rank highly for target queries and supply false information as evidence. The distinction from injection is important: injection attacks the model's obedience, poisoning attacks the model's evidence.
>
> What makes it serious is that it defeats the entire generation-side safety stack. The answer genuinely is grounded, in the poisoned chunk. The citation genuinely does resolve and support the claim. There's no injected instruction to scan for, and the model fabricated nothing. Groundedness scores 1.0 and every check passes.
>
> So the controls are all corpus governance rather than model or prompt engineering. Source allowlisting, write controls on indexed locations, provenance metadata recording author and review status, authority weighting so official policy outranks user-generated content, and change review for sensitive topics.
>
> The specific mechanism I'd build is tiered answering by topic. For high-stakes topics — transfer limits, fees, regulatory guidance — answer only from official-tier sources, and abstain if no official source covers it. For general informational topics, any tier is acceptable with official boosted. That's a policy decision expressed as a retrieval filter, and it converts a broad corpus into a safe one for the queries that actually matter.
>
> Two things I'd add. Corroboration checking — if the top chunk contradicts other indexed sources on the same topic, flag it. That catches poisoning and genuine content inconsistency with one check.
>
> And this isn't only an external-attacker problem. An employee with write access to an indexed wiki can do it deliberately or by mistake — a well-meaning but wrong 'updated procedure' page has exactly the same effect. Write controls and review address both."

## 8. Likely Follow-ups

**Q: How is this different from prompt injection?**
Injection contains instructions and tries to override the model's behavior. Poisoning contains no instructions — it's a plausible document stating a false fact, and the model behaves entirely correctly by grounding in it. Injection defenses scan for instruction patterns and find nothing.

**Q: Why don't groundedness and citation checks catch it?**
Because both pass. The answer is grounded in a retrieved chunk, and the citation resolves to a real document that genuinely contains the claim. Those checks verify the model stayed within its evidence — and it did. The evidence itself was the attack, which is outside what they measure.

**Q: What are the practical controls?**
All on the ingestion side: source allowlisting, write controls on indexed locations, provenance metadata, authority weighting, and change review for sensitive topics. Plus corroboration checking at retrieval as a detection signal. There's no prompt or model change that addresses this.

**Q: How do you balance corpus breadth against safety?**
Tier rather than restrict. Index broadly but record authority in metadata and weight retrieval accordingly. Then require official-tier sources for high-stakes topics, abstaining if none covers the question, while allowing any tier for general information. Coverage where it's harmless, rigor where it matters.

**Q: Is this only an external threat?**
No, and that's worth saying. An employee with write access to an indexed wiki can poison the corpus deliberately or accidentally — a well-intentioned but incorrect "updated procedure" page has the same effect as a malicious one. Write controls, review workflows, and authority tiering address both the insider and the accident.

## 9. Common Mistakes

- Treating it as a variant of injection and scanning for instructions.
- Relying on groundedness and citation validation, which both pass.
- No provenance metadata, so authority weighting is impossible.
- Indexing anything reachable without write controls on those sources.
- Framing it as an external-attacker problem and ignoring insider and accidental cases.

## 10. What to Remember

- **Poisoning attacks the evidence, not the obedience.** No instructions involved.
- **The whole generation-side safety stack passes** — groundedness, citations, hallucination checks.
- **Controls are corpus governance:** allowlisting, write controls, provenance, authority tiers.
- **Tier by topic sensitivity** — official-tier only for limits, fees, and regulatory answers.
- **Insiders and accidents cause it too**, not just external attackers.
