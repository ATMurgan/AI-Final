export default function Header() {
  return (
    <header
      className="w-full border-b border-dawn-700 px-6 py-4 flex items-center justify-between"
      style={{
        background:
          "linear-gradient(135deg, #251038 0%, #5c1d5c 28%, #a03050 55%, #ea580c 80%, #f97316 100%)",
      }}
    >
      <div className="flex items-center gap-3">
        {/* Airplane logo mark */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #f59e0b, #f97316, #e11d48)" }}
        >
          <svg
            className="w-5 h-5 text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
          </svg>
        </div>
        <div>
          <span className="text-white font-bold text-xl tracking-tight leading-none">
            BudgetAdvisor
          </span>
          <p className="text-sunrise-100/70 text-[10px] tracking-widest uppercase leading-none mt-0.5">
            AI Travel Planner
          </p>
        </div>
      </div>
      <p className="text-white/60 text-sm hidden sm:block italic">
        Find the cheapest trip that fits your life.
      </p>
      <div className="w-8" />
    </header>
  );
}
