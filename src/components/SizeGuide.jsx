// Panduan ukuran visual (Goal 2 PRD): tabel ukuran + estimasi tinggi & berat badan.
const COLS = {
  top: [
    ['chest', 'Lebar dada'],
    ['length', 'Panjang badan'],
    ['sleeve', 'Panjang lengan'],
  ],
  bottom: [
    ['waist', 'Lingkar pinggang'],
    ['hip', 'Lingkar pinggul'],
    ['length', 'Panjang celana'],
  ],
};

function Diagram({ type }) {
  // Ilustrasi titik ukur sederhana
  return type === 'bottom' ? (
    <svg viewBox="0 0 160 180" className="h-36 w-auto" aria-hidden="true">
      <path d="M45 20h70l8 150H90L80 70l-10 100H37z" fill="var(--color-soft)" stroke="currentColor" strokeWidth="1.5" />
      <path d="M45 30h70" stroke="var(--color-ink)" strokeDasharray="3 3" />
      <text x="80" y="14" textAnchor="middle" fontSize="9" fill="currentColor">A</text>
      <path d="M130 20v150" stroke="var(--color-ink)" strokeDasharray="3 3" />
      <text x="140" y="98" fontSize="9" fill="currentColor">C</text>
    </svg>
  ) : (
    <svg viewBox="0 0 180 170" className="h-36 w-auto" aria-hidden="true">
      <path d="M55 20l18-8q17 12 34 0l18 8 35 32-18 22-14-10v100H52V64L38 74 20 52z" fill="var(--color-soft)" stroke="currentColor" strokeWidth="1.5" />
      <path d="M52 70h76" stroke="var(--color-ink)" strokeDasharray="3 3" />
      <text x="90" y="64" textAnchor="middle" fontSize="9" fill="currentColor">A</text>
      <path d="M140 20v144" stroke="var(--color-ink)" strokeDasharray="3 3" />
      <text x="146" y="96" fontSize="9" fill="currentColor">B</text>
    </svg>
  );
}

export default function SizeGuide({ chart, sizeType, highlight }) {
  if (!chart?.length) return null;
  if (sizeType === 'onesize') {
    return <p className="text-sm text-mute">{chart[0].note}</p>;
  }
  const cols = COLS[sizeType] || COLS.top;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-6">
        <Diagram type={sizeType} />
        <ul className="space-y-1 text-xs text-mute">
          {cols.map(([, label], i) => <li key={label}><b className="text-ink">{'ABC'[i]}</b> · {label}</li>)}
        </ul>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <caption className="sr-only">Tabel ukuran dalam centimeter</caption>
          <thead>
            <tr className="border-b border-ink text-left text-xs uppercase tracking-wider">
              <th className="py-2 pr-3">Size</th>
              {cols.map(([k, label]) => <th key={k} className="py-2 pr-3 font-semibold">{label}</th>)}
              <th className="py-2 pr-3">Tinggi</th>
              <th className="py-2">Berat</th>
            </tr>
          </thead>
          <tbody>
            {chart.map((row) => (
              <tr key={row.size} className={`border-b border-line ${row.size === highlight ? 'bg-lemon/40' : ''}`}>
                <td className="py-2.5 pr-3 font-semibold">{row.size}</td>
                {cols.map(([k]) => <td key={k} className="py-2.5 pr-3 tabular-nums">{row[k]} cm</td>)}
                <td className="py-2.5 pr-3 tabular-nums">{row.tb} cm</td>
                <td className="py-2.5 tabular-nums">{row.bb} kg</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-mute">Ukuran diukur dari pakaian (toleransi ±1–2 cm). Tinggi & berat adalah estimasi umum, cek juga ukuran baju favoritmu.</p>
    </div>
  );
}
