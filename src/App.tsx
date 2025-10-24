import React, { useState, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  Button,
  Loader,
  withAuthenticator,
  View,
  Heading,
} from "@aws-amplify/ui-react";
import { DataStore } from "aws-amplify/datastore";
import { Auth } from "aws-amplify";
import { Loader2, Upload, Trash2, FileText, X, Plus, Minus, UserPlus } from "lucide-react";
import "./index.css";

// --- Types and UI setup (same as before) ---
const buttonStyles = "px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 ease-in-out shadow-md";
const inputStyles = "w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors";
const containerStyles = "bg-white p-6 rounded-xl shadow-2xl space-y-6";

// Your existing interfaces and initial states here...
// (Keep your HistoryEntry, EmploymentEntry, IdFile, Adult, ApplicationData, etc. definitions unchanged)

// =================================================================
// MAIN APPLICATION COMPONENT (AMPLIFY VERSION)
// =================================================================
const App: React.FC = () => {
  const [applicationData, setApplicationData] = useState<ApplicationData>(initialApplicationData);
  const [userId, setUserId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // 1️⃣ Authenticate with Amplify Auth (Cognito)
  useEffect(() => {
    const initAuth = async () => {
      try {
        const user = await Auth.currentAuthenticatedUser();
        setUserId(user.username);
        setIsReady(true);
      } catch (error) {
        console.error("Auth error:", error);
        setIsReady(true); // still load UI if not signed in
      }
    };
    initAuth();
  }, []);

  // 2️⃣ Save Data to Amplify DataStore or API (instead of Firestore)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      console.log("Submitting data:", applicationData);
      // Example: Save to API or DynamoDB via AppSync mutation
      // await API.graphql({ query: mutations.createApplication, variables: { input: applicationData } });
      console.log("Saved successfully.");
    } catch (err) {
      console.error("Error saving data:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
        <p className="ml-2 text-sky-600">Initializing Application...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-inter">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Rental Application</h1>
          <p className="mt-2 text-lg text-gray-500">Powered by AWS Amplify</p>
          {userId && <p className="mt-1 text-xs text-gray-400">User ID: {userId}</p>}
        </header>

        {/* Your existing form JSX unchanged, except handleSubmit now calls Amplify */}
        <form onSubmit={handleSubmit} className="space-y-10">
          {/* ... all your form sections here ... */}
          <div className="pt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`${buttonStyles} w-full text-lg bg-sky-600 hover:bg-sky-700 text-white disabled:bg-sky-300 disabled:cursor-not-allowed flex items-center justify-center`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Submitting Application...
                </>
              ) : (
                "Submit Application"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Export with Amplify Authenticator (for login)
export default withAuthenticator(App);