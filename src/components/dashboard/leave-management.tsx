"use client";

import * as React from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { createLeaveRequestAction, getLeaveRequestsAction, getLeaveBalanceAction, updateLeaveRequestStatusAction } from "@/app/dashboard/actions";
import type { LeaveRequest, LeaveBalance, LeaveType, LeaveStatus } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, differenceInDays, addDays } from "date-fns";
import { CalendarIcon, Plus, Clock, CheckCircle, XCircle, AlertCircle, Plane, Heart, User, Baby, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const leaveRequestSchema = z.object({
    leaveType: z.enum(['vacation', 'sick', 'personal', 'maternity', 'paternity', 'emergency']),
    startDate: z.date({
        required_error: "Start date is required",
    }),
    endDate: z.date({
        required_error: "End date is required",
    }),
    reason: z.string().min(10, "Reason must be at least 10 characters"),
}).refine((data) => data.endDate >= data.startDate, {
    message: "End date must be after start date",
    path: ["endDate"],
});

type LeaveRequestForm = z.infer<typeof leaveRequestSchema>;

const leaveTypeIcons = {
    vacation: Plane,
    sick: Heart,
    personal: User,
    maternity: Baby,
    paternity: Baby,
    emergency: Zap,
};

const leaveTypeColors = {
    vacation: "bg-blue-100 text-blue-800",
    sick: "bg-red-100 text-red-800",
    personal: "bg-green-100 text-green-800",
    maternity: "bg-pink-100 text-pink-800",
    paternity: "bg-purple-100 text-purple-800",
    emergency: "bg-orange-100 text-orange-800",
};

const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    cancelled: "bg-gray-100 text-gray-800",
};

const statusIcons = {
    pending: Clock,
    approved: CheckCircle,
    rejected: XCircle,
    cancelled: AlertCircle,
};

function LeaveBalanceSkeleton() {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                    <CardHeader className="pb-2">
                        <Skeleton className="h-4 w-20" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-8 w-12 mb-2" />
                        <Skeleton className="h-3 w-16" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

function LeaveRequestSkeleton() {
    return (
        <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div className="space-y-2">
                                <Skeleton className="h-5 w-32" />
                                <Skeleton className="h-4 w-48" />
                            </div>
                            <Skeleton className="h-6 w-20" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-3/4" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

export function LeaveManagement() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [leaveRequests, setLeaveRequests] = React.useState<LeaveRequest[]>([]);
    const [leaveBalance, setLeaveBalance] = React.useState<LeaveBalance | null>(null);
    const [allLeaveRequests, setAllLeaveRequests] = React.useState<LeaveRequest[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);

    const form = useForm<LeaveRequestForm>({
        resolver: zodResolver(leaveRequestSchema),
        defaultValues: {
            reason: "",
        },
    });

    const loadData = React.useCallback(async () => {
        if (!user) return;
        
        setIsLoading(true);
        try {
            // Load user's leave balance
            const balanceData = await getLeaveBalanceAction(user.id);
            setLeaveBalance(balanceData);

            // Load leave requests
            if (user.role === 'admin') {
                const allRequests = await getLeaveRequestsAction();
                setAllLeaveRequests(allRequests);
            }
            const userRequests = await getLeaveRequestsAction(user.id);
            setLeaveRequests(userRequests);
        } catch (error) {
            console.error("Error loading leave data:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to load leave data. Please try again.",
            });
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    React.useEffect(() => {
        loadData();
    }, [loadData]);

    const onSubmit = async (data: LeaveRequestForm) => {
        if (!user) return;
        
        setIsSubmitting(true);
        try {
            const result = await createLeaveRequestAction(user.id, data);
            if (!result.success) {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Failed to submit leave request. Please try again.",
                });
            } else {
                toast({
                    title: "Success",
                    description: "Leave request submitted successfully.",
                });
                setIsDialogOpen(false);
                form.reset();
                loadData();
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to submit leave request. Please try again.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStatusUpdate = async (leaveId: string, status: LeaveStatus, rejectionReason?: string) => {
        if (!user) return;

        try {
            const result = await updateLeaveRequestStatusAction(leaveId, status, user.id, rejectionReason);
            if (!result.success) {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Failed to update leave request. Please try again.",
                });
            } else {
                toast({
                    title: "Success",
                    description: `Leave request ${status} successfully.`,
                });
                loadData();
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to update leave request. Please try again.",
            });
        }
    };

    if (isLoading) {
        return (
            <div className="p-4 md:p-6 space-y-6">
                <header className="mb-6">
                    <h1 className="text-3xl font-bold font-headline text-foreground">
                        Leave Management
                    </h1>
                    <p className="text-muted-foreground">
                        Request and manage your leave applications.
                    </p>
                </header>
                <LeaveBalanceSkeleton />
                <LeaveRequestSkeleton />
            </div>
        );
    }

    const isAdmin = user?.role === 'admin';

    return (
        <div className="p-4 md:p-6 space-y-6">
            <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline text-foreground">
                        Leave Management
                    </h1>
                    <p className="text-muted-foreground">
                        Request and manage your leave applications.
                    </p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Request Leave
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <DialogHeader>
                                    <DialogTitle>New Leave Request</DialogTitle>
                                    <DialogDescription>
                                        Submit a new leave request. Please provide all required information.
                                    </DialogDescription>
                                </DialogHeader>
                                
                                <FormField
                                    control={form.control}
                                    name="leaveType"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Leave Type</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select leave type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="vacation">Vacation Leave</SelectItem>
                                                    <SelectItem value="sick">Sick Leave</SelectItem>
                                                    <SelectItem value="personal">Personal Leave</SelectItem>
                                                    <SelectItem value="maternity">Maternity Leave</SelectItem>
                                                    <SelectItem value="paternity">Paternity Leave</SelectItem>
                                                    <SelectItem value="emergency">Emergency Leave</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <FormField
                                        control={form.control}
                                        name="startDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Start Date</FormLabel>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button
                                                                variant="outline"
                                                                className={cn(
                                                                    "w-full pl-3 text-left font-normal",
                                                                    !field.value && "text-muted-foreground"
                                                                )}
                                                            >
                                                                {field.value ? (
                                                                    format(field.value, "PPP")
                                                                ) : (
                                                                    <span>Pick a date</span>
                                                                )}
                                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="start">
                                                        <Calendar
                                                            mode="single"
                                                            selected={field.value}
                                                            onSelect={field.onChange}
                                                            disabled={(date) =>
                                                                date < new Date()
                                                            }
                                                            initialFocus
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="endDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>End Date</FormLabel>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button
                                                                variant="outline"
                                                                className={cn(
                                                                    "w-full pl-3 text-left font-normal",
                                                                    !field.value && "text-muted-foreground"
                                                                )}
                                                            >
                                                                {field.value ? (
                                                                    format(field.value, "PPP")
                                                                ) : (
                                                                    <span>Pick a date</span>
                                                                )}
                                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="start">
                                                        <Calendar
                                                            mode="single"
                                                            selected={field.value}
                                                            onSelect={field.onChange}
                                                            disabled={(date) =>
                                                                date < (form.getValues("startDate") || new Date())
                                                            }
                                                            initialFocus
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="reason"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Reason</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Please provide a detailed reason for your leave request"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Minimum 10 characters required
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <DialogFooter>
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting ? (
                                            <>
                                                <Clock className="mr-2 h-4 w-4 animate-spin" />
                                                Submitting...
                                            </>
                                        ) : (
                                            "Submit Request"
                                        )}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </header>

            {/* Leave Balance Section */}
            {leaveBalance && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(leaveBalance)
                        .filter(([key]) => key !== 'userId' && key !== 'year')
                        .map(([type, days]) => {
                            const Icon = leaveTypeIcons[type as LeaveType];
                            return (
                                <Card key={type}>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                                            {Icon && <Icon className="h-4 w-4" />}
                                            {type.charAt(0).toUpperCase() + type.slice(1)} Leave
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{days}</div>
                                        <p className="text-xs text-muted-foreground">Days remaining</p>
                                    </CardContent>
                                </Card>
                            );
                        })}
                </div>
            )}

            {/* Leave Requests Section */}
            <Tabs defaultValue={isAdmin ? "all" : "my-requests"} className="space-y-4">
                <TabsList>
                    {isAdmin && <TabsTrigger value="all">All Requests</TabsTrigger>}
                    <TabsTrigger value="my-requests">My Requests</TabsTrigger>
                </TabsList>

                {isAdmin && (
                    <TabsContent value="all" className="space-y-4">
                        {allLeaveRequests.length === 0 ? (
                            <Card className="p-8 text-center">
                                <CardTitle className="text-muted-foreground mb-2">No Leave Requests</CardTitle>
                                <CardDescription>There are no leave requests to display.</CardDescription>
                            </Card>
                        ) : (
                            allLeaveRequests.map((request) => (
                                <Card key={request.id}>
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-2">
                                                <CardTitle className="flex items-center gap-2">
                                                    {leaveTypeIcons[request.leaveType] && React.createElement(leaveTypeIcons[request.leaveType], { className: "h-5 w-5" })}
                                                    {request.leaveType.charAt(0).toUpperCase() + request.leaveType.slice(1)} Leave
                                                </CardTitle>
                                                <CardDescription>
                                                    {format(request.startDate instanceof Date ? request.startDate : new Date(request.startDate), "PPP")} - {format(request.endDate instanceof Date ? request.endDate : new Date(request.endDate), "PPP")}
                                                    {" · "}{differenceInDays(request.endDate instanceof Date ? request.endDate : new Date(request.endDate), request.startDate instanceof Date ? request.startDate : new Date(request.startDate)) + 1} days
                                                </CardDescription>
                                            </div>
                                            <Badge className={statusColors[request.status]} variant="secondary">
                                                {React.createElement(statusIcons[request.status], { className: "h-4 w-4 mr-1 inline" })}
                                                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <p className="text-sm">{request.reason}</p>
                                        {request.status === 'pending' && (
                                            <div className="flex gap-2 mt-4">
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    onClick={() => handleStatusUpdate(request.id, 'approved')}
                                                >
                                                    Approve
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleStatusUpdate(request.id, 'rejected')}
                                                >
                                                    Reject
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </TabsContent>
                )}

                <TabsContent value="my-requests" className="space-y-4">
                    {leaveRequests.length === 0 ? (
                        <Card className="p-8 text-center">
                            <CardTitle className="text-muted-foreground mb-2">No Leave Requests</CardTitle>
                            <CardDescription>You haven't made any leave requests yet.</CardDescription>
                        </Card>
                    ) : (
                        leaveRequests.map((request) => (
                            <Card key={request.id}>
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-2">
                                            <CardTitle className="flex items-center gap-2">
                                                {leaveTypeIcons[request.leaveType] && React.createElement(leaveTypeIcons[request.leaveType], { className: "h-5 w-5" })}
                                                {request.leaveType.charAt(0).toUpperCase() + request.leaveType.slice(1)} Leave
                                            </CardTitle>
                                            <CardDescription>
                                                {format(request.startDate instanceof Date ? request.startDate : new Date(request.startDate), "PPP")} - {format(request.endDate instanceof Date ? request.endDate : new Date(request.endDate), "PPP")}
                                                {" · "}{differenceInDays(request.endDate instanceof Date ? request.endDate : new Date(request.endDate), request.startDate instanceof Date ? request.startDate : new Date(request.startDate)) + 1} days
                                            </CardDescription>
                                        </div>
                                        <Badge className={statusColors[request.status]} variant="secondary">
                                            {React.createElement(statusIcons[request.status], { className: "h-4 w-4 mr-1 inline" })}
                                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <p className="text-sm">{request.reason}</p>
                                    {request.status === 'pending' && (
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => handleStatusUpdate(request.id, 'cancelled')}
                                        >
                                            Cancel Request
                                        </Button>
                                    )}
                                    {request.rejectionReason && (
                                        <div className="mt-2 p-3 bg-red-50 text-red-800 rounded-md text-sm">
                                            <strong>Rejection Reason:</strong> {request.rejectionReason}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
