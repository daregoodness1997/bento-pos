import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import Auth from '../pages/Auth';

const mockLogin = jest.fn(() => true);

jest.mock('context', () => ({
  DEMO_EMAIL: 'ada@bento.pos',
  DEMO_PASSWORD: 'bento1234',
  useAuth: () => ({ login: mockLogin }),
}));

describe('Auth', () => {
  beforeEach(() => {
    mockLogin.mockClear();
  });

  it('submits valid credentials', async () => {
    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'ada@bento.pos' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'bento1234' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Open register' }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('ada@bento.pos', 'bento1234');
    });
  });
});
