
"use client";
import { SignupForm } from "@/components/auth/signup-form";
import { useAuth } from "@/components/auth/auth-provider";
import { redirect } from "next/navigation";
import { useEffect } from "react";
import { LoaderCircle } from "lucide-react";

export default function SignupPage() {
   const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      redirect("/dashboard");
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (user) {
    return null;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-br from-background to-secondary">
      <div className="w-full max-w-md">
        <SignupForm />
      </div>
    </main>
  );
}
