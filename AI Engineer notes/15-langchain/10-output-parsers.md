# Output Parsers

> **Phase 15 · LANGCHAIN · Topic 10**

## 1. Definition

Components that convert model text into structured Python objects — strings, JSON, Pydantic models, lists — and inject formatting instructions into the prompt so the model produces parseable output.

## 2. Simple Explanation

The model returns text. You usually want an object.

An output parser handles both halves: telling the model what format to produce, and parsing what comes back. But the modern answer is usually to avoid parsing entirely by using structured output.

## 3. How It Works

```python
from langchain_core.output_parsers import PydanticOutputParser

class FeeAnswer(BaseModel):
    answer: str
    fee_amount: float | None
    citations: list[str]
    confident: bool

parser = PydanticOutputParser(pydantic_object=FeeAnswer)
prompt = ChatPromptTemplate.from_messages([
    ("system", "{format_instructions}"),
    ("human", "{question}"),
]).partial(format_instructions=parser.get_format_instructions())
```

**Parsers do two things:** `get_format_instructions()` goes into the prompt, and `parse()` handles the response. Both halves matter — a parser used without its format instructions will fail often.

## 4. Practical Example

**The better approach, where the provider supports it:**

```python
structured_llm = llm.with_structured_output(FeeAnswer)
result = structured_llm.invoke(messages)     # → FeeAnswer instance
```

```
This uses the provider's native function-calling or
structured-output mode, which CONSTRAINS DECODING to the
schema rather than asking the model to comply and parsing
the result.

Text parsing:     the model usually produces valid JSON
Constrained:      the output conforms by construction

For anything in production, prefer with_structured_output.
Text parsing is a fallback for models that don't support it.
```

**That distinction is the substantive point** — it's the difference between hoping and enforcing.

**On `OutputFixingParser` and `RetryOutputParser`:**

```
These catch a parse failure and call the model again to fix
the output. That's an extra LLM call to repair a problem
that constrained decoding prevents.

Useful with models lacking structured output support.
A sign of the wrong approach otherwise.
```

**What structured output doesn't give you:**

```
A FeeAnswer with fee_amount=25.00 is schema-valid. It says
nothing about whether $25 is the correct fee, or whether
the citations actually support it.

Schema validation is structural. Business validation and
grounding checks remain yours, and conflating the two is
the classic mistake here.
```

## 5. Why It Matters

- **`with_structured_output` constrains decoding** rather than parsing hopefully.
- **Fixing parsers signal the wrong approach** when structured output is available.
- **Schema validity isn't semantic correctness** — the boundary to state clearly.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Text parsing when constrained output exists** | Avoidable failures |
| **Parser without format instructions** | Frequent parse errors |
| **Fixing parsers as the primary strategy** | Extra calls repairing a preventable problem |
| **Deeply nested schemas** | Accuracy degrades with complexity |
| **Schema validity assumed correct** | Wrong values pass validation |
| **Streaming with structured output** | Partial JSON isn't parseable mid-stream |

**On streaming:** structured output and token streaming interact awkwardly — partial JSON can't be parsed until complete. For a chat interface where streaming matters, one workable pattern is streaming the prose answer as text while returning structured metadata separately, rather than forcing the whole response into one schema.

**On schema design:** flat schemas with enums and explicit nullable types work reliably; five-level nested objects with conditional requirements don't. Where a complex structure is needed, requesting the flat pieces and assembling in code is more reliable than asking the model for the whole shape in one call.

## 7. Interview Answer

> "Output parsers convert model text into structured objects and inject format instructions into the prompt. Both halves matter — a parser used without its format instructions fails often, because the model was never told what shape to produce.
>
> But the modern answer is usually to avoid text parsing entirely. `with_structured_output` uses the provider's native function-calling or structured-output mode, which constrains decoding to the schema rather than asking the model to comply and then parsing. The difference is between the model usually producing valid JSON and the output conforming by construction. For anything in production I'd prefer that; text parsing is a fallback for models that don't support it.
>
> That framing also tells you what OutputFixingParser and RetryOutputParser are. They catch a parse failure and call the model again to fix the output — an extra LLM call repairing a problem constrained decoding prevents. Useful with models lacking structured output support, and a sign of the wrong approach otherwise.
>
> The limit I'd state clearly: schema validity isn't semantic correctness. A response with a fee amount of twenty-five dollars is schema-valid, and that says nothing about whether twenty-five is the right fee or whether the citations actually support it. Business validation and grounding checks remain mine, and conflating structural with semantic validation is the classic mistake.
>
> Two practical points. Schema design matters — flat schemas with enums and explicit nullable types work reliably, while deeply nested objects with conditional requirements degrade accuracy. Where I need a complex structure I'd request flat pieces and assemble in code.
>
> And streaming interacts awkwardly with structured output, because partial JSON isn't parseable until complete. For a chat interface where streaming matters, I'd stream the prose answer as text and return structured metadata separately rather than forcing everything into one schema — otherwise you lose the largest perceived-latency improvement available."

## 8. Likely Follow-ups

**Q: Parser or `with_structured_output`?**
Structured output where the provider supports it — it constrains decoding so the response conforms by construction, rather than asking the model to comply and parsing the result. Text parsers are a fallback for models without that capability.

**Q: What are the fixing parsers for?**
Catching a parse failure and calling the model again to repair the output. They're useful with models that lack structured output support, but otherwise they're an extra LLM call solving a problem that constrained decoding prevents entirely.

**Q: Does structured output guarantee correctness?**
No — only structure. A schema-valid response can contain the wrong fee, an invented citation, or a claim the retrieved context doesn't support. Business validation and grounding checks remain the application's responsibility.

**Q: What makes a good schema?**
Flat, with enums where the value set is known, explicit nullable types rather than sentinel values, and per-field descriptions. Accuracy degrades with nesting depth, so requesting flat pieces and assembling complex structures in code is more reliable than asking for the whole shape.

**Q: How does this interact with streaming?**
Awkwardly — partial JSON can't be parsed mid-stream. For a chat interface I'd stream the prose answer as text and return structured metadata separately, since forcing everything into one schema means losing streaming, which is the biggest perceived-latency improvement available.

## 9. Common Mistakes

- Using text parsing when constrained structured output is available.
- Omitting format instructions from the prompt.
- Treating fixing parsers as a normal part of the design.
- Assuming schema validity implies semantic correctness.
- Forcing a streamed response into a single structured schema.

## 10. What to Remember

- **`with_structured_output` constrains decoding** — prefer it in production.
- **Parsers need their format instructions** in the prompt to work.
- **Fixing parsers repair a preventable problem.**
- **Schema validity ≠ correct content** — business validation stays yours.
- **Stream prose, return structure separately** rather than losing streaming.
