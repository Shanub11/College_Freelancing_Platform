import { useState, useEffect } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { compressImage } from "@/lib/imageUtils";
import posthog from "posthog-js";

interface VerificationUploadProps {
  profile: any;
}

export function VerificationUpload({ profile }: VerificationUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [studentIdFile, setStudentIdFile] = useState<File | null>(null);
  const [govtIdFile, setGovtIdFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    collegeEmail: profile.collegeEmail || "",
    collegeName: profile.collegeName || "",
    course: "",
    department: "",
    graduationYear: new Date().getFullYear() + 1,
  });

  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const submitVerification = useMutation(api.profiles.submitForVerification);
  const verificationStatus = useQuery(api.profiles.getVerificationStatus);

  const validateUpload = useMutation(api.storage.validateUpload);

  const handleFileUpload = async (file: File) => {
    if (!file) return null;

    try {
      setIsUploading(true);

      const compressedFile = await compressImage(file, 1600, 1600, 0.8);

      const uploadUrl = await generateUploadUrl();

      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": compressedFile.type },
        body: compressedFile,
      });

      if (!result.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = await result.json();

      // SERVER-SIDE VALIDATION: validate file type and size on the server.
      // If invalid, server deletes the file and throws an error.
      const validatedId = await validateUpload({
        storageId,
        category: "verification_doc",
      });

      return validatedId;
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload file");
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!studentIdFile || !govtIdFile) {
      toast.error("Please upload both your Student ID and Government ID.");
      return;
    }

    if (!formData.collegeEmail || !formData.collegeName || !formData.course || !formData.department) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setIsUploading(true);

      // Upload the student ID file
      const studentIdStorageId = await handleFileUpload(studentIdFile);
      const govtIdStorageId = await handleFileUpload(govtIdFile);

      if (!studentIdStorageId || !govtIdStorageId) return;

      // Submit verification request
      await submitVerification({
        collegeEmail: formData.collegeEmail,
        collegeName: formData.collegeName,
        course: formData.course,
        department: formData.department,
        graduationYear: formData.graduationYear,
        studentId: studentIdStorageId,
        govtId: govtIdStorageId,
      });

      toast.success("Verification request submitted successfully!");
      posthog.capture("verification_submitted", { college: formData.collegeName });
    } catch (error) {
      console.error("Verification submission error:", error);
      toast.error("Failed to submit verification request");
    } finally {
      setIsUploading(false);
    }
  };

  // If already verified
  if (profile.isVerified) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-green-600 text-xl">✓</span>
          </div>
          <div>
            <h3 className="font-semibold text-green-800">Verification Complete</h3>
            <p className="text-green-700">Your student status has been verified. You can now create gigs and start freelancing!</p>
          </div>
        </div>
      </div>
    );
  }

  // If verification is pending
  if (verificationStatus?.status === "pending") {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
            <span className="text-yellow-600 text-xl">⏳</span>
          </div>
          <div>
            <h3 className="font-semibold text-yellow-800">Verification Pending</h3>
            <p className="text-yellow-700">Your verification request is being reviewed. This usually takes 1-2 business days.</p>
            <p className="text-yellow-600 text-sm mt-1">
              Submitted: {new Date(verificationStatus._creationTime).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If verification was rejected
  if (verificationStatus?.status === "rejected") {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600 text-xl">✗</span>
            </div>
            <div>
              <h3 className="font-semibold text-red-800">Verification Rejected</h3>
              <p className="text-red-700">Your verification request was not approved.</p>
              {verificationStatus.adminNotes && (
                <p className="text-red-600 text-sm mt-1">
                  Reason: {verificationStatus.adminNotes}
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* Allow resubmission */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Submit New Verification Request</h3>
          <VerificationForm 
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmit}
            isUploading={isUploading}
            studentIdFile={studentIdFile}
            setStudentIdFile={setStudentIdFile}
            govtIdFile={govtIdFile}
            setGovtIdFile={setGovtIdFile}
          />
        </div>
      </div>
    );
  }

  // Show verification form
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Student Verification Required</h3>
        <p className="text-gray-600">
          To maintain trust and quality on our platform, we need to verify that you're currently enrolled as a college student.
        </p>
      </div>

      <VerificationForm 
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        isUploading={isUploading}
        studentIdFile={studentIdFile}
        setStudentIdFile={setStudentIdFile}
        govtIdFile={govtIdFile}
        setGovtIdFile={setGovtIdFile}
      />
    </div>
  );
}

interface FileUploaderProps {
  id: string;
  label: string;
  description: string;
  file: File | null;
  onChange: (file: File | null) => void;
}

function FileUploader({ id, label, description, file, onChange }: FileUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onChange(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</label>
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all ${
          dragActive
            ? "border-primary-500 bg-primary-50/30 dark:bg-primary-950/10"
            : "border-gray-300 dark:border-dark-border hover:border-gray-400 dark:hover:border-gray-600 bg-gray-50/50 dark:bg-dark-surface/40"
        }`}
      >
        <input
          type="file"
          id={id}
          required={!file}
          accept="image/*,.pdf"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              onChange(e.target.files[0]);
            }
          }}
        />
        {previewUrl ? (
          <div className="relative z-20 space-y-3">
            <img src={previewUrl} alt="Preview" className="max-h-32 mx-auto rounded-lg object-contain shadow-sm border border-gray-200 dark:border-dark-border" />
            <div className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[280px]">{file?.name}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {((file?.size || 0) / 1024 / 1024).toFixed(2)} MB · <button type="button" onClick={() => onChange(null)} className="text-red-500 hover:text-red-700 underline font-semibold">Remove</button>
            </div>
          </div>
        ) : file ? (
          <div className="relative z-20 space-y-2">
            <div className="text-4xl">📄</div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[280px]">{file.name}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {((file.size) / 1024 / 1024).toFixed(2)} MB · <button type="button" onClick={() => onChange(null)} className="text-red-500 hover:text-red-700 underline font-semibold">Remove</button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-4xl text-gray-400">📤</div>
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              <span className="text-primary-600 dark:text-primary-400">Click to upload</span> or drag and drop
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{description}</div>
          </div>
        )}
      </div>
    </div>
  );
}

interface VerificationFormProps {
  formData: any;
  setFormData: (updater: (prev: any) => any) => void;
  onSubmit: (e: React.FormEvent) => void;
  isUploading: boolean;
  studentIdFile: File | null;
  setStudentIdFile: (file: File | null) => void;
  govtIdFile: File | null;
  setGovtIdFile: (file: File | null) => void;
}

function VerificationForm({
  formData,
  setFormData,
  onSubmit,
  isUploading,
  studentIdFile,
  setStudentIdFile,
  govtIdFile,
  setGovtIdFile,
}: VerificationFormProps) {
  const [step, setStep] = useState<"email" | "otp" | "details">("email");
  const [otp, setOtp] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const sendOtpAction = useAction(api.verification.sendOtpEmail);
  const verifyOtpMutation = useMutation(api.verification.verifyOtp);

  // Track funnel step progression
  useEffect(() => {
    posthog.capture("verification_step_viewed", { step });
  }, [step]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.collegeEmail) {
      toast.error("Please enter your college email first");
      return;
    }

    try {
      setIsSending(true);
      await sendOtpAction({ email: formData.collegeEmail });
      toast.success("OTP sent to your email!");
      setStep("otp");
    } catch (err: any) {
      toast.error(err.message || "Failed to send OTP");
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;

    try {
      setIsVerifying(true);
      await verifyOtpMutation({ email: formData.collegeEmail, otp });
      toast.success("Email verified successfully!");
      setStep("details");
    } catch (err: any) {
      toast.error(err.message || "Invalid OTP");
    } finally {
      setIsVerifying(false);
    }
  };

  if (step === "email") {
    return (
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            College Email *
          </label>
          <input
            type="email"
            required
            value={formData.collegeEmail}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, collegeEmail: e.target.value }))}
            placeholder="your.name@college.edu"
            className="input-field"
          />
          <p className="text-xs text-gray-500 mt-1.5">
            Must be your official college email address (e.g., .edu, .ac.in domains).
          </p>
        </div>
        <button
          onClick={handleSendOtp}
          disabled={isSending || !formData.collegeEmail}
          className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2.5 ${
            isSending
              ? "bg-primary-700 dark:bg-primary-800 text-white cursor-wait opacity-100"
              : "btn-primary active:scale-[0.99] disabled:opacity-50"
          }`}
        >
          {isSending ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Sending OTP...</span>
            </>
          ) : (
            "Send Verification OTP"
          )}
        </button>
      </div>
    );
  }

  if (step === "otp") {
    return (
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Enter Verification Code (OTP) *
          </label>
          <p className="text-sm text-gray-600 mb-2">Sent to {formData.collegeEmail}</p>
          <input
            type="text"
            required
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="123456"
            className="input-field text-center text-lg tracking-widest font-bold"
            maxLength={6}
          />
        </div>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setStep("email")}
            className="w-1/3 btn-secondary py-3"
          >
            Back
          </button>
          <button
            onClick={handleVerifyOtp}
            disabled={isVerifying || otp.length < 6}
            className={`w-2/3 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2.5 ${
              isVerifying
                ? "bg-primary-700 dark:bg-primary-800 text-white cursor-wait opacity-100"
                : "btn-primary disabled:opacity-50"
            }`}
          >
            {isVerifying ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              "Verify Email"
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="bg-emerald-50 border border-emerald-200/60 text-emerald-800 p-4 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">✓</span>
          <p className="font-semibold">Email Verified: {formData.collegeEmail}</p>
        </div>
        <button type="button" onClick={() => setStep("email")} className="text-sm text-emerald-700 font-bold hover:underline">Change</button>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          College Name *
        </label>
        <input
          type="text"
          required
          value={formData.collegeName}
          onChange={(e) => setFormData(prev => ({ ...prev, collegeName: e.target.value }))}
          placeholder="e.g., Stanford University"
          className="input-field"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Current Course *
          </label>
          <input
            type="text"
            required
            value={formData.course}
            onChange={(e) => setFormData(prev => ({ ...prev, course: e.target.value }))}
            placeholder="e.g., B.Tech in Computer Science"
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Department *
          </label>
          <input
            type="text"
            required
            value={formData.department}
            onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
            placeholder="e.g., Computer Engineering"
            className="input-field"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Expected Graduation Year *
        </label>
        <input
          type="number"
          required
          value={formData.graduationYear}
          onChange={(e) => setFormData(prev => ({ ...prev, graduationYear: parseInt(e.target.value) }))}
          min={new Date().getFullYear()}
          max={new Date().getFullYear() + 10}
          className="input-field"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FileUploader
          id="studentId"
          label="Student ID Card *"
          description="Upload a clear photo of your student ID card (JPG, PNG, PDF). Max 10MB."
          file={studentIdFile}
          onChange={setStudentIdFile}
        />
        <FileUploader
          id="govtId"
          label="Government ID *"
          description="Aadhaar, Driver's License, Passport, or PAN Card. Max 10MB."
          file={govtIdFile}
          onChange={setGovtIdFile}
        />
      </div>

      <div className="bg-primary-50 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-900/30 p-4 rounded-xl">
        <h4 className="font-semibold text-primary-900 dark:text-primary-300 mb-2">What we verify:</h4>
        <ul className="text-sm text-primary-700 dark:text-primary-400 space-y-1.5">
          <li>• Your college email matches your institution</li>
          <li>• Your student ID shows current enrollment</li>
          <li>• Your name matches across documents</li>
          <li>• Your institution is an accredited college/university</li>
        </ul>
      </div>

      <button
        type="submit"
        disabled={isUploading}
        className={`w-full py-3.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2.5 ${
          isUploading
            ? "bg-primary-700 dark:bg-primary-800 text-white cursor-wait opacity-100"
            : "btn-primary active:scale-[0.99]"
        }`}
      >
        {isUploading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Uploading & Submitting...</span>
          </>
        ) : (
          "Submit Verification Request"
        )}
      </button>
    </form>
  );
}
