CREATE TABLE IF NOT EXISTS orders (
  id          BIGSERIAL PRIMARY KEY,
  number      TEXT        NOT NULL UNIQUE,
  order_type  TEXT        NOT NULL CHECK (order_type IN ('dine-in', 'take-out')),
  name        TEXT        NOT NULL,
  phone       TEXT        NOT NULL,
  pickup_at   TIMESTAMPTZ NOT NULL,
  placed_at   TIMESTAMPTZ NOT NULL,
  total       NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
  items       JSONB       NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'received'
              CHECK (status IN ('received', 'preparing', 'ready', 'collected')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_status_pickup_idx ON orders (status, pickup_at);
