CREATE TABLE orders (
  id UUID PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'CONFIRMED')),
  total_cents BIGINT NOT NULL CHECK (total_cents BETWEEN 1 AND 100000000000),
  created_at TIMESTAMPTZ NOT NULL,
  confirmed_at TIMESTAMPTZ,
  CHECK ((status='PENDING' AND confirmed_at IS NULL) OR (status='CONFIRMED' AND confirmed_at IS NOT NULL))
);
CREATE TABLE order_items (
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position BETWEEN 0 AND 99),
  sku VARCHAR(64) NOT NULL CHECK (length(trim(sku)) > 0 AND sku=trim(sku)),
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 1000),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents BETWEEN 1 AND 1000000),
  PRIMARY KEY (order_id, position)
);
