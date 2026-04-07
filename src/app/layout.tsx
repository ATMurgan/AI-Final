import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BudgetAdvisor — Find the cheapest trip that fits your life",
  description:
    "AI-powered travel planner that finds the cheapest feasible itinerary based on your budget, origin, and preferences.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full font-sans antialiased">{children}</body>
    </html>
  );
}
