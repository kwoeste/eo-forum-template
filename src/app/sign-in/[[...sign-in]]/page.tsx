"use client";
import { siteConfig, isEmail } from "@/site.config";

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <h1
          className="text-3xl font-bold mb-2"
          style={{ color: "#ffffff" }}
        >
          {siteConfig.forumName}
        </h1>
        <p className="text-slate-400 mb-4 text-sm italic">Nothing, no one, ever.</p>
        <p className="text-slate-400 mb-2 text-sm">Members Only</p>
        <p className="text-slate-500 mb-8 text-sm">
          This is a private forum. Contact an administrator for access.
        </p>
        <SignIn
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-white shadow-xl",
            },
          }}
        />
      </div>
    </div>
  );
}
