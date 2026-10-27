"use client";
import { siteConfig, isEmail } from "@/site.config";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { prepareUploadFile } from "@/lib/prepare-upload-file";

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  birthday: string;
  bio: string;
  spouseName: string;
  businessName: string;
  businessWebsite: string;
  socialLinks: {
    linkedin: string;
    twitter: string;
    instagram: string;
    facebook: string;
    other: string;
  };
  photoUrl: string | null;
  lifelineUrl: string | null;
  lifelineFileName: string | null;
  archetypeUrl: string | null;
  archetypeFileName: string | null;
  profileCompleted?: boolean;
  role?: string;
}

const INITIAL_PROFILE: ProfileData = {
  firstName: "",
  lastName: "",
  email: "",
  birthday: "",
  bio: "",
  spouseName: "",
  businessName: "",
  businessWebsite: "",
  socialLinks: {
    linkedin: "",
    twitter: "",
    instagram: "",
    facebook: "",
    other: "",
  },
  photoUrl: null,
  lifelineUrl: null,
  lifelineFileName: null,
  archetypeUrl: null,
  archetypeFileName: null,
};

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const [profile, setProfile] = useState<ProfileData>(INITIAL_PROFILE);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingLifeline, setUploadingLifeline] = useState(false);
  const [uploadingArchetype, setUploadingArchetype] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);

  useEffect(() => {
    if (isLoaded && user) {
      setProfile((prev) => ({
        ...prev,
        firstName: user.firstName || prev.firstName || "",
        lastName: user.lastName || prev.lastName || "",
        email: user.primaryEmailAddress?.emailAddress || "",
      }));
      fetchProfile();
    }
  }, [isLoaded, user]);

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/profile");
      if (response.ok) {
        const data = await response.json();
        if (data.profile) {
          setProfile((prev) => ({
            ...prev,
            ...data.profile,
            firstName: data.profile.firstName || prev.firstName,
            lastName: data.profile.lastName || prev.lastName,
            socialLinks: {
              ...prev.socialLinks,
              ...(data.profile.socialLinks || {}),
            },
          }));
          setIsFirstLogin(!data.profile.profileCompleted);
        } else {
          setIsFirstLogin(true);
        }
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile.firstName.trim() || !profile.lastName.trim()) {
      alert("First name and last name are required");
      return;
    }

    setSaving(true);
    setSaved(false);
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });

      if (response.ok) {
        setSaved(true);
        if (isFirstLogin) {
          window.location.href = "/";
        } else {
          setTimeout(() => setSaved(false), 3000);
        }
      } else {
        const data = await response.json();
        alert(data.error || "Failed to save profile");
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    const looksLikeImage =
      file.type.startsWith("image/") ||
      file.type === "" ||
      /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(file.name);
    if (!looksLikeImage) {
      alert("Please upload an image file");
      input.value = "";
      return;
    }

    setUploadingPhoto(true);
    try {
      const prepared = await prepareUploadFile(file);

      if (user) {
        try {
          await user.setProfileImage({ file: prepared });
          await user.reload();
        } catch (error) {
          console.error("Clerk profile image upload failed:", error);
        }
      }

      const formData = new FormData();
      formData.append("file", prepared);
      formData.append("type", "photo");

      const response = await fetch("/api/profile/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setProfile((prev) => ({ ...prev, photoUrl: data.fileUrl }));
        return;
      }

      if (user?.imageUrl) {
        setProfile((prev) => ({ ...prev, photoUrl: user.imageUrl }));
        return;
      }

      const data = await response.json().catch(() => null);
      alert(data?.error || "Failed to upload photo");
    } catch (error) {
      console.error("Upload error:", error);
      alert(error instanceof Error ? error.message : "Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
      input.value = "";
    }
  };

  const handleLifelineUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/gif"];
    if (!allowed.includes(file.type)) {
      alert("Please upload a PDF or image file");
      return;
    }

    setUploadingLifeline(true);
    try {
      const prepared = await prepareUploadFile(file);
      const formData = new FormData();
      formData.append("file", prepared);
      formData.append("type", "lifeline");

      const response = await fetch("/api/profile/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setProfile({
          ...profile,
          lifelineUrl: data.fileUrl,
          lifelineFileName: data.fileName,
        });
      } else {
        const data = await response.json().catch(() => null);
        alert(data?.error || "Failed to upload lifeline");
      }
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploadingLifeline(false);
    }
  };

  const handleArchetypeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/gif"];
    if (!allowed.includes(file.type)) {
      alert("Please upload a PDF or image file");
      return;
    }

    setUploadingArchetype(true);
    try {
      const prepared = await prepareUploadFile(file);
      const formData = new FormData();
      formData.append("file", prepared);
      formData.append("type", "archetype");

      const response = await fetch("/api/profile/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setProfile({
          ...profile,
          archetypeUrl: data.fileUrl,
          archetypeFileName: data.fileName,
        });
      } else {
        const data = await response.json().catch(() => null);
        alert(data?.error || "Failed to upload archetype");
      }
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploadingArchetype(false);
    }
  };

  const updateSocialLink = (platform: keyof ProfileData["socialLinks"], value: string) => {
    setProfile({
      ...profile,
      socialLinks: { ...profile.socialLinks, [platform]: value },
    });
  };

  if (!isLoaded || loading) {
    return <div className="text-center py-12 text-stone-500">Loading profile...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {isFirstLogin && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <h2 className="font-semibold text-amber-900">Welcome to {siteConfig.forumName}!</h2>
          <p className="text-amber-700 text-sm mt-1">
            Please complete your profile to access the forum. First name and last name are required. 
            We encourage you to add a photo, birthday, and bio so your forum mates can get to know you better.
          </p>
        </div>
      )}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">
          {isFirstLogin ? "Complete Your Profile" : "Profile Settings"}
        </h1>
        <p className="text-stone-500 mt-1">
          {isFirstLogin ? "Fill in your information to get started" : "Update your personal information"}
        </p>
        {profile.role && (
          <p className="text-sm text-stone-400 mt-1">Role: {profile.role}</p>
        )}
      </div>

      <div className="space-y-6">
        {/* Photo */}
        <section className="card p-6">
          <h2 className="font-semibold text-stone-900 mb-4">Profile Photo</h2>
          <div className="flex items-center gap-4">
            {profile.photoUrl ? (
              <img
                src={profile.photoUrl}
                alt="Profile"
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 text-2xl font-medium">
                {profile.firstName?.[0] || "?"}
              </div>
            )}
            <div>
              <label className="btn btn-ghost text-sm cursor-pointer">
                {uploadingPhoto ? "Uploading..." : profile.photoUrl ? "Change Photo" : "Upload Photo"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={uploadingPhoto}
                />
              </label>
            </div>
          </div>
        </section>

        {/* Basic Info */}
        <section className="card p-6">
          <h2 className="font-semibold text-stone-900 mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  value={profile.firstName}
                  onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                  className="w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={profile.lastName}
                  onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                  className="w-full"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full"
                disabled
              />
              <p className="text-xs text-stone-500 mt-1">
                Email is managed by Clerk authentication
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Birthday</label>
                <input
                  type="date"
                  value={profile.birthday}
                  onChange={(e) => setProfile({ ...profile, birthday: e.target.value })}
                  className="w-full"
                />
                <p className="text-xs text-stone-500 mt-1">
                  Shown on the birthday calendar and meeting calendar
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Spouse Name
                </label>
                <input
                  type="text"
                  value={profile.spouseName}
                  onChange={(e) => setProfile({ ...profile, spouseName: e.target.value })}
                  className="w-full"
                  placeholder="Name only (no login)"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Bio / About</label>
              <textarea
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                rows={4}
                className="w-full"
                placeholder="Tell us about yourself..."
              />
            </div>
          </div>
        </section>

        {/* Business */}
        <section className="card p-6">
          <h2 className="font-semibold text-stone-900 mb-4">Business Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Business Name
              </label>
              <input
                type="text"
                value={profile.businessName}
                onChange={(e) => setProfile({ ...profile, businessName: e.target.value })}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Business Website
              </label>
              <input
                type="url"
                value={profile.businessWebsite}
                onChange={(e) => setProfile({ ...profile, businessWebsite: e.target.value })}
                className="w-full"
                placeholder="https://..."
              />
            </div>
          </div>
        </section>

        {/* Social Links */}
        <section className="card p-6">
          <h2 className="font-semibold text-stone-900 mb-4">Social Links</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">LinkedIn</label>
              <input
                type="url"
                value={profile.socialLinks.linkedin}
                onChange={(e) => updateSocialLink("linkedin", e.target.value)}
                className="w-full"
                placeholder="https://linkedin.com/in/..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">X / Twitter</label>
              <input
                type="url"
                value={profile.socialLinks.twitter}
                onChange={(e) => updateSocialLink("twitter", e.target.value)}
                className="w-full"
                placeholder="https://x.com/..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Instagram</label>
              <input
                type="url"
                value={profile.socialLinks.instagram}
                onChange={(e) => updateSocialLink("instagram", e.target.value)}
                className="w-full"
                placeholder="https://instagram.com/..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Facebook</label>
              <input
                type="url"
                value={profile.socialLinks.facebook}
                onChange={(e) => updateSocialLink("facebook", e.target.value)}
                className="w-full"
                placeholder="https://facebook.com/..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Other</label>
              <input
                type="url"
                value={profile.socialLinks.other}
                onChange={(e) => updateSocialLink("other", e.target.value)}
                className="w-full"
                placeholder="https://..."
              />
            </div>
          </div>
        </section>

        {/* Lifeline / Timeline */}
        <section className="card p-6">
          <h2 className="font-semibold text-stone-900 mb-4">Lifeline / Timeline</h2>
          <p className="text-sm text-stone-600 mb-4">
            Upload your lifeline (timeline document) here. This is separate from your bio.
          </p>
          {profile.lifelineUrl ? (
            <div className="bg-stone-50 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-stone-900">{profile.lifelineFileName || "Lifeline"}</p>
                <a
                  href={profile.lifelineUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-amber-700 hover:underline"
                >
                  View →
                </a>
              </div>
              <label className="text-sm text-stone-500 hover:text-stone-700 cursor-pointer">
                Replace
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={handleLifelineUpload}
                  className="hidden"
                  disabled={uploadingLifeline}
                />
              </label>
            </div>
          ) : (
            <div className="bg-stone-50 rounded-lg p-4 text-center">
              <p className="text-sm text-stone-500 mb-3">No lifeline uploaded yet</p>
              <label className="btn btn-ghost text-sm cursor-pointer">
                {uploadingLifeline ? "Uploading..." : "Upload Lifeline"}
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={handleLifelineUpload}
                  className="hidden"
                  disabled={uploadingLifeline}
                />
              </label>
              <p className="text-xs text-stone-400 mt-2">PDF or image</p>
            </div>
          )}
        </section>

        {/* Archetype */}
        <section className="card p-6">
          <h2 className="font-semibold text-stone-900 mb-4">Archetype</h2>
          <p className="text-sm text-stone-600 mb-4">
            Upload your archetype document (EO forum archetype homework) here.
          </p>
          {profile.archetypeUrl ? (
            <div className="bg-stone-50 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-stone-900">{profile.archetypeFileName || "Archetype"}</p>
                <a
                  href={profile.archetypeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-amber-700 hover:underline"
                >
                  View →
                </a>
              </div>
              <label className="text-sm text-stone-500 hover:text-stone-700 cursor-pointer">
                Replace
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={handleArchetypeUpload}
                  className="hidden"
                  disabled={uploadingArchetype}
                />
              </label>
            </div>
          ) : (
            <div className="bg-stone-50 rounded-lg p-4 text-center">
              <p className="text-sm text-stone-500 mb-3">No archetype uploaded yet</p>
              <label className="btn btn-ghost text-sm cursor-pointer">
                {uploadingArchetype ? "Uploading..." : "Upload Archetype"}
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={handleArchetypeUpload}
                  className="hidden"
                  disabled={uploadingArchetype}
                />
              </label>
              <p className="text-xs text-stone-400 mt-2">PDF or image</p>
            </div>
          )}
        </section>

        {/* Save */}
        <div className="flex items-center justify-end gap-3">
          {saved && <span className="text-sm text-green-600">Profile saved</span>}
          <button
            onClick={handleSave}
            disabled={saving || !profile.firstName || !profile.lastName}
            className="btn btn-primary"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}
