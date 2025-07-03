import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { UserDashboardWrapper } from "@/components/dashboard/user-dashboard-wrapper";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { Suspense } from "react";
import { LoaderCircle } from "lucide-react";

const DashboardPageSkeleton = () => (
    <div className="flex h-full items-center justify-center">
        <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
    </div>
);

export default async function DashboardPage({ searchParams }: { searchParams?: Promise<{ view?: string }> }) {
  const params = await searchParams;
  
  return (
    <Suspense fallback={<DashboardPageSkeleton />}>
      <DashboardView 
        adminDashboard={<AdminDashboard view={params?.view} />} 
        userDashboard={<UserDashboardWrapper view={params?.view} />} 
      />
    </Suspense>
  );
}
