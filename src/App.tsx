import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    signInAnonymously, 
    signInWithCustomToken, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    GoogleAuthProvider, 
    signInWithPopup 
} from 'firebase/auth';
import { 
    getFirestore, 
    doc, 
    collection, 
    setDoc, 
    serverTimestamp 
} from 'firebase/firestore';

// --- Global Variables for Canvas Environment ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Utility to generate a unique ID for state management
const generateUniqueId = () => Math.random().toString(36).substring(2, 9);

// Initial structure for history entries
const initialHistoryEntry = () => ({
    id: generateUniqueId(),
    address: '',
    from: '',
    to: '',
    contactName: '',
    contactPhone: ''
});

const initialEmploymentEntry = () => ({
    id: generateUniqueId(),
    employer: '',
    from: '',
    to: '',
    supervisorName: '',
    supervisorPhone: ''
});

// Initial structure for an adult applicant
const initialAdult = () => ({
    id: generateUniqueId(),
    firstName: '',
    lastName: '',
    ssn: '', // Sensitive: Requires careful handling in a real app
    email: '',
    leaseTerm: '',
    rentalHistory: [initialHistoryEntry()],
    employmentHistory: [initialEmploymentEntry()],
    idFileFront: null, // File object for ID Front
    idFileBack: null,  // File object for ID Back
});

// The main application component
const App = () => {
    // --- Firebase State ---
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

    // --- Auth State ---
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState('');
    const [isSigningUp, setIsSigningUp] = useState(false); // Toggle between Sign In / Sign Up

    // --- Application Form State ---
    const [adults, setAdults] = useState([initialAdult()]);

    // --- UI State ---
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState(''); // Success/Error message for data operations
    const [showSignInModal, setShowSignInModal] = useState(true);

    // --- 1. Firebase Initialization and Authentication Setup ---
    useEffect(() => {
        if (Object.keys(firebaseConfig).length === 0) {
            console.error("Firebase config is missing. Cannot initialize services.");
            return;
        }

        const app = initializeApp(firebaseConfig);
        const firestoreDb = getFirestore(app);
        const firebaseAuth = getAuth(app);
        
        setDb(firestoreDb);
        setAuth(firebaseAuth);

        const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
            if (user) {
                setUserId(user.uid);
                setAuthError('');
                setShowSignInModal(false);
            } else {
                setUserId(null);
                setShowSignInModal(true);
            }
            setIsAuthReady(true);
        });

        const initializeAuth = async () => {
            try {
                if (initialAuthToken) {
                    await signInWithCustomToken(firebaseAuth, initialAuthToken);
                } else {
                    await signInAnonymously(firebaseAuth);
                }
            } catch (error) {
                console.error("Error during initial authentication:", error.message);
                await signInAnonymously(firebaseAuth).catch(err => {
                    console.error("Anonymous sign-in failed:", err.message);
                });
            }
        };

        if (!isAuthReady) {
            initializeAuth();
        }

        return () => unsubscribe();
    }, []);

    // Helper function to show a temporary message
    const showFeedback = (text) => {
        setMessage(text);
        // Clear message after 5 seconds unless it's a submission loading message
        if (!text.startsWith('Simulating S3 upload')) {
            setTimeout(() => setMessage(''), 5000);
        }
    };

    // --- 2. Authentication Handlers ---
    const handleAuthSubmit = async (e) => {
        e.preventDefault();
        if (!auth) return;

        setIsLoading(true);
        setAuthError('');

        try {
            if (isSigningUp) {
                await createUserWithEmailAndPassword(auth, email, password);
                showFeedback('Sign Up Successful! You are now logged in.');
            } else {
                await signInWithEmailAndPassword(auth, email, password);
                showFeedback('Sign In Successful!');
            }
        } catch (error) {
            setAuthError(error.message.replace('Firebase: ', ''));
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        if (!auth) return;
        setIsLoading(true);
        setAuthError('');

        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            showFeedback('Google Sign-In Successful!');
        } catch (error) {
            setAuthError(error.message.replace('Firebase: ', ''));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignOut = async () => {
        if (!auth) return;
        await signOut(auth);
        setUserId(null);
        showFeedback('You have been signed out.');
    };

    // --- 3. Form State Update Handlers ---

    // Function to update any field of an adult
    const handleAdultChange = (adultId, field, value) => {
        setAdults(prevAdults => 
            prevAdults.map(adult => 
                adult.id === adultId ? { ...adult, [field]: value } : adult
            )
        );
    };

    // Function to add a new adult to the array
    const handleAddAdult = () => {
        setAdults(prevAdults => [...prevAdults, initialAdult()]);
    };

    // Function to remove an adult
    const handleRemoveAdult = (adultId) => {
        if (adults.length > 1) {
            setAdults(prevAdults => prevAdults.filter(adult => adult.id !== adultId));
        } else {
            showFeedback("You must have at least one adult in the application.");
        }
    };

    // Function to add a history entry (rental/employment)
    const handleAddHistoryEntry = (adultId, type) => {
        setAdults(prevAdults => 
            prevAdults.map(adult => 
                adult.id === adultId ? 
                { 
                    ...adult, 
                    [type]: [...adult[type], type === 'rentalHistory' ? initialHistoryEntry() : initialEmploymentEntry()] 
                } : 
                adult
            )
        );
    };

    // Function to remove a history entry
    const handleRemoveHistoryEntry = (adultId, type, entryId) => {
        setAdults(prevAdults => 
            prevAdults.map(adult => {
                if (adult.id === adultId) {
                    const updatedHistory = adult[type].filter(entry => entry.id !== entryId);
                    // Ensure there's always at least one entry for validation purposes
                    if (updatedHistory.length === 0) {
                        showFeedback(`Cannot remove the last ${type === 'rentalHistory' ? 'Rental' : 'Employment'} entry. Please fill it or use the Remove Adult button.`);
                        return adult;
                    }
                    return { ...adult, [type]: updatedHistory };
                }
                return adult;
            })
        );
    };

    // Function to change a history entry field
    const handleHistoryChange = (adultId, type, entryId, field, value) => {
        setAdults(prevAdults => 
            prevAdults.map(adult => {
                if (adult.id === adultId) {
                    return {
                        ...adult,
                        [type]: adult[type].map(entry => 
                            entry.id === entryId ? { ...entry, [field]: value } : entry
                        )
                    };
                }
                return adult;
            })
        );
    };


    // --- 4. Simulated Backend Handlers (S3 and DynamoDB) ---

    // Simulates S3 upload and returns a simulated S3 path
    const uploadFileToS3Simulation = async (file, fileTypeLabel) => {
        return new Promise((resolve) => {
            showFeedback(`Simulating S3 upload for ${fileTypeLabel} (${file.name})...`);
            setTimeout(() => {
                const simulatedS3Path = `s3://${appId}/uploads/${userId}/${Date.now()}_${fileTypeLabel.replace(/\s/g, '_')}_${file.name}`;
                resolve(simulatedS3Path);
            }, 1000); 
        });
    };

    // Simulates saving the entire application data to a DynamoDB table via Firestore
    const saveDataToDynamoDBSimulation = async (data) => {
        if (!db || !userId) {
            throw new Error("Database or User not initialized.");
        }
        // Store all application submissions in a single collection named 'lease_applications'
        const docRef = doc(collection(db, `/artifacts/${appId}/users/${userId}/lease_applications`));
        
        await setDoc(docRef, data);
        console.log("Application saved:", data);
    };

    // --- 5. Main Submission Logic ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!userId) {
            showFeedback('Please sign in to submit data.');
            return;
        }

        // Detailed Validation: check for required fields
        const isFullyValid = adults.every(adult => 
            adult.firstName && adult.lastName && adult.email && adult.ssn && adult.leaseTerm &&
            adult.idFileFront && adult.idFileBack &&
            // Basic history validation (only checks if arrays are not empty, detailed field validation omitted for brevity)
            adult.rentalHistory.length > 0 && adult.employmentHistory.length > 0
        );
        
        if (!isFullyValid) {
            showFeedback('Please ensure ALL required fields are filled and both ID files are selected for every applicant.');
            return;
        }

        setIsLoading(true);
        setMessage('');
        const submissionStartTime = Date.now();

        let finalApplicationData = {
            applicationId: generateUniqueId(),
            submitterUserId: userId,
            submissionDate: serverTimestamp(),
            adults: [],
        };

        try {
            for (const adult of adults) {
                // 1. Simulate S3 Uploads for the two ID files
                const frontPath = await uploadFileToS3Simulation(adult.idFileFront, `${adult.firstName}_ID_Front`);
                const backPath = await uploadFileToS3Simulation(adult.idFileBack, `${adult.firstName}_ID_Back`);

                // 2. Prepare the clean structured data for DynamoDB (Firestore)
                const cleanedAdultData = {
                    firstName: adult.firstName,
                    lastName: adult.lastName,
                    ssn: adult.ssn,
                    email: adult.email,
                    leaseTerm: adult.leaseTerm,
                    // Clean up internal state IDs from history records before saving
                    rentalHistory: adult.rentalHistory.map(({ id, ...rest }) => rest), 
                    employmentHistory: adult.employmentHistory.map(({ id, ...rest }) => rest), 
                    // Store the S3 paths
                    idFiles: {
                        front: frontPath,
                        back: backPath,
                    }
                };
                finalApplicationData.adults.push(cleanedAdultData);
            }

            // 3. Simulate DynamoDB Data Save (using Firestore)
            await saveDataToDynamoDBSimulation(finalApplicationData);

            // 4. Clear form after success
            setAdults([initialAdult()]); // Reset to one empty adult form
            const timeTaken = ((Date.now() - submissionStartTime) / 1000).toFixed(2);
            showFeedback(`Application for ${adults.length} adults submitted successfully! (Simulated backend time: ${timeTaken}s)`);

        } catch (error) {
            console.error("Submission error:", error);
            showFeedback(`Error during submission: ${error.message}. Please check the console for details.`);
        } finally {
            setIsLoading(false);
        }
    };


    // --- 6. UI Helper Components ---

    const HistoryEntry = ({ adultId, entry, type, onChange, onRemove, adultsCount }) => {
        const isRental = type === 'rentalHistory';
        const titlePrefix = isRental ? 'Rental History' : 'Employment History';
        const isOnlyEntry = isRental ? adults.find(a => a.id === adultId).rentalHistory.length === 1 : adults.find(a => a.id === adultId).employmentHistory.length === 1;

        const fields = isRental ? [
            { name: 'address', placeholder: 'Full Address' },
            { name: 'contactName', placeholder: 'Landlord Contact Name' },
            { name: 'contactPhone', placeholder: 'Landlord Phone' },
        ] : [
            { name: 'employer', placeholder: 'Employer Name' },
            { name: 'supervisorName', placeholder: 'Supervisor Name' },
            { name: 'supervisorPhone', placeholder: 'Supervisor Phone' },
        ];

        return (
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3 bg-gray-50 dark:bg-gray-700/50">
                <div className="flex justify-between items-start">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-100">{titlePrefix} Entry</h4>
                    <button
                        type="button"
                        onClick={() => onRemove(entry.id)}
                        className="text-red-500 hover:text-red-700 disabled:opacity-50"
                        title="Remove Entry"
                        disabled={isOnlyEntry}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                    </button>
                </div>
                
                {fields.map(field => (
                    <input
                        key={field.name}
                        type={field.name.includes('phone') ? 'tel' : 'text'}
                        placeholder={`${field.placeholder} *`}
                        value={entry[field.name]}
                        onChange={(e) => onChange(entry.id, field.name, e.target.value)}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-sky-500 focus:border-sky-500 dark:bg-gray-800 dark:text-white text-sm"
                        required
                    />
                ))}

                <div className="grid grid-cols-2 gap-3">
                    <input
                        type="month"
                        title="From Month/Year *"
                        placeholder="From Date (YYYY-MM) *"
                        value={entry.from}
                        onChange={(e) => onChange(entry.id, 'from', e.target.value)}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-sky-500 focus:border-sky-500 dark:bg-gray-800 dark:text-white text-sm"
                        required
                    />
                    <input
                        type="month"
                        title="To Month/Year *"
                        placeholder="To Date (YYYY-MM) *"
                        value={entry.to}
                        onChange={(e) => onChange(entry.id, 'to', e.target.value)}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-sky-500 focus:border-sky-500 dark:bg-gray-800 dark:text-white text-sm"
                        required
                    />
                </div>
            </div>
        );
    };

    const AdultFormSection = ({ adult, onRemoveAdult }) => {
        // Reusable input style
        const inputClass = "w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-sky-500 focus:border-sky-500 bg-white dark:bg-gray-700 dark:text-white text-sm";
        const adultIndex = adults.findIndex(a => a.id === adult.id);
        
        // File change handler specific to the ID type
        const handleFileChange = (e, fileType) => {
            handleAdultChange(adult.id, fileType, e.target.files[0] || null);
        };

        return (
            <div className="p-6 border-2 border-sky-300 dark:border-sky-600 rounded-xl shadow-lg space-y-6 bg-sky-50 dark:bg-gray-900/50 mb-8">
                <div className="flex justify-between items-center border-b pb-4 mb-4">
                    <h3 className="text-xl font-bold text-sky-700 dark:text-sky-300">Applicant {adultIndex + 1} Details</h3>
                    {adults.length > 1 && (
                        <button
                            type="button"
                            onClick={() => onRemoveAdult(adult.id)}
                            className="text-red-500 hover:text-red-700 flex items-center space-x-1 font-medium text-sm transition"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 10-2 0v6a1 1 0 102 0V8z" clipRule="evenodd" /></svg>
                            <span>Remove Applicant</span>
                        </button>
                    )}
                </div>

                {/* Basic Personal Info */}
                <div className="space-y-2">
                    <label className="block text-base font-medium text-gray-700 dark:text-gray-200">Personal Information</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="text" placeholder="First Name *" value={adult.firstName} onChange={(e) => handleAdultChange(adult.id, 'firstName', e.target.value)} className={inputClass} required />
                        <input type="text" placeholder="Last Name *" value={adult.lastName} onChange={(e) => handleAdultChange(adult.id, 'lastName', e.target.value)} className={inputClass} required />
                        <input type="email" placeholder="Email Address *" value={adult.email} onChange={(e) => handleAdultChange(adult.id, 'email', e.target.value)} className={inputClass} required />
                        <input type="text" placeholder="Lease Term Expected (e.g., 12 Months) *" value={adult.leaseTerm} onChange={(e) => handleAdultChange(adult.id, 'leaseTerm', e.target.value)} className={inputClass} required />
                        {/* SSN field - marked as sensitive data */}
                        <input type="password" placeholder="Social Security Number (SSN) *" value={adult.ssn} onChange={(e) => handleAdultChange(adult.id, 'ssn', e.target.value)} className={`${inputClass} col-span-1 md:col-span-2`} required />
                    </div>
                </div>

                {/* Rental History */}
                <div className="space-y-4 pt-4 border-t dark:border-gray-700">
                    <h4 className="font-semibold text-lg text-gray-800 dark:text-gray-100">Rental History (Last 3 Years) *</h4>
                    {adult.rentalHistory.map((entry) => (
                        <HistoryEntry
                            key={entry.id}
                            adultId={adult.id}
                            entry={entry}
                            type="rentalHistory"
                            onChange={(entryId, field, value) => handleHistoryChange(adult.id, 'rentalHistory', entryId, field, value)}
                            onRemove={(entryId) => handleRemoveHistoryEntry(adult.id, 'rentalHistory', entryId)}
                        />
                    ))}
                    <button
                        type="button"
                        onClick={() => handleAddHistoryEntry(adult.id, 'rentalHistory')}
                        className="w-full text-sm text-sky-600 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-200 border border-sky-300 dark:border-sky-700 py-2 rounded-lg transition duration-200"
                    >
                        + Add More Rental History
                    </button>
                </div>
                
                {/* Employment History */}
                <div className="space-y-4 pt-4 border-t dark:border-gray-700">
                    <h4 className="font-semibold text-lg text-gray-800 dark:text-gray-100">Employment History (Last 3 Years) *</h4>
                    {adult.employmentHistory.map((entry) => (
                        <HistoryEntry
                            key={entry.id}
                            adultId={adult.id}
                            entry={entry}
                            type="employmentHistory"
                            onChange={(entryId, field, value) => handleHistoryChange(adult.id, 'employmentHistory', entryId, field, value)}
                            onRemove={(entryId) => handleRemoveHistoryEntry(adult.id, 'employmentHistory', entryId)}
                        />
                    ))}
                    <button
                        type="button"
                        onClick={() => handleAddHistoryEntry(adult.id, 'employmentHistory')}
                        className="w-full text-sm text-sky-600 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-200 border border-sky-300 dark:border-sky-700 py-2 rounded-lg transition duration-200"
                    >
                        + Add More Employment History
                    </button>
                </div>

                {/* ID File Uploads */}
                <div className="space-y-4 pt-4 border-t dark:border-gray-700">
                    <h4 className="font-semibold text-lg text-gray-800 dark:text-gray-100">ID Document Upload (2 Files Required) *</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* ID Front */}
                        <div className="flex flex-col space-y-1">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">ID Front</label>
                            <input
                                type="file"
                                className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 dark:file:bg-sky-900 dark:file:text-sky-300 dark:text-gray-400"
                                onChange={(e) => handleFileChange(e, 'idFileFront')}
                                required
                            />
                            {adult.idFileFront && <p className="text-xs text-green-600 dark:text-green-400 truncate">Selected: {adult.idFileFront.name}</p>}
                        </div>
                        {/* ID Back */}
                        <div className="flex flex-col space-y-1">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">ID Back</label>
                            <input
                                type="file"
                                className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 dark:file:bg-sky-900 dark:file:text-sky-300 dark:text-gray-400"
                                onChange={(e) => handleFileChange(e, 'idFileBack')}
                                required
                            />
                            {adult.idFileBack && <p className="text-xs text-green-600 dark:text-green-400 truncate">Selected: {adult.idFileBack.name}</p>}
                        </div>
                    </div>
                </div>
            </div>
        );
    };
    
    // Main authenticated content view
    const MainAppContent = () => (
        <div className="w-full max-w-4xl bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-xl shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
                    Lease Application Form
                </h1>
                <button
                    onClick={handleSignOut}
                    className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg text-sm transition duration-300"
                >
                    Sign Out
                </button>
            </div>
            
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Fill out the required information for all adult applicants. Data is stored in **Firestore** (simulating DynamoDB), and files are referenced as if stored in **S3**. Fields marked with * are required.
                <br/>
                <span className="font-medium">Current User ID: {userId}</span>
            </p>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Map over adults to render a section for each one */}
                {adults.map((adult) => (
                    <AdultFormSection 
                        key={adult.id}
                        adult={adult}
                        onRemoveAdult={handleRemoveAdult}
                    />
                ))}

                {/* Add Adult Button */}
                <button
                    type="button"
                    onClick={handleAddAdult}
                    className="w-full bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold py-3 px-4 rounded-lg shadow-md transition duration-300 flex items-center justify-center space-x-2 dark:bg-indigo-900 dark:hover:bg-indigo-800 dark:text-indigo-300"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0h-3v-.25A3.6 3.6 0 0012 16h-1a3.6 3.6 0 00-3.6 3.6v.25H3z" /></svg>
                    <span>Add Another Adult Applicant</span>
                </button>

                {/* Submission Button */}
                <button
                    type="submit"
                    disabled={isLoading || adults.length === 0}
                    className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition duration-300 disabled:opacity-50 flex items-center justify-center space-x-2 mt-8"
                >
                    {isLoading ? (
                         <svg className="animate-spin h-5 w-5 text-white mr-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M7.707 10.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h-1v5.586l-1.293-1.293z" /><path d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-2 0a6 6 0 11-12 0 6 6 0 0112 0z" /></svg>
                            <span>Submit Complete Application ({adults.length} Applicants)</span>
                        </>
                    )}
                </button>
            </form>
            
        </div>
    );

    const AuthModal = () => (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-sm transform transition-all">
                <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-6 text-center">
                    {isSigningUp ? 'Create Account' : 'Sign In'}
                </h2>
                
                <form onSubmit={handleAuthSubmit} className="space-y-4">
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-sky-500 focus:border-sky-500 bg-white dark:bg-gray-700 dark:text-white"
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-sky-500 focus:border-sky-500 bg-white dark:bg-gray-700 dark:text-white"
                        required
                    />
                    
                    {authError && (
                        <p className="text-red-500 text-sm text-center">{authError}</p>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition duration-300 disabled:opacity-50 flex items-center justify-center"
                    >
                        {isLoading ? (
                            <svg className="animate-spin h-5 w-5 text-white mr-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : (
                            isSigningUp ? 'Sign Up' : 'Sign In'
                        )}
                    </button>
                </form>

                <div className="flex items-center justify-between my-6">
                    <hr className="w-full border-gray-300 dark:border-gray-600" />
                    <span className="px-3 text-gray-500 dark:text-gray-400 text-sm font-medium">OR</span>
                    <hr className="w-full border-gray-300 dark:border-gray-600" />
                </div>

                <button
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition duration-300 disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm-2 16.5v-9l7 4.5-7 4.5z"/></svg>
                    <span>Sign In with Google</span>
                </button>

                <div className="mt-6 text-center text-sm">
                    <button
                        onClick={() => setIsSigningUp(!isSigningUp)}
                        className="text-sky-600 hover:text-sky-700 font-medium dark:text-sky-400 dark:hover:text-sky-500"
                    >
                        {isSigningUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
                    </button>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {isAuthReady && !userId && "Signed in anonymously. "}
                        User ID: {isAuthReady && (auth.currentUser?.uid || 'N/A')}
                    </p>
                </div>
            </div>
        </div>
    );
    
    // Main App Render
    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 font-sans p-4 sm:p-8 flex flex-col items-center justify-start transition-colors duration-300 pt-10">
            {/* Global Message Bar */}
            {message && (
                <div className={`p-4 mb-4 rounded-lg shadow-lg text-sm text-center font-medium ${message.includes('Error') ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'} w-full max-w-4xl`}>
                    {message}
                </div>
            )}
            
            {/* Show Auth Modal if user is not signed in and auth is ready */}
            {isAuthReady && userId && !showSignInModal ? (
                <MainAppContent />
            ) : (isAuthReady && showSignInModal) ? (
                <AuthModal />
            ) : (
                <div className="text-center p-8 text-gray-600 dark:text-gray-400">
                    <svg className="animate-spin mx-auto h-8 w-8 text-sky-500" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <p className="mt-3">Initializing application...</p>
                </div>
            )}
        </div>
    );
};

export default App;