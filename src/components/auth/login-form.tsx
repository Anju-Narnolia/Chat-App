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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { loginAction } from "@/app/signup/actions";
import { useAuth } from "./auth-provider";

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { setUser } = useAuth();
  const [role, setRole] = useState<"user" | "admin">("user");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await loginAction({ email, password });
      if (result.error) {
        throw new Error(result.error);
      }
      if (!result.user || !result.token) {
        throw new Error("Login response is missing user data or token.");
      }
      localStorage.setItem("token", result.token);
      setUser(result.user);
      router.push("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message || "An unknown error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mx-auto max-w-sm shadow-2xl bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <div className="flex justify-center mb-4">
            <TowerControl className="w-12 h-12 text-primary"/>
        </div>
        <CardTitle className="text-3xl font-headline text-center">TaskTalk</CardTitle>
        <CardDescription className="text-center">
          Select your role and enter your credentials
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="user" onValueChange={(value) => setRole(value as "user" | "admin")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="user">User</TabsTrigger>
                <TabsTrigger value="admin">Admin</TabsTrigger>
            </TabsList>
        </Tabs>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center">
              <Label htmlFor="password">Password</Label>
              <Link href="#" className="ml-auto inline-block text-sm underline" prefetch={false}>
                Forgot your password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <LoaderCircle className="animate-spin" /> : "Login"}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="underline" prefetch={false}>
            Sign up
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
