# Scalability

> **Phase 07 · VECTOR DATABASES · Topic 16**

## 1. Definition

How a vector search system grows along three independent axes — corpus size, query throughput, and write rate — and which resource binds first on each.

## 2. Simple Explanation

"Does it scale" is three different questions.

More vectors is a memory problem. More queries is a CPU and replica problem. More writes is an index-maintenance problem. They're solved by different things, and the one that bites first is usually memory.

## 3. How It Works

| Axis | Binding resource | Solution |
|---|---|---|
| **Corpus size** | Memory | Shard, or quantize |
| **Query throughput** | CPU | Replicate |
| **Write rate** | Index maintenance | Batch; separate write path |

```
SHARD  — split vectors across nodes; query all shards,
         merge results. Scales corpus size.
REPLICATE — full copy per node; route queries to any.
         Scales throughput. Does NOT scale corpus size.

They compose: N shards × M replicas.
```

**Scatter-gather is the cost of sharding:**

```
A query hits all shards, each returns its local top-k,
results are merged.

  · latency = SLOWEST shard, not the average
  · a single slow node degrades every query
  · retrieving top-10 across 8 shards means fetching
    80 candidates and merging

Tail latency gets worse as shard count rises, which is why
you shard when memory forces you to — not preemptively.
```

## 4. Practical Example

**Sizing from the numbers:**

```
50,000,000 chunks × 768 dims × 4 bytes  = 154 GB vectors
HNSW graph at M=16                       ≈   6 GB
Payloads (text + metadata)               ≈  50 GB+
                                          ────────
Resident for search:                      ~160 GB

Options:
  · one very large machine                  simplest
  · 4 shards of 40 GB                       commodity nodes
  · scalar quantization (int8), 4× smaller  → ~40 GB, one machine
  · PQ, 32× smaller                          → billion-scale territory

Scalar quantization first. It's the cheapest large win —
roughly 4× memory reduction for a small recall cost, and it
often removes the need to shard at all.
```

**That's the practically useful ordering:** quantize before sharding, because sharding adds a distributed system and quantization adds a configuration flag.

**What usually breaks first in practice:**

```
NOT query latency. Usually:

  1. Memory      — the index stops fitting
  2. Build time  — full re-index takes longer than the
                   maintenance window allows
  3. Write path  — updates can't keep up with the source
                   system's change rate

Build time is the one teams don't plan for. A corpus that takes
14 hours to index can't be re-indexed nightly, which constrains
how quickly you can change chunking or embedding models.
```

## 5. Why It Matters

- **The three axes need different solutions**, and conflating them produces the wrong architecture.
- **Quantization before sharding** avoids a distributed system for a configuration change.
- **Build time is an under-planned constraint** that limits how fast you can iterate.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Sharding for throughput** | Wrong tool — replicate instead |
| **Replicating for corpus size** | Doesn't help; each replica holds everything |
| **Scatter-gather tail latency** | Bound by the slowest shard |
| **Rebalancing on shard changes** | Expensive and usually manual |
| **Build time exceeding the window** | Blocks iteration on chunking and models |
| **Uneven shards** | One hot shard bounds everything |

**On sharding strategy:** random assignment gives even load but requires querying every shard. Sharding by tenant means a query touches one shard, which is better for latency and isolation — but risks a large tenant dominating a node. For a multi-tenant banking system, tenant-based sharding with the largest tenants isolated is usually the right shape, and it composes with namespaces.

**On replicas and consistency:** replicas must be updated too, so a high write rate multiplies write cost by the replica count. Some architectures separate a write-optimized path from read replicas with a lag, which is acceptable for documentation but needs thought for anything where freshness is a correctness property.

## 7. Interview Answer

> "Scalability here is three separate questions with different answers. Corpus size is a memory problem, solved by sharding or quantization. Query throughput is a CPU problem, solved by replication. Write rate is an index-maintenance problem, solved by batching and separating the write path. Sharding doesn't help throughput and replication doesn't help corpus size, so conflating them produces the wrong architecture.
>
> Concretely: fifty million chunks at 768 dimensions is about a hundred and fifty-four gigabytes of vectors, plus the graph and the payloads — roughly a hundred and sixty gigabytes resident. The options are one very large machine, four shards, or quantization.
>
> I'd reach for scalar quantization first. Int8 gives roughly four times memory reduction for a small recall cost, which brings a hundred and sixty gigabytes down to around forty — one machine. That's the useful ordering: quantize before sharding, because sharding adds a distributed system and quantization adds a configuration flag.
>
> The cost of sharding is scatter-gather. Every query hits all shards and latency is bound by the slowest one, not the average, so a single slow node degrades every query and tail latency worsens as shard count rises. That's why I'd shard when memory forces it rather than preemptively. On strategy, random assignment balances load but touches every shard; sharding by tenant means one shard per query, which is better for latency and isolation, with the risk that a large tenant dominates a node. For multi-tenant banking, tenant-based sharding with the biggest tenants isolated is usually the right shape and it composes with namespaces.
>
> What actually breaks first, in my experience of reasoning about these systems, isn't query latency — it's memory, then build time. Build time is the one teams don't plan for: a corpus taking fourteen hours to index can't be re-indexed nightly, and that constrains how quickly you can change chunking or swap embedding models. That's a real limit on iteration speed, not just an operational annoyance."

## 8. Likely Follow-ups

**Q: Sharding or replication?**
Different problems. Shard when the corpus doesn't fit in memory on one node — it splits the vectors. Replicate when you need more queries per second — each replica holds a full copy. They compose as N shards times M replicas, but neither substitutes for the other.

**Q: What's the cost of sharding?**
Scatter-gather. Every query hits all shards and waits for the slowest, so tail latency is governed by your worst node and gets worse as shard count rises. You also fetch more candidates than you need — top-ten across eight shards means merging eighty. That's why sharding should be forced by memory, not chosen preemptively.

**Q: What would you do before sharding?**
Scalar quantization. Int8 gives around four times memory reduction for a modest recall cost and often removes the need to shard entirely — a configuration change instead of a distributed system. Product quantization is the next step, but that's billion-scale territory with a much larger recall cost.

**Q: How would you shard a multi-tenant system?**
By tenant, so each query touches one shard — better latency, better isolation, and it composes with namespaces. The risk is a large tenant dominating a node, so I'd isolate the biggest tenants onto their own shards and pack the long tail together.

**Q: What breaks first at scale?**
Memory usually, then build time. Build time is the under-planned one — a corpus taking fourteen hours to index can't be re-indexed nightly, which limits how quickly you can iterate on chunking strategy or migrate embedding models. It's a constraint on development speed, not just operations.

## 9. Common Mistakes

- Sharding to increase throughput or replicating to increase capacity.
- Sharding before trying quantization.
- Ignoring that scatter-gather latency follows the slowest shard.
- Not planning for index build time as a hard constraint.
- Allowing uneven shards where one hot node bounds the system.

## 10. What to Remember

- **Three axes:** corpus size → memory, throughput → CPU, writes → maintenance.
- **Shard for size, replicate for throughput.** They don't substitute.
- **Quantize before sharding** — a flag beats a distributed system.
- **Scatter-gather latency follows the slowest shard.**
- **Build time is the under-planned constraint** and it limits iteration speed.
