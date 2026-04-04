# Backend Changes Required: QR Pagination & Filtering

## Context

The frontend has a new **All QR Tags** page (`/tags/all`) that needs the backend `GET /qr` endpoint to support:
1. **Dynamic `page_size`** — currently hardcoded to 10, needs to accept any value (frontend will send 20)
2. **Status filtering** — a new `status` query parameter to filter by `active` or `inactive`

---

## What to Change

### Endpoint: `GET /qr`

Update the existing `GET /qr` endpoint to accept these query parameters:

| Parameter   | Type     | Default | Description |
|-------------|----------|---------|-------------|
| `page`      | int      | 1       | Page number (1-indexed) — **already exists** |
| `page_size` | int      | 10      | Items per page — **make this dynamic instead of hardcoded** |
| `status`    | str/None | None    | Optional filter: `"active"` or `"inactive"`. If omitted or empty, return all tags. |

### Required Response Format (keep existing structure)

```json
{
  "items": [
    { "id": "00000001", "notes": "QR-1", "status": "active" },
    { "id": "00000002", "notes": "QR-2", "status": "inactive" }
  ],
  "total": 55,
  "page": 1,
  "page_size": 20,
  "total_pages": 3
}
```

- `total` must reflect the count **after** the status filter is applied
- `total_pages` = `ceil(total / page_size)`

---

## Implementation Steps

### Step 1: Update the route function signature

Add `page_size` as a dynamic parameter (instead of hardcoded 10) and add `status`:

```python
@router.get("/qr")
async def list_qr_codes(
    page: int = 1,
    page_size: int = 10,       # <-- Make this a parameter, was hardcoded before
    status: str | None = None,  # <-- NEW: optional status filter
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
```

### Step 2: Apply status filter to the query

Before pagination, add a WHERE clause if `status` is provided:

```python
query = select(QRCode)

# NEW: Apply status filter
if status and status in ("active", "inactive"):
    query = query.where(QRCode.status == status)
```

### Step 3: Use `page_size` from the parameter (not hardcoded)

Replace any hardcoded `10` or `PAGE_SIZE` constant with the `page_size` parameter:

```python
# Count total (after filter)
count_query = select(func.count()).select_from(query.subquery())
total = (await db.execute(count_query)).scalar()

# Paginate using the dynamic page_size
offset = (page - 1) * page_size
query = query.offset(offset).limit(page_size)
result = await db.execute(query)
items = result.scalars().all()

return {
    "items": items,
    "total": total,
    "page": page,
    "page_size": page_size,
    "total_pages": ceil(total / page_size) if page_size > 0 else 1
}
```

### Step 4 (Optional): Add validation

```python
# Clamp page_size to a reasonable range
page_size = max(1, min(page_size, 100))
```

---

## Summary of Changes

1. **`page_size`**: Change from hardcoded `10` to a query parameter (default still `10`)
2. **`status`**: Add new optional query parameter, filter the DB query when provided
3. **`total` / `total_pages`**: Must reflect filtered count, not total count of all tags

That's it — no new endpoints, no schema changes, just 2 new query params on the existing `GET /qr` route.

---

## After Backend Changes

Once deployed, update the frontend `AllTags.jsx` file:
- Change `PAGE_SIZE` from `10` to `20` (line 8, marked with a TODO comment)