// @ts-ignore
import React, { useState, useEffect, useCallback } from 'react';
// @ts-ignore
import { initializeApp } from 'firebase/app';
// @ts-ignore
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, User } from 'firebase/auth';
// @ts-ignore
import { getFirestore, doc, setDoc, onSnapshot, Firestore, Unsubscribe, DocumentSnapshot, FirebaseError } from 'firebase/firestore';
// @ts-ignore
import { Loader2, Trash2, Upload, FileText, UserPlus, X, Minus, Plus } from 'lucide-react';
// @ts-ignore
import { v4 as uuidv4 } from 'uuid';


// --- Global Variable Access (MANDATORY) ---
declare const __app_id: string;
declare const __firebase_config: string;
declare const __initial_auth_token: string | undefined;

// Use 'Inter' font via Tailwind's default configuration
const buttonStyles = "px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 ease-in-out shadow-md";
const inputStyles = "w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors";
const containerStyles = "bg-white p-6 rounded-xl shadow-2xl space-y-6";

// =================================================================
// 1. TYPESCRIPT INTERFACES
// =================================================================

// Types for history entries
interface HistoryEntry {
  id: string; // Unique ID for keying and removal
  address: string;
  from: string;
  to: string;
  contactName: string;
  contactPhone: string;
}

interface EmploymentEntry {
  id: string; // Unique ID for keying and removal
  employer: string;
  address: string;
  from: string;
  to: string;
  contactName: string;
  contactPhone: string;
}

interface IdFile {
  driverLicense: File | null;
  passport: File | null;
  other: File | null;
}

interface Adult {
  id: string; // Unique ID for keying and data separation
  files: IdFile;
}

interface ApplicationData {
  firstName: string;
  lastName: string;
  ssn: string;
  email: string;
  leaseTerm: string;
  rentalHistory: HistoryEntry[];
  employmentHistory: EmploymentEntry[];
  mainApplicantIdFiles: IdFile;
  otherAdults: Adult[];
}

interface HistoryEntryProps {
  adultId: string; // Used as key/context
  entry: HistoryEntry | EmploymentEntry;
  type: 'rental' | 'employment';
  onChange: (entryId: string, field: string, value: string) => void;
  onRemove: (entryId: string) => void;
}

interface AdultEntryProps {
  adult: Adult;
  onRemoveAdult: (id: string) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>, fileType: keyof IdFile, adultId: string) => void;
  adultsCount: number;
}

interface FileDisplayProps {
  file: File | null;
  fileTypeLabel: string;
  onRemoveFile: (fileTypeLabel: keyof IdFile) => void;
}

// Initial state for the main applicant
const initialHistoryEntry: HistoryEntry = {
  id: uuidv4(),
  address: '',
  from: '',
  to: '',
  contactName: '',
  contactPhone: '',
};

const initialEmploymentEntry: EmploymentEntry = {
  id: uuidv4(),
  employer: '',
  address: '',
  from: '',
  to: '',
  contactName: '',
  contactPhone: '',
};

const initialApplicationData: ApplicationData = {
  firstName: '',
  lastName: '',
  ssn: '',
  email: '',
  leaseTerm: '',
  rentalHistory: [initialHistoryEntry],
  employmentHistory: [initialEmploymentEntry],
  mainApplicantIdFiles: {
    driverLicense: null,
    passport: null,
    other: null,
  },
  otherAdults: [],
};

// =================================================================
// 2. FILE DISPLAY COMPONENT
// =================================================================
const FileDisplay: React.FC<FileDisplayProps> = ({ file, fileTypeLabel, onRemoveFile }) => {
  if (!file) return null;

  return (
    <div className="flex items-center justify-between p-2 bg-sky-50 border border-sky-200 rounded-lg text-sm">
      <div className="flex items-center space-x-2 truncate">
        <FileText className="w-4 h-4 text-sky-600 flex-shrink-0" />
        <span className="truncate font-medium text-gray-800">{file.name}</span>
        <span className="text-gray-500">({fileTypeLabel})</span>
      </div>
      <button
        onClick={() => onRemoveFile(fileTypeLabel as keyof IdFile)}
        className="ml-2 p-1 text-red-500 hover:text-red-700 bg-white rounded-full transition-colors"
        aria-label={`Remove ${file.name}`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};


// =================================================================
// 3. HISTORY ENTRY COMPONENT
// =================================================================
const HistoryEntryComponent: React.FC<HistoryEntryProps> = ({ entry, type, onChange, onRemove }) => {
  const isRental = type === 'rental';
  const entryId = entry.id;

  return (
    <div className="border border-sky-100 p-4 rounded-xl bg-sky-50/50 space-y-3 relative">
      <button
        type="button"
        onClick={() => onRemove(entryId)}
        className="absolute top-2 right-2 p-1 text-red-500 hover:bg-red-100 rounded-full transition-colors"
        aria-label="Remove entry"
      >
        <Minus className="w-4 h-4" />
      </button>

      {isRental ? (
        <label className="block text-gray-700 font-medium">Previous Address</label>
      ) : (
        <label className="block text-gray-700 font-medium">Employer Name</label>
      )}

      {/* Address / Employer Name */}
      <input
        type="text"
        placeholder={isRental ? "Full Address" : "Employer Name"}
        value={isRental ? (entry as HistoryEntry).address : (entry as EmploymentEntry).employer}
        onChange={(e) => onChange(entryId, isRental ? 'address' : 'employer', e.target.value)}
        className={inputStyles}
        required
      />

      {/* Contact Fields (shared) */}
      <div className="grid grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="Contact Name"
          value={entry.contactName}
          onChange={(e) => onChange(entryId, 'contactName', e.target.value)}
          className={inputStyles}
          required
        />
        <input
          type="tel"
          placeholder="Contact Phone"
          value={entry.contactPhone}
          onChange={(e) => onChange(entryId, 'contactPhone', e.target.value)}
          className={inputStyles}
          required
        />
      </div>

      {/* Dates (shared) */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">From</label>
          <input
            type="date"
            value={entry.from}
            onChange={(e) => onChange(entryId, 'from', e.target.value)}
            className={inputStyles}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">To</label>
          <input
            type="date"
            value={entry.to}
            onChange={(e) => onChange(entryId, 'to', e.target.value)}
            className={inputStyles}
            required
          />
        </div>
      </div>
    </div>
  );
};


// =================================================================
// 4. ADULT FILE UPLOADER COMPONENT
// =================================================================
const AdultFileUploader: React.FC<AdultEntryProps> = ({ adult, onRemoveAdult, onFileChange, adultsCount }) => {
  const adultId = adult.id;
  const fileTypes: { key: keyof IdFile, label: string }[] = [
    { key: 'driverLicense', label: 'Driver\'s License' },
    { key: 'passport', label: 'Passport' },
    { key: 'other', label: 'Other Photo ID' },
  ];

  // NOTE: This onRemoveFile function is a local handler that uses the incoming onFileChange prop.
  // It correctly proxies the removal back to the main component's state update logic.
  const handleRemoveFile = useCallback((fileTypeLabel: keyof IdFile) => {
    // We send a mock event with a null file to trigger the removal logic in the parent component.
    const mockEvent = { target: { files: [null] } } as unknown as React.ChangeEvent<HTMLInputElement>;
    onFileChange(mockEvent, fileTypeLabel, adultId);
  }, [adultId, onFileChange]);

  const adultIndex = adultsCount; // 0-indexed for display purposes

  return (
    <div className="border border-sky-300 p-5 rounded-xl bg-white space-y-4 shadow-sm">
      <div className="flex justify-between items-center pb-2 border-b border-sky-100">
        <h3 className="text-lg font-bold text-sky-800">Co-Applicant {adultIndex > 1 ? adultIndex : ''}</h3>
        <button
          type="button"
          onClick={() => onRemoveAdult(adultId)}
          className={`${buttonStyles} bg-red-500 hover:bg-red-600 text-white`}
          aria-label="Remove co-applicant"
        >
          <Trash2 className="w-4 h-4 inline-block mr-1" /> Remove
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {fileTypes.map((item) => ( 
          <div key={item.key} className="space-y-2">
            <label htmlFor={`file-${adultId}-${item.key}`} className="block text-sm font-semibold text-gray-700">{item.label}</label>
            {adult.files[item.key] ? (
              <FileDisplay
                file={adult.files[item.key]}
                fileTypeLabel={item.label}
                onRemoveFile={handleRemoveFile}
              />
            ) : (
              <div className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg h-24 p-4 hover:border-sky-500 transition-colors cursor-pointer relative">
                <input
                  id={`file-${adultId}-${item.key}`}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => onFileChange(e, item.key, adultId)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  required
                />
                <div className="text-center text-gray-500">
                  <Upload className="w-5 h-5 mx-auto mb-1 text-sky-500" />
                  <p className="text-xs">Click to Upload</p>
                  <p className="text-xs font-medium text-sky-600">{item.label}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};


// =================================================================
// 5. MAIN APPLICATION COMPONENT
// =================================================================
const App: React.FC = () => {
  const [applicationData, setApplicationData] = useState<ApplicationData>(initialApplicationData);
  const [db, setDb] = useState<Firestore | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Parse and initialize Firebase config
  const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
  // FIX: Sanitize the rawAppId to ensure it is a valid single document ID 
  // (no slashes or invalid characters from the provided environment variable).
  const appId = rawAppId.replace(/[./]/g, '-').replace(/-+/g, '-').toLowerCase(); 

  const firebaseConfig: object = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};

  // ----------------------------------------------------------------
  // LIFECYCLE: FIREBASE INITIALIZATION AND AUTHENTICATION
  // ----------------------------------------------------------------
  useEffect(() => {
    try {
      if (Object.keys(firebaseConfig).length === 0) {
        console.error("Firebase configuration is missing or empty.");
        return;
      }
      
      // @ts-ignore
      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const authInstance = getAuth(app);
      setDb(firestore);

      const handleAuth = async () => {
        try {
          if (typeof __initial_auth_token !== 'undefined') {
            await signInWithCustomToken(authInstance, __initial_auth_token);
          } else {
            await signInAnonymously(authInstance);
          }
        } catch (e) {
          console.error("Auth failed:", e);
        }
      };
      handleAuth();

      // FIX 1: Only set isReady and userId upon successful authentication (user is not null)
      const unsubscribe = onAuthStateChanged(authInstance, (user: User | null) => {
        if (user && user.uid) {
          setUserId(user.uid);
          console.log(`User authenticated with ID: ${user.uid}`);
          setIsReady(true); // Only mark ready after successful auth
        } else {
          // If auth fails, do not set isReady=true, keeping the app in a safe loading state
          console.error("Authentication check complete, but no valid user found. Data access disabled.");
          setUserId(null); 
        }
      });

      return () => {
        unsubscribe(); // Clean up auth listener
      };
    } catch (error) {
      console.error("Failed to initialize Firebase:", error);
    }
  }, []);

  // ----------------------------------------------------------------
  // LIFECYCLE: DATA SUBSCRIPTION (READ)
  // ----------------------------------------------------------------
  useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;
    let timeoutId: number | undefined;
    
    if (db && userId && isReady) {
      // The path structure is: collection/document/collection/document/collection/document (6 segments = valid)
      const docPath = `/artifacts/${appId}/users/${userId}/leaseApplication/main`;
      const applicationDocRef = doc(db, docPath);
      console.log(`Attempting to subscribe to: ${docPath}`);

      // FIX 2: Add a small delay to prevent the race condition between auth token update and Firestore read
      timeoutId = window.setTimeout(() => {
        // FIX: Explicitly type docSnapshot and error
        unsubscribe = onSnapshot(applicationDocRef, (docSnapshot: DocumentSnapshot) => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data() as ApplicationData;
            // IMPORTANT: Handle data structure integrity, especially for arrays which might be empty
            // in Firestore but we expect at least one entry for the form fields.
            const loadedData: ApplicationData = {
                ...data,
                rentalHistory: data.rentalHistory && data.rentalHistory.length > 0 ? data.rentalHistory : [initialHistoryEntry],
                employmentHistory: data.employmentHistory && data.employmentHistory.length > 0 ? data.employmentHistory : [initialEmploymentEntry],
                // Ensure files are not re-assigned from non-File objects
                mainApplicantIdFiles: {
                    driverLicense: null,
                    passport: null,
                    other: null,
                },
                otherAdults: data.otherAdults || [],
            };
            setApplicationData(loadedData);
            console.log("Application data loaded from Firestore.");
          }
        }, (error: FirebaseError) => { // FIX: Explicitly type error
          if (error.code === 'permission-denied') {
            console.error("Permission denied. Ensure Firebase security rules are correct for the user path.");
          }
          console.error("Error subscribing to application data:", error);
        });
      }, 50); // 50ms delay

    }

    return () => {
      if (timeoutId !== undefined) {
          window.clearTimeout(timeoutId);
      }
      if (unsubscribe) unsubscribe();
    };
  }, [db, userId, appId, isReady]);

  // ----------------------------------------------------------------
  // HANDLERS
  // ----------------------------------------------------------------

  // Generic field change handler
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setApplicationData(prev => ({ ...prev, [name]: value }));
  }, []);

  // Dynamic history/employment field change handler
  const handleHistoryChange = useCallback((entryId: string, field: keyof HistoryEntry | keyof EmploymentEntry, value: string, type: 'rental' | 'employment') => {
    const historyKey = type === 'rental' ? 'rentalHistory' : 'employmentHistory';
    setApplicationData(prev => ({
      ...prev,
      [historyKey]: prev[historyKey].map(entry =>
        entry.id === entryId ? { ...entry, [field]: value } : entry
      ) as (HistoryEntry[] | EmploymentEntry[]), // Type assertion for union array
    }));
  }, []);

  // Remove history/employment entry handler
  const handleRemoveEntry = useCallback((entryId: string, type: 'rental' | 'employment') => {
    const historyKey = type === 'rental' ? 'rentalHistory' : 'employmentHistory';
    setApplicationData(prev => ({
      ...prev,
      [historyKey]: prev[historyKey].filter(entry => entry.id !== entryId) as (HistoryEntry[] | EmploymentEntry[]), // Type assertion for union array
    }));
  }, []);

  // Add history/employment entry handler
  const handleAddEntry = useCallback((type: 'rental' | 'employment') => {
    const newEntry = type === 'rental' 
      ? { ...initialHistoryEntry, id: uuidv4() } 
      : { ...initialEmploymentEntry, id: uuidv4() };

    const historyKey = type === 'rental' ? 'rentalHistory' : 'employmentHistory';
    setApplicationData(prev => ({
      ...prev,
      [historyKey]: [...prev[historyKey], newEntry] as (HistoryEntry[] | EmploymentEntry[]), // Type assertion for union array
    }));
  }, []);


  // Main applicant file upload handler (only used by main applicant)
  const handleMainApplicantFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, fileType: keyof IdFile) => {
    const file = e.target.files ? e.target.files[0] : null;

    setApplicationData(prev => ({
      ...prev,
      mainApplicantIdFiles: {
        ...prev.mainApplicantIdFiles,
        [fileType]: file
      }
    }));
  }, []);

  // File removal handler for the main applicant only, used by FileDisplay component
  const handleRemoveMainApplicantFile = useCallback((fileTypeLabel: keyof IdFile) => {
    setApplicationData(prev => ({
        ...prev,
        mainApplicantIdFiles: {
            ...prev.mainApplicantIdFiles,
            [fileTypeLabel]: null
        }
    }));
  }, []);

  // Co-applicant file upload handler
  const handleAdultFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, fileType: keyof IdFile, adultId: string) => {
    const file = e.target.files ? e.target.files[0] : null;

    setApplicationData(prev => ({
      ...prev,
      otherAdults: prev.otherAdults.map(adult => 
        adult.id === adultId ? { ...adult, files: { ...adult.files, [fileType]: file } } : adult
      )
    }));
  }, []);


  // Add co-applicant
  const handleAddAdult = useCallback(() => {
    const newAdult: Adult = {
      id: uuidv4(),
      files: { driverLicense: null, passport: null, other: null }
    };
    setApplicationData(prev => ({
      ...prev,
      otherAdults: [...prev.otherAdults, newAdult],
    }));
  }, []);

  // Remove co-applicant
  const handleRemoveAdult = useCallback((id: string) => {
    setApplicationData(prev => ({
      ...prev,
      otherAdults: prev.otherAdults.filter(adult => adult.id !== id),
    }));
  }, []);

  // ----------------------------------------------------------------
  // FIREBASE SUBMISSION
  // ----------------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !userId) {
      console.error("Database not initialized or User ID is missing.");
      return;
    }

    setIsSubmitting(true);
    const docPath = `/artifacts/${appId}/users/${userId}/leaseApplication/main`;
    const applicationDocRef = doc(db, docPath);

    // Filter out File objects before saving to Firestore, as they are not serializable.
    // We replace File objects with simple metadata to signify their existence.
    const serializableData: ApplicationData = JSON.parse(JSON.stringify(applicationData, (key: string, value: any) => {
        // Exclude File objects from serialization.
        if (value instanceof File) {
            return {
                name: value.name,
                size: value.size,
                type: value.type,
                lastModified: value.lastModified,
                exists: true // Mark that a file was attached
            };
        }
        return value;
    }));


    try {
      await setDoc(applicationDocRef, serializableData, { merge: true });
      console.log("Application Data successfully submitted and saved to Firestore.");
    } catch (error: unknown) { // Use unknown type for catch block error
      if (error instanceof Error) {
        console.error('Error submitting form:', error.message);
      } else {
        console.error('An unknown error occurred during submission:', error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };


  // File uploader function for repeated use (main applicant) - NOW A PLAIN JS FUNCTION
  const renderFileUploadSection = () => {
    const files = applicationData.mainApplicantIdFiles;
    
    if (!files) return null;

    const fileTypes: { key: keyof IdFile, label: string }[] = [
      { key: 'driverLicense', label: 'Driver\'s License' },
      { key: 'passport', label: 'Passport' },
      { key: 'other', label: 'Other Photo ID' },
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {fileTypes.map((item) => ( 
          <div key={item.key} className="space-y-2">
            <label htmlFor={`file-${item.key}`} className="block text-sm font-semibold text-gray-700">{item.label}</label>
            {files[item.key] ? (
              <FileDisplay
                file={files[item.key]}
                fileTypeLabel={item.label}
                // Using the top-level, consistent hook here:
                onRemoveFile={handleRemoveMainApplicantFile} 
              />
            ) : (
              <div className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg h-24 p-4 hover:border-sky-500 transition-colors cursor-pointer relative">
                <input
                  id={`file-${item.key}`}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => handleMainApplicantFileChange(e, item.key)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  required
                />
                <div className="text-center text-gray-500">
                  <Upload className="w-5 h-5 mx-auto mb-1 text-sky-500" />
                  <p className="text-xs">Click to Upload</p>
                  <p className="text-xs font-medium text-sky-600">{item.label}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
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
          <p className="mt-2 text-lg text-gray-500">Securely powered by AWS Amplify & Firestore.</p>
          <p className="mt-1 text-xs text-gray-400">Your User ID: **{userId}**</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* ==========================================================
              SECTION 1: APPLICANT INFORMATION
              ========================================================== */}
          <div className={containerStyles}>
            <h2 className="text-2xl font-bold text-gray-800 border-b pb-3 mb-4">1. Personal Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" name="firstName" placeholder="First Name" value={applicationData.firstName} onChange={handleInputChange} className={inputStyles} required />
              <input type="text" name="lastName" placeholder="Last Name" value={applicationData.lastName} onChange={handleInputChange} className={inputStyles} required />
              <input type="text" name="ssn" placeholder="SSN (Last 4 Digits or Full)" value={applicationData.ssn} onChange={handleInputChange} className={inputStyles} required />
              <input type="email" name="email" placeholder="Email Address" value={applicationData.email} onChange={handleInputChange} className={inputStyles} required />
            </div>
            <div>
              <label htmlFor="leaseTerm" className="block text-sm font-medium text-gray-700 mb-1">Desired Lease Term</label>
              <select
                id="leaseTerm"
                name="leaseTerm"
                value={applicationData.leaseTerm}
                onChange={handleInputChange}
                className={inputStyles}
                required
              >
                <option value="">Select Term</option>
                <option value="12">12 Months</option>
                <option value="6">6 Months</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* ==========================================================
              SECTION 2: RENTAL HISTORY
              ========================================================== */}
          <div className={containerStyles}>
            <h2 className="text-2xl font-bold text-gray-800 border-b pb-3 mb-4">2. Rental History</h2>
            <p className="text-sm text-gray-500 mb-6">Please list your previous addresses for the last three years.</p>
            <div className="space-y-6">
              {applicationData.rentalHistory.map((entry: HistoryEntry) => (
                <HistoryEntryComponent
                  key={entry.id}
                  adultId="main"
                  entry={entry}
                  type="rental"
                  onChange={(id, field, value) => handleHistoryChange(id, field as keyof HistoryEntry, value, 'rental')}
                  onRemove={(id) => handleRemoveEntry(id, 'rental')}
                />
              ))}
              <button
                type="button"
                onClick={() => handleAddEntry('rental')}
                className={`${buttonStyles} bg-sky-500 hover:bg-sky-600 text-white w-full flex items-center justify-center`}
              >
                <Plus className="w-4 h-4 mr-2" /> Add Previous Residence
              </button>
            </div>
          </div>

          {/* ==========================================================
              SECTION 3: EMPLOYMENT HISTORY
              ========================================================== */}
          <div className={containerStyles}>
            <h2 className="text-2xl font-bold text-gray-800 border-b pb-3 mb-4">3. Employment History</h2>
            <p className="text-sm text-gray-500 mb-6">Please list your current and previous employers.</p>
            <div className="space-y-6">
              {applicationData.employmentHistory.map((entry: EmploymentEntry) => (
                <HistoryEntryComponent
                  key={entry.id}
                  adultId="main"
                  entry={entry}
                  type="employment"
                  onChange={(id, field, value) => handleHistoryChange(id, field as keyof EmploymentEntry, value, 'employment')}
                  onRemove={(id) => handleRemoveEntry(id, 'employment')}
                />
              ))}
              <button
                type="button"
                onClick={() => handleAddEntry('employment')}
                className={`${buttonStyles} bg-sky-500 hover:bg-sky-600 text-white w-full flex items-center justify-center`}
              >
                <Plus className="w-4 h-4 mr-2" /> Add Previous Employer
              </button>
            </div>
          </div>

          {/* ==========================================================
              SECTION 4: IDENTIFICATION DOCUMENTS
              ========================================================== */}
          <div className={containerStyles}>
            <h2 className="text-2xl font-bold text-gray-800 border-b pb-3 mb-4">4. ID Documents (Main Applicant)</h2>
            <p className="text-sm text-gray-500 mb-6">Upload copies of your primary and secondary photo identification.</p>
            {renderFileUploadSection()}
          </div>

          {/* ==========================================================
              SECTION 5: OTHER ADULTS / CO-APPLICANTS
              ========================================================== */}
          <div className={containerStyles}>
            <h2 className="text-2xl font-bold text-gray-800 border-b pb-3 mb-4">5. Co-Applicants (18+)</h2>
            <p className="text-sm text-gray-500 mb-6">Include identification for all adults (18+) who will reside in the property.</p>

            <div className="space-y-6">
              {applicationData.otherAdults.map((adult, index) => (
                <AdultFileUploader
                  key={adult.id}
                  adult={adult}
                  onRemoveAdult={handleRemoveAdult}
                  onFileChange={handleAdultFileChange}
                  adultsCount={index + 1}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddAdult}
              className={`${buttonStyles} bg-green-500 hover:bg-green-600 text-white w-full flex items-center justify-center mt-6`}
            >
              <UserPlus className="w-4 h-4 mr-2" /> Add Co-Applicant
            </button>
          </div>

          {/* ==========================================================
              SUBMIT BUTTON
              ========================================================== */}
          <div className="pt-6">
            <button
              type="submit"
              disabled={isSubmitting || !isReady}
              className={`${buttonStyles} w-full text-lg bg-sky-600 hover:bg-sky-700 text-white disabled:bg-sky-300 disabled:cursor-not-allowed flex items-center justify-center`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Submitting Application...
                </>
              ) : (
                'Submit Application'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default App;