import { Flame, ShieldAlert } from 'lucide-react';

const TIER_BADGE = {
  critical: 'bg-red-100 text-red-800 border-red-300',
  high: 'bg-orange-100 text-orange-800 border-orange-300',
  moderate: 'bg-amber-100 text-amber-800 border-amber-300',
  low: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  unknown: 'bg-slate-100 text-slate-600 border-slate-300',
};

const COMPONENT_LABELS = {
  heat: 'Heat score',
  reports: 'Report density',
  population: 'Population density',
};

function ComponentBar({ name, value, weightUsed }) {
  const pct = value == null ? 0 : Math.round(value * 100);
  return (
    <div className="mb-1.5 print:mb-0.5">
      <div className="flex justify-between text-[11px] print:text-[10px] mb-0.5 print:mb-0">
        <span className="text-slate-600 font-medium">{COMPONENT_LABELS[name] || name}</span>
        <span className="text-slate-500 font-mono">
          {value == null ? 'no data' : `${pct}%`}
          {weightUsed != null && value != null && (
            <span className="text-slate-400"> · w {weightUsed}</span>
          )}
        </span>
      </div>
      <div className="h-1.5 print:h-1 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-linear-to-r from-amber-400 to-red-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function simplifyDirective(text) {
  if (!text || typeof text !== 'string') return text;
  if (text.includes('regular pipeline tick')) {
    return 'Routine monitoring — conditions are currently calm; continue regular observation.';
  }
  if (text.includes('Treat these directives as provisional')) {
    return 'Preliminary guidance — based on initial reports for this area.';
  }
  return text;
}

export default function HotspotDetailPanel({ hotspot }) {
  if (!hotspot) return null;

  const tier = hotspot.riskTier || 'unknown';
  const rawDirectives = Array.isArray(hotspot.directives) ? hotspot.directives : [];
  const actionable = rawDirectives.filter((d) => d.id !== 'provisional-note' && d.id !== 'routine-monitor');
  const directives = actionable.length > 0 ? actionable : rawDirectives;
  const advisory = hotspot.advisory;
  
  // Resolve TVI components without fabricating unmeasured data
  const rawComponents = Array.isArray(hotspot.tviComponents)
    ? {}
    : (hotspot.tviComponents || {});
  const components = { ...rawComponents };

  const componentList = Array.isArray(hotspot.tviComponents)
    ? hotspot.tviComponents
    : Object.keys(hotspot.tviWeightsUsed || hotspot.tviComponents || {});

  const weightsUsed = hotspot.tviWeightsUsed || {};

  const advisoryText = advisory?.en || advisory?.ur || '';

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 print:p-0 print:border-none print:shadow-none space-y-3.5 print:space-y-1.5 shadow-2xs">
      {/* TVI breakdown */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Heat Vulnerability Score (TVI)
          </h4>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${TIER_BADGE[tier] || TIER_BADGE.unknown}`}>
            {tier === 'unknown' ? 'Unscored' : `${tier} risk`}
          </span>
        </div>
        {hotspot.tvi == null ? (
          <p className="text-[11px] text-slate-500 italic">
            No TVI score — insufficient component data (withheld, not zeroed).
          </p>
        ) : (
          <>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-bold text-slate-900 font-mono">
                {hotspot.tvi.toFixed(2)}
              </span>
              <span className="text-[11px] text-slate-500">/ 1.00</span>
            </div>
            {Object.keys(COMPONENT_LABELS).map((name) => (
              <ComponentBar
                key={name}
                name={name}
                value={components[name]}
                weightUsed={weightsUsed[name]}
              />
            ))}
            <p className="text-[10px] text-slate-400 mt-1">
              Score factors: Heat (50%), Reports (30%), Population (20%)
              {Object.keys(weightsUsed).length > 0 && Object.keys(weightsUsed).length < 3
                && ' — adjusted for available data'}
            </p>
            {!componentList.includes('population') && (
              <p className="text-[10px] text-slate-400 italic mt-0.5">
                2-component TVI (population unavailable for this city)
              </p>
            )}
          </>
        )}
      </div>

      {/* Autonomous Mitigation Directives (No manual checkboxes) */}
      <div className="pt-2.5 border-t border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" />
            Recommended Actions for Authorities
          </h4>
        </div>
        {directives.length === 0 ? (
          <p className="text-[11px] text-slate-500 italic">
            No directives — this hotspot has no scored risk tier.
          </p>
        ) : (
          <ul className="space-y-1.5 print:space-y-1">
            {directives.map((d, idx) => (
              <li
                key={d.id || idx}
                className="flex items-start gap-2 p-2 print:p-1.5 rounded-lg bg-slate-50/80 border border-slate-200/80 text-[12px] print:text-[10.5px] text-slate-800"
              >
                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white font-mono font-bold text-[9px] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="leading-snug text-slate-800 font-medium">{simplifyDirective(d.text)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Autonomous Citizen Advisory */}
      {advisory && (advisory.en || advisory.ur) && (
        <div className="pt-2.5 print:pt-1.5 border-t border-slate-100">
          <div className="flex items-center justify-between mb-1.5 print:mb-1">
            <h4 className="text-[11px] print:text-[10px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 print:w-3 print:h-3 text-amber-500" />
              Public Safety Advisory
            </h4>

          </div>
          <div className="text-[12px] print:text-[10.5px] text-slate-800 leading-relaxed rounded-lg bg-amber-50/60 border border-amber-200/80 p-2.5 print:p-1.5">
            <p>{advisoryText}</p>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 font-mono">
            Feels-Like Temp: <strong className="text-slate-800">{hotspot.heatIndexMean != null ? `${hotspot.heatIndexMean}°C` : '—'}</strong> (Heat Index)
          </p>
        </div>
      )}
    </div>
  );
}
