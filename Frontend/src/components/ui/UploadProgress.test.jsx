// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, within } from '@testing-library/react';
import UploadProgress from './UploadProgress.jsx';

describe('UploadProgress', () => {
  it('renders the 0% state', () => {
    const view = render(<UploadProgress progress={0} error={null} />);
    const q = within(view.container);
    const bar = q.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '0');
    expect(bar).toHaveAttribute('aria-label', 'Photo upload progress');
    expect(q.getByText('0%')).toBeTruthy();
    expect(q.getByText(/Uploading photo/)).toBeTruthy();
  });

  it('renders the 50% state', () => {
    const view = render(<UploadProgress progress={50} error={null} />);
    const q = within(view.container);
    expect(q.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
    expect(q.getByText('50%')).toBeTruthy();
  });

  it('renders 100% as complete', () => {
    const view = render(<UploadProgress progress={100} error={null} />);
    const q = within(view.container);
    expect(q.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    expect(q.getByText('100%')).toBeTruthy();
    expect(q.getByText('Upload complete')).toBeTruthy();
  });

  it('renders the error state instead of the bar', () => {
    const view = render(
      <UploadProgress
        progress={null}
        error="Server error (500). Please try again later."
      />
    );
    const q = within(view.container);
    const alert = q.getByRole('alert');
    expect(alert.textContent).toContain('Upload failed');
    expect(alert.textContent).toContain('Server error (500). Please try again later.');
    expect(q.queryByRole('progressbar')).toBeNull();
  });

  it('renders nothing when idle (no progress, no error)', () => {
    const { container } = render(<UploadProgress progress={null} error={null} />);
    expect(container.innerHTML).toBe('');
  });
});
