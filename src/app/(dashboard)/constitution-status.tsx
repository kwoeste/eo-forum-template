"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Signature {
  signedName: string;
  signedAt: string;
}

function formatSignedAt(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function ConstitutionStatusCard() {
  const [signature, setSignature] = useState<Signature | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/api/constitution");
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        if (!cancelled) {
          setSignature(data.signature);
        }
      } catch (error) {
        console.error("Failed to load constitution status:", error);
      } finally {
        if (!cancelled) {
          setLoaded(true);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="card p-5">
      <h2 className="font-semibold text-stone-900 mb-3">Constitution</h2>
      <p className="text-sm text-stone-600 mb-3">
        {!loaded
          ? "Check your constitution signature."
          : signature
            ? `You signed on ${formatSignedAt(signature.signedAt)} as ${signature.signedName}.`
            : "Your forum constitution awaits your signature."}
      </p>
      <Link href="/constitution" className="btn btn-primary text-sm w-full">
        {!loaded ? "Review Constitution" : signature ? "View Constitution" : "Review & Sign"}
      </Link>
    </section>
  );
}
