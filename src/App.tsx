import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { withAuthenticator, View, Heading } from "@aws-amplify/ui-react";
import { Amplify } from "aws-amplify";
import { fetchAuthSession, getCurrentUser } from "aws-amplify/auth";
import "./index.css";

// ----------------------
// Types
// ----------------------
interface ApplicationData {
  name: string;
  age: number;
}

const initialApplicationData: ApplicationData = {
  name: "",
  age: 0,
};

// ----------------------
// Component
// ----------------------
const App: React.FC = () => {
  const [applicationData, setApplicationData] = useState<ApplicationData>(initialApplicationData);
  const [userId, setUserId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // 1️⃣ Get current user (Amplify v6 Auth API)
  useEffect(() => {
    const initAuth = async () => {
      try {
        const user = await getCurrentUser();
        setUserId(user.username);
      } catch (error) {
        console.warn("User not signed in:", error);
      } finally {
        setIsReady(true);
      }
    };
    initAuth();
  }, []);

  // 2️⃣ Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      console.log("Submitting data:", applicationData);
      // Replace this with your Amplify API / DataStore logic
      await new Promise((resolve) => setTimeout(resolve, 1000));
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

  // 3️⃣ UI
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-inter">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            Rental Application
          </h1>
          <p className="mt-2 text-lg text-gray-500">Powered by AWS Amplify</p>
          {userId && <p className="mt-1 text-xs text-gray-400">User ID: {userId}</p>}
        </header>

        <form onSubmit={handleSubmit} className="space-y-10">
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Name
            </label>
            <input
              type="text"
              value={applicationData.name}
              onChange={(e) =>
                setApplicationData({ ...applicationData, name: e.target.value })
              }
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Age
            </label>
            <input
              type="number"
              value={applicationData.age}
              onChange={(e) =>
                setApplicationData({
                  ...applicationData,
                  age: Number(e.target.value),
                })
              }
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>

          <div className="pt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full text-lg bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg shadow-md disabled:bg-sky-300 flex items-center justify-center"
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

// Export with Amplify Authenticator
export default withAuthenticator(App);