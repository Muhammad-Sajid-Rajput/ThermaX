import Report from '../models/Report.js';
import Hotspot from '../models/Hotspot.js';
import HotspotPublication from '../models/HotspotPublication.js';
import { currentHotspotRunFilter } from '../utils/currentHotspotRunFilter.js';
import { getCities } from './boundaryService.js';
import { toDto } from '../routes/hotspots.js';

/**
 * Area Insights — a decision-oriented, area-scoped report built from
 * verified citizen reports plus the current published hotspot run.
 *
 * Policy (see Backend/README.md "Area Insights"):
 *  - city is required and must be in the supported-city allowlist (no default)
 *  - area is an optional literal, case-insensitive substring of areaName
 *  - days is one of 7 / 30 / 90 (default 30)
 *  - aggregates count status 'verified' only; flagged reports are counted in
 *    dataQuality but excluded from every aggregate
 *  - synthetic rows are excluded unless includeSynthetic is explicitly true
 *  - time series are withheld (empty arrays) below the trend threshold
 *  - takeaways are deterministic templates filled from payload numbers only;
 *    a template whose inputs are null/insufficient is omitted
 *  - DB errors propagate: never answer with a fabricated empty payload
 */

export const INSIGHTS_ALLOWED_DAYS = [7, 30, 90];
export const INSIGHTS_DEFAULT_DAYS = 30;
export const DEFAULT_MIN_REPORTS_FOR_TREND = 10;

const MAX_AREA_LENGTH = 100;
const DAY_MS = 24 * 60 * 60 * 1000;
const REPORT_FIELDS = 'status severityLevel ambientTemp createdAt';

/** Thrown for bad query parameters; the route maps it to HTTP 400. */
export class InsightsValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InsightsValidationError';
    this.status = 400;
  }
}

/**
 * Minimum verified reports required before any time series is returned.
 * Env-overridable; an unset / non-integer / < 1 value falls back to the default.
 */
export function minReportsForTrend() {
  const n = Number(process.env.INSIGHTS_MIN_REPORTS_FOR_TREND);
  return Number.isInteger(n) && n >= 1 ? n : DEFAULT_MIN_REPORTS_FOR_TREND;
}

// Same literal-substring escaping as the ?area= filter in
// controllers/reportController.js (ReDoS hardening: the area is never a
// user-supplied pattern).
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const round1 = (n) => Number(n.toFixed(1));
const mean = (values) => values.reduce((a, b) => a + b, 0) / values.length;

const PROVINCE_TO_CITY = {
  punjab: 'Lahore',
  sindh: 'Karachi',
  'islamabad capital territory': 'Islamabad',
  islamabad: 'Islamabad',
  ict: 'Islamabad',
  'khyber pakhtunkhwa': 'Peshawar',
  kp: 'Peshawar',
  kpk: 'Peshawar',
  balochistan: 'Quetta',
  balouchistan: 'Quetta',
  'azad kashmir': 'Muzaffarabad',
  ajk: 'Muzaffarabad',
  'gilgit baltistan': 'Gilgit',
  gb: 'Gilgit',
};

export const CITY_TO_PROVINCE = {
  // Punjab
  Lahore: 'Punjab',
  Faisalabad: 'Punjab',
  Rawalpindi: 'Punjab',
  Multan: 'Punjab',
  Gujranwala: 'Punjab',
  Sargodha: 'Punjab',
  Sialkot: 'Punjab',
  Bahawalpur: 'Punjab',
  'Rahim Yar Khan': 'Punjab',
  'Dera Ghazi Khan': 'Punjab',
  Sahiwal: 'Punjab',
  Sheikhupura: 'Punjab',
  Attock: 'Punjab',
  Jhelum: 'Punjab',
  Gujrat: 'Punjab',
  Chakwal: 'Punjab',
  Mianwali: 'Punjab',
  Bhakkar: 'Punjab',
  Khushab: 'Punjab',
  Jhang: 'Punjab',
  Chiniot: 'Punjab',
  'Toba Tek Singh': 'Punjab',
  Hafizabad: 'Punjab',
  'Mandi Bahauddin': 'Punjab',
  Kasur: 'Punjab',
  Okara: 'Punjab',
  'Nankana Sahib': 'Punjab',
  Pakpattan: 'Punjab',
  Vehari: 'Punjab',
  Burewala: 'Punjab',
  Khanewal: 'Punjab',
  Lodhran: 'Punjab',
  Muzaffargarh: 'Punjab',
  Layyah: 'Punjab',
  Rajanpur: 'Punjab',
  Bahawalnagar: 'Punjab',
  Chishtian: 'Punjab',
  Haroonabad: 'Punjab',
  'Ahmedpur East': 'Punjab',
  'Kot Addu': 'Punjab',
  'Taunsa Sharif': 'Punjab',
  Murree: 'Punjab',
  Kamoke: 'Punjab',
  Sambrial: 'Punjab',
  Daska: 'Punjab',
  Wazirabad: 'Punjab',
  'Pind Dadan Khan': 'Punjab',
  Taxila: 'Punjab',
  Rabwah: 'Punjab',
  'Chenab Nagar': 'Punjab',
  Bhalwal: 'Punjab',

  // Sindh
  Karachi: 'Sindh',
  Hyderabad: 'Sindh',
  Sukkur: 'Sindh',
  Larkana: 'Sindh',
  'Mirpur Khas': 'Sindh',
  Nawabshah: 'Sindh',
  'Shaheed Benazirabad': 'Sindh',
  Jacobabad: 'Sindh',
  Shikarpur: 'Sindh',
  Khairpur: 'Sindh',
  Dadu: 'Sindh',
  Ghotki: 'Sindh',
  'Mirpur Mathelo': 'Sindh',
  Umerkot: 'Sindh',
  Badin: 'Sindh',
  Thatta: 'Sindh',
  Sujawal: 'Sindh',
  Sajawal: 'Sindh',
  Kashmore: 'Sindh',
  Kandhkot: 'Sindh',
  'Tando Adam': 'Sindh',
  'Tando Allahyar': 'Sindh',
  'Tando Muhammad Khan': 'Sindh',
  Kotri: 'Sindh',
  Jamshoro: 'Sindh',
  Matiari: 'Sindh',
  Sanghar: 'Sindh',
  Moro: 'Sindh',
  Shahdadkot: 'Sindh',
  'Kamber Ali Khan': 'Sindh',
  'Pano Akil': 'Sindh',
  'Sehwan Sharif': 'Sindh',
  Sehwan: 'Sindh',
  Mithi: 'Sindh',
  Digri: 'Sindh',
  Ratodero: 'Sindh',
  Mehrabpur: 'Sindh',
  Rohri: 'Sindh',
  Hala: 'Sindh',
  Ranipur: 'Sindh',

  // Khyber Pakhtunkhwa
  Peshawar: 'Khyber Pakhtunkhwa',
  Mardan: 'Khyber Pakhtunkhwa',
  Mingora: 'Khyber Pakhtunkhwa',
  Swat: 'Khyber Pakhtunkhwa',
  Kohat: 'Khyber Pakhtunkhwa',
  Abbottabad: 'Khyber Pakhtunkhwa',
  'Dera Ismail Khan': 'Khyber Pakhtunkhwa',
  Nowshera: 'Khyber Pakhtunkhwa',
  Charsadda: 'Khyber Pakhtunkhwa',
  Swabi: 'Khyber Pakhtunkhwa',
  Haripur: 'Khyber Pakhtunkhwa',
  Mansehra: 'Khyber Pakhtunkhwa',
  Bannu: 'Khyber Pakhtunkhwa',
  Karak: 'Khyber Pakhtunkhwa',
  Hangu: 'Khyber Pakhtunkhwa',
  Tank: 'Khyber Pakhtunkhwa',
  'Lakki Marwat': 'Khyber Pakhtunkhwa',
  Timergara: 'Khyber Pakhtunkhwa',
  'Lower Dir': 'Khyber Pakhtunkhwa',
  Dir: 'Khyber Pakhtunkhwa',
  'Upper Dir': 'Khyber Pakhtunkhwa',
  Chitral: 'Khyber Pakhtunkhwa',
  Batkhela: 'Khyber Pakhtunkhwa',
  Malakand: 'Khyber Pakhtunkhwa',
  'Saidu Sharif': 'Khyber Pakhtunkhwa',
  Battagram: 'Khyber Pakhtunkhwa',
  Alpuri: 'Khyber Pakhtunkhwa',
  Shangla: 'Khyber Pakhtunkhwa',
  Parachinar: 'Khyber Pakhtunkhwa',
  Kurram: 'Khyber Pakhtunkhwa',
  Miranshah: 'Khyber Pakhtunkhwa',
  'North Waziristan': 'Khyber Pakhtunkhwa',
  Wana: 'Khyber Pakhtunkhwa',
  'South Waziristan': 'Khyber Pakhtunkhwa',
  Ghalanai: 'Khyber Pakhtunkhwa',
  Mohmand: 'Khyber Pakhtunkhwa',
  Khar: 'Khyber Pakhtunkhwa',
  Bajaur: 'Khyber Pakhtunkhwa',
  'Landi Kotal': 'Khyber Pakhtunkhwa',
  Khyber: 'Khyber Pakhtunkhwa',
  Tangi: 'Khyber Pakhtunkhwa',
  Topi: 'Khyber Pakhtunkhwa',
  Pabbi: 'Khyber Pakhtunkhwa',

  // Balochistan
  Quetta: 'Balochistan',
  Turbat: 'Balochistan',
  Kech: 'Balochistan',
  Khuzdar: 'Balochistan',
  Hub: 'Balochistan',
  Gwadar: 'Balochistan',
  Chaman: 'Balochistan',
  Panjgur: 'Balochistan',
  Pishin: 'Balochistan',
  'Dera Murad Jamali': 'Balochistan',
  'Dera Allah Yar': 'Balochistan',
  Kharan: 'Balochistan',
  Nushki: 'Balochistan',
  Sibi: 'Balochistan',
  Loralai: 'Balochistan',
  Zhob: 'Balochistan',
  Kalat: 'Balochistan',
  Mastung: 'Balochistan',
  'Usta Muhammad': 'Balochistan',
  Sui: 'Balochistan',
  'Dera Bugti': 'Balochistan',
  Kohlu: 'Balochistan',
  Barkhan: 'Balochistan',
  Ziarat: 'Balochistan',
  'Qila Saifullah': 'Balochistan',
  'Qila Abdullah': 'Balochistan',
  Taftan: 'Balochistan',
  Pasni: 'Balochistan',
  Ormara: 'Balochistan',
  Mach: 'Balochistan',
  Uthal: 'Balochistan',
  Bela: 'Balochistan',
  Surab: 'Balochistan',

  // ICT
  Islamabad: 'Islamabad Capital Territory',

  // Azad Kashmir
  Muzaffarabad: 'Azad Kashmir',
  Mirpur: 'Azad Kashmir',
  Rawalakot: 'Azad Kashmir',
  Kotli: 'Azad Kashmir',
  Bhimber: 'Azad Kashmir',
  Bagh: 'Azad Kashmir',
  Pallandri: 'Azad Kashmir',
  'Hattian Bala': 'Azad Kashmir',
  Athmuqam: 'Azad Kashmir',
  'Neelum Valley': 'Azad Kashmir',

  // Gilgit Baltistan
  Gilgit: 'Gilgit Baltistan',
  Skardu: 'Gilgit Baltistan',
  Hunza: 'Gilgit Baltistan',
  Aliabad: 'Gilgit Baltistan',
  Chilas: 'Gilgit Baltistan',
  Diamer: 'Gilgit Baltistan',
  Khaplu: 'Gilgit Baltistan',
  Ghanche: 'Gilgit Baltistan',
  Gakuch: 'Gilgit Baltistan',
  Ghizer: 'Gilgit Baltistan',
  Shigar: 'Gilgit Baltistan',
  Eidgah: 'Gilgit Baltistan',
  Astore: 'Gilgit Baltistan',
  Minimarg: 'Gilgit Baltistan',
};

export const PROVINCES_CONFIG = {
  sindh: {
    name: 'Sindh',
    canonicalCity: 'Karachi',
    bounds: { minLat: 23.5, maxLat: 28.5, minLng: 66.5, maxLng: 71.2 },
    citiesRegex: /sindh|karachi|hyderabad|sukkur|larkana|mirpur\s*khas|nawabshah|shaheed\s*benazirabad|jacobabad|shikarpur|khairpur|dadu|ghotki|mirpur\s*mathelo|umerkot|badin|thatta|sujawal|sajawal|kashmore|kandhkot|tando\s*adam|tando\s*allahyar|tando\s*muhammad\s*khan|kotri|jamshoro|matiari|sanghar|moro|shahdadkot|kamber|pano\s*akil|sehwan|mithi|digri|ratodero|mehrabpur|rohri|hala|ranipur/i,
  },
  punjab: {
    name: 'Punjab',
    canonicalCity: 'Lahore',
    bounds: { minLat: 27.7, maxLat: 34.0, minLng: 69.3, maxLng: 75.4 },
    citiesRegex: /punjab|lahore|faisalabad|rawalpindi|multan|gujranwala|sargodha|sialkot|bahawalpur|rahim\s*yar\s*khan|dera\s*ghazi\s*khan|dg\s*khan|sahiwal|sheikhupura|attock|jhelum|gujrat|chakwal|mianwali|bhakkar|khushab|jhang|chiniot|toba\s*tek\s*singh|hafizabad|mandi\s*bahauddin|kasur|okara|nankana\s*sahib|pakpattan|vehari|burewala|khanewal|lodhran|muzaffargarh|layyah|rajanpur|bahawalnagar|chishtian|haroonabad|ahmedpur\s*east|kot\s*addu|taunsa|murree|kamoke|sambrial|daska|wazirabad|pind\s*dadan\s*khan|taxila|rabwah|chenab\s*nagar|bhalwal/i,
  },
  'islamabad capital territory': {
    name: 'Islamabad Capital Territory',
    canonicalCity: 'Islamabad',
    bounds: { minLat: 33.4, maxLat: 33.9, minLng: 72.8, maxLng: 73.4 },
    citiesRegex: /islamabad|ict|blue\s*area|rawal\s*lake|bhara\s*kahu|chak\s*shahzad|tarlai|sector\s*[fghij]-?\d+/i,
  },
  islamabad: {
    name: 'Islamabad Capital Territory',
    canonicalCity: 'Islamabad',
    bounds: { minLat: 33.4, maxLat: 33.9, minLng: 72.8, maxLng: 73.4 },
    citiesRegex: /islamabad|ict|blue\s*area|rawal\s*lake|bhara\s*kahu|chak\s*shahzad|tarlai|sector\s*[fghij]-?\d+/i,
  },
  ict: {
    name: 'Islamabad Capital Territory',
    canonicalCity: 'Islamabad',
    bounds: { minLat: 33.4, maxLat: 33.9, minLng: 72.8, maxLng: 73.4 },
    citiesRegex: /islamabad|ict|blue\s*area|rawal\s*lake|bhara\s*kahu|chak\s*shahzad|tarlai|sector\s*[fghij]-?\d+/i,
  },
  'khyber pakhtunkhwa': {
    name: 'Khyber Pakhtunkhwa',
    canonicalCity: 'Peshawar',
    bounds: { minLat: 31.2, maxLat: 36.9, minLng: 69.2, maxLng: 74.1 },
    citiesRegex: /khyber|kpk|kp|peshawar|mardan|mingora|swat|kohat|abbottabad|dera\s*ismail\s*khan|di\s*khan|nowshera|charsadda|swabi|haripur|mansehra|bannu|karak|hangu|tank|lakki\s*marwat|timergara|dir|chitral|batkhela|malakand|saidu\s*sharif|battagram|alpuri|shangla|parachinar|kurram|miranshah|waziristan|wana|ghalanai|mohmand|khar|bajaur|landi\s*kotal|tangi|topi|pabbi/i,
  },
  kpk: {
    name: 'Khyber Pakhtunkhwa',
    canonicalCity: 'Peshawar',
    bounds: { minLat: 31.2, maxLat: 36.9, minLng: 69.2, maxLng: 74.1 },
    citiesRegex: /khyber|kpk|kp|peshawar|mardan|mingora|swat|kohat|abbottabad|dera\s*ismail\s*khan|di\s*khan|nowshera|charsadda|swabi|haripur|mansehra|bannu|karak|hangu|tank|lakki\s*marwat|timergara|dir|chitral|batkhela|malakand|saidu\s*sharif|battagram|alpuri|shangla|parachinar|kurram|miranshah|waziristan|wana|ghalanai|mohmand|khar|bajaur|landi\s*kotal|tangi|topi|pabbi/i,
  },
  kp: {
    name: 'Khyber Pakhtunkhwa',
    canonicalCity: 'Peshawar',
    bounds: { minLat: 31.2, maxLat: 36.9, minLng: 69.2, maxLng: 74.1 },
    citiesRegex: /khyber|kpk|kp|peshawar|mardan|mingora|swat|kohat|abbottabad|dera\s*ismail\s*khan|di\s*khan|nowshera|charsadda|swabi|haripur|mansehra|bannu|karak|hangu|tank|lakki\s*marwat|timergara|dir|chitral|batkhela|malakand|saidu\s*sharif|battagram|alpuri|shangla|parachinar|kurram|miranshah|waziristan|wana|ghalanai|mohmand|khar|bajaur|landi\s*kotal|tangi|topi|pabbi/i,
  },
  balochistan: {
    name: 'Balochistan',
    canonicalCity: 'Quetta',
    bounds: { minLat: 24.8, maxLat: 32.1, minLng: 60.8, maxLng: 70.3 },
    citiesRegex: /balochistan|balouchistan|quetta|turbat|kech|khuzdar|hub|gwadar|chaman|panjgur|pishin|dera\s*murad\s*jamali|dera\s*allah\s*yar|kharan|nushki|sibi|loralai|zhob|kalat|mastung|usta\s*muhammad|sui|dera\s*bugti|kohlu|barkhan|ziarat|qila\s*saifullah|qila\s*abdullah|taftan|pasni|ormara|mach|uthal|bela|surab/i,
  },
  balouchistan: {
    name: 'Balochistan',
    canonicalCity: 'Quetta',
    bounds: { minLat: 24.8, maxLat: 32.1, minLng: 60.8, maxLng: 70.3 },
    citiesRegex: /balochistan|balouchistan|quetta|turbat|kech|khuzdar|hub|gwadar|chaman|panjgur|pishin|dera\s*murad\s*jamali|dera\s*allah\s*yar|kharan|nushki|sibi|loralai|zhob|kalat|mastung|usta\s*muhammad|sui|dera\s*bugti|kohlu|barkhan|ziarat|qila\s*saifullah|qila\s*abdullah|taftan|pasni|ormara|mach|uthal|bela|surab/i,
  },
  'azad kashmir': {
    name: 'Azad Kashmir',
    canonicalCity: 'Muzaffarabad',
    bounds: { minLat: 32.9, maxLat: 35.1, minLng: 73.4, maxLng: 75.3 },
    citiesRegex: /azad\s*kashmir|ajk|muzaffarabad|mirpur|rawalakot|kotli|bhimber|bagh|pallandri|hattian\s*bala|athmuqam|neelum/i,
  },
  ajk: {
    name: 'Azad Kashmir',
    canonicalCity: 'Muzaffarabad',
    bounds: { minLat: 32.9, maxLat: 35.1, minLng: 73.4, maxLng: 75.3 },
    citiesRegex: /azad\s*kashmir|ajk|muzaffarabad|mirpur|rawalakot|kotli|bhimber|bagh|pallandri|hattian\s*bala|athmuqam|neelum/i,
  },
  'gilgit baltistan': {
    name: 'Gilgit Baltistan',
    canonicalCity: 'Gilgit',
    bounds: { minLat: 34.8, maxLat: 37.1, minLng: 72.5, maxLng: 77.8 },
    citiesRegex: /gilgit|baltistan|gb|skardu|hunza|aliabad|chilas|diamer|khaplu|ghanche|gakuch|ghizer|shigar|eidgah|astore|minimarg/i,
  },
  gb: {
    name: 'Gilgit Baltistan',
    canonicalCity: 'Gilgit',
    bounds: { minLat: 34.8, maxLat: 37.1, minLng: 72.5, maxLng: 77.8 },
    citiesRegex: /gilgit|baltistan|gb|skardu|hunza|aliabad|chilas|diamer|khaplu|ghanche|gakuch|ghizer|shigar|eidgah|astore|minimarg/i,
  },
};

function parseQuery({ city, province, area, days, includeSynthetic } = {}) {
  const cities = getCities();
  const supported = cities.map((c) => c.name);

  // Reject object injection (?city[$ne]=x or ?province[$ne]=x)
  if (typeof city === 'object' && city !== null) {
    throw new InsightsValidationError('city must be a string.');
  }
  if (typeof province === 'object' && province !== null) {
    throw new InsightsValidationError('province must be a string.');
  }

  const rawProv = typeof province === 'string' ? province.trim() : null;
  const rawCity = typeof city === 'string' ? city.trim() : null;

  if (!rawProv && !rawCity) {
    throw new InsightsValidationError(
      `city is required. Supported cities: ${supported.join(', ')}.`
    );
  }

  let provConfig = null;
  if (rawProv && PROVINCES_CONFIG[rawProv.toLowerCase()]) {
    provConfig = PROVINCES_CONFIG[rawProv.toLowerCase()];
  } else if (rawCity && PROVINCES_CONFIG[rawCity.toLowerCase()]) {
    provConfig = PROVINCES_CONFIG[rawCity.toLowerCase()];
  }

  let areaTerm = null;
  if (area !== undefined && area !== '') {
    if (typeof area !== 'string') {
      throw new InsightsValidationError('area must be a string.');
    }
    areaTerm = area.trim() || null;
    if (areaTerm && areaTerm.length > MAX_AREA_LENGTH) {
      throw new InsightsValidationError(`area must be at most ${MAX_AREA_LENGTH} characters.`);
    }
  }

  // If a known non-capital city was passed without a province, resolve its province
  const isDirectSupportedCity = rawCity && supported.some((s) => s.toLowerCase() === rawCity.toLowerCase());
  if (!provConfig && rawCity && !isDirectSupportedCity) {
    const provName =
      CITY_TO_PROVINCE[rawCity] ||
      Object.entries(CITY_TO_PROVINCE).find(
        ([k]) => k.toLowerCase() === rawCity.toLowerCase()
      )?.[1];
    if (provName && PROVINCES_CONFIG[provName.toLowerCase()]) {
      provConfig = PROVINCES_CONFIG[provName.toLowerCase()];
      if (!areaTerm) {
        areaTerm = rawCity;
      }
    }
  }

  let resolvedCityName = null;
  let cityDef = null;

  if (provConfig) {
    resolvedCityName = provConfig.canonicalCity;
    cityDef = cities.find((c) => c.name.toLowerCase() === resolvedCityName.toLowerCase());
  } else {
    resolvedCityName = rawCity;
    if (resolvedCityName && PROVINCE_TO_CITY[resolvedCityName.toLowerCase()]) {
      resolvedCityName = PROVINCE_TO_CITY[resolvedCityName.toLowerCase()];
    }
    cityDef = resolvedCityName ? cities.find((c) => c.name === resolvedCityName) : null;
    if (!cityDef) {
      throw new InsightsValidationError(`Unknown city. Supported cities: ${supported.join(', ')}.`);
    }
  }

  let windowDays = INSIGHTS_DEFAULT_DAYS;
  if (days !== undefined && days !== '') {
    let n = NaN;
    if (typeof days === 'number') n = days;
    else if (typeof days === 'string' && /^\d+$/.test(days)) n = Number(days);
    if (!INSIGHTS_ALLOWED_DAYS.includes(n)) {
      throw new InsightsValidationError(`days must be one of ${INSIGHTS_ALLOWED_DAYS.join(', ')}.`);
    }
    windowDays = n;
  }

  return {
    city: cityDef ? cityDef.name : resolvedCityName,
    provinceConfig: provConfig,
    isProvinceQuery: Boolean(provConfig),
    timeZone: cityDef?.timezone || 'Asia/Karachi',
    areaTerm,
    days: windowDays,
    // Same semantics as the existing export flow: only an explicit opt-in.
    includeSynthetic: includeSynthetic === true || includeSynthetic === 'true',
  };
}

/** YYYY-MM-DD formatter in the city's timezone (falls back to UTC). */
function makeDayKey(timeZone) {
  const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
  let fmt;
  try {
    fmt = new Intl.DateTimeFormat('en-CA', { ...options, timeZone });
  } catch {
    fmt = new Intl.DateTimeFormat('en-CA', { ...options, timeZone: 'UTC' });
  }
  return (date) => {
    const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  };
}

function summarizeReports(reports) {
  const temps = reports.map((r) => r.ambientTemp).filter(isNum);
  const severities = reports.map((r) => r.severityLevel).filter(isNum);
  return {
    avgTemp: temps.length ? round1(mean(temps)) : null,
    peakTemp: temps.length ? round1(Math.max(...temps)) : null,
    avgSeverity: severities.length ? round1(mean(severities)) : null,
  };
}

function buildSeverityDistribution(reports) {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of reports) {
    if (counts[r.severityLevel] !== undefined) counts[r.severityLevel] += 1;
  }
  return [1, 2, 3, 4, 5].map((severity) => ({ severity, count: counts[severity] }));
}

/**
 * Daily buckets (city-local dates) over the window. Volume is zero-filled —
 * a day with no verified reports genuinely had zero. avgTemp is null on days
 * with no measurement (a gap, never an invented value). The first and last
 * buckets are partial days because the window is rolling.
 */
function buildSeries(reports, from, to, dayKey) {
  const keys = [];
  for (let t = from.getTime(); t <= to.getTime(); t += DAY_MS) {
    const key = dayKey(new Date(t));
    if (keys[keys.length - 1] !== key) keys.push(key);
  }
  const lastKey = dayKey(to);
  if (keys[keys.length - 1] !== lastKey) keys.push(lastKey);

  const buckets = new Map(keys.map((k) => [k, { count: 0, temps: [] }]));
  for (const r of reports) {
    const bucket = buckets.get(dayKey(new Date(r.createdAt)));
    if (!bucket) continue;
    bucket.count += 1;
    if (isNum(r.ambientTemp)) bucket.temps.push(r.ambientTemp);
  }
  return {
    volumeSeries: keys.map((date) => ({ date, count: buckets.get(date).count })),
    tempSeries: keys.map((date) => {
      const { temps } = buckets.get(date);
      return { date, avgTemp: temps.length ? round1(mean(temps)) : null };
    }),
  };
}

function toInsightHotspot(h) {
  return {
    id: String(h.id),
    clusterId: h.clusterId,
    area: h.area,
    centroid: h.centroid ? { lat: h.centroid.lat, lng: h.centroid.lng } : null,
    reportCount: h.reportCount,
    tvi: h.tvi,
    riskTier: h.riskTier,
    peakTemp: h.peakTemp ?? null,
    heatIndexMean: h.heatIndexMean,
    directives: h.directives,
    advisory: h.advisory ? { en: h.advisory.en ?? null, ur: h.advisory.ur ?? null } : null,
  };
}

// Ranked by TVI descending; unscored (tvi null) sort last — never zeroed.
function compareHotspots(a, b) {
  if (a.tvi == null && b.tvi != null) return 1;
  if (a.tvi != null && b.tvi == null) return -1;
  if (a.tvi != null && b.tvi != null && a.tvi !== b.tvi) return b.tvi - a.tvi;
  return (
    String(a.clusterId).localeCompare(String(b.clusterId)) ||
    String(a.id).localeCompare(String(b.id))
  );
}

/**
 * Directives aggregated across the area's hotspots, de-duplicated by id.
 * hotspotCount counts each hotspot at most once per directive. The text of
 * the first-seen (highest-TVI) hotspot wins; ties sort by id for determinism.
 */
function aggregateDirectives(hotspots) {
  const byId = new Map();
  for (const h of hotspots) {
    for (const id of new Set(h.directives.map((d) => d.id))) {
      const entry = byId.get(id);
      if (entry) {
        entry.hotspotCount += 1;
      } else {
        byId.set(id, {
          id,
          text: h.directives.find((d) => d.id === id).text,
          hotspotCount: 1,
        });
      }
    }
  }
  return [...byId.values()].sort(
    (a, b) => b.hotspotCount - a.hotspotCount || a.id.localeCompare(b.id)
  );
}

/**
 * Deterministic takeaways (no LLM). Each template is filled only from payload
 * numbers; when any input is null/insufficient the template is omitted.
 */
function buildTakeaways({
  city,
  days,
  hotspots,
  topDirectives,
  verifiedCount,
  flaggedCount,
  minReports,
  trendEligible,
  previousWindowCount,
  areaAvgTempDelta,
}) {
  const takeaways = [];

  const top = hotspots[0];
  if (top && isNum(top.tvi) && top.riskTier && top.area && isNum(top.reportCount) && isNum(top.peakTemp)) {
    takeaways.push(
      `Highest-risk zone: ${top.area} (TVI ${top.tvi.toFixed(2)}, ${top.riskTier}). ` +
        `${top.reportCount} verified reports, peak ${top.peakTemp}°C.`
    );
  }

  if (trendEligible && isNum(previousWindowCount) && previousWindowCount >= minReports) {
    const pct = Math.round((Math.abs(verifiedCount - previousWindowCount) / previousWindowCount) * 100);
    // No template exists for "unchanged", so a 0% move is omitted.
    if (pct > 0) {
      const direction = verifiedCount > previousWindowCount ? 'up' : 'down';
      takeaways.push(`Report volume ${direction} ${pct}% vs the previous ${days} days.`);
    }
  }

  if (isNum(areaAvgTempDelta) && areaAvgTempDelta !== 0) {
    const direction = areaAvgTempDelta > 0 ? 'above' : 'below';
    takeaways.push(
      `This area averages ${Math.abs(areaAvgTempDelta).toFixed(1)}°C ${direction} ` +
        `the ${city} city average over the same period.`
    );
  }

  if (topDirectives.length > 0 && hotspots.length > 0) {
    const focus = topDirectives[0];
    const focusText = focus.text.replace(/[.\s]+$/, '');
    takeaways.push(
      `Recommended focus: ${focusText} — relevant to ${focus.hotspotCount} of ${hotspots.length} hotspots in this area.`
    );
  }

  takeaways.push(
    `Based on ${verifiedCount} verified reports (${flaggedCount} flagged reports excluded from scoring).`
  );

  if (!trendEligible) {
    takeaways.push(
      `Fewer than ${minReports} verified reports in this window — trends withheld until more data arrives.`
    );
  }

  return takeaways;
}

/**
 * Build the single-source-of-truth insights payload. The page renders it,
 * the JSON export downloads it verbatim, the CSV export flattens it.
 *
 * @param {{city?: string, area?: string, days?: number|string, includeSynthetic?: boolean|string}} query
 * @param {{now?: Date}} [options] - `now` exists for deterministic tests.
 * @throws {InsightsValidationError} on bad parameters (HTTP 400).
 */
export async function buildInsights(query = {}, { now = new Date() } = {}) {
  const { city, provinceConfig, isProvinceQuery, timeZone, areaTerm, days, includeSynthetic } =
    parseQuery(query);
  const minReports = minReportsForTrend();

  const to = new Date(now);
  const from = new Date(to.getTime() - days * DAY_MS);
  const previousFrom = new Date(from.getTime() - days * DAY_MS);

  let baselineScope;
  let areaScope;

  if (isProvinceQuery) {
    const provinceFilter = {
      $or: [
        { city: provinceConfig.canonicalCity },
        { city: provinceConfig.citiesRegex },
        { district: provinceConfig.citiesRegex },
        { areaName: provinceConfig.citiesRegex },
        {
          latitude: { $gte: provinceConfig.bounds.minLat, $lte: provinceConfig.bounds.maxLat },
          longitude: { $gte: provinceConfig.bounds.minLng, $lte: provinceConfig.bounds.maxLng },
        },
      ],
    };

    const areaRegex = areaTerm ? { $regex: escapeRegex(areaTerm), $options: 'i' } : null;
    const areaFilter = areaRegex
      ? {
          $or: [
            { areaName: areaRegex },
            { district: areaRegex },
            { city: areaRegex },
          ],
        }
      : null;

    baselineScope = {
      $and: [
        provinceFilter,
        ...(!includeSynthetic ? [{ isSynthetic: { $ne: true } }] : []),
      ],
    };

    areaScope = {
      $and: [
        provinceFilter,
        ...(areaFilter ? [areaFilter] : []),
        ...(!includeSynthetic ? [{ isSynthetic: { $ne: true } }] : []),
      ],
    };
  } else {
    const cityScope = {
      city,
      ...(!includeSynthetic && { isSynthetic: { $ne: true } }),
    };
    const areaRegex = areaTerm ? { $regex: escapeRegex(areaTerm), $options: 'i' } : null;
    areaScope = {
      ...cityScope,
      ...(areaRegex && {
        $or: [
          { areaName: areaRegex },
          { district: areaRegex },
          { city: areaRegex },
        ],
      }),
    };
    baselineScope = cityScope;
  }

  // Verified + flagged in one pass; partition in JS. Flagged rows only feed
  // the data-quality counts — they never reach an aggregate.
  const windowReports = await Report.find({
    ...areaScope,
    status: { $in: ['verified', 'flagged'] },
    createdAt: { $gte: from, $lte: to },
  })
    .select(REPORT_FIELDS)
    .lean();
  const verified = windowReports.filter((r) => r.status === 'verified');
  const flaggedCount = windowReports.length - verified.length;
  const verifiedCount = verified.length;
  const trendEligible = verifiedCount >= minReports;

  const summary = summarizeReports(verified);

  // Baseline: the same window at city level (no area filter). With no area
  // the "area" is the city, so there is nothing to compare against.
  let cityReports = verified;
  if (areaTerm) {
    cityReports = await Report.find({
      ...baselineScope,
      status: 'verified',
      createdAt: { $gte: from, $lte: to },
    })
      .select(REPORT_FIELDS)
      .lean();
  }
  const citySummary = areaTerm ? summarizeReports(cityReports) : summary;
  const areaAvgTempDelta =
    areaTerm && isNum(summary.avgTemp) && isNum(citySummary.avgTemp)
      ? round1(summary.avgTemp - citySummary.avgTemp)
      : null;

  // Previous-window volume, same filters — only needed when trends are shown.
  const previousWindowCount = trendEligible
    ? await Report.countDocuments({
        ...areaScope,
        status: 'verified',
        createdAt: { $gte: previousFrom, $lt: from },
      })
    : null;

  // Hotspots: current published run only, regardless of the days window.
  const hotspotCity = isProvinceQuery ? provinceConfig.canonicalCity : city;
  const runFilter = await currentHotspotRunFilter(hotspotCity);
  const [hotspotDocs, publication] = await Promise.all([
    Hotspot.find({ status: 'active', ...runFilter }).lean(),
    HotspotPublication.findOne({ city: hotspotCity }).lean(),
  ]);
  const needle = areaTerm ? areaTerm.toLowerCase() : null;
  const hotspots = hotspotDocs
    .map(toDto)
    .filter(
      (h) =>
        !needle ||
        String(h.area ?? '').toLowerCase().includes(needle) ||
        String(h.district ?? '').toLowerCase().includes(needle) ||
        String(h.city ?? '').toLowerCase().includes(needle)
    )
    .map(toInsightHotspot)
    .sort(compareHotspots);
  const topDirectives = aggregateDirectives(hotspots);

  const series = trendEligible
    ? buildSeries(verified, from, to, makeDayKey(timeZone))
    : { volumeSeries: [], tempSeries: [] };

  return {
    scope: {
      city: isProvinceQuery ? provinceConfig.name : city,
      province: isProvinceQuery ? provinceConfig.name : (CITY_TO_PROVINCE[city] || city),
      area: areaTerm,
      days,
      from: from.toISOString(),
      to: to.toISOString(),
    },
    dataQuality: {
      reportCount: windowReports.length,
      verifiedCount,
      flaggedCount,
      trendEligible,
      minReportsForTrend: minReports,
      syntheticExcluded: !includeSynthetic,
      hotspotRunId: publication?.currentRunId ?? null,
    },
    summary: {
      totalReports: verifiedCount,
      avgTemp: summary.avgTemp,
      peakTemp: summary.peakTemp,
      avgSeverity: summary.avgSeverity,
      activeHotspots: hotspots.length,
      criticalHotspots: hotspots.filter((h) => h.riskTier === 'critical').length,
    },
    baseline: {
      cityAvgTemp: citySummary.avgTemp,
      areaAvgTempDelta,
      cityReportCount: cityReports.length,
    },
    severityDistribution: buildSeverityDistribution(verified),
    volumeSeries: series.volumeSeries,
    tempSeries: series.tempSeries,
    hotspots,
    topDirectives,
    takeaways: buildTakeaways({
      city: isProvinceQuery ? provinceConfig.name : city,
      days,
      hotspots,
      topDirectives,
      verifiedCount,
      flaggedCount,
      minReports,
      trendEligible,
      previousWindowCount,
      areaAvgTempDelta,
    }),
  };
}

export default { buildInsights, minReportsForTrend, InsightsValidationError };
