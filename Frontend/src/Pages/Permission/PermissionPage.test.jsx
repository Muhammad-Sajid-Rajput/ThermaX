// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, within, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const { requestLocation } = vi.hoisted(() => ({ requestLocation: vi.fn() }));

// PermissionPage reads `useUserLocationStore((s) => s.requestLocation)`;
vi.mock('../../stores/userLocationStore.js', () => ({
  default: (selector) => selector({ requestLocation }),
}));

import PermissionPage from './PermissionPage.jsx';

// Note: this repo's RTL setup does not auto-clean between renders, so every
// query is scoped to the render's own container (the existing test style).
function renderPermissionRoute(initialEntries = ['/permission']) {
  const view = render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/permission" element={<PermissionPage />} />
        <Route path="/report" element={<div>report page</div>} />
        <Route path="/permission/denied" element={<div>denied page</div>} />
        <Route path="/" element={<div>home page</div>} />
      </Routes>
    </MemoryRouter>
  );
  return within(view.container);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PermissionPage', () => {
  it('states the accurate privacy policy: snapped public coords, private moderation identity', () => {
    const q = renderPermissionRoute();
    // Public map responses hide identity…
    expect(q.getByText(/snapped, coarsened coordinates/i)).toBeTruthy();
    expect(q.getByText(/ever shown on the public map/i)).toBeTruthy();
    // …but the page must not claim identity is never stored: the backend
    // keeps the uploader linked privately for moderation.
    expect(q.getByText(/moderators/i)).toBeTruthy();
    expect(q.queryByText(/never your identity/i)).toBeNull();
  });

  it('grant success navigates back to the return target', async () => {
    requestLocation.mockResolvedValue({ lat: 24.86, lng: 67.0 });
    const q = renderPermissionRoute();
    fireEvent.click(q.getByRole('button', { name: /grant location access/i }));
    await waitFor(() => {
      expect(q.getByText('report page')).toBeTruthy();
    });
    expect(requestLocation).toHaveBeenCalled();
  });

  it('grant denial navigates to the recovery page', async () => {
    requestLocation.mockResolvedValue(null);
    const q = renderPermissionRoute();
    fireEvent.click(q.getByRole('button', { name: /grant location access/i }));
    await waitFor(() => {
      expect(q.getByText('denied page')).toBeTruthy();
    });
  });

  it('return-home CTA navigates home', () => {
    const q = renderPermissionRoute();
    fireEvent.click(q.getByRole('button', { name: /return home/i }));
    expect(q.getByText('home page')).toBeTruthy();
  });
});
