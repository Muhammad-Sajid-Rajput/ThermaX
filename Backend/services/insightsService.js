import mongoose from 'mongoose';
import Report from '../models/Report.js';
import Hotspot from '../models/Hotspot.js';
import HotspotPublication from '../models/HotspotPublication.js';
import AdminNotification from '../models/AdminNotification.js';
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
const REPORT_FIELDS = 'status severityLevel ambientTemp createdAt causes areaName district description';

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

  // If a province was explicitly passed along with a town or city, scope down to that city/area
  if (provConfig && rawCity && !areaTerm) {
    const isProvName = Object.keys(PROVINCES_CONFIG).some((k) => k === rawCity.toLowerCase());
    const isCanonical = rawCity.toLowerCase() === provConfig.canonicalCity.toLowerCase();
    if (!isProvName && !isCanonical) {
      areaTerm = rawCity;
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
    cityDef = resolvedCityName ? cities.find((c) => c.name.toLowerCase() === resolvedCityName.toLowerCase()) : null;
    if (!cityDef) {
      throw new InsightsValidationError(`Unknown city. Supported cities: ${supported.join(', ')}.`);
    }
  }

  let windowDays = INSIGHTS_DEFAULT_DAYS;
  if (days !== undefined && days !== '') {
    let n = NaN;
    if (typeof days === 'number') n = days;
    else if (typeof days === 'string' && /^\d+$/.test(days.trim())) n = parseInt(days.trim(), 10);
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
  const TVI_DIMENSIONS = ['heat', 'reports', 'population'];
  const tviComponents = Array.isArray(h.tviComponents)
    ? h.tviComponents
    : (h.tviWeightsUsed && Object.keys(h.tviWeightsUsed).length > 0
        ? Object.keys(h.tviWeightsUsed)
        : (h.tviComponents && typeof h.tviComponents === 'object'
            ? Object.keys(h.tviComponents).filter((k) => h.tviComponents[k] != null)
            : null));

  const tviComponentsMissing = Array.isArray(tviComponents)
    ? TVI_DIMENSIONS.filter((d) => !tviComponents.includes(d))
    : [...TVI_DIMENSIONS];

  return {
    id: String(h.id),
    clusterId: h.clusterId,
    area: h.area,
    city: h.city,
    district: h.district,
    centroid: h.centroid ? { lat: h.centroid.lat, lng: h.centroid.lng } : null,
    reportCount: h.reportCount,
    tvi: h.tvi,
    tviComponents,
    tviComponentsMissing,
    tviWeightsUsed: h.tviWeightsUsed ?? null,
    tviNote: h.tviNote ?? null,
    riskTier: h.riskTier,
    peakTemp: h.peakTemp ?? null,
    heatIndexMean: h.heatIndexMean ?? null,
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

const TIER_WEIGHTS = { critical: 4, high: 3, moderate: 2, low: 1, unknown: 0 };

function resolveOwner(id, text) {
  const candidates = [String(id || '').toLowerCase(), String(text || '').toLowerCase()];
  for (const str of candidates) {
    if (/water|cooling\.center|hydrat/i.test(str)) return 'Municipal Corporation / PDMA';
    if (/health|hospital|clinic|medical/i.test(str)) return 'Health Department';
    if (/tree|shade|green|plant/i.test(str)) return 'Parks & Horticulture Authority';
    if (/traffic|vehicle|transport/i.test(str)) return 'Traffic Police / Municipal Corporation';
    if (/school|child/i.test(str)) return 'Education Department / District Administration';
    if (/advisory|awareness|alert/i.test(str)) return 'District Administration';
  }
  return 'District Administration';
}

function resolveCostBand(id, text) {
  const candidates = [String(id || '').toLowerCase(), String(text || '').toLowerCase()];
  for (const str of candidates) {
    if (/advisory|awareness|timing|alert/i.test(str)) return 'low';
    if (/water\.station|cooling\.center|shade\.structure|mist/i.test(str)) return 'medium';
    if (/tree|plantation|green|infrastructure|resurfac|cool\.roof/i.test(str)) return 'high';
  }
  return 'medium';
}

function resolveTimeline(band) {
  if (band === 'low') return 'Immediate (0–7 days)';
  if (band === 'high') return 'Long-term (2–12 months)';
  return 'Short-term (1–8 weeks)';
}

function resolvePhase(id, text) {
  const str = `${id} ${text}`.toLowerCase();
  // Phase 1: Immediate Field Relief & Hydration (0–48h)
  if (/water|cooling|mist|hydrat|hospital-alert|disaster-coord/i.test(str)) {
    return {
      phaseNumber: 1,
      phaseName: 'Phase 1: Immediate Relief (0–48h)',
      urgency: 'HIGH PRIORITY',
    };
  }
  // Phase 2: Community Advisories & Institutional Safeguards (1–2 weeks)
  if (/advisory|alert|warning|school|clinic|hospital|labor|labour|tree|shade|infrastructure|vulnerable/i.test(str)) {
    return {
      phaseNumber: 2,
      phaseName: 'Phase 2: Tactical Safeguards & Advisories',
      urgency: 'PUBLIC HEALTH',
    };
  }
  // Phase 3: Active Surveillance & Escalation Watch
  return {
    phaseNumber: 3,
    phaseName: 'Phase 3: Surveillance & Escalation Watch',
    urgency: 'SURVEILLANCE',
  };
}

/**
 * F1: Ranked Action Plan.
 * Turns topDirectives into an actionable list prioritized by affected hotspot risk tier and report count.
 * Filters out internal development/telemetry notes (provisional-note, routine-monitor) so only
 * operational municipal interventions are surfaced.
 */
export function buildActionPlan(hotspots = [], topDirectives = []) {
  if (!Array.isArray(topDirectives) || topDirectives.length === 0 || !Array.isArray(hotspots) || hotspots.length === 0) {
    return [];
  }

  const NON_ACTIONABLE_IDS = new Set(['provisional-note', 'routine-monitor']);

  const items = [];
  for (const directive of topDirectives) {
    if (NON_ACTIONABLE_IDS.has(directive.id)) continue;

    const affectedHotspots = hotspots.filter(
      (h) => Array.isArray(h.directives) && h.directives.some((d) => d.id === directive.id)
    );
    if (affectedHotspots.length === 0) continue;

    const score = affectedHotspots.reduce((sum, h) => {
      const tier = String(h.riskTier || 'unknown').toLowerCase();
      const weight = TIER_WEIGHTS[tier] ?? 0;
      const count = isNum(h.reportCount) ? h.reportCount : 0;
      return sum + weight * count;
    }, 0);

    const sortedAffected = [...affectedHotspots].sort(compareHotspots);
    const topAffected = sortedAffected[0];
    const topArea = topAffected ? (topAffected.area || topAffected.clusterId || 'Zone') : 'Unknown';
    let evidence = `Applies to ${affectedHotspots.length} of ${hotspots.length} hotspots; strongest: ${topArea}`;
    if (topAffected) {
      if (topAffected.tvi != null) {
        evidence += ` (TVI ${topAffected.tvi.toFixed(2)}, ${topAffected.riskTier})`;
      } else {
        evidence += ` (${topAffected.riskTier})`;
      }
    }

    const owner = resolveOwner(directive.id, directive.text);
    const costBand = resolveCostBand(directive.id, directive.text);
    const timeline = resolveTimeline(costBand);
    const phaseInfo = resolvePhase(directive.id, directive.text);

    items.push({
      directiveId: directive.id,
      action: directive.text,
      score,
      evidence,
      owner,
      costBand,
      timeline,
      phaseNumber: phaseInfo.phaseNumber,
      phaseName: phaseInfo.phaseName,
      urgency: phaseInfo.urgency,
    });
  }

  items.sort((a, b) => b.score - a.score || a.directiveId.localeCompare(b.directiveId));

  return items.map((item, idx) => ({
    rank: idx + 1,
    directiveId: item.directiveId,
    action: item.action,
    evidence: item.evidence,
    owner: item.owner,
    costBand: item.costBand,
    timeline: item.timeline,
    phaseNumber: item.phaseNumber,
    phaseName: item.phaseName,
    urgency: item.urgency,
  }));
}

const RECEPTOR_KEYWORDS = {
  school: ['school', 'college', 'university', 'madrassa', 'madrasa'],
  health: ['hospital', 'clinic', 'dispensary', 'basic health'],
  market_labor: [
    'market',
    'bazaar',
    'mandi',
    'plaza',
    'factory',
    'industrial',
    'mazdoor',
    'labor',
    'labour',
    'chowk',
    'adda',
  ],
};

/**
 * F2: Vulnerable-receptor flags.
 * Tags hotspots near schools, clinics/hospitals, markets/labor areas.
 */
export function flagReceptors(hotspots = [], verifiedReports = []) {
  const flags = [];
  for (const h of hotspots) {
    const rawArea = typeof h.area === 'string' ? h.area.trim() : '';
    // A hotspot with no area gets receptors: [], never inferred flags.
    if (!rawArea) {
      continue;
    }
    const areaLower = rawArea.toLowerCase();
    const areaPattern = new RegExp(escapeRegex(rawArea), 'i');
    const texts = [areaLower];

    for (const r of verifiedReports) {
      const rArea = String(r.areaName || '').trim();
      const rDistrict = String(r.district || '').trim();
      const isAreaMatch =
        (rArea && (areaPattern.test(rArea) || rArea.toLowerCase().includes(areaLower))) ||
        (rDistrict && (areaPattern.test(rDistrict) || rDistrict.toLowerCase().includes(areaLower)));

      if (isAreaMatch) {
        if (r.areaName) texts.push(String(r.areaName).toLowerCase());
        if (r.district) texts.push(String(r.district).toLowerCase());
        if (r.description) texts.push(String(r.description).toLowerCase());
      }
    }

    const combined = texts.join(' ');
    const matched = [];
    for (const [key, keywords] of Object.entries(RECEPTOR_KEYWORDS)) {
      if (keywords.some((kw) => combined.includes(kw))) {
        matched.push(key);
      }
    }

    if (matched.length > 0) {
      flags.push({
        hotspotId: String(h.id || h.clusterId),
        area: h.area || h.clusterId,
        riskTier: h.riskTier || 'unknown',
        receptors: matched,
      });
    }
  }
  return flags;
}

/**
 * F3: Time-of-day danger windows.
 * Buckets verified reports with temperatures by hour; finds longest contiguous run with meanTemp >= 38 and count >= 2.
 */
export function buildDangerWindows(
  verifiedReports = [],
  timeZone = 'Asia/Karachi',
  minReports = DEFAULT_MIN_REPORTS_FOR_TREND
) {
  const reportsWithTemp = verifiedReports.filter((r) => isNum(r.ambientTemp));
  if (reportsWithTemp.length < minReports) {
    return { window: null, reason: 'insufficient-data' };
  }

  const hourFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone || 'Asia/Karachi',
    hour: 'numeric',
    hourCycle: 'h23',
  });

  const buckets = Array.from({ length: 24 }, () => ({ temps: [] }));
  for (const r of reportsWithTemp) {
    try {
      const hStr = hourFormatter.format(new Date(r.createdAt));
      const h = parseInt(hStr, 10);
      if (h >= 0 && h < 24) {
        buckets[h].temps.push(r.ambientTemp);
      }
    } catch {}
  }

  const hourly = buckets.map((b) => ({
    count: b.temps.length,
    meanTemp: b.temps.length > 0 ? round1(mean(b.temps)) : null,
  }));

  const runs = [];
  let currentRun = null;
  for (let h = 0; h < 24; h++) {
    const isQualifying = hourly[h].count >= 2 && hourly[h].meanTemp != null && hourly[h].meanTemp >= 38;
    if (isQualifying) {
      if (!currentRun) {
        currentRun = { start: h, end: h, hours: [h] };
      } else {
        currentRun.end = h;
        currentRun.hours.push(h);
      }
    } else {
      if (currentRun) {
        runs.push(currentRun);
        currentRun = null;
      }
    }
  }
  if (currentRun) runs.push(currentRun);

  // Filter runs to those spanning >= 2 hours (Fix 5: minimum sustained width)
  const sustainedRuns = runs.filter((r) => r.hours.length >= 2);
  if (sustainedRuns.length === 0) {
    return { window: null, reason: 'no-sustained-window' };
  }

  for (const run of sustainedRuns) {
    const allTemps = run.hours.flatMap((h) => buckets[h].temps);
    run.length = run.hours.length;
    run.overallMean = mean(allTemps);
    let peakHour = run.hours[0];
    let peakMeanTemp = hourly[peakHour].meanTemp;
    for (const h of run.hours) {
      if (hourly[h].meanTemp > peakMeanTemp) {
        peakHour = h;
        peakMeanTemp = hourly[h].meanTemp;
      }
    }
    run.peakHour = peakHour;
    run.peakMeanTemp = round1(peakMeanTemp);
  }

  sustainedRuns.sort((a, b) => b.length - a.length || b.overallMean - a.overallMean);
  const best = sustainedRuns[0];

  const pad = (n) => String(n).padStart(2, '0');
  const windowStr = `${pad(best.start)}:00–${pad(best.end + 1)}:00`;

  return {
    window: windowStr,
    peakHour: best.peakHour,
    peakMeanTemp: best.peakMeanTemp,
  };
}

/**
 * F4: Comparative rank vs the city.
 * Compares this area's mean hotspot TVI against other areas in the city.
 */
export function buildComparative(cityHotspots = [], scopeArea = null, baseline = null) {
  const byArea = new Map();
  for (const h of cityHotspots) {
    if (h.area && h.tvi != null && isNum(h.tvi)) {
      const areaKey = String(h.area).trim();
      if (!byArea.has(areaKey)) {
        byArea.set(areaKey, []);
      }
      byArea.get(areaKey).push(h.tvi);
    }
  }

  const areaMeans = [];
  for (const [area, tvis] of byArea.entries()) {
    areaMeans.push({
      area,
      meanTvi: mean(tvis),
    });
  }
  areaMeans.sort((a, b) => b.meanTvi - a.meanTvi || a.area.localeCompare(b.area));

  const areasRanked = areaMeans.length;
  let areaRank = null;

  if (areasRanked >= 2 && scopeArea) {
    const scopeLower = String(scopeArea).trim().toLowerCase();
    const idx = areaMeans.findIndex((a) => {
      const aLower = a.area.toLowerCase();
      return aLower === scopeLower || aLower.includes(scopeLower) || scopeLower.includes(aLower);
    });
    if (idx !== -1) {
      areaRank = idx + 1;
    }
  }

  return {
    areaRank,
    areasRanked,
    cityAvgTemp: baseline?.cityAvgTemp ?? null,
    areaDeltaC: baseline?.areaAvgTempDelta ?? null,
  };
}

/**
 * F6: Escalation watch.
 * Tracks 48h verified report surge and links with autonomous outlier notifications.
 * Fix 3: Zero recent reports is NO_RECENT_DATA, never STABLE.
 */
export async function buildEscalationWatch(verifiedReports = [], now = new Date()) {
  const escalateThreshold = Number.isInteger(Number(process.env.INSIGHTS_ESCALATE_COUNT))
    ? Number(process.env.INSIGHTS_ESCALATE_COUNT)
    : 20;
  const watchThreshold = Number.isInteger(Number(process.env.INSIGHTS_WATCH_COUNT))
    ? Number(process.env.INSIGHTS_WATCH_COUNT)
    : 10;

  const nowMs = new Date(now).getTime();
  const h48Ago = nowMs - 48 * 60 * 60 * 1000;

  const last48hReports = verifiedReports.filter((r) => {
    const t = new Date(r.createdAt).getTime();
    return t >= h48Ago && t <= nowMs;
  });
  const last48hCount = last48hReports.length;

  let status = 'STABLE';
  let reason = '';
  if (last48hCount >= escalateThreshold) {
    status = 'ESCALATE';
    reason = `${last48hCount} verified report(s) in last 48h meets or exceeds escalation threshold of ${escalateThreshold}`;
  } else if (last48hCount >= watchThreshold) {
    status = 'WATCH';
    reason = `${last48hCount} verified report(s) in last 48h meets or exceeds watch threshold of ${watchThreshold}`;
  } else if (last48hCount > 0) {
    status = 'STABLE';
    reason = `${last48hCount} verified reports in the last 48h — below watch threshold.`;
  } else {
    status = 'NO_RECENT_DATA';
    reason = 'No verified reports in the last 48h — escalation cannot be assessed; check the reporting pipeline.';
  }

  const outlierNotifications = { extreme_contradiction: 0, enrichment_failed: 0 };
  const reportIds = verifiedReports
    .map((r) => r._id || r.id)
    .filter((id) => id && mongoose.Types.ObjectId.isValid(String(id)));
  if (reportIds.length > 0) {
    try {
      const notifs = await AdminNotification.find({
        reportId: { $in: reportIds },
      })
        .select('type')
        .lean();
      for (const n of notifs) {
        if (n.type === 'extreme_contradiction') outlierNotifications.extreme_contradiction += 1;
        else if (n.type === 'enrichment_failed') outlierNotifications.enrichment_failed += 1;
      }
    } catch (err) {
      console.error('Failed to query AdminNotification in buildEscalationWatch:', err);
    }
  }

  return {
    status,
    reason,
    last48hCount,
    outlierNotifications,
  };
}

/**
 * F7: Root-cause breakdown.
 * Frequency analysis of citizen-supplied heat causes.
 */
export function buildCauseBreakdown(verifiedReports = [], minReports = DEFAULT_MIN_REPORTS_FOR_TREND) {
  const reportsWithCauses = verifiedReports.filter(
    (r) => Array.isArray(r.causes) && r.causes.length > 0
  );
  if (reportsWithCauses.length < minReports) {
    return [];
  }

  const counts = new Map();

  for (const r of reportsWithCauses) {
    const seenInReport = new Set();
    for (const rawCause of r.causes) {
      if (typeof rawCause !== 'string') continue;
      const trimmed = rawCause.trim().replace(/\s+/g, ' ');
      if (!trimmed) continue;
      const normalized = trimmed.toLowerCase();
      if (seenInReport.has(normalized)) continue;
      seenInReport.add(normalized);

      if (!counts.has(normalized)) {
        counts.set(normalized, { count: 0, casingMap: new Map() });
      }
      const entry = counts.get(normalized);
      entry.count += 1;
      entry.casingMap.set(trimmed, (entry.casingMap.get(trimmed) || 0) + 1);
    }
  }

  const results = [];
  for (const [, entry] of counts.entries()) {
    let bestCasing = '';
    let maxCasingCount = -1;
    for (const [casing, cCount] of entry.casingMap.entries()) {
      if (cCount > maxCasingCount) {
        maxCasingCount = cCount;
        bestCasing = casing;
      }
    }
    const pct = round1((entry.count / reportsWithCauses.length) * 100);
    results.push({
      cause: bestCasing,
      count: entry.count,
      pct,
    });
  }

  results.sort((a, b) => b.count - a.count || a.cause.localeCompare(b.cause));
  return results.slice(0, 8);
}

/**
 * F8: "One paragraph for the minister".
 * 3-sentence, zero-jargon summary at the top of the briefing.
 * Fix 4: Province-aware wording, never duplicated name.
 */
export function buildMinisterParagraph({
  area,
  city,
  provinceName,
  isProvinceQuery = false,
  verifiedCount,
  days,
  hotspots = [],
  peakTemp,
  areaAvgTempDelta,
  criticalHotspots = 0,
  receptorFlags = [],
  actionPlan = [],
  dangerWindow,
}) {
  const sentences = [];

  // Sentence 1
  if (isNum(verifiedCount) && isNum(days) && isNum(peakTemp)) {
    let s1 = '';
    if (isProvinceQuery) {
      const pName = provinceName || city;
      s1 = `${pName} recorded ${verifiedCount} verified heat reports in the last ${days} days across ${hotspots.length} hotspots, peaking at ${peakTemp}°C.`;
      if (hotspots.length === 0) {
        s1 += ' No clustered hotspots were published in this window — findings are report-level only.';
      }
    } else {
      const targetArea = area && area !== city ? `${area} (${city})` : (area || city);
      s1 = `${targetArea} recorded ${verifiedCount} verified heat reports in the last ${days} days across ${hotspots.length} hotspots, peaking at ${peakTemp}°C`;
      if (isNum(areaAvgTempDelta) && areaAvgTempDelta > 0) {
        s1 += `, ${areaAvgTempDelta}°C above the ${city} average`;
      }
      s1 += '.';
      if (hotspots.length === 0) {
        s1 += ' No clustered hotspots were published in this window — findings are report-level only.';
      }
    }
    sentences.push(s1);
  }

  // Sentence 2
  if (criticalHotspots > 0) {
    const s = criticalHotspots === 1 ? '' : 's';
    let s2 = `${criticalHotspots} hotspot${s} rated critical`;
    const flaggedCount = Array.isArray(receptorFlags) ? receptorFlags.length : 0;
    if (flaggedCount > 0) {
      s2 += `, ${flaggedCount} overlapping schools, clinics or markets`;
    }
    s2 += '.';
    sentences.push(s2);
  }

  // Sentence 3
  if (Array.isArray(actionPlan) && actionPlan.length > 0 && actionPlan[0]) {
    const first = actionPlan[0];
    let s3 = `Recommended first step: ${first.action} (${first.costBand} cost, ${first.owner} lead)`;
    if (dangerWindow && dangerWindow.window) {
      s3 += `, timed outside the ${dangerWindow.window} danger window`;
    }
    s3 += '.';
    sentences.push(s3);
  }

  if (sentences.length === 0) return null;
  return sentences.join(' ');
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
  dangerWindow,
  comparative,
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

  if (comparative && isNum(comparative.areaRank) && comparative.areasRanked >= 2) {
    takeaways.push(
      `Ranked #${comparative.areaRank} of ${comparative.areasRanked} areas in ${city} by mean hotspot TVI.`
    );
  }

  if (dangerWindow && dangerWindow.window && isNum(dangerWindow.peakMeanTemp) && isNum(dangerWindow.peakHour)) {
    takeaways.push(
      `Extreme heat concentrates ${dangerWindow.window} (peak ${dangerWindow.peakMeanTemp}°C at ${dangerWindow.peakHour}:00) — restrict outdoor labor and adjust school timings in this window.`
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
  // Fix 1: Province queries must aggregate hotspots across ALL province cities
  const provinceCities = isProvinceQuery
    ? Object.keys(CITY_TO_PROVINCE).filter((c) => CITY_TO_PROVINCE[c] === provinceConfig.name)
    : [city];
  if (isProvinceQuery && provinceConfig?.canonicalCity && !provinceCities.includes(provinceConfig.canonicalCity)) {
    provinceCities.push(provinceConfig.canonicalCity);
  }
  const hotspotCities = isProvinceQuery ? provinceCities : [city];
  const runFilter = await currentHotspotRunFilter();
  const [hotspotDocs, publications] = await Promise.all([
    Hotspot.find({ status: 'active', city: { $in: hotspotCities }, ...runFilter }).lean(),
    HotspotPublication.find({ city: { $in: hotspotCities } }).lean(),
  ]);

  const validPublications = publications.filter((p) => p && p.currentRunId);
  const singlePub = publications.find((p) => p.city === city);

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

  // Fix 2: Honest emptiness: never a silent 0
  let hotspotEmptyReason = null;
  if (hotspotDocs.length === 0 || hotspots.length === 0) {
    if (validPublications.length === 0) {
      hotspotEmptyReason = 'no-published-run';
    } else if (hotspotDocs.length > 0 && needle && hotspots.length === 0) {
      hotspotEmptyReason = 'no-area-match';
    } else {
      hotspotEmptyReason = 'below-threshold';
    }
  }

  const topDirectives = aggregateDirectives(hotspots);

  const series = trendEligible
    ? buildSeries(verified, from, to, makeDayKey(timeZone))
    : { volumeSeries: [], tempSeries: [] };

  const allCityHotspots = hotspotDocs.map(toDto).map(toInsightHotspot);
  const actionPlan = buildActionPlan(hotspots, topDirectives);
  const receptorFlags = flagReceptors(hotspots, verified);
  const dangerWindow = buildDangerWindows(verified, timeZone, minReports);
  const comparative = buildComparative(
    allCityHotspots,
    areaTerm,
    { cityAvgTemp: citySummary.avgTemp, areaAvgTempDelta }
  );
  const escalation = await buildEscalationWatch(verified, now);
  const causeBreakdown = buildCauseBreakdown(verified, minReports);
  const criticalHotspotsCount = hotspots.filter((h) => h.riskTier === 'critical').length;
  const ministerBrief = buildMinisterParagraph({
    area: areaTerm,
    city,
    provinceName: isProvinceQuery ? provinceConfig.name : null,
    isProvinceQuery,
    verifiedCount,
    days,
    hotspots,
    peakTemp: summary.peakTemp,
    areaAvgTempDelta,
    criticalHotspots: criticalHotspotsCount,
    receptorFlags,
    actionPlan,
    dangerWindow,
  });

  const citySlug = (city || 'AREA').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const ymd = to.toISOString().slice(0, 10).replace(/-/g, '');
  const briefRef = `HTX-${citySlug}-${ymd}-${days}D`;

  return {
    scope: {
      briefRef,
      city: isProvinceQuery ? (areaTerm || provinceConfig.name) : city,
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
      hotspotRunId: isProvinceQuery ? null : (singlePub?.currentRunId ?? null),
      hotspotRuns: validPublications.map((p) => ({ city: p.city, runId: p.currentRunId })),
      hotspotEmptyReason,
    },
    summary: {
      totalReports: verifiedCount,
      avgTemp: summary.avgTemp,
      peakTemp: summary.peakTemp,
      avgSeverity: summary.avgSeverity,
      activeHotspots: hotspots.length,
      criticalHotspots: criticalHotspotsCount,
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
      dangerWindow,
      comparative,
    }),
    ministerBrief,
    escalation,
    comparative,
    dangerWindow,
    receptorFlags,
    actionPlan,
    causeBreakdown,
  };
}

export default {
  buildInsights,
  minReportsForTrend,
  InsightsValidationError,
  buildActionPlan,
  flagReceptors,
  buildDangerWindows,
  buildComparative,
  buildEscalationWatch,
  buildCauseBreakdown,
  buildMinisterParagraph,
};
