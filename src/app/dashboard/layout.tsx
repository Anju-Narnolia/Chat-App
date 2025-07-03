"use client";
import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  ClipboardList,
  Settings,
  LayoutDashboard,
  Users,
  LoaderCircle,
  FileVideo,
  ScreenShare,
  Bell,
  Video,
  TowerControl,
  CalendarCheck,
  CalendarDays,
  Monitor,
} from "lucide-react";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/signout-button";
import { useAuth } from "@/components/auth/auth-provider";
import { IncomingCallNotification } from "@/components/dashboard/IncomingCallNotification";
import type { Call } from "@/lib/types";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { WorkTracker } from "@/components/dashboard/work-tracker";

const NavItem = ({
  href,
  view,
  currentView,
  label,
  children,
}: {
  href: string;
  view: string;
  currentView: string | null;
  label: string;
  children: React.ReactNode;
}) => (
  <Button
    asChild
    variant="ghost"
    className={cn(
      "flex h-auto w-full flex-col items-center justify-center rounded-lg py-2 px-1",
      view === currentView
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
    )}
  >
    <Link
      href={href}
      className="flex flex-col items-center justify-center gap-1 w-full"
    >
      {children}
      <span className="mt-0 text-[11px] font-medium tracking-tight">
        {label}
      </span>
    </Link>
  </Button>
);

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const searchParams = useSearchParams();
  const view = searchParams.get("view");
  const [incomingCall, setIncomingCall] = React.useState<Call | null>(null);

  React.useEffect(() => {
    if (!loading && !user) {
      redirect("/");
    }
  }, [user, loading]);

  React.useEffect(() => {
    if (!user) return;
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isAdmin = user.role === "admin";
  const currentView = view || (isAdmin ? "dashboard" : "chats");

  const adminNavItems = [
    {
      href: "/dashboard",
      view: "dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-6 w-6" />,
    },
    {
      href: "/dashboard?view=chats",
      view: "chats",
      label: "Chat",
      icon: <MessageSquare className="h-6 w-6" />,
    },
    {
      href: "/dashboard?view=meetings",
      view: "meetings",
      label: "Meet",
      icon: <Video className="h-6 w-6" />,
    },
    {
      href: "/dashboard?view=users",
      view: "users",
      label: "Users",
      icon: <Users className="h-6 w-6" />,
    },
    {
      href: "/dashboard?view=tasks",
      view: "tasks",
      label: "Tasks",
      icon: <ClipboardList className="h-6 w-6" />,
    },
    {
      href: "/dashboard?view=recordings",
      view: "recordings",
      label: "Activity",
      icon: <Bell className="h-6 w-6" />,
    },
    {
      href: "/dashboard?view=attendance",
      view: "attendance",
      label: "Attendance",
      icon: <CalendarCheck className="h-6 w-6" />,
    },
    {
      href: "/dashboard?view=leave",
      view: "leave",
      label: "Leave",
      icon: <CalendarDays className="h-6 w-6" />,
    },
    {
      href: "/dashboard?view=monitoring",
      view: "monitoring",
      label: "Monitoring",
      icon: <Monitor className="h-6 w-6" />,
    },
  ];

  const userNavItems = [
    {
      href: "/dashboard?view=chats",
      view: "chats",
      label: "Chat",
      icon: <MessageSquare className="h-6 w-6" />,
    },
    {
      href: "/dashboard?view=meetings",
      view: "meetings",
      label: "Meet",
      icon: <Video className="h-6 w-6" />,
    },
    {
      href: "/dashboard?view=tasks",
      view: "tasks",
      label: "Tasks",
      icon: <ClipboardList className="h-6 w-6" />,
    },
    {
      href: "/dashboard?view=recordings",
      view: "recordings",
      label: "Activity",
      icon: <Bell className="h-6 w-6" />,
    },
    {
      href: "/dashboard?view=attendance",
      view: "attendance",
      label: "Attendance",
      icon: <CalendarCheck className="h-6 w-6" />,
    },
    {
      href: "/dashboard?view=leave",
      view: "leave",
      label: "Leave",
      icon: <CalendarDays className="h-6 w-6" />,
    },
  ];

  const navItems = isAdmin ? adminNavItems : userNavItems;

  return (
    <div className="flex min-h-screen bg-background">
      <nav className="w-24 bg-secondary border-r flex flex-col items-center py-4 px-2 space-y-2">
        <Button variant="ghost" size="icon" className="h-12 w-12 p-2">
          <TowerControl className="h-8 w-8 text-primary" />
        </Button>
        <Separator className="w-full my-2" />
        <div className="flex flex-col space-y-1 flex-1 w-full">
          {navItems.map((item) => (
            <NavItem
              key={item.view}
              href={item.href}
              view={item.view}
              currentView={currentView}
              label={item.label}
            >
              {item.icon}
            </NavItem>
          ))}
        </div>
        <div className="flex flex-col space-y-2 items-center w-full">
          <SignOutButton />
          <Avatar className="h-10 w-10">
            <AvatarImage
              src={user.image ?? "https://placehold.co/100x100.png"}
              alt={user.name ?? "User"}
              data-ai-hint="person avatar"
            />
            <AvatarFallback>
              {user.name?.charAt(0).toUpperCase() ?? "U"}
            </AvatarFallback>
          </Avatar>
        </div>
      </nav>
      <main className="flex-1 flex flex-col h-screen">
        {user.role === "user" && <WorkTracker />}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </main>
      {incomingCall && (
        <IncomingCallNotification
          call={incomingCall}
          onClose={() => setIncomingCall(null)}
        />
      )}
    </div>
  );
}

const DashboardSkeleton = () => (
  <div className="flex h-screen items-center justify-center bg-background">
    <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
  </div>
);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <React.Suspense fallback={<DashboardSkeleton />}>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </React.Suspense>
  );
}
