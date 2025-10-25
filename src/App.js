import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { withAuthenticator } from "@aws-amplify/ui-react";
import * as Auth from "@aws-amplify/auth";
import "./index.css";
// --- Styles ---
const buttonStyles = "px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 ease-in-out shadow-md";
const inputStyles = "w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors";
const containerStyles = "bg-white p-6 rounded-xl shadow-2xl space-y-6";
const initialApplicationData = {
    name: "",
    age: 0,
    // Initialize other fields here
};
// =================================================================
// MAIN APP COMPONENT
// =================================================================
const App = () => {
    const [applicationData, setApplicationData] = useState(initialApplicationData);
    const [userId, setUserId] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isReady, setIsReady] = useState(false);
    // Authenticate user
    useEffect(() => {
        const initAuth = async () => {
            try {
                const user = await Auth.currentAuthenticatedUser();
                setUserId(user.username);
                setIsReady(true);
            }
            catch (error) {
                console.error("Auth error:", error);
                setIsReady(true); // still load UI if not signed in
            }
        };
        initAuth();
    }, []);
    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            console.log("Submitting data:", applicationData);
            // Example: save to DataStore or API
            // await DataStore.save(new ApplicationModel(applicationData));
            console.log("Saved successfully.");
        }
        catch (err) {
            console.error("Error saving data:", err);
        }
        finally {
            setIsSubmitting(false);
        }
    };
    if (!isReady) {
        return (_jsxs("div", { className: "flex items-center justify-center min-h-screen bg-gray-50", children: [_jsx(Loader2, { className: "w-8 h-8 animate-spin text-sky-600" }), _jsx("p", { className: "ml-2 text-sky-600", children: "Initializing Application..." })] }));
    }
    return (_jsx("div", { className: "min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-inter", children: _jsxs("div", { className: "max-w-4xl mx-auto", children: [_jsxs("header", { className: "text-center mb-10", children: [_jsx("h1", { className: "text-4xl font-extrabold text-gray-900 tracking-tight", children: "Rental Application" }), _jsx("p", { className: "mt-2 text-lg text-gray-500", children: "Powered by AWS Amplify" }), userId && (_jsxs("p", { className: "mt-1 text-xs text-gray-400", children: ["User ID: ", userId] }))] }), _jsx("form", { onSubmit: handleSubmit, className: "space-y-10", children: _jsx("div", { className: "pt-6", children: _jsx("button", { type: "submit", disabled: isSubmitting, className: `${buttonStyles} w-full text-lg bg-sky-600 hover:bg-sky-700 text-white disabled:bg-sky-300 disabled:cursor-not-allowed flex items-center justify-center`, children: isSubmitting ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-5 h-5 mr-2 animate-spin" }), "Submitting Application..."] })) : ("Submit Application") }) }) })] }) }));
};
export default withAuthenticator(App);
