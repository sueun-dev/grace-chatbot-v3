"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

/**
 * DownloadPage
 * - Admin login (client-side gate backed by /api/admin-auth)
 * - Download current CSV (/api/download-csv)
 * - Download all CSVs as ZIP (/api/download-all-csv)
 * - Test-friendly: noValidate on form, session restore, deterministic messages
 */
export default function DownloadPage() {
  const router = useRouter();

  // Auth & UI state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState("");

  // Download concurrency guards
  const [isCsvDownloading, setIsCsvDownloading] = useState(false);
  const [isZipDownloading, setIsZipDownloading] = useState(false);

  // Restore session (used by tests and actual app after refresh)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const ok = sessionStorage.getItem("adminAuth") === "true";
      if (ok) setIsAuthenticated(true);
    }
  }, []);

  /** @param {import('react').FormEvent<HTMLFormElement>} e */
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data?.authenticated) {
        setIsAuthenticated(true);
        sessionStorage.setItem("adminAuth", "true");
      } else {
        // Test expectation: invalid credentials show this exact message
        setError("Invalid username or password");
      }
    } catch {
      // Network/unknown auth error
      setError("Authentication failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadCSV = async () => {
    if (isCsvDownloading) return;
    setIsCsvDownloading(true);
    setDownloadStatus("Preparing download...");

    try {
      const response = await fetch("/api/download-csv", {
        method: "GET",
        headers: {
          Authorization:
            sessionStorage.getItem("adminAuth") === "true" ? "Bearer admin" : "",
        },
      });

      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      const downloadFileName = `all_user_interactions_${new Date()
        .toISOString()
        .split("T")[0]}.csv`;

      // Ensure both attribute and property are set (for test env compatibility)
      a.setAttribute("download", downloadFileName);
      a.download = downloadFileName;

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setDownloadStatus("Download complete!");
      setTimeout(() => setDownloadStatus(""), 3000);
    } catch (err) {
      console.error("Download error:", err);
      setDownloadStatus("Download failed. Please try again.");
    } finally {
      setIsCsvDownloading(false);
    }
  };

  const handleDownloadAllCSVs = async () => {
    if (isZipDownloading) return;
    setIsZipDownloading(true);
    setDownloadStatus("Preparing all CSV files...");

    try {
      const response = await fetch("/api/download-all-csv", {
        method: "GET",
        headers: {
          Authorization:
            sessionStorage.getItem("adminAuth") === "true" ? "Bearer admin" : "",
        },
      });

      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      const downloadFileName = `all_csv_files_${new Date()
        .toISOString()
        .split("T")[0]}.zip`;

      a.setAttribute("download", downloadFileName);
      a.download = downloadFileName;

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setDownloadStatus("All files downloaded!");
      setTimeout(() => setDownloadStatus(""), 3000);
    } catch (err) {
      console.error("Download error:", err);
      setDownloadStatus("Download failed. Please try again.");
    } finally {
      setIsZipDownloading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem("adminAuth");
    setUsername("");
    setPassword("");
    setError("");
  };

  // --- Unauthenticated view ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="flex justify-center mb-6">
            <Image src="/logo.svg" width={150} height={80} alt="Logo" />
          </div>

          <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
            Admin Access Required
          </h1>

          {/* noValidate: allow submit in JSDOM tests even with required fields */}
          <form onSubmit={handleLogin} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={isLoading}
              />
            </div>

            {error && (
              <div
                className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-lg text-sm"
                role="alert"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-2 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-purple-600 transition-colors disabled:opacity-50"
            >
              {isLoading ? "Authenticating..." : "Login"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Authenticated view ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <Image src="/logo.svg" width={150} height={80} alt="Logo" />
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 border border-gray-300 rounded-lg"
          >
            Logout
          </button>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          CSV Data Download Center
        </h1>

        <div className="space-y-6">
          {/* Current CSV */}
          <div className="border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">
              Download Current Session CSV
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Download the CSV file containing all user interactions from the
              current chatbot session.
            </p>
            <button
              type="button"
              onClick={handleDownloadCSV}
              disabled={isCsvDownloading}
              className="bg-blue-500 text-white py-2 px-6 rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {/* Keep label static to avoid duplicate "Preparing..." text nodes */}
              Download Current CSV
            </button>
          </div>

          {/* All CSVs ZIP */}
          <div className="border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">
              Download All CSV Files
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Download a ZIP file containing all CSV files from all chatbot
              sessions (General AI, Doctor AI, Friend AI).
            </p>
            <button
              type="button"
              onClick={handleDownloadAllCSVs}
              disabled={isZipDownloading}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 px-6 rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-colors disabled:opacity-50"
            >
              {/* Keep label static for the same reason as above */}
              Download All CSV Files (ZIP)
            </button>
          </div>

          {/* Status messages (single source of truth for progress/success/fail) */}
          {downloadStatus && (
            <div
              role="status"
              className={`text-center py-2 px-4 rounded-lg ${
                downloadStatus.includes("failed")
                  ? "bg-red-100 text-red-700"
                  : downloadStatus.includes("Preparing")
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {downloadStatus}
            </div>
          )}

          {/* Info list */}
          <div className="border-t pt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              CSV File Information:
            </h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• User Identifier (입력한 암호)</li>
              <li>• Session ID</li>
              <li>• All user actions and selections</li>
              <li>• Questionnaire responses</li>
              <li>• Scenario evaluations (appropriate/inappropriate)</li>
              <li>• Retry attempts and scores</li>
              <li>• Free chat conversations</li>
              <li>• Timestamps for all actions</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
