export type CustomerType = 'restaurant' | 'retail' | 'wholesale' | 'supplier'
export type CustomerStatus = 'active' | 'dormant' | 'churn_risk'
export type CustomerGrade = 'vip' | 'core' | 'normal' | 'risk'
export type PaymentStatus = 'paid' | 'unpaid' | 'partial'
export type ReceivableStatus = 'normal' | 'warning' | 'risk' | 'long_term'

export interface Customer {
  id: string
  name: string
  type: CustomerType
  phone: string | null
  business_number: string | null
  industry: string | null
  status: CustomerStatus
  grade: CustomerGrade
  first_order_date: string | null
  last_order_date: string | null
  total_orders: number
  total_revenue: number
  avg_order_value: number
  avg_order_cycle_days: number
  expected_reorder_date: string | null
  receivable_balance: number
  created_at: string
}

export interface Product {
  id: string
  name: string
  category: string | null
  supply_price: number
  base_price: number
  margin_rate: number
  reorder_cycle_days: number
  last_sold_at: string | null
  total_sold_qty: number
  total_sales: number
  created_at: string
}

export interface Order {
  id: string
  customer_id: string
  order_date: string
  payment_method: string | null
  payment_status: PaymentStatus
  total_sales: number
  total_cost: number
  total_margin: number
  created_at: string
  customers?: Customer
  order_items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  qty: number
  unit_price: number
  supply_price: number
  sales_amount: number
  cost_amount: number
  margin_amount: number
  created_at: string
  products?: Product
}

export interface Receivable {
  id: string
  customer_id: string
  total_unpaid: number
  last_unpaid_date: string | null
  unpaid_count: number
  status: ReceivableStatus
  created_at: string
  customers?: Customer
}

export interface Activity {
  id: string
  customer_id: string
  activity_type: string
  channel: string | null
  result: string | null
  next_action_date: string | null
  created_at: string
  customers?: Customer
}

export interface CreateOrderItemInput {
  product_id: string
  qty: number
  unit_price: number
  supply_price: number
}

export interface CreateOrderInput {
  customer_id: string
  order_date: string
  payment_method?: string
  payment_status: PaymentStatus
  items: CreateOrderItemInput[]
}

export interface DashboardKPI {
  monthly_sales: number
  monthly_margin: number
  order_count: number
  avg_order_value: number
  active_customers: number
  total_receivables: number
  upcoming_reorders: number
  top_customers: { id: string; name: string; total_revenue: number }[]
  top_products: { id: string; name: string; total_sales: number }[]
}
