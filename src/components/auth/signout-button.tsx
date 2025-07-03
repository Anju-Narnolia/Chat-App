"use client";

import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-provider";

export function SignOutButton() {
    const { toast } = useToast();
    const router = useRouter();
    const { setUser } = useAuth();

    const handleSignOut = async () => {
        try {
            // Clear JWT token from localStorage
            localStorage.removeItem("token");
            // Clear user from context
            setUser(null);
            // Redirect to login page
            router.push("/");
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Logout Failed",
                description: "An error occurred while signing out. Please try again.",
            });
        }
    };

    return (
        <Button
            variant="ghost"
            onClick={handleSignOut}
            className="flex h-auto w-full flex-col items-center justify-center rounded-lg py-2 px-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
            <LogOut className="h-6 w-6" />
            <span className="mt-1 text-[11px] font-medium tracking-tight">
                Logout
            </span>
        </Button>
    );
}
