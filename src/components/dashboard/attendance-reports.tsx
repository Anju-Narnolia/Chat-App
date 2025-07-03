"use client";

import * as React from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { getAttendanceReportAction, getTeamAttendanceReportsAction, getAttendanceStatsAction } from "@/app/dashboard/actions";
import type { AttendanceReport, AttendanceStats } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Calendar, Users, TrendingUp, Clock, AlertCircle, CheckCircle, XCircle, Coffee } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function AttendanceStatsSkeleton() {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-8 w-16 mb-2" />
                        <Skeleton className="h-3 w-24" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

function ReportCardSkeleton() {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <div className="grid grid-cols-2 gap-4">
                        <Skeleton className="h-16" />
                        <Skeleton className="h-16" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export function AttendanceReports() {
    const { user } = useAuth();
    const [stats, setStats] = React.useState<AttendanceStats | null>(null);
    const [reports, setReports] = React.useState<AttendanceReport[]>([]);
    const [userReport, setUserReport] = React.useState<AttendanceReport | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [selectedPeriod, setSelectedPeriod] = React.useState("thisMonth");

    const getPeriodDates = (period: string) => {
        const now = new Date();
        switch (period) {
            case "last7days":
                return {
                    startDate: format(subDays(now, 6), 'yyyy-MM-dd'),
                    endDate: format(now, 'yyyy-MM-dd')
                };
            case "last30days":
                return {
                    startDate: format(subDays(now, 29), 'yyyy-MM-dd'),
                    endDate: format(now, 'yyyy-MM-dd')
                };
            case "thisMonth":
                return {
                    startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
                    endDate: format(endOfMonth(now), 'yyyy-MM-dd')
                };
            case "lastMonth":
                const lastMonth = subDays(startOfMonth(now), 1);
                return {
                    startDate: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
                    endDate: format(endOfMonth(lastMonth), 'yyyy-MM-dd')
                };
            default:
                return {
                    startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
                    endDate: format(endOfMonth(now), 'yyyy-MM-dd')
                };
        }
    };

    const loadData = React.useCallback(async () => {
        if (!user) return;
        
        setIsLoading(true);
        try {
            const { startDate, endDate } = getPeriodDates(selectedPeriod);
            
            // Load stats
            const statsData = await getAttendanceStatsAction();
            setStats(statsData);

            // Load user's personal report
            const userReportData = await getAttendanceReportAction(user.id, startDate, endDate);
            setUserReport(userReportData);

            // Load team reports if admin
            if (user.role === 'admin') {
                const teamReportsData = await getTeamAttendanceReportsAction(startDate, endDate);
                setReports(teamReportsData);
            }
        } catch (error) {
            console.error("Error loading attendance data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [user, selectedPeriod]);

    React.useEffect(() => {
        loadData();
    }, [loadData]);

    if (isLoading) {
        return (
            <div className="p-4 md:p-6 space-y-6 h-full overflow-y-auto">
                <header className="mb-6">
                    <h1 className="text-3xl font-bold font-headline text-foreground">
                        Attendance Reports
                    </h1>
                    <p className="text-muted-foreground">
                        Track attendance patterns and performance metrics.
                    </p>
                </header>
                <AttendanceStatsSkeleton />
                <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                    <ReportCardSkeleton />
                    <ReportCardSkeleton />
                </div>
            </div>
        );
    }

    const isAdmin = user?.role === 'admin';

    return (
        <div className="p-4 md:p-6 space-y-6 h-full overflow-y-auto">
            <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline text-foreground">
                        Attendance Reports
                    </h1>
                    <p className="text-muted-foreground">
                        Track attendance patterns and performance metrics.
                    </p>
                </div>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger className="w-48">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="last7days">Last 7 Days</SelectItem>
                        <SelectItem value="last30days">Last 30 Days</SelectItem>
                        <SelectItem value="thisMonth">This Month</SelectItem>
                        <SelectItem value="lastMonth">Last Month</SelectItem>
                    </SelectContent>
                </Select>
            </header>

            {/* Attendance Stats */}
            {isAdmin && stats && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
                            <p className="text-xs text-muted-foreground">Active workforce</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{stats.presentToday}</div>
                            <p className="text-xs text-muted-foreground">
                                {stats.totalEmployees > 0 ? Math.round((stats.presentToday / stats.totalEmployees) * 100) : 0}% attendance
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">On Leave</CardTitle>
                            <Coffee className="h-4 w-4 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">{stats.onLeaveToday}</div>
                            <p className="text-xs text-muted-foreground">Planned absences</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Late Arrivals</CardTitle>
                            <AlertCircle className="h-4 w-4 text-orange-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-600">{stats.lateToday}</div>
                            <p className="text-xs text-muted-foreground">Today's late arrivals</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            <Tabs defaultValue={isAdmin ? "team" : "personal"} className="space-y-4">
                <TabsList>
                    {isAdmin && <TabsTrigger value="team">Team Overview</TabsTrigger>}
                    <TabsTrigger value="personal">My Attendance</TabsTrigger>
                    {isAdmin && <TabsTrigger value="topPerformers">Top Performers</TabsTrigger>}
                </TabsList>

                {/* Team Overview Tab */}
                {isAdmin && (
                    <TabsContent value="team" className="space-y-4">
                        {reports.length === 0 ? (
                            <Card className="flex flex-col items-center justify-center p-12 text-center">
                                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                                <CardTitle>No Reports Available</CardTitle>
                                <CardDescription>No attendance data found for the selected period.</CardDescription>
                            </Card>
                        ) : (
                            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                                {reports.map(report => (
                                    <Card key={report.userId}>
                                        <CardHeader>
                                            <div className="flex items-center space-x-4">
                                                <Avatar className="h-12 w-12">
                                                    <AvatarImage src={report.userImage} alt={report.userName} />
                                                    <AvatarFallback>{report.userName.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <CardTitle className="text-lg">{report.userName}</CardTitle>
                                                    <CardDescription>
                                                        {report.attendancePercentage}% attendance rate
                                                    </CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span>Attendance Rate</span>
                                                    <span>{report.attendancePercentage}%</span>
                                                </div>
                                                <Progress value={report.attendancePercentage} className="h-2" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                                        <span>Present: {report.presentDays}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <XCircle className="h-4 w-4 text-red-600" />
                                                        <span>Absent: {report.absentDays}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Coffee className="h-4 w-4 text-blue-600" />
                                                        <span>Leave: {report.leaveDays}</span>
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="h-4 w-4 text-orange-600" />
                                                        <span>Late: {report.lateArrivals}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <TrendingUp className="h-4 w-4 text-purple-600" />
                                                        <span>Avg Hours: {report.averageWorkHours}h</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="h-4 w-4 text-indigo-600" />
                                                        <span>Overtime: {report.overtimeHours}h</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                )}

                {/* Personal Attendance Tab */}
                <TabsContent value="personal" className="space-y-4">
                    {userReport ? (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="h-5 w-5" />
                                    My Attendance Summary
                                </CardTitle>
                                <CardDescription>
                                    Period: {format(new Date(userReport.period.startDate), 'MMM dd')} - {format(new Date(userReport.period.endDate), 'MMM dd, yyyy')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Overall Attendance Rate</span>
                                        <span className="font-semibold">{userReport.attendancePercentage}%</span>
                                    </div>
                                    <Progress value={userReport.attendancePercentage} className="h-3" />
                                </div>
                                
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="text-center p-4 bg-green-50 rounded-lg">
                                        <div className="text-2xl font-bold text-green-600">{userReport.presentDays}</div>
                                        <div className="text-sm text-green-700">Present Days</div>
                                    </div>
                                    <div className="text-center p-4 bg-red-50 rounded-lg">
                                        <div className="text-2xl font-bold text-red-600">{userReport.absentDays}</div>
                                        <div className="text-sm text-red-700">Absent Days</div>
                                    </div>
                                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                                        <div className="text-2xl font-bold text-blue-600">{userReport.leaveDays}</div>
                                        <div className="text-sm text-blue-700">Leave Days</div>
                                    </div>
                                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                                        <div className="text-2xl font-bold text-orange-600">{userReport.lateArrivals}</div>
                                        <div className="text-sm text-orange-700">Late Arrivals</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                                    <div className="text-center">
                                        <div className="text-lg font-semibold">{userReport.totalWorkHours}h</div>
                                        <div className="text-sm text-muted-foreground">Total Work Hours</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-lg font-semibold">{userReport.averageWorkHours}h</div>
                                        <div className="text-sm text-muted-foreground">Average Daily Hours</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-lg font-semibold">{userReport.overtimeHours}h</div>
                                        <div className="text-sm text-muted-foreground">Overtime Hours</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="flex flex-col items-center justify-center p-12 text-center">
                            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                            <CardTitle>No Attendance Data</CardTitle>
                            <CardDescription>No attendance records found for the selected period.</CardDescription>
                        </Card>
                    )}
                </TabsContent>

                {/* Top Performers Tab */}
                {isAdmin && stats && (
                    <TabsContent value="topPerformers" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5" />
                                    Top Performers
                                </CardTitle>
                                <CardDescription>
                                    Employees with highest attendance rates (Last 30 days)
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {stats.topPerformers.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No performance data available
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {stats.topPerformers.map((performer, index) => (
                                            <div key={performer.userId} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <Badge variant={index === 0 ? "default" : "secondary"}>
                                                        #{index + 1}
                                                    </Badge>
                                                    <span className="font-medium">{performer.userName}</span>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-semibold">{performer.attendancePercentage}%</div>
                                                    <div className="text-sm text-muted-foreground">Attendance</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
}
