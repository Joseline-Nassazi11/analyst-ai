// Save this as fix-responsive.js and run: node fix-responsive.js

const fs = require("fs");

// ── 1. Fix page.tsx ───────────────────────────────────────────────────────────
// Already provided as a separate file - copy responsive/page.tsx

// ── 2. Fix Header.tsx ─────────────────────────────────────────────────────────
// Already provided as a separate file - copy responsive/Header.tsx

// ── 3. Fix ChatPanel.tsx ─────────────────────────────────────────────────────
let chat = fs.readFileSync("./src/components/chat/ChatPanel.tsx", "utf8");

// Make outer container support column layout on mobile
chat = chat.replace(
  'className="flex h-full overflow-hidden bg-slate-50 dark:bg-[#080c14]"',
  'className="flex h-full overflow-hidden bg-slate-50 dark:bg-[#080c14] flex-col md:flex-row"',
);

// Hide left query panel on mobile
chat = chat.replace(
  'className="w-64 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#080c14] flex flex-col"',
  'className="hidden md:flex w-64 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#080c14] flex-col"',
);

// Add mobile input bar just before the last closing fragment tag
const mobileBar = `
        {/* ── Mobile input bar ── */}
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#080c14] p-3 flex-shrink-0">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask a research question..."
              className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-cyan-500"
            />
            {isLoading ? (
              <button type="button" onClick={stop}
                className="px-4 py-2.5 rounded-xl bg-red-500 text-white text-xs font-bold flex-shrink-0">
                Stop
              </button>
            ) : (
              <button type="submit" disabled={!input.trim()}
                className="px-4 py-2.5 rounded-xl bg-sky-600 dark:bg-cyan-500 hover:bg-sky-500 dark:hover:bg-cyan-400 text-white dark:text-slate-900 text-xs font-bold disabled:opacity-40 flex-shrink-0 transition-all">
                Send
              </button>
            )}
          </form>
        </div>
`;

// Insert mobile bar before the last </> closing tag
chat = chat.replace(/(\s+)<\/>\s*\);\s*}/, mobileBar + "\n    </>\n  );\n}");

fs.writeFileSync("./src/components/chat/ChatPanel.tsx", chat);
console.log("✓ ChatPanel.tsx fixed");

// ── 4. Fix DocumentsPanel - responsive grid ───────────────────────────────────
let docs = fs.readFileSync(
  "./src/components/documents/DocumentsPanel.tsx",
  "utf8",
);
docs = docs.replace(
  'className="grid grid-cols-3 gap-3"',
  'className="grid grid-cols-1 sm:grid-cols-3 gap-3"',
);
docs = docs.replace(
  'className="grid grid-cols-4 gap-2"',
  'className="grid grid-cols-2 sm:grid-cols-4 gap-2"',
);
fs.writeFileSync("./src/components/documents/DocumentsPanel.tsx", docs);
console.log("✓ DocumentsPanel.tsx fixed");

// ── 5. Fix AnalyticsPanel - responsive grids ──────────────────────────────────
let analytics = fs.readFileSync(
  "./src/components/analytics/AnalyticsPanel.tsx",
  "utf8",
);
analytics = analytics.replace(
  /className="grid grid-cols-4 gap-3"/g,
  'className="grid grid-cols-2 sm:grid-cols-4 gap-3"',
);
analytics = analytics.replace(
  /className="grid grid-cols-5 gap-3"/g,
  'className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"',
);
analytics = analytics.replace(
  /className="grid grid-cols-2 gap-4"/g,
  'className="grid grid-cols-1 sm:grid-cols-2 gap-4"',
);
fs.writeFileSync("./src/components/analytics/AnalyticsPanel.tsx", analytics);
console.log("✓ AnalyticsPanel.tsx fixed");

// ── 6. Fix ComparePanel - responsive grid ─────────────────────────────────────
let compare = fs.readFileSync(
  "./src/components/compare/ComparePanel.tsx",
  "utf8",
);
compare = compare.replace(
  'className="grid grid-cols-2 gap-2"',
  'className="grid grid-cols-1 sm:grid-cols-2 gap-2"',
);
fs.writeFileSync("./src/components/compare/ComparePanel.tsx", compare);
console.log("✓ ComparePanel.tsx fixed");

// ── 7. Fix Sidebar - ensure it works on all sizes ────────────────────────────
let sidebar = fs.readFileSync("./src/components/layout/Sidebar.tsx", "utf8");
sidebar = sidebar.replace(
  'className="flex h-full w-[260px] flex-col',
  'className="flex h-full w-[260px] min-w-[260px] flex-col',
);
fs.writeFileSync("./src/components/layout/Sidebar.tsx", sidebar);
console.log("✓ Sidebar.tsx fixed");

console.log("\n✅ All responsive fixes applied! Refresh your browser.");
