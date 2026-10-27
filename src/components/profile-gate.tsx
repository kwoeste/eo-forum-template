"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export function ProfileGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [profileCompleted, setProfileCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    if (pathname === "/profile") {
      setChecking(false);
      return;
    }

    const checkProfile = async () => {
      try {
        const response = await fetch("/api/profile/check");
        if (response.ok) {
          const data = await response.json();
          setProfileCompleted(data.profileCompleted);
          if (!data.profileCompleted) {
            router.replace("/profile");
          }
        }
      } catch (error) {
        console.error("Profile check failed:", error);
      } finally {
        setChecking(false);
      }
    };

    checkProfile();
  }, [pathname, router]);

  if (pathname === "/profile") {
    return <>{children}</>;
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-stone-500">Loading...</div>
      </div>
    );
  }

  if (profileCompleted === false) {
    return null;
  }

  return <>{children}</>;
}
