# Code Chunking

> **Phase 10 · RAG CHUNKING · Topic 09**

## 1. Definition

Splitting source code on syntactic boundaries — functions, classes, modules — rather than by token count, and enriching each chunk with the context needed to interpret it: file path, imports, and enclosing class.

## 2. Simple Explanation

Code has hard structural boundaries that text doesn't. A function is a complete unit; half a function is not code, it's a syntax error.

And a function taken out of its file loses almost everything: which module it's in, what the imports refer to, what class it belongs to. A chunk containing just `def process(self, tx): return self._validate(tx)` is nearly meaningless alone.

## 3. How It Works

1. **Parse with a language-aware tool** — tree-sitter, or a language-specific AST parser.
2. **Split on definitions** — functions, methods, classes. Never mid-body.
3. **Enrich each chunk** with:
   - File path
   - Import statements (or a summary of them)
   - Enclosing class signature, for methods
   - The docstring, if separate
4. **Handle oversized functions** — split on logical blocks, repeating the signature.
5. **Index separately from prose** — code and documentation need different retrieval treatment.

```python
# Enriched chunk text before embedding:
"""
File: src/payments/processor.py
Imports: from .validators import TransactionValidator, FraudCheck
Class: class PaymentProcessor(BaseProcessor)

def process_international(self, tx: Transaction) -> Result:
    '''Process an international wire transfer.'''
    self._validate(tx)
    fee = self._calculate_fee(tx, region=tx.destination_region)
    return self._execute(tx, fee)
"""
```

## 4. Practical Example

**Why token-count splitting fails on code:**

```python
# Split at 400 tokens, mid-function:

# --- chunk N ---
def calculate_fee(self, tx, region):
    base = FEE_TABLE[region]["base"]
    if tx.amount > 10_000:
        base *= 1.5
    if self.account.tier == "premier":
# --- chunk N+1 ---
        base *= 0.5
        if self.waivers_used_this_month < 2:
            base = 0
    return round(base, 2)

Neither chunk is valid code. Neither answers "how is the
Premier fee calculated?" — chunk N has the condition without
the effect, chunk N+1 has the effect without the condition.
```

**The retrieval difference from enrichment:**

```
Raw:      "def process(self, tx): return self._execute(tx, fee)"
          Query: "how do we handle international payments?"
          → poor match; the chunk never says "international" or "payment"

Enriched: "File: src/payments/processor.py
           Class: PaymentProcessor
           def process_international(self, tx): ..."
          → strong match
```

**Two indexes usually beats one:**

```
Code index:  functions, classes, enriched as above
Docs index:  README, API docs, architecture notes, comments

A question like "how does fee calculation work?" often wants
the documentation. "Where is calculate_fee defined?" wants the code.
Routing between them beats blending both into one index.
```

## 5. Why It Matters

- **Code has unambiguous boundaries** — there's no excuse for character-count splitting.
- **Enrichment matters more for code than for prose**, because identifiers are terse and context-dependent.
- **It's a common real use case** — internal code search, onboarding assistants, migration tooling.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Splitting mid-function** | Produces invalid, uninterpretable chunks |
| **No file path or imports** | Chunk is unattributable and its dependencies are invisible |
| **Losing the class context** | A method without its class is missing half its meaning |
| **Very large functions** | A 2,000-line function needs splitting; repeat the signature on each piece |
| **Dense retrieval on identifiers** | Exact symbol names need BM25 — dense embeddings blur `calculate_fee` and `compute_charge` |
| **Generated and vendored code indexed** | Floods the index with content nobody asks about |
| **Cross-file dependencies invisible** | A chunk can't express "this calls that in another module" |

**Hybrid retrieval is especially important for code.** Developers search for exact symbol names, error strings, and file paths — all of which are lexical matches that dense retrieval handles poorly. BM25 is arguably more important here than in prose RAG.

**On cross-file relationships:** for questions like "what calls this function," a call graph is the right structure, not a vector index. That's a case where [graph RAG](../09-advanced-rag/19-graph-rag.md) has a genuinely good fit.

## 7. Interview Answer

> "Code chunking splits on syntactic boundaries — functions, classes, modules — rather than by token count, using a language-aware parser like tree-sitter.
>
> The reason character splitting is clearly wrong here is that code has hard structural boundaries. Splitting mid-function produces chunks that aren't valid code and can't be interpreted. If a fee calculation gets cut between the Premier condition and its effect, one chunk has the condition without the consequence and the other has the consequence without the condition. Neither answers the question.
>
> Enrichment matters even more for code than for prose, because identifiers are terse. A chunk that's just 'def process(self, tx): return self._execute(tx, fee)' is nearly meaningless alone. I'd prepend the file path, the imports, and the enclosing class signature so the chunk is interpretable and so it matches queries that use domain vocabulary rather than the exact identifier.
>
> Hybrid retrieval is more important here than in prose RAG, because developers search for exact symbol names, error strings, and file paths — all lexical matches. Dense embeddings blur `calculate_fee` and `compute_charge` into the same region, so BM25 does real work.
>
> Two practical points. I'd exclude generated and vendored code, which otherwise floods the index with content nobody asks about. And for relationship questions like 'what calls this function,' a vector index is the wrong structure entirely — that's a call graph, and it's one of the cases where graph-based retrieval genuinely fits."

## 8. Likely Follow-ups

**Q: What tool would you use to parse code?**
tree-sitter, because it has grammars for most languages, is fast, and handles incomplete or syntactically invalid files gracefully — which matters when indexing a real repository. Language-specific AST parsers are more precise but mean a different tool per language. LangChain and LlamaIndex both wrap tree-sitter for this.

**Q: How do you handle very large functions?**
Split on logical blocks within the function and repeat the signature and docstring on each piece, so every chunk knows what function it belongs to. A 2,000-line function is usually a code smell, but you still have to index it. The signature repetition is what keeps the pieces interpretable.

**Q: Should code and documentation share an index?**
Usually not. They answer different questions and benefit from different retrieval treatment. "How does fee calculation work conceptually" wants the docs; "where is calculate_fee defined" wants the code. I'd keep separate indexes and route, or at minimum tag content type in metadata so retrieval can be filtered.

**Q: Why is hybrid retrieval more important for code?**
Because developer queries are heavily lexical — exact function names, error messages, file paths, config keys. Dense embeddings encode "this is a fee-related function," which puts `calculate_fee`, `compute_charge`, and `get_pricing` in roughly the same place. BM25 distinguishes them. The exact-match gap is larger in code than in prose.

**Q: How do you handle relationships between files?**
A vector index can't express them — a chunk has no way to say "this calls that." For call graphs, dependency analysis, or impact questions, you need a graph built from static analysis. That's a genuinely good fit for graph RAG, and it's one of the clearest cases where the graph structure earns its cost.

## 9. Common Mistakes

- Using a generic text splitter on source code.
- Omitting file path, imports, and class context from chunks.
- Indexing generated, vendored, and build-output code.
- Relying on dense retrieval alone when developers search for exact symbols.
- Expecting a vector index to answer "what calls this function."

## 10. What to Remember

- **Split on functions and classes** using a language-aware parser, never mid-body.
- **Enrich with file path, imports, and enclosing class** — identifiers are too terse alone.
- **Hybrid retrieval matters more here** — developers search for exact symbols.
- **Separate code and documentation indexes**, and route between them.
- **Relationship questions need a call graph**, not a vector index.
