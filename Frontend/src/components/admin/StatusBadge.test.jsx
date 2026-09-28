// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, within } from '@testing-library/react';
import StatusBadge from './StatusBadge.jsx';

describe('StatusBadge', () => {
  it('renders the Phase 3 lifecycle statuses with correct labels', () => {
    // Queries are scoped to each render's container: this repo has no
    // testing-library setup file, so renders are not auto-cleaned up.
    let view = render(<StatusBadge status="pending" />);
    expect(within(view.container).getByText('Pending')).toBeTruthy();

    view = render(<StatusBadge status="verified" />);
    expect(within(view.container).getByText('Verified')).toBeTruthy();

    view = render(<StatusBadge status="flagged" />);
    expect(within(view.container).getByText('Flagged')).toBeTruthy();

    view = render(<StatusBadge status="rejected" />);
    expect(within(view.container).getByText('Rejected')).toBeTruthy();
  });

  it("treats the legacy 'validated' status as Verified", () => {
    const view = render(<StatusBadge status="validated" />);
    expect(within(view.container).getByText('Verified')).toBeTruthy();
  });

  it('normalizes case for status keys', () => {
    const view = render(<StatusBadge status="VERIFIED" />);
    expect(within(view.container).getByText('Verified')).toBeTruthy();
  });
});
