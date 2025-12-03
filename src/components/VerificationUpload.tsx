import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

interface VerificationUploadProps {
  profile: any;
}

export function VerificationUpload({ profile }: VerificationUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
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

  const handleFileUpload = async (file: File) => {
    if (!file) return null;

    try {
      setIsUploading(true);

      // Generate upload URL
      const uploadUrl = await generateUploadUrl();

      // Upload file
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!result.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = await result.json();
      return storageId;
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload file");
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const fileInput = document.getElementById("studentId") as HTMLInputElement;
    const studentIdFile = fileInput?.files?.[0];
    const govtIdInput = document.getElementById("govtId") as HTMLInputElement;
    const govtIdFile = govtIdInput?.files?.[0];

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
      />
    </div>
  );
}

interface VerificationFormProps {
  formData: any;
  setFormData: (updater: (prev: any) => any) => void;
  onSubmit: (e: React.FormEvent) => void;
  isUploading: boolean;
}

function VerificationForm({ formData, setFormData, onSubmit, isUploading }: VerificationFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          College Name *
        </label>
        <input
          type="text"
          required
          value={formData.collegeName}
          onChange={(e) => setFormData(prev => ({ ...prev, collegeName: e.target.value }))}
          placeholder="e.g., Stanford University"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Current Course *
          </label>
          <input
            type="text"
            required
            value={formData.course}
            onChange={(e) => setFormData(prev => ({ ...prev, course: e.target.value }))}
            placeholder="e.g., B.Tech in Computer Science"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Department *
          </label>
          <input
            type="text"
            required
            value={formData.department}
            onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
            placeholder="e.g., Computer Engineering"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Expected Graduation Year *
        </label>
        <input
          type="number"
          required
          value={formData.graduationYear}
          onChange={(e) => setFormData(prev => ({ ...prev, graduationYear: parseInt(e.target.value) }))}
          min={new Date().getFullYear()}
          max={new Date().getFullYear() + 10}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          College Email *
        </label>
        <input
          type="email"
          required
          value={formData.collegeEmail}
          onChange={(e) => setFormData(prev => ({ ...prev, collegeEmail: e.target.value }))}
          placeholder="your.name@college.edu"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">
          Must be your official college email address (e.g., .edu, .ac.in domains).
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Student ID Card *
        </label>
        <input
          type="file"
          id="studentId"
          required
          accept="image/*,.pdf"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">
          Upload a clear photo of your student ID card or official enrollment letter (JPG, PNG, or PDF)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Government ID *
        </label>
        <input
          type="file"
          id="govtId"
          required
          accept="image/*,.pdf"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">
          e.g., Adhaar Card, Driver's License, Passport, or PAN Card.
        </p>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">What we verify:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Your college email matches your institution</li>
          <li>• Your student ID shows current enrollment</li>
          <li>• Your name matches across documents</li>
          <li>• Your institution is an accredited college/university</li>
        </ul>
      </div>

      <button
        type="submit"
        disabled={isUploading}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isUploading ? "Uploading..." : "Submit Verification Request"}
      </button>
    </form>
  );
}
