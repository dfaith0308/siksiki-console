-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE customer_type AS ENUM ('restaurant', 'retail', 'wholesale', 'supplier');
CREATE TYPE customer_status AS ENUM ('active', 'dormant', 'churn_risk');
CREATE TYPE customer_grade AS ENUM ('vip', 'core', 'normal', 'risk');
CREATE TYPE payment_status AS ENUM ('paid', 'unpaid', 'partial');
CREATE TYPE receivable_status AS ENUM ('normal', 'warning', 'risk', 'long_term');

-- ============================================================
-- TABLE: customers
-- ============================================================

CREATE TABLE customers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  type                  customer_type NOT NULL,
  phone                 TEXT,
  business_number       TEXT,
  industry              TEXT,
  status                customer_status NOT NULL DEFAULT 'active',
  grade                 customer_grade NOT NULL DEFAULT 'normal',
  first_order_date      DATE,
  last_order_date       DATE,
  total_orders          INT NOT NULL DEFAULT 0,
  total_revenue         NUMERIC(12,2) NOT NULL DEFAULT 0,
  avg_order_value       NUMERIC(12,2) NOT NULL DEFAULT 0,
  avg_order_cycle_days  INT NOT NULL DEFAULT 14,
  expected_reorder_date DATE,
  receivable_balance    NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: products
-- ============================================================

CREATE TABLE products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  category          TEXT,
  supply_price      NUMERIC(12,2) NOT NULL DEFAULT 0,
  base_price        NUMERIC(12,2) NOT NULL DEFAULT 0,
  margin_rate       NUMERIC(5,2) NOT NULL DEFAULT 0,
  reorder_cycle_days INT NOT NULL DEFAULT 14,
  last_sold_at      DATE,
  total_sold_qty    INT NOT NULL DEFAULT 0,
  total_sales       NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: orders
-- ============================================================

CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID NOT NULL REFERENCES customers(id)
                    ON DELETE RESTRICT ON UPDATE CASCADE,
  order_date      DATE NOT NULL,
  payment_method  TEXT,
  payment_status  payment_status NOT NULL DEFAULT 'unpaid',
  total_sales     NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_cost      NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_margin    NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: order_items
-- ============================================================

CREATE TABLE order_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES orders(id)
                  ON DELETE RESTRICT ON UPDATE CASCADE,
  product_id    UUID NOT NULL REFERENCES products(id)
                  ON DELETE RESTRICT ON UPDATE CASCADE,
  qty           INT NOT NULL CHECK (qty > 0),
  unit_price    NUMERIC(12,2) NOT NULL,
  supply_price  NUMERIC(12,2) NOT NULL,
  sales_amount  NUMERIC(12,2) NOT NULL,
  cost_amount   NUMERIC(12,2) NOT NULL,
  margin_amount NUMERIC(12,2) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: receivables
-- ============================================================

CREATE TABLE receivables (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID NOT NULL UNIQUE REFERENCES customers(id)
                    ON DELETE RESTRICT ON UPDATE CASCADE,
  total_unpaid    NUMERIC(12,2) NOT NULL DEFAULT 0,
  last_unpaid_date DATE,
  unpaid_count    INT NOT NULL DEFAULT 0,
  status          receivable_status NOT NULL DEFAULT 'normal',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: activities
-- ============================================================

CREATE TABLE activities (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      UUID NOT NULL REFERENCES customers(id)
                     ON DELETE RESTRICT ON UPDATE CASCADE,
  activity_type    TEXT NOT NULL,
  channel          TEXT,
  result           TEXT,
  next_action_date DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: backups (metadata)
-- ============================================================

CREATE TABLE backups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path       TEXT NOT NULL,
  schema_version  TEXT NOT NULL,
  triggered_by    TEXT NOT NULL DEFAULT 'scheduled',
  status          TEXT NOT NULL DEFAULT 'completed',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_orders_customer_date     ON orders(customer_id, order_date DESC);
CREATE INDEX idx_orders_order_date        ON orders(order_date);
CREATE INDEX idx_order_items_order_id     ON order_items(order_id);
CREATE INDEX idx_order_items_product_id   ON order_items(product_id);
CREATE INDEX idx_receivables_customer_id  ON receivables(customer_id);
CREATE INDEX idx_activities_customer_date ON activities(customer_id, next_action_date);
CREATE INDEX idx_customers_name           ON customers(name);
CREATE INDEX idx_products_name            ON products(name);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE customers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE products    ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities  ENABLE ROW LEVEL SECURITY;
ALTER TABLE backups     ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read/write all tables
CREATE POLICY "auth_all_customers"   ON customers   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_products"    ON products    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_orders"      ON orders      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_order_items" ON order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_receivables" ON receivables FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_activities"  ON activities  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_backups"     ON backups     FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- FUNCTION: update_customer_aggregates
-- Called after order insert/update/delete
-- ============================================================

CREATE OR REPLACE FUNCTION update_customer_aggregates(p_customer_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_orders        INT;
  v_total_revenue       NUMERIC(12,2);
  v_avg_order_value     NUMERIC(12,2);
  v_first_order_date    DATE;
  v_last_order_date     DATE;
  v_avg_cycle_days      INT;
  v_expected_reorder    DATE;
  v_order_dates         DATE[];
  v_i                   INT;
  v_gap_sum             INT := 0;
  v_gap_count           INT := 0;
BEGIN
  SELECT
    COUNT(*)::INT,
    COALESCE(SUM(total_sales), 0),
    COALESCE(AVG(total_sales), 0),
    MIN(order_date),
    MAX(order_date)
  INTO
    v_total_orders,
    v_total_revenue,
    v_avg_order_value,
    v_first_order_date,
    v_last_order_date
  FROM orders
  WHERE customer_id = p_customer_id;

  -- compute avg cycle from consecutive order gaps
  SELECT ARRAY_AGG(order_date ORDER BY order_date ASC)
  INTO v_order_dates
  FROM orders
  WHERE customer_id = p_customer_id;

  IF array_length(v_order_dates, 1) >= 2 THEN
    FOR v_i IN 2..array_length(v_order_dates, 1) LOOP
      v_gap_sum   := v_gap_sum + (v_order_dates[v_i] - v_order_dates[v_i - 1]);
      v_gap_count := v_gap_count + 1;
    END LOOP;
    v_avg_cycle_days := ROUND(v_gap_sum::NUMERIC / v_gap_count);
  ELSE
    v_avg_cycle_days := 14;
  END IF;

  IF v_last_order_date IS NOT NULL THEN
    v_expected_reorder := v_last_order_date + v_avg_cycle_days;
  END IF;

  UPDATE customers SET
    total_orders          = v_total_orders,
    total_revenue         = v_total_revenue,
    avg_order_value       = v_avg_order_value,
    first_order_date      = v_first_order_date,
    last_order_date       = v_last_order_date,
    avg_order_cycle_days  = v_avg_cycle_days,
    expected_reorder_date = v_expected_reorder
  WHERE id = p_customer_id;
END;
$$;

-- ============================================================
-- FUNCTION: update_receivable
-- Called after order insert/update
-- ============================================================

CREATE OR REPLACE FUNCTION update_receivable(p_customer_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_unpaid    NUMERIC(12,2);
  v_unpaid_count    INT;
  v_last_unpaid     DATE;
  v_status          receivable_status;
BEGIN
  SELECT
    COALESCE(SUM(total_sales), 0),
    COUNT(*)::INT,
    MAX(order_date)
  INTO
    v_total_unpaid,
    v_unpaid_count,
    v_last_unpaid
  FROM orders
  WHERE customer_id = p_customer_id
    AND payment_status != 'paid';

  -- determine status
  IF v_total_unpaid = 0 THEN
    v_status := 'normal';
  ELSIF v_last_unpaid IS NOT NULL AND (CURRENT_DATE - v_last_unpaid) > 90 THEN
    v_status := 'long_term';
  ELSIF v_total_unpaid > 1000000 THEN
    v_status := 'risk';
  ELSIF v_total_unpaid > 300000 THEN
    v_status := 'warning';
  ELSE
    v_status := 'normal';
  END IF;

  INSERT INTO receivables (customer_id, total_unpaid, last_unpaid_date, unpaid_count, status)
  VALUES (p_customer_id, v_total_unpaid, v_last_unpaid, v_unpaid_count, v_status)
  ON CONFLICT (customer_id) DO UPDATE SET
    total_unpaid     = EXCLUDED.total_unpaid,
    last_unpaid_date = EXCLUDED.last_unpaid_date,
    unpaid_count     = EXCLUDED.unpaid_count,
    status           = EXCLUDED.status;

  UPDATE customers SET receivable_balance = v_total_unpaid WHERE id = p_customer_id;
END;
$$;

-- ============================================================
-- FUNCTION: update_product_aggregates
-- ============================================================

CREATE OR REPLACE FUNCTION update_product_aggregates(p_product_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_qty   INT;
  v_total_sales NUMERIC(12,2);
  v_last_sold   DATE;
BEGIN
  SELECT
    COALESCE(SUM(oi.qty), 0),
    COALESCE(SUM(oi.sales_amount), 0),
    MAX(o.order_date)
  INTO v_total_qty, v_total_sales, v_last_sold
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE oi.product_id = p_product_id;

  UPDATE products SET
    total_sold_qty = v_total_qty,
    total_sales    = v_total_sales,
    last_sold_at   = v_last_sold
  WHERE id = p_product_id;
END;
$$;
-- ============================================================
-- RPC: create_order_transactional
-- Atomically creates order + items + updates aggregates
-- ============================================================

CREATE OR REPLACE FUNCTION create_order_transactional(
  p_customer_id    UUID,
  p_order_date     DATE,
  p_payment_method TEXT,
  p_payment_status payment_status,
  p_total_sales    NUMERIC(12,2),
  p_total_cost     NUMERIC(12,2),
  p_total_margin   NUMERIC(12,2),
  p_items          JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_item     JSONB;
BEGIN
  -- Insert order
  INSERT INTO orders (
    customer_id, order_date, payment_method, payment_status,
    total_sales, total_cost, total_margin
  )
  VALUES (
    p_customer_id, p_order_date, p_payment_method, p_payment_status,
    p_total_sales, p_total_cost, p_total_margin
  )
  RETURNING id INTO v_order_id;

  -- Insert order items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO order_items (
      order_id, product_id, qty,
      unit_price, supply_price,
      sales_amount, cost_amount, margin_amount
    )
    VALUES (
      v_order_id,
      (v_item->>'product_id')::UUID,
      (v_item->>'qty')::INT,
      (v_item->>'unit_price')::NUMERIC(12,2),
      (v_item->>'supply_price')::NUMERIC(12,2),
      (v_item->>'sales_amount')::NUMERIC(12,2),
      (v_item->>'cost_amount')::NUMERIC(12,2),
      (v_item->>'margin_amount')::NUMERIC(12,2)
    );

    -- Update product aggregates
    PERFORM update_product_aggregates((v_item->>'product_id')::UUID);
  END LOOP;

  -- Update customer aggregates
  PERFORM update_customer_aggregates(p_customer_id);

  -- Update receivables
  PERFORM update_receivable(p_customer_id);

  RETURN jsonb_build_object('id', v_order_id);
END;
$$;

-- ============================================================
-- RPC: delete_order_transactional
-- ============================================================

CREATE OR REPLACE FUNCTION delete_order_transactional(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_customer_id UUID;
  v_product_ids UUID[];
BEGIN
  SELECT customer_id INTO v_customer_id FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  SELECT ARRAY_AGG(product_id) INTO v_product_ids
  FROM order_items WHERE order_id = p_order_id;

  DELETE FROM order_items WHERE order_id = p_order_id;
  DELETE FROM orders WHERE id = p_order_id;

  IF v_product_ids IS NOT NULL THEN
    FOR i IN 1..array_length(v_product_ids, 1) LOOP
      PERFORM update_product_aggregates(v_product_ids[i]);
    END LOOP;
  END IF;

  PERFORM update_customer_aggregates(v_customer_id);
  PERFORM update_receivable(v_customer_id);
END;
$$;

-- ============================================================
-- RPC: update_receivable (wrapper for server actions)
-- ============================================================

CREATE OR REPLACE FUNCTION update_receivable(p_customer_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM update_receivable(p_customer_id);
END;
$$;
