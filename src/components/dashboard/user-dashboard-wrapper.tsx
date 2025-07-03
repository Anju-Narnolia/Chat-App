"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { UserDashboard } from "./user-dashboard";
import { useEffect, useState } from "react";
import { getTasksByAssigneeAction, getAllUsersAction } from "@/app/dashboard/actions";
import type { User } from "@/lib/types";

export function UserDashboardWrapper({ view }: { view?: string }) {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [fetchedUsers, fetchedTasks] = await Promise.all([
          getAllUsersAction(),
          user ? getTasksByAssigneeAction(user.id) : Promise.resolve([])
        ]);
        console.log('Fetched users in wrapper:', fetchedUsers);
        setUsers(fetchedUsers);
        setTasks(fetchedTasks);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }
    if (user) {
      fetchData();
    }
  }, [user]);

  if (!user || loading) {
    return <div>Loading...</div>;
  }

  return <UserDashboard view={view} userId={user.id} users={users} tasks={tasks} />;
} 