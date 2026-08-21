import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StaffLogin from './StaffLogin';
import * as firebaseMod from '../firebase';

vi.mock('../firebase', () => ({
  authenticateStaff: vi.fn(),
  isFirebaseConfigured: vi.fn(() => true)
}));

describe('StaffLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form correctly', () => {
    render(<StaffLogin onLogin={() => {}} navigateToHome={() => {}} />);
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
  });

  it('shows error when fields are empty', async () => {
    render(<StaffLogin onLogin={() => {}} navigateToHome={() => {}} />);
    
    const loginBtn = screen.getByRole('button', { name: /Sign In/i });
    fireEvent.click(loginBtn);
    
    expect(screen.getByText('Both fields are required.')).toBeInTheDocument();
  });

  it('calls authenticateStaff and onLogin on success', async () => {
    const mockOnLogin = vi.fn();
    firebaseMod.authenticateStaff.mockResolvedValueOnce({ role: 'manager' });

    render(<StaffLogin onLogin={mockOnLogin} navigateToHome={() => {}} />);
    
    const loginIdInput = screen.getByPlaceholderText(/manager/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);
    
    fireEvent.change(loginIdInput, { target: { value: 'manager' } });
    fireEvent.change(passwordInput, { target: { value: 'admin' } });
    
    // Default role is 'manager', so we just click Login
    const loginBtn = screen.getByRole('button', { name: /Sign In/i });
    fireEvent.click(loginBtn);
    
    await waitFor(() => {
      expect(firebaseMod.authenticateStaff).toHaveBeenCalledWith('manager', 'admin');
      expect(mockOnLogin).toHaveBeenCalledWith('manager');
    });
  });

  it('shows error when authenticateStaff fails', async () => {
    const mockOnLogin = vi.fn();
    firebaseMod.authenticateStaff.mockRejectedValueOnce(new Error('Invalid credentials'));

    render(<StaffLogin onLogin={mockOnLogin} navigateToHome={() => {}} />);
    
    const loginIdInput = screen.getByPlaceholderText(/manager/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);
    
    fireEvent.change(loginIdInput, { target: { value: 'bad_user' } });
    fireEvent.change(passwordInput, { target: { value: 'bad_pass' } });
    
    const loginBtn = screen.getByRole('button', { name: /Sign In/i });
    fireEvent.click(loginBtn);
    
    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      expect(mockOnLogin).not.toHaveBeenCalled();
    });
  });
});
