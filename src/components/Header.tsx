export default function Header() {
  return (
    <header className="w-full bg-gradient-to-r from-ocean-950 via-ocean-900 to-ocean-950 border-b border-ocean-700 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-coral-500 flex items-center justify-center">
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064"
            />
          </svg>
        </div>
        <span className="text-white font-semibold text-xl tracking-tight">
          BudgetAdvisor
        </span>
      </div>
      <p className="text-gray-400 text-sm hidden sm:block">
        Find the cheapest trip that fits your life.
      </p>
      <div className="w-8" />
    </header>
  );
}
