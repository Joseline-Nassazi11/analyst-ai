const fs = require("fs");
const file = "src/components/documents/DocumentsPanel.tsx";
let c = fs.readFileSync(file, "utf8");

// Add recharts import
if (c.indexOf("recharts") === -1) {
  c = c.replace(
    "import { cn } from '@/lib/utils/cn';",
    "import { cn } from '@/lib/utils/cn';\nimport { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';",
  );
  console.log("recharts added");
} else {
  console.log("recharts already present");
}

// Add CSV states
if (c.indexOf("selectedCSV") === -1) {
  c = c.replace(
    "const [loading, setLoading] = useState(false);",
    "const [loading, setLoading] = useState(false);\n  const [selectedCSV, setSelectedCSV] = useState(null);\n  const [csvChartData, setCsvChartData] = useState([]);\n  const [csvStats, setCsvStats] = useState({ rows: 0, cols: 0, numeric: 0 });",
  );
  console.log("CSV states added");
} else {
  console.log("CSV states already present");
}

// Add CSV handler before stats
if (c.indexOf("handleCSVClick") === -1) {
  const handler = `
  async function handleCSVClick(doc) {
    if (doc.type !== 'csv' || doc.status !== 'ready') return;
    if (selectedCSV && selectedCSV.id === doc.id) { setSelectedCSV(null); return; }
    setSelectedCSV(doc);
    try {
      const res = await fetch('/api/ingest/csv?documentId=' + doc.id);
      if (res.status !== 200) return;
      const json = await res.json();
      const text = json.content;
      const lines = text.split('\\n').filter(function(l) { return l.trim(); });
      const headers = lines[0].split(',').map(function(h) { return h.trim().replace(/"/g, ''); });
      const rows = lines.slice(1).map(function(line) { return line.split(',').map(function(v) { return v.trim().replace(/"/g, ''); }); });
      const numericCols = headers.filter(function(h, i) {
        const vals = rows.map(function(r) { return r[i]; }).filter(Boolean);
        return vals.filter(function(v) { return !isNaN(Number(v)); }).length > vals.length * 0.7;
      });
      setCsvStats({ rows: rows.length, cols: headers.length, numeric: numericCols.length });
      if (numericCols[0]) {
        const idx = headers.indexOf(numericCols[0]);
        setCsvChartData(rows.slice(0, 20).map(function(row, i) { return { name: String(i+1), value: Number(row[idx]) || 0 }; }));
      }
    } catch(e) { console.error(e); }
  }

`;
  c = c.replace("  const stats = {", handler + "  const stats = {");
  console.log("CSV handler added");
} else {
  console.log("CSV handler already present");
}

fs.writeFileSync(file, c);
console.log("DocumentsPanel patched successfully");
