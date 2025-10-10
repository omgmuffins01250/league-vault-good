export const MEMBERSHIP_PLANS = [
  {
    id: "league-member",
    name: "League Member",
    price: 30,
    billingInterval: "year",
    description: "Get up to 5 leagues across any platform.",
    perks: [
      "All data: H2H matchups, Career stats, Monetary analysis, Luck Index",
      "Weekly Outlooks",
      "Yearly Recaps",
      "5 leagues at a time",
    ],
  },
  {
    id: "commissioner",
    name: "Commissioner",
    price: 50,
    billingInterval: "year",
    description: "Unlimited leagues with access for everyone in them.",
    perks: [
      "All data: H2H matchups, Career stats, Monetary analysis, Luck Index",
      "Weekly Outlooks",
      "Yearly Recaps",
      "Unlimited leagues",
      "Access for your league mates",
    ],
    badge: "Best Value",
  },
];

export function getPlanById(planId) {
  return MEMBERSHIP_PLANS.find((plan) => plan.id === planId) || null;
}
