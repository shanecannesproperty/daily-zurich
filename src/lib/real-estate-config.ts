// Feature flag for the optional "Recently Sold & Leased" surface.
//
// Per the frontend spec the sold/leased route ships DISABLED: by default
// sold/leased stock is fully suppressed from the site so a buyer or renter can
// never mistake an unavailable property for available stock (ACL s18/s29).
// Enabling it is a deliberate toggle: flip this to true to expose the
// /real-estate/sold route and the "Recently sold" strip on the index, where
// every card is clearly labelled SOLD/LEASED with no enquire CTA.
export const SOLD_ROUTE_ENABLED = false;
