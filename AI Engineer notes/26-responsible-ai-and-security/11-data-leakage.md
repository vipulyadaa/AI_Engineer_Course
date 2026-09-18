# Data Leakage

> **Phase 26 · RESPONSIBLE AI & SECURITY · Topic 11**

## 1. Definition

Data reaching someone or somewhere it shouldn't — another customer, a third party, an unbounded log, or a model provider. In an AI system the leak paths are more numerous than in a conventional application, and most aren't the model.

## 2. Simple Explanation

People picture leakage as the model saying something it shouldn't. That's one path, and usually the least likely.

The more common paths are: retrieval returning documents the user isn't entitled to, a cache serving one customer's answer to another, logs accumulating everything, and data crossing a boundary to a third-party service.

## 3. How It Works

```
LEAK PATHS, roughly by likelihood

1. RETRIEVAL      post-filtering, or filters missing on one
                  branch of hybrid search
2. CACHE          key without identity or permissions
3. LOGS/TRACES    full prompts and responses, retained
                  indefinitely, broadly readable
4. THIRD PARTY    a hosted service outside the perimeter
5. AGENT MEMORY   not partitioned by authenticated user
6. MODEL OUTPUT   generating something present in context
                  that the user shouldn't see
7. TRAINING       customer data used to tune a model
```

**Path 6 — the model saying it — is last on the list.** And it only happens when a control above it already failed and put the data in context.

## 4. Practical Example

**The hybrid search leak, which is easy to introduce:**

```
Dense retrieval filters on acl_groups. BM25 is configured
separately and the filter was never added.

Result: the lexical branch returns documents the user can't
see, they're fused with the dense results, and they reach
the context.

Hybrid search became an authorization bypass.

The fix: shared filter construction in one place, and a
test asserting BOTH branches honour it. It's an easy
regression because the two retrievers are configured
independently.
```

**The cache leak, which is a performance optimization causing a breach:**

```
cache_key = normalize(query)

Customer A asks "what's my transfer fee?" → answer cached
Customer B asks the same → cached answer returned

Customer B receives an answer computed from Customer A's
account data.

cache_key MUST include the authenticated user and, for a
shared cache, the permission set — otherwise the cache is
a cross-customer disclosure mechanism.
```

**The log leak, which is slow and quiet:**

```
Logging full prompts means logging retrieved document
content and customer queries. Over months that becomes a
complete shadow copy of sensitive data — in a store with
broader read access than the source systems, and often no
retention policy.

Controls: structured summaries by default, full payloads
sampled or on failure only, identifiers hashed, retention
set, access restricted.
```

**Detection at the output:** verifying that every identifier in an answer has provenance — it came from the session or a permitted tool result — catches paths 1, 2, 5, and 6 at once. That's a cheap structural check covering most of the list.

## 5. Why It Matters

- **The model is the least likely leak path**, and only after another control failed.
- **Hybrid search and caches** are the two easiest leaks to introduce accidentally.
- **An output provenance check** catches most paths with one control.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Filter on one retrieval branch only** | Hybrid search bypasses authorization |
| **Cache key without identity** | Cross-customer answers |
| **Full prompt logging** | A shadow copy of sensitive data |
| **Third-party services** | Data outside the perimeter |
| **Agent memory not user-partitioned** | Cross-session leakage |
| **Customer data used for tuning** | A different purpose, possibly no basis |

**On third parties:** every hosted service in the path — tracing, evaluation, a reranking API, a vector database — is a boundary customer data crosses. Each needs a vendor assessment and a processor agreement, and in many banks the answer is to keep everything in-project, which is the strongest argument for the Vertex AI path over standalone APIs.

**On tuning:** using production conversations to fine-tune a model is a leak if the basis for that processing doesn't exist — and the data becomes unextractable afterwards, because you can't remove one customer's contribution from trained weights. That makes it effectively irreversible, which is a strong reason to require an explicit decision rather than letting it happen as a natural next step.

## 7. Interview Answer

> "People picture leakage as the model saying something it shouldn't, and that's usually the least likely path. It only happens when a control above it already failed and put the data in context.
>
> The more common paths, roughly by likelihood: retrieval returning documents the user isn't entitled to; a cache serving one customer's answer to another; logs and traces accumulating everything; data crossing to a third-party service; agent memory not partitioned by user; then the model itself; then customer data used for tuning.
>
> Two are easy to introduce accidentally. The first is hybrid search. Dense retrieval filters on ACL groups, BM25 is configured separately, and the filter was never added there — so the lexical branch returns documents the user can't see, they're fused with the dense results, and hybrid search has become an authorization bypass. The fix is shared filter construction in one place plus a test asserting both branches honour it, because the two retrievers being configured independently makes it an easy regression.
>
> The second is caching. If the cache key is just the normalized query, customer A asks about their transfer fee, the answer is cached, customer B asks the same question and receives an answer computed from customer A's account data. The key has to include the authenticated user and, for a shared cache, the permission set — otherwise a performance optimization is a cross-customer disclosure mechanism.
>
> The quiet one is logs. Logging full prompts means logging retrieved document content and customer queries, and over months that's a complete shadow copy of sensitive data — usually in a store with broader read access than the source systems and often with no retention policy. So: structured summaries by default, full payloads sampled or on failure only, identifiers hashed, retention set, access restricted.
>
> The control I'd add that covers most of this at once is an output provenance check — verifying every identifier in an answer came from the session or a permitted tool result. That catches retrieval leaks, cache leaks, memory leaks, and model disclosure with one structural check.
>
> And I'd flag tuning as a special case. Using production conversations to fine-tune is a leak if the basis doesn't exist, and it's effectively irreversible — you can't remove one customer's contribution from trained weights. That's a strong reason to require an explicit decision rather than letting it happen as a natural next step."

## 8. Likely Follow-ups

**Q: What's the most likely leak path?**
Retrieval — post-filtering, or a permission filter missing on one branch of hybrid search. The model generating something it shouldn't is the least likely, and it only occurs after a control above it already placed the data in context.

**Q: How does hybrid search leak?**
The dense and lexical retrievers are configured separately, so the ACL filter gets applied to one and not the other. The unfiltered branch returns documents the user can't see, they're fused into the results, and hybrid search becomes an authorization bypass.

**Q: What's wrong with caching by query?**
It serves one customer's answer to another. If the key is just the normalized query, an answer computed from customer A's account data is returned to customer B asking the same question. The key needs the authenticated user and the permission set.

**Q: Why are logs a leak path?**
Because logging full prompts logs retrieved document content and customer queries, building a shadow copy of sensitive data over months — typically in a store with broader read access than the source systems and no retention policy. Summaries by default, payloads sampled, identifiers hashed.

**Q: What single control covers the most paths?**
An output provenance check: every identifier in the answer must have come from the session or a permitted tool result. That catches retrieval leaks, cache leaks, memory leaks, and model disclosure at once, and it's structural rather than pattern-based.

## 9. Common Mistakes

- Filtering one retrieval branch and not the other.
- Cache keys without identity and permissions.
- Logging full prompts and responses universally.
- Agent memory keyed on conversation rather than authenticated user.
- Tuning on production conversations without an explicit basis.

## 10. What to Remember

- **The model is the last leak path**, not the first.
- **Hybrid search and caches** are the easiest leaks to introduce accidentally.
- **Logs become a shadow copy** — summarize, sample, hash, retain briefly.
- **Output provenance check** covers most paths with one control.
- **Tuning on customer data is irreversible** — require an explicit decision.
