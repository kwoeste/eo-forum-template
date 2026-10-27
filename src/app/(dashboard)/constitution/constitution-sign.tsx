"use client";
import { siteConfig, isEmail } from "@/site.config";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  CONSTITUTION_DRIVE_URL,
  CONSTITUTION_TITLE,
} from "@/lib/constitution";

interface Signature {
  signedName: string;
  signedAt: string;
}

interface MemberSignature {
  memberId: string;
  name: string;
  signed: boolean;
  signedName: string | null;
  signedAt: string | null;
}

function formatSignedAt(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function ConstitutionSign() {
  const [memberName, setMemberName] = useState("");
  const [signedName, setSignedName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [signature, setSignature] = useState<Signature | null>(null);
  const [members, setMembers] = useState<MemberSignature[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/constitution");
      if (!response.ok) {
        throw new Error("Failed to load signature status");
      }
      const data = await response.json();
      setMemberName(data.memberName || "");
      setSignature(data.signature);
      setMembers(data.members || []);
      setSignedName((current) => current || data.memberName || "");
    } catch (loadError) {
      console.error(loadError);
      setError("Unable to load your signature status.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount fetch of signature status
    void loadStatus();
  }, [loadStatus]);

  const handleSign = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/constitution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signedName, agreed }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to sign");
      }
      setSignature(data.signature);
      await loadStatus();
    } catch (signError) {
      setError(signError instanceof Error ? signError.message : "Failed to sign");
    } finally {
      setSubmitting(false);
    }
  };

  const signedCount = members.filter((member) => member.signed).length;
  const canSubmit = agreed && signedName.trim().length >= 2 && !submitting;

  return (
    <>
      <section className="card p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold">{CONSTITUTION_TITLE}</h2>
          {loading ? (
            <span className="badge badge-muted">Checking…</span>
          ) : signature ? (
            <span className="badge badge-success">Signed</span>
          ) : (
            <span className="badge badge-accent">Unsigned</span>
          )}
        </div>
        <p className="text-stone-600 text-sm mb-4">
          The Constitution establishes the foundational principles, commitments, and
          guidelines that govern how {siteConfig.forumName} operates.
        </p>
        <Link
          href={CONSTITUTION_DRIVE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary inline-flex items-center"
        >
          View Full Constitution (Google Drive)
          <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </Link>

        {!loading && signature && (
          <div className="mt-6 p-4 bg-green-50 border border-green-100 rounded-lg">
            <p className="text-sm font-medium text-green-900">
              Signed by {signature.signedName}
            </p>
            <p className="text-xs text-green-800 mt-1">
              Electronic signature recorded {formatSignedAt(signature.signedAt)}
            </p>
          </div>
        )}

        {!loading && !signature && (
          <form onSubmit={handleSign} className="mt-6 pt-6 border-t border-stone-200 space-y-4">
            <div>
              <h3 className="font-semibold text-stone-900">Approve & sign</h3>
              <p className="text-sm text-stone-600 mt-1">
                Review the full document, then type your name to record your
                electronic approval.
              </p>
            </div>

            <label className="flex items-start gap-3 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(event) => setAgreed(event.target.checked)}
                className="mt-1"
              />
              <span>
                I have read {CONSTITUTION_TITLE}, I approve it, and I agree to
                abide by its principles and rules.
              </span>
            </label>

            <div>
              <label htmlFor="constitution-signed-name" className="block text-sm font-medium text-stone-700 mb-1">
                Type your full name to sign
              </label>
              <input
                id="constitution-signed-name"
                type="text"
                value={signedName}
                onChange={(event) => setSignedName(event.target.value)}
                placeholder={memberName || "Your full name"}
                autoComplete="name"
                className="w-full"
              />
              <p className="text-xs text-stone-500 mt-1">
                Your typed name is your electronic signature and will be stored
                with the date and your member account.
              </p>
            </div>

            {error && <p className="text-sm text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={!canSubmit}
              className="btn btn-accent w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Signing…" : "Sign Constitution"}
            </button>
          </form>
        )}
      </section>

      <section className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Member signatures</h2>
          <span className="text-xs text-stone-500">
            {loading ? "—" : `${signedCount} of ${members.length} signed`}
          </span>
        </div>
        {loading ? (
          <p className="text-sm text-stone-500">Loading signatures…</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-stone-500">No members found.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {members.map((member) => (
              <li key={member.memberId} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-stone-900">{member.name}</p>
                  {member.signed && member.signedAt && (
                    <p className="text-xs text-stone-500">
                      {member.signedName} · {formatSignedAt(member.signedAt)}
                    </p>
                  )}
                </div>
                {member.signed ? (
                  <span className="badge badge-success">Signed</span>
                ) : (
                  <span className="badge badge-accent">Unsigned</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
