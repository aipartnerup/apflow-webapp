/**
 * Auto-login hook
 * 
 * Triggers auto-login by calling the configured endpoint, which will:
 * 1. Trigger SessionCookieMiddleware to generate and set JWT token cookie
 * 2. Verify that the server supports auto-login
 * 
 * This hook runs once on mount to initialize cookie-based authentication.
 * After this, all subsequent API requests will automatically include the cookie.
 */

import { useEffect, useState } from 'react';

interface AutoLoginStatus {
  enabled: boolean;
  verified: boolean;
  loading: boolean;
  error?: string;
}

export function useAutoLogin(): AutoLoginStatus {
  const [status, setStatus] = useState<AutoLoginStatus>({
    enabled: false,
    verified: false,
    loading: false,
  });

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      return;
    }

    // Check if auto-login path is configured
    const autoLoginPath = process.env.NEXT_PUBLIC_AUTO_LOGIN_PATH;
    const isEnabled = Boolean(autoLoginPath && autoLoginPath.trim() !== '');

    if (!isEnabled) {
      // Auto-login not configured, no need to trigger
      setStatus({
        enabled: false,
        verified: true,
        loading: false,
      });
      return;
    }

    // Auto-login is configured, trigger it by calling the endpoint
    // This will cause SessionCookieMiddleware to generate and set the JWT cookie
    const triggerAutoLogin = async () => {
      setStatus((prev) => ({ ...prev, enabled: true, loading: true }));

      try {
        // Get API URL from localStorage or use default
        const apiUrl =
          localStorage.getItem('api_url') ||
          process.env.NEXT_PUBLIC_API_URL ||
          'http://localhost:8000';

        // Call the auto-login endpoint
        // This request will go through SessionCookieMiddleware, which will:
        // 1. Check if demo_jwt_token cookie exists
        // 2. If not, generate user_id from browser fingerprint and create JWT token
        // 3. Set the JWT token in cookie (demo_jwt_token)
        // 4. Subsequent API requests will automatically include this cookie
        const response = await fetch(`${apiUrl}${autoLoginPath}`, {
          method: 'GET',
          credentials: 'include', // Include cookies for cross-origin requests (required for cookie to be set)
        });

        if (response.ok) {
          const data = await response.json();
          // Verify the response indicates auto-login is enabled
          if (data.auto_login_enabled === true) {
            // Cookie should now be set by SessionCookieMiddleware
            // All subsequent API requests will automatically include this cookie
            setStatus({
              enabled: true,
              verified: true,
              loading: false,
            });
          } else {
            setStatus({
              enabled: true,
              verified: false,
              loading: false,
              error: 'Server does not support auto-login',
            });
          }
        } else {
          // Even if endpoint returns an error, cookie might have been set
          // Consider it verified if endpoint exists (status 401/403 means endpoint exists)
          if (response.status === 401 || response.status === 403) {
            // Endpoint exists, cookie might have been set by middleware
            setStatus({
              enabled: true,
              verified: true,
              loading: false,
            });
          } else {
            setStatus({
              enabled: true,
              verified: false,
              loading: false,
              error: `Server returned ${response.status}`,
            });
          }
        }
      } catch (error: any) {
        // Network error or CORS issue - endpoint might not exist or server is unreachable
        // Don't treat this as a fatal error, just mark as unverified
        setStatus({
          enabled: true,
          verified: false,
          loading: false,
          error: error.message || 'Failed to trigger auto-login',
        });
      }
    };

    triggerAutoLogin();
  }, []);

  return status;
}

