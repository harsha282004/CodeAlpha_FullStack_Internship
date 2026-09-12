// Single source of truth for the OrderStatus enum values on the frontend,
// so admin/history/detail views can't drift into showing an invalid status.
export const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled']
