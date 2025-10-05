import { describe, it, expect } from 'vitest';
import { act } from 'react-dom/test-utils';
import { render, screen, waitFor } from '../test-utils/testing-library-react';
import userEvent from '../test-utils/user-event';
import { App } from '../App';
import { useLayerStore } from '../store/layerStore';

async function completeOnboarding() {
  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: /sign up/i }));
  await userEvent.type(screen.getByPlaceholderText('Email'), 'tester@example.com');
  await userEvent.type(
    screen.getByPlaceholderText('Display Name (optional)'),
    'Tester',
  );
  await userEvent.type(
    screen.getByPlaceholderText('Password (min. 6 characters)'),
    'strongpass',
  );
  await userEvent.type(
    screen.getByPlaceholderText('Confirm Password'),
    'strongpass',
  );
  await userEvent.click(screen.getByRole('button', { name: /sign up/i }));
  await waitFor(() => expect(screen.getByText(/Operator Atlas/i)).toBeTruthy());
}

describe('App integration flows', () => {
  it('completes onboarding and reveals console', async () => {
    await completeOnboarding();
    expect(screen.getByText(/Quantum Link Console/i)).toBeTruthy();
    expect(screen.getByText(/Operator Atlas/i)).toBeTruthy();
  });

  it('enforces visibility toggles and propagates permission updates', async () => {
    await completeOnboarding();

    expect(screen.getByText(/Awaiting decoded intel/i)).toBeTruthy();
    expect(screen.queryByText(/Authorize sync capsule/i)).toBeNull();

    await userEvent.click(screen.getByTestId('layer-toggle-trusted'));
    await waitFor(() => {
      expect(screen.queryByText(/Awaiting decoded intel/i)).toBeNull();
    });

    await act(async () => {
      useLayerStore.getState().setPermissionContext({ role: 'operator' });
    });

    await waitFor(() => {
      expect(screen.getByText(/Authorize sync capsule/i)).toBeTruthy();
      expect(screen.getByText(/Awaiting decoded intel/i)).toBeTruthy();
    });
  });

  it('handles restricted content lifecycle without leaking data', async () => {
    await completeOnboarding();

    const textarea = screen.getByPlaceholderText(/compose encrypted field note/i);
    await userEvent.clear(textarea);
    await userEvent.type(textarea, 'Quantum restricted log');
    await userEvent.click(screen.getByRole('button', { name: /save log/i }));

    expect(screen.queryByText(/Quantum restricted log/i)).toBeNull();

    await act(async () => {
      useLayerStore.getState().elevateRole('operator');
    });

    await waitFor(() => {
      expect(screen.getByText(/Quantum restricted log/i)).toBeTruthy();
    });
  });
});
