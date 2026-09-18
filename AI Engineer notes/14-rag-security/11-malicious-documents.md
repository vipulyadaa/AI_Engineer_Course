# Malicious Documents

> **Phase 14 · RAG SECURITY · Topic 11**

## 1. Definition

Documents crafted to harm the system when ingested or retrieved — carrying injected instructions, false facts designed to be cited, content designed to dominate retrieval, or payloads that exploit the parsing pipeline itself.

## 2. Simple Explanation

Your ingestion pipeline processes files from sources you may not fully control. Those files are untrusted input, exactly like a file upload in a web application.

Most RAG security thinking focuses on the query. The document pipeline is the surface that accepts arbitrary third-party content and processes it with parsers, and it gets far less attention.

## 3. How It Works

**Four attack types:**

| Type | Goal | Defense |
|---|---|---|
| **Injection carrier** | Instructions the model may follow | Ingestion scanning, delimiting, least privilege |
| **Poisoning** | False facts cited as evidence | Provenance, authority weighting, review |
| **Retrieval flooding** | Dominate results for target queries | Deduplication, per-source caps, anomaly detection |
| **Parser exploit** | Attack the ingestion pipeline itself | Sandboxing, resource limits, updated libraries |

**The fourth is the one people forget.** Document parsers are complex C libraries with a history of memory-safety vulnerabilities. A malformed PDF can be an attack on your ingestion infrastructure, independent of anything the LLM does.

```
Parsing sandbox:
  · run parsers in an isolated container, no network egress
  · CPU and memory limits (zip bombs, decompression bombs)
  · timeouts (parser hangs)
  · minimal filesystem access
  · keep parsing libraries patched
```

## 4. Practical Example

**Retrieval flooding — an attack that needs no injection at all:**

```
Attacker uploads 400 near-identical documents, each phrased
slightly differently, all stating the same false fact about
transfer limits.

Effect: for "transfer limit" queries, top-k fills with the
attacker's documents. The legitimate policy is crowded out.
No injected instruction. No malformed file. Just volume.

Defenses:
  · near-duplicate detection at ingestion (cluster and collapse)
  · per-source contribution caps in retrieval results
  · alerting on unusual ingestion volume from one source
  · diversity constraints in top-k (MMR)
```

**The ingestion-side control stack:**

```
1. SOURCE TIERING       third-party/uploaded content → low-trust tier
2. FILE VALIDATION      type sniffing, size limits, structure checks
3. SANDBOXED PARSING    isolated, no network, resource-limited
4. CONTENT SCANNING     instruction patterns, hidden text, anomalies
5. DEDUPLICATION        near-duplicate clustering
6. QUARANTINE           flagged → human review, not auto-reject
7. PROVENANCE           author, source, review status in metadata
```

**Quarantine over auto-reject, again:** auto-rejecting flagged documents lets an attacker plant trigger patterns in a *legitimate* document to keep it out of the index — a denial-of-service on your own corpus.

## 5. Why It Matters

- **The ingestion pipeline is an under-reviewed attack surface** that accepts arbitrary third-party files.
- **Parser exploits are a conventional security problem** that LLM-focused threat models miss entirely.
- **Retrieval flooding needs no sophistication** — just the ability to upload volume.

## 6. Trade-offs / Failure Modes

| Weakness | Detail |
|---|---|
| **Unsandboxed parsing** | A malformed file attacks your infrastructure |
| **No file validation** | Type confusion, decompression bombs |
| **No near-duplicate detection** | Flooding succeeds trivially |
| **Auto-rejecting flagged content** | Denial-of-service on the corpus |
| **No provenance** | Can't distinguish trusted from untrusted content later |
| **Over-scanning** | Legitimate documents blocked; ingestion becomes a bottleneck |

**On the false-positive cost:** content scanning for instruction-like patterns will flag legitimate documents — a policy about prompt engineering, a security training document, a transcript discussing injection. If the pipeline auto-blocks, those never get indexed and users experience it as missing content. Quarantine plus review handles it; auto-block doesn't.

**On where the real leverage is:** who can add documents to the corpus. Every technical control is downstream of that governance question, and in most enterprises the answer is a much wider group than expected.

## 7. Interview Answer

> "Malicious documents are files crafted to harm the system when ingested or retrieved. The framing I'd start with is that the ingestion pipeline accepts arbitrary third-party content and processes it with parsers — that's untrusted input, exactly like a file upload in a web application, and it gets far less security attention than the query surface.
>
> There are four attack types. Injection carriers, which embed instructions the model may follow. Poisoning, which supplies false facts to be cited. Retrieval flooding. And parser exploits.
>
> That last one is the one LLM-focused threat models miss entirely. Document parsers are complex libraries with a history of memory-safety vulnerabilities, and a malformed PDF is an attack on your ingestion infrastructure independent of anything the model does. So I'd run parsing in an isolated container with no network egress, CPU and memory limits for decompression bombs, timeouts for parser hangs, and keep the libraries patched. That's conventional application security applied to a pipeline people think of as a data pipeline.
>
> Retrieval flooding is the one that needs no sophistication. An attacker uploads four hundred near-identical documents stating the same false fact, and top-k fills with them for target queries — crowding out the legitimate policy. No injection, no malformed file, just volume. Near-duplicate detection at ingestion, per-source contribution caps in results, and alerting on unusual ingestion volume address it.
>
> The control I'd emphasize across all of these is quarantine rather than auto-reject. Auto-rejecting flagged documents lets an attacker plant trigger patterns in a legitimate document to keep it out of the index — a denial-of-service on your own corpus.
>
> And all of it is downstream of one governance question: who can add documents to the indexed corpus. In most enterprises that's a much wider group than anyone expects."

## 8. Likely Follow-ups

**Q: What's the attack type people miss?**
Parser exploits. Document parsing libraries are complex and have a history of memory-safety issues, so a malformed PDF can attack the ingestion infrastructure directly — nothing to do with the LLM. It needs conventional application-security controls: sandboxed parsing, no network egress, resource limits, timeouts, and patched libraries.

**Q: What is retrieval flooding?**
Uploading many near-identical documents stating the same false fact, so they dominate top-k for target queries and crowd out legitimate content. It requires no injection and no malformed files, just volume. Near-duplicate detection at ingestion, per-source caps on how many results one source can contribute, and ingestion-volume alerting address it.

**Q: Why quarantine rather than auto-reject?**
Because auto-rejection creates a denial-of-service path — an attacker plants trigger patterns in a legitimate document to keep it out of the index. It also has a false-positive cost: a security training document discussing prompt injection gets blocked, and users experience that as missing content. Quarantine keeps a human in the loop.

**Q: How do you validate uploaded files?**
Sniff the content type rather than trusting the extension, enforce size limits, check structural validity, and scan for decompression bombs before parsing. Then parse in a sandbox. It's the same checklist as any file-upload feature, which is the point — the ingestion pipeline is a file-upload feature that nobody reviewed as one.

**Q: What's the highest-leverage control?**
Narrowing who can add documents to the indexed corpus, and tiering the sources that remain by trust level. Every technical control is downstream of that. In most enterprises the set of people who can get a document into an indexed location is far larger than anyone assumes — open wikis, shared drives, email ingestion, upload features.

## 9. Common Mistakes

- Treating the ingestion pipeline as a data pipeline rather than an untrusted-input surface.
- Unsandboxed parsing of third-party files.
- No near-duplicate detection, making flooding trivial.
- Auto-rejecting flagged documents, creating a DoS path.
- Not asking who can actually add documents to the corpus.

## 10. What to Remember

- **The ingestion pipeline is untrusted input** — treat it like a file-upload feature.
- **Four types:** injection carrier, poisoning, retrieval flooding, parser exploit.
- **Parser exploits are conventional security** that LLM threat models miss.
- **Flooding needs no sophistication** — near-duplicate detection and per-source caps.
- **Quarantine, never auto-reject.** And ask who can add documents at all.
