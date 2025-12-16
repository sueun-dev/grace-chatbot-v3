/**
 * Unit tests for downloadit page
 * Tests authentication, CSV download functionality, and UI interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DownloadPage from '@/app/downloadit/page';
import { useRouter } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt} />
  }
}));

// Mock fetch globally
global.fetch = jest.fn();

// Mock window methods
const mockCreateObjectURL = jest.fn();
const mockRevokeObjectURL = jest.fn();
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true
});

describe('DownloadPage Component Tests', () => {
  let mockPush;

  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorageMock.clear();
    mockPush = jest.fn();
    useRouter.mockReturnValue({ push: mockPush });
    mockCreateObjectURL.mockReturnValue('blob:mock-url');
  });

  describe('Authentication Flow', () => {
    test('should render login form when not authenticated', () => {
      render(<DownloadPage />);

      expect(screen.getByText('Admin Access Required')).toBeInTheDocument();
      expect(screen.getByLabelText('Username')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
    });

    test('should handle successful login', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true })
      });

      render(<DownloadPage />);

      const usernameInput = screen.getByLabelText('Username');
      const passwordInput = screen.getByLabelText('Password');
      const loginButton = screen.getByRole('button', { name: 'Login' });

      fireEvent.change(usernameInput, { target: { value: 'admin' } });
      fireEvent.change(passwordInput, { target: { value: 'grace2024!@#' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('CSV Data Download Center')).toBeInTheDocument();
      });

      expect(sessionStorageMock.setItem).toHaveBeenCalledWith('adminAuth', 'true');
      expect(global.fetch).toHaveBeenCalledWith('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'grace2024!@#' })
      });
    });

    test('should handle failed login with invalid credentials', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ authenticated: false })
      });

      render(<DownloadPage />);

      const usernameInput = screen.getByLabelText('Username');
      const passwordInput = screen.getByLabelText('Password');
      const loginButton = screen.getByRole('button', { name: 'Login' });

      fireEvent.change(usernameInput, { target: { value: 'wrong' } });
      fireEvent.change(passwordInput, { target: { value: 'incorrect' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid username or password')).toBeInTheDocument();
      });

      expect(sessionStorageMock.setItem).not.toHaveBeenCalled();
    });

    test('should handle authentication error', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      render(<DownloadPage />);

      const loginButton = screen.getByRole('button', { name: 'Login' });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('Authentication failed. Please try again.')).toBeInTheDocument();
      });
    });

    test('should disable form during authentication', async () => {
      global.fetch.mockImplementationOnce(() =>
        new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<DownloadPage />);

      const usernameInput = screen.getByLabelText('Username');
      const passwordInput = screen.getByLabelText('Password');
      const loginButton = screen.getByRole('button', { name: 'Login' });

      fireEvent.click(loginButton);

      expect(loginButton).toHaveTextContent('Authenticating...');
      expect(usernameInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
    });

    test('should handle logout correctly', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true })
      });

      render(<DownloadPage />);

      // Login first
      const usernameInput = screen.getByLabelText('Username');
      const passwordInput = screen.getByLabelText('Password');
      const loginButton = screen.getByRole('button', { name: 'Login' });

      fireEvent.change(usernameInput, { target: { value: 'admin' } });
      fireEvent.change(passwordInput, { target: { value: 'password' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('CSV Data Download Center')).toBeInTheDocument();
      });

      // Now logout
      const logoutButton = screen.getByRole('button', { name: 'Logout' });
      fireEvent.click(logoutButton);

      expect(screen.getByText('Admin Access Required')).toBeInTheDocument();
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('adminAuth');
    });
  });

  describe('Download Functionality', () => {
    beforeEach(async () => {
      // Setup authenticated state
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true })
      });

      render(<DownloadPage />);

      const usernameInput = screen.getByLabelText('Username');
      const passwordInput = screen.getByLabelText('Password');
      const loginButton = screen.getByRole('button', { name: 'Login' });

      fireEvent.change(usernameInput, { target: { value: 'admin' } });
      fireEvent.change(passwordInput, { target: { value: 'password' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('CSV Data Download Center')).toBeInTheDocument();
      });
    });

    test('should download current CSV successfully', async () => {
      const mockBlob = new Blob(['csv,data'], { type: 'text/csv' });
      global.fetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob
      });

      const createdAnchors = [];
      const originalCreateElement = document.createElement.bind(document);
      const createElementSpy = jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
        const element = originalCreateElement(tagName);
        if (tagName === 'a') {
          createdAnchors.push(element);
          element.click = jest.fn();
        }
        return element;
      });

      try {
        const downloadButton = screen.getByRole('button', { name: 'Download Current CSV' });
        fireEvent.click(downloadButton);

        await waitFor(() => {
          expect(screen.getByText('Download complete!')).toBeInTheDocument();
        });

        expect(global.fetch).toHaveBeenCalledWith('/api/download-csv', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer admin'
          }
        });

        expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
        expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

        expect(createdAnchors.length).toBeGreaterThan(0);
        expect(createdAnchors[0].download).toMatch(/all_user_interactions_.*\.csv/);
      } finally {
        createElementSpy.mockRestore();
      }
    });

    test('should handle CSV download failure', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const downloadButton = screen.getByRole('button', { name: 'Download Current CSV' });
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(screen.getByText('Download failed. Please try again.')).toBeInTheDocument();
      });

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    test('should download all CSV files as ZIP successfully', async () => {
      const mockBlob = new Blob(['zip,data'], { type: 'application/zip' });
      global.fetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob
      });

      const downloadButton = screen.getByRole('button', { name: 'Download All CSV Files (ZIP)' });
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(screen.getByText('All files downloaded!')).toBeInTheDocument();
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/download-all-csv', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer admin'
        }
      });

      expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    test('should handle ZIP download failure', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const downloadButton = screen.getByRole('button', { name: 'Download All CSV Files (ZIP)' });
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(screen.getByText('Download failed. Please try again.')).toBeInTheDocument();
      });

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    test('should show download status messages', async () => {
      const mockBlob = new Blob(['csv,data'], { type: 'text/csv' });
      global.fetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob
      });

      const downloadButton = screen.getByRole('button', { name: 'Download Current CSV' });
      fireEvent.click(downloadButton);

      expect(screen.getByText('Preparing download...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Download complete!')).toBeInTheDocument();
      });

      // Status should disappear after 3 seconds
      await waitFor(() => {
        expect(screen.queryByText('Download complete!')).not.toBeInTheDocument();
      }, { timeout: 4000 });
    });

    test('should display CSV file information', () => {
      expect(screen.getByText('CSV File Information:')).toBeInTheDocument();
      expect(screen.getByText(/User Identifier/)).toBeInTheDocument();
      expect(screen.getByText(/Session ID/)).toBeInTheDocument();
      expect(screen.getByText(/Questionnaire responses/)).toBeInTheDocument();
      expect(screen.getByText(/Scenario evaluations/)).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    test('should navigate back to home from login page', () => {
      render(<DownloadPage />);

      const backButton = screen.getByText('← Back to Home');
      fireEvent.click(backButton);

      expect(mockPush).toHaveBeenCalledWith('/');
    });

    test('should navigate back to home from download page', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true })
      });

      render(<DownloadPage />);

      const usernameInput = screen.getByLabelText('Username');
      const passwordInput = screen.getByLabelText('Password');
      const loginButton = screen.getByRole('button', { name: 'Login' });

      fireEvent.change(usernameInput, { target: { value: 'admin' } });
      fireEvent.change(passwordInput, { target: { value: 'password' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('CSV Data Download Center')).toBeInTheDocument();
      });

      const backButton = screen.getByText('← Back to Home');
      fireEvent.click(backButton);

      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  describe('UI Elements', () => {
    test('should display logo on login page', () => {
      render(<DownloadPage />);

      const logo = screen.getByAltText('Logo');
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute('width', '150');
      expect(logo).toHaveAttribute('height', '80');
    });

    test('should display correct section headers when authenticated', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true })
      });

      render(<DownloadPage />);

      const usernameInput = screen.getByLabelText('Username');
      const passwordInput = screen.getByLabelText('Password');
      const loginButton = screen.getByRole('button', { name: 'Login' });

      fireEvent.change(usernameInput, { target: { value: 'admin' } });
      fireEvent.change(passwordInput, { target: { value: 'password' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('Download Current Session CSV (Raw Data)')).toBeInTheDocument();
      });

      expect(screen.getByText('Download All CSV Files')).toBeInTheDocument();
      expect(screen.getByText(/Download the CSV file containing all user interactions/)).toBeInTheDocument();
      expect(screen.getByText(/Download a ZIP file containing all CSV files/)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty username and password', async () => {
      render(<DownloadPage />);

      const usernameInput = screen.getByLabelText('Username');
      const passwordInput = screen.getByLabelText('Password');
      const loginButton = screen.getByRole('button', { name: 'Login' });

      // Explicitly set empty values
      fireEvent.change(usernameInput, { target: { value: '' } });
      fireEvent.change(passwordInput, { target: { value: '' } });

      // Mock the API response for empty credentials
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ authenticated: false })
      });

      fireEvent.click(loginButton);

      // The form will submit in JSDOM even with empty fields
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/admin-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: '', password: '' })
        });
      });
    });

    test('should handle download with no admin auth in session', async () => {
      // Setup authenticated state
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true })
      });

      render(<DownloadPage />);

      const usernameInput = screen.getByLabelText('Username');
      const passwordInput = screen.getByLabelText('Password');
      const loginButton = screen.getByRole('button', { name: 'Login' });

      fireEvent.change(usernameInput, { target: { value: 'admin' } });
      fireEvent.change(passwordInput, { target: { value: 'password' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('CSV Data Download Center')).toBeInTheDocument();
      });

      // Clear session storage to simulate expired session
      sessionStorageMock.clear();
      sessionStorageMock.getItem.mockReturnValue(null);

      const mockBlob = new Blob(['csv,data'], { type: 'text/csv' });
      global.fetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob
      });

      const downloadButton = screen.getByRole('button', { name: 'Download Current CSV' });
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/download-csv', {
          method: 'GET',
          headers: {
            'Authorization': ''
          }
        });
      });
    });

    test('should handle concurrent download requests', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true })
      });

      render(<DownloadPage />);

      const usernameInput = screen.getByLabelText('Username');
      const passwordInput = screen.getByLabelText('Password');
      const loginButton = screen.getByRole('button', { name: 'Login' });

      fireEvent.change(usernameInput, { target: { value: 'admin' } });
      fireEvent.change(passwordInput, { target: { value: 'password' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('CSV Data Download Center')).toBeInTheDocument();
      });

      const mockBlob1 = new Blob(['csv1'], { type: 'text/csv' });
      const mockBlob2 = new Blob(['csv2'], { type: 'application/zip' });

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          blob: async () => mockBlob1
        })
        .mockResolvedValueOnce({
          ok: true,
          blob: async () => mockBlob2
        });

      const csvButton = screen.getByRole('button', { name: 'Download Current CSV' });
      const zipButton = screen.getByRole('button', { name: 'Download All CSV Files (ZIP)' });

      fireEvent.click(csvButton);
      fireEvent.click(zipButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(3); // 1 auth + 2 downloads
      });
    });
  });
});
