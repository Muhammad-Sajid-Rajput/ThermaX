import { useState } from 'react';
import { Flame, ClipboardCheck, Languages, Info } from 'lucide-react';

/**
 * Phase 6 admin hotspot detail: ranked TVI breakdown + directive checklist.
 *
 * Rendered inline under a hotspot in the admin feed. All values come from
 * the API (deterministic ML-side tables); this panel never invents scores.
 * The checklist is local action-tracking state — checking a box records
 * that the admin acted on it, it does not change the stored directive.
 */
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

const COMPONENT_WEIGHT_HINT = {
  heat: '0.5',
  reports: '0.3',
  population: '0.2',
};

function ComponentBar({ name, value, weightUsed }) {
  const pct = value == null ? 0 : Math.round(value * 100);
  return (
    <div className="mb-1.5">
      <div className="flex justify-between text-[11px] mb-0.5">
        <span className="text-slate-600 font-medium">{COMPONENT_LABELS[name] || name}</span>
        <span className="text-slate-500 font-mono">
          {value == null ? 'no data' : `${pct}%`}
          {weightUsed != null && value != null && (
            <span className="text-slate-400"> · w {weightUsed}</span>
          )}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-linear-to-r from-amber-400 to-red-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function HotspotDetailPanel({ hotspot }) {
  const [checked, setChecked] = useState({});
  const [advLang, setAdvLang] = useState('en');
  if (!hotspot) return null;

  const tier = hotspot.riskTier || 'unknown';
  const directives = Array.isArray(hotspot.directives) ? hotspot.directives : [];
  const advisory = hotspot.advisory;
  const components = hotspot.tviComponents || {};
  const weightsUsed = hotspot.tviWeightsUsed || {};

  const toggle = (id) => setChecked((c) => ({ ...c, [id]: !c[id] }));
  const doneCount = directives.filter((d) => checked[d.id]).length;

  return (
    <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-3.5">
      {/* TVI breakdown */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Thermal Vulnerability Index
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
              Base weights {Object.entries(COMPONENT_WEIGHT_HINT).map(([k, w]) => `${k} ${w}`).join(' · ')}
              {Object.keys(weightsUsed).length > 0 && Object.keys(weightsUsed).length < 3
                && ' — renormalized for missing components'}
            </p>
            {hotspot.tviNote && (
              <p className="text-[11px] text-slate-500 italic mt-1 flex gap-1">
                <Info className="w-3 h-3 mt-0.5 shrink-0" />
                {hotspot.tviNote}
              </p>
            )}
          </>
        )}
      </div>

      {/* Directive checklist */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <ClipboardCheck className="w-3.5 h-3.5" />
            Mitigation directives
          </h4>
          {directives.length > 0 && (
            <span className="text-[10px] text-slate-400 font-mono">
              {doneCount}/{directives.length} acted
            </span>
          )}
        </div>
        {directives.length === 0 ? (
          <p className="text-[11px] text-slate-500 italic">
            No directives — this hotspot has no scored risk tier.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {directives.map((d) => (
              <li key={d.id}>
                <label className="flex items-start gap-2 text-[12px] text-slate-700 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={!!checked[d.id]}
                    onChange={() => toggle(d.id)}
                    className="mt-0.5 w-3.5 h-3.5 accent-emerald-600 shrink-0"
                  />
                  <span className={checked[d.id] ? 'line-through text-slate-400' : 'group-hover:text-slate-900'}>
                    {d.text}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Citizen advisory preview */}
      {advisory && (advisory.en || advisory.ur) && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5" />
              Citizen advisory
            </h4>
            <button
              type="button"
              onClick={() => setAdvLang((l) => (l === 'en' ? 'ur' : 'en'))}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
              title={advLang === 'en' ? 'اردو میں دیکھیں' : 'View in English'}
              aria-label={advLang === 'en' ? 'Switch to Urdu' : 'Switch to English'}
            >
              <Languages className="w-3.5 h-3.5" />
            </button>
          </div>
          <p
            dir={advLang === 'ur' ? 'rtl' : 'ltr'}
            className={`text-[12px] text-slate-700 leading-relaxed rounded-lg bg-white border border-slate-200 p-2.5 ${advLang === 'ur' ? 'font-[Noto_Nastaliq_Urdu,serif]' : ''}`}
          >
            {advLang === 'ur' ? (advisory.ur ?? advisory.en) : (advisory.en ?? advisory.ur)}
          </p>
          {hotspot.heatIndexMean != null && (
            <p className="text-[10px] text-slate-400 mt-1 font-mono">
              mean heat index {hotspot.heatIndexMean}°C · band {advisory.heatIndexBand || 'unknown'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
