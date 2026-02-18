# DOMAIN.md

## Domain Overview (Simple Hinglish)

IMS ka model: **N branches + 1 central warehouse**.

### Core flow

1. Purchase inbound hota hai central warehouse mein.
2. Warehouse se branch transfer hota hai demand ke basis pe.
3. Branch pe sales/fulfillment se stock reduce hota hai.
4. Stock adjustment events (positive/negative) ledger mein append hote hain.

### Ledger-first approach

- `StockLedger` append-only hai: past mutate nahi karte, sirf new events add karte hain.
- Current stock ko ledger aggregation se derive karte hain (`sum(quantityDelta)` by product/location).
- Audit aur traceability strong rehti hai.

### Multi-branch + single warehouse behavior

- Warehouse global replenishment point hai.
- Branch inventory operational level pe maintain hota hai.
- Transfer event logically 2 entries hoti hain:
  - warehouse out
  - branch in

### Optimizer concept

- Input: budget + product candidates.
- Product score mein ABC class weight use hota hai:
  - A = high priority
  - B = medium
  - C = lower
- Knapsack optimizer best mix suggest karta hai budget ke andar.
- Optional urgency/margin factors se service-level friendly decision milta hai.

### Forecasting starter

- Simple Exponential Smoothing (SES) use karke short-term demand estimate karte hain.
- Isse branch replenishment planning aur transfer decisions better hote hain.

## StockLedger scale notes (Indexing / Partitioning)

- Index combo: `(productId, createdAt)`, `(branchId, productId, createdAt)`, `(warehouseId, productId, createdAt)`.
- High write volume ke liye monthly range partitioning on `createdAt` consider karo.
- Old partitions ko archive/compress policy ke saath move kar sakte ho.
