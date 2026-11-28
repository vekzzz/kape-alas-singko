# Kapé Alas-Singko — Entity Relationship Diagram

Database for the backend (Postgres, managed with Drizzle). It is based on what the frontend shows and sends, and it replaces the data that used to live in `frontend/src/data/menu.ts`, `frontend/src/lib/pricing.ts`, `frontend/src/lib/time.ts` and `frontend/src/lib/shop.ts`. The API that sits on top of it is in [api.md](api.md).

```mermaid
erDiagram
    menu_groups ||--o{ menu_items : contains
    menu_items ||--o{ menu_item_option_groups : offers
    option_groups ||--o{ menu_item_option_groups : "offered on"
    option_groups ||--|{ option_values : has
    option_values |o--o{ menu_item_option_groups : "default for"

    orders ||--|{ order_items : contains
    menu_items |o--o{ order_items : "ordered as"
    order_items ||--o{ order_item_options : "customized with"
    option_values ||--o{ order_item_options : "chosen as"

    orders ||--|{ order_status_events : "moves through"
    staff |o--o{ order_status_events : records
    staff ||--o{ staff_sessions : "logs in with"

    menu_groups {
        text id PK "espresso, slow, cold, bakery"
        text name "Espresso bar"
        text tagline
        smallint morning_position "menu order before 11 AM and after 6 PM"
        smallint afternoon_position "menu order 11 AM to 6 PM, cold bar first"
    }

    menu_items {
        text id PK "slug, e.g. spanish-latte"
        text group_id FK
        text name
        text description
        text note "caveat, e.g. Contains walnuts. Nullable"
        integer base_price_centavos "17000 = PHP 170"
        text tone "hex colour for product art"
        text stage_background "hex, page background for this item"
        text stage_ink "hex, text colour on that background"
        text art "cup, small-cup, demitasse, mug, glass, press, pour-over, pastry"
        numeric coffee_ratio "0 to 1, product art fill. Nullable"
        boolean iced_only
        boolean is_sold_out
        boolean is_active "hide without deleting"
        smallint position
        timestamptz created_at
        timestamptz updated_at
    }

    option_groups {
        text id PK "size, temperature, milk, extra_shot"
        text label
        text kind "single or toggle"
        smallint position
    }

    option_values {
        bigint id PK
        text group_id FK
        text code "regular, large, hot, iced, whole, oat, none, extra"
        text label
        integer price_delta_centavos "large +3000, oat +4000, extra shot +5000"
        smallint position
    }

    menu_item_option_groups {
        text menu_item_id PK, FK
        text option_group_id PK, FK
        bigint default_value_id FK "e.g. cold brew defaults to no milk"
    }

    orders {
        bigint id PK
        text public_id UK "128-bit random, base64url, used in customer and staff URLs"
        text number "A5-K7P, made by the server"
        date business_date "Manila date of pickup_at"
        text idempotency_key UK "UUID sent by the client per checkout attempt"
        text order_type "dine-in or take-out"
        text customer_name "max 30 chars"
        text phone "09XXXXXXXXX, nullable, cleared 30 days after done"
        timestamptz pickup_at "15-minute slot"
        timestamptz placed_at
        integer total_centavos "recomputed on the server"
        text status "received, preparing, ready, collected, cancelled"
        text cancel_reason "sold_out, customer_request, no_show, other. Nullable"
        text payment_method "cash or gcash, set at counter. Nullable"
        timestamptz paid_at "nullable"
        timestamptz created_at
        timestamptz updated_at
    }

    order_items {
        bigint id PK
        bigint order_id FK
        text menu_item_id FK "nullable if item later removed"
        text item_name "snapshot"
        integer unit_price_centavos "snapshot, extras included"
        smallint quantity "1 to 99"
        integer line_total_centavos
        text note "e.g. less ice. Nullable"
        smallint position
    }

    order_item_options {
        bigint order_item_id PK, FK
        text option_group_id PK "one choice per group per line"
        bigint option_value_id FK
        text label "snapshot, e.g. oat milk"
        integer price_delta_centavos "snapshot"
    }

    order_status_events {
        bigint id PK
        bigint order_id FK
        text status
        text actor "customer, staff or system"
        bigint staff_id FK "set only when actor is staff"
        timestamptz changed_at
    }

    staff {
        bigint id PK
        text name
        text email UK
        text password_hash "argon2id"
        text role "barista or manager"
        boolean is_active
        timestamptz created_at
    }

    staff_sessions {
        bigint id PK
        bigint staff_id FK
        text token_hash UK "SHA-256 of the opaque bearer token"
        timestamptz created_at
        timestamptz last_used_at
        timestamptz expires_at "12 h, pushed forward while in use"
        timestamptz revoked_at "set on logout. Nullable"
    }

    shop_settings {
        smallint id PK "single row, always 1"
        text name "Kapé Alas-Singko"
        text address "Magsaysay Avenue, Naga City"
        text timezone "Asia/Manila"
        text order_prefix "A5-"
        smallint slot_minutes "15"
        smallint min_lead_minutes "10"
        boolean accepting_orders "pause online orders"
        timestamptz updated_at
    }

    opening_hours {
        smallint weekday PK "0 Sunday to 6 Saturday"
        time opens_at "05:00"
        time closes_at "21:00"
        boolean is_closed
    }

    shop_closures {
        date closed_on PK
        text reason "holiday, maintenance"
    }
```

## Constraints and indexes

- `orders`: `UNIQUE (number, business_date)`, `UNIQUE (public_id)`, `UNIQUE (idempotency_key)`. Index on `(business_date, status, pickup_at)` for the board and on `updated_at` for the `?since=` cursor.
- `order_item_options`: composite foreign key `(option_value_id, option_group_id)` to `option_values (id, group_id)`, so a line cannot have two milks or a value from the wrong group. Primary key `(order_item_id, option_group_id)`.
- `order_status_events`: `CHECK (actor <> 'staff' OR staff_id IS NOT NULL)`.
- `orders.status` and `cancel_reason` are `CHECK` constrained to their lists. `cancel_reason` is required when `status = 'cancelled'`.
- All money columns are integer centavos with `CHECK (>= 0)`. The API and the database use the same unit.

## Notes

- **Snapshots on orders.** `order_items` and `order_item_options` copy the name, label and price at the time of ordering, so a later menu or price change does not rewrite past orders. This replaces the `items JSONB` column in the old `backend/db/schema.sql`, which is dropped.
- **Customizations.** `menu_item_option_groups` replaces the `hasSizes`, `hasTemperatures`, `hasMilk` and `hasExtraShot` flags. An item with no rows (bakery) is not customizable. `iced_only` items skip the temperature group.
- **Presentation columns.** `stage_background`, `stage_ink` and `art` replace `STAGE_COLORS` and the item-id checks in `pickVessel`. The SVG drawings stay in the frontend and are picked by `art`. An iced drink still draws as a glass at runtime.
- **No customers table.** The site has no accounts. "My orders" stays in the browser (zustand `persist`): up to 5 orders, each kept until 2 hours after pickup. Orders keep their own name and phone.
- **Business date.** `business_date` is the Manila date of `pickup_at`, not `placed_at`. An order placed at 9:30 PM for 5 AM belongs to tomorrow's queue. Order numbers are unique within a business date, not forever.
- **Staff.** Replaces the single shared `STAFF_TOKEN`. `order_status_events` gives the tracker real timestamps for each step and records who moved the order. `barista` and `manager` have the same rights in v1.
- **Phone retention.** `orders.phone` is set to null 30 days after an order is collected or cancelled. The cleanup query runs when staff log in.
- **Seed.** The menu is seeded from the old `menu.ts` by an idempotent `npm run seed` (upsert), so rerunning it never duplicates rows.
