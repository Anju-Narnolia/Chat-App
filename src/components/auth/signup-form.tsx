"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TowerControl, LoaderCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { signupAction } from "@/app/signup/actions";
import { useAuth } from "./auth-provider";

export function SignupForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { setUser } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await signupAction({ name, email, password });

    setIsLoading(false);

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Signup Failed",
        description: result.error,
      });
    } else {
      localStorage.setItem("token", result.token);
      setUser(result.user);
      toast({
        title: "Signup Successful",
        description: "Your account has been created.",
      });
      router.push("/dashboard");
    }
  };

  return (
    <Card className="mx-auto max-w-sm shadow-2xl bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <div className="flex justify-center mb-4">
            <TowerControl className="w-12 h-12 text-primary"/>
        </div>
        <CardTitle className="text-3xl font-headline text-center">Create Account</CardTitle>
        <CardDescription className="text-center">
          Enter your information to create an account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="John Doe" required value={name} onChange={(e) => setName(e.target.value)} disabled={isLoading}/>
            </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading}/>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading}/>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <LoaderCircle className="animate-spin" /> : "Create Account"}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm">
          Already have an account?{" "}
          <Link href="/" className="underline" prefetch={false}>
            Login
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
