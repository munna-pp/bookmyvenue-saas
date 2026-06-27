/**
 * Dynamically resolves the API endpoint URL.
 * - Uses NEXT_PUBLIC_API_BASE_URL environment variable if defined.
 * - Falls back to direct backend connection (http://localhost:5000) during local development when bypassing Nginx.
 * - Returns relative path when running behind Nginx.
 */
export const getApiUrl = (path: string): string => {
  const envBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envBaseUrl) {
    return `${envBaseUrl.replace(/\/$/, '')}${path}`;
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    if (port && ['3000', '3001', '3002'].includes(port)) {
      return `${protocol}//${hostname}:5000${path}`;
    }
  }

  return path;
};
