import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 20 },
    { duration: '20s', target: 50 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
  },
};

export default function () {
  const url = 'http://localhost:5000/api/v1/health';
  const res = http.get(url);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'protocol is v1': (r) => r.json().apiVersion === 'v1',
  });
  sleep(1);
}
