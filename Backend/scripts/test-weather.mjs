/**
 * Local WeatherAPI smoke test — requires WEATHER_API_KEY in Backend/.env
 * Usage: node scripts/test-weather.mjs [lat] [lng]
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const lat = process.argv[2] ?? '25.4284';
const lng = process.argv[3] ?? '68.2828';
const key = process.env.WEATHER_API_KEY;

if (!key) {
  console.error('Set WEATHER_API_KEY in Backend/.env');
  process.exit(1);
}

const q = `${lat},${lng}`;
const url = `https://api.weatherapi.com/v1/current.json?key=${key}&q=${encodeURIComponent(q)}`;

const res = await fetch(url);
const data = await res.json();
if (!res.ok || data.error) {
  console.error('API error:', data.error ?? res.status);
  process.exit(1);
}
console.log(JSON.stringify(data, null, 2));
