# Memory (in LangChain)

> **Phase 15 · LANGCHAIN · Topic 13**

## 1. Definition

LangChain's mechanisms for carrying conversation history between turns — buffers, windows, summaries, and history-backed runnables that persist by session.

## 2. Simple Explanation

The model sees nothing except what's in the current request, so conversation history has to be re-sent every turn.

Memory is the policy for what to re-send: everything, the last N turns, a summary, or some combination. The old `Memory` classes are largely superseded by `RunnableWithMessageHistory` and explicit management.

## 3. How It Works

```python
from langchain_core.runnables.history import RunnableWithMessageHistory

chain_with_history = RunnableWithMessageHistory(
    chain,
    get_session_history,          # session_id → history store
    input_messages_key="question",
    history_messages_key="history",
)
chain_with_history.invoke(
    {"question": q},
    config={"configurable": {"session_id": session_id}},
)
```

**The classic strategies:** buffer (everything), window (last k turns), summary (LLM-compressed), and summary-buffer (recent verbatim plus older summarized).

**Summary-buffer is usually the right shape** — recent turns matter in full, older ones only as context.

## 4. Practical Example

**What LangChain memory doesn't solve for RAG:**

```
The hard problem in conversational RAG isn't storing history.
It's QUERY REWRITING — turning "and for Premier?" into a
standalone retrievable query.

Memory classes carry the history. They don't rewrite the
query, and without rewriting, a follow-up retrieves almost
nothing because its embedding is nearly meaningless.

So memory is necessary and not sufficient, and the rewriting
step is the one that determines multi-turn quality.
```

**That's the point worth making** — it's easy to configure memory, conclude that multi-turn is handled, and ship a system where every follow-up retrieves badly.

**Session storage and the banking consideration:**

```
get_session_history is backed by Redis, Firestore, Postgres,
or in-memory.

In banking that store holds customer conversation content,
which makes it:
  · personal data with retention limits
  · subject to erasure requests
  · requiring access control and encryption
  · needing strict partitioning by authenticated user

The severe failure is a session ID that isn't bound to the
authenticated user — then one customer's history can be
retrieved with another's request. That's a breach, and the
config-driven session_id makes it an easy mistake.
```

**On summarization:** summarizing conversation history is a lossy LLM call that can drop the specific figure the customer was told. For banking I'd keep recent turns verbatim, keep established facts as structured state, and summarize only the older conversational parts — never the numbers.

## 5. Why It Matters

- **Memory carries history but doesn't rewrite queries**, which is what multi-turn RAG actually needs.
- **Session stores hold customer data** and need the corresponding controls.
- **Session IDs must be bound to the authenticated user**, or history leaks across customers.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **No query rewriting** | Follow-ups retrieve almost nothing |
| **Unbound session IDs** | Cross-customer history leakage |
| **Buffer memory unbounded** | Context and cost grow every turn |
| **Summarization losing figures** | The specific fee quoted disappears |
| **Session store outside retention policy** | A compliance gap |
| **Legacy `Memory` classes** | Superseded; still common in examples |

**On unbounded buffers:** `ConversationBufferMemory` re-sends everything, so by turn twenty the cost per turn is several times turn one's. A window or summary-buffer is the practical default, with the original user request preserved verbatim regardless.

**On what to keep as state rather than conversation:** established facts — tier, account, verified details — belong in structured state re-injected each turn, not left to survive summarization. Facts are compact and must be exact; conversation is bulky and tolerates compression.

## 7. Interview Answer

> "LangChain memory carries conversation history between turns, since the model sees nothing except the current request. The strategies are buffer, window, summary, and summary-buffer — recent turns verbatim plus older ones summarized, which is usually the right shape. `RunnableWithMessageHistory` is the current mechanism; the older Memory classes are largely superseded.
>
> The point I'd make is that memory doesn't solve the hard problem in conversational RAG. That problem is query rewriting — turning 'and for Premier?' into a standalone retrievable query. Memory carries the history; it doesn't rewrite. And without rewriting, a follow-up retrieves almost nothing because its embedding is nearly meaningless on its own. So it's easy to configure memory, conclude multi-turn is handled, and ship a system where every follow-up retrieves badly.
>
> In banking the session store matters more than usual. It holds customer conversation content, which makes it personal data with retention limits, subject to erasure requests, needing access control and encryption. And the severe failure is a session ID not bound to the authenticated user — then one customer's history can be retrieved with another's request. The config-driven session_id makes that an easy mistake, because it's just a string passed in.
>
> On summarization, I'd be careful. It's a lossy LLM call that can drop the specific figure the customer was told. So I'd keep recent turns verbatim, keep established facts like tier and account as structured state re-injected each turn, and summarize only the older conversational parts — never the numbers. Facts are compact and must be exact; conversation is bulky and tolerates compression.
>
> And I'd avoid unbounded buffer memory. It re-sends everything, so by turn twenty the cost per turn is several times turn one's. A window or summary-buffer is the practical default, with the original user request preserved verbatim regardless of what else gets compressed."

## 8. Likely Follow-ups

**Q: What does memory not solve?**
Query rewriting. It carries the conversation history but doesn't turn "and for Premier?" into a standalone retrievable query, and without that a follow-up retrieves almost nothing. Configuring memory and assuming multi-turn RAG works is a common and costly mistake.

**Q: Which memory strategy would you use?**
Summary-buffer — recent turns verbatim, older ones summarized — with the original user request always kept verbatim. Unbounded buffers make per-turn cost grow every turn, and pure summarization loses detail from recent exchanges that still matters.

**Q: What's the security concern?**
Session IDs not bound to the authenticated user. The session ID is just a string in the config, so if it isn't derived from the verified session, one customer's history can be fetched with another's request. That's a breach, and the API makes it easy to get wrong.

**Q: What shouldn't be summarized?**
Numbers and established facts. A summary is a lossy LLM call that can drop the specific fee quoted earlier. I'd keep facts like tier and account in structured state re-injected each turn, and let summarization touch only older conversational content.

**Q: Is the session store subject to data protection rules?**
Yes — it holds customer conversation content, so it's personal data with retention limits, erasure obligations, access control, and encryption requirements. Treating it as ordinary application state rather than a customer data store is a compliance gap.

## 9. Common Mistakes

- Assuming memory handles multi-turn RAG without query rewriting.
- Using unbounded buffer memory in production.
- Session IDs not bound to the authenticated user.
- Summarizing content containing specific figures.
- Excluding the session store from retention and erasure policies.

## 10. What to Remember

- **Memory carries history; it doesn't rewrite queries** — rewriting is the real need.
- **Summary-buffer**, with the original request always verbatim.
- **Bind session IDs to the authenticated user** — otherwise history leaks.
- **Keep facts as structured state**, never trust summarization with numbers.
- **The session store is a customer data store** — retention and erasure apply.
