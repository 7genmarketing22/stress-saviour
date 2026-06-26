"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  TrendingUp, Download, DollarSign, Activity, Calendar,
  Users, UserCheck, Filter, FileText, ArrowUpRight, ArrowDownRight,
  BarChart3, Clock, Star, AlertCircle,
  CheckCircle, XCircle, Target, RefreshCw
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

type ReportPeriod = "7d" | "30d" | "90d" | "1y" | "all";

export default function AdminReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>("30d");

  // Key Metrics
  const metrics = [
    {
      title: "Total Revenue",
      value: "₨1,847,500",
      change: "+24.5%",
      trend: "up",
      icon: DollarSign,
      color: "bg-green-50",
      iconColor: "text-green-600",
      description: "Platform earnings"
    },
    {
      title: "Total Appointments",
      value: "2,456",
      change: "+18.2%",
      trend: "up",
      icon: Calendar,
      color: "bg-blue-50",
      iconColor: "text-blue-600",
      description: "All consultations"
    },
    {
      title: "Active Doctors",
      value: "127",
      change: "+8",
      trend: "up",
      icon: UserCheck,
      color: "bg-purple-50",
      iconColor: "text-purple-600",
      description: "Verified & active"
    },
    {
      title: "Total Patients",
      value: "1,845",
      change: "+156",
      trend: "up",
      icon: Users,
      color: "bg-cyan-50",
      iconColor: "text-cyan-600",
      description: "Registered users"
    },
    {
      title: "Avg Rating",
      value: "4.8",
      change: "+0.2",
      trend: "up",
      icon: Star,
      color: "bg-yellow-50",
      iconColor: "text-yellow-600",
      description: "From 342 reviews"
    },
    {
      title: "Completion Rate",
      value: "94.3%",
      change: "+2.1%",
      trend: "up",
      icon: CheckCircle,
      color: "bg-emerald-50",
      iconColor: "text-emerald-600",
      description: "Successful sessions"
    },
    {
      title: "Avg Session Time",
      value: "42 min",
      change: "-3 min",
      trend: "down",
      icon: Clock,
      color: "bg-slate-50",
      iconColor: "text-slate-600",
      description: "Per consultation"
    },
    {
      title: "Cancellation Rate",
      value: "5.7%",
      change: "-1.2%",
      trend: "up",
      icon: XCircle,
      color: "bg-red-50",
      iconColor: "text-red-600",
      description: "Below industry avg"
    }
  ];

  // Revenue Over Time
  const revenueData = [
    { date: "Jan", revenue: 285000, appointments: 412, patients: 145 },
    { date: "Feb", revenue: 342000, appointments: 489, patients: 167 },
    { date: "Mar", revenue: 318000, appointments: 456, patients: 152 },
    { date: "Apr", revenue: 395000, appointments: 567, patients: 189 },
    { date: "May", revenue: 468000, appointments: 672, patients: 214 },
    { date: "Jun", revenue: 542000, appointments: 789, patients: 248 }
  ];

  // Appointments by Type
  const appointmentTypeData = [
    { type: "Video Call", count: 1247, percentage: 51 },
    { type: "Audio Call", count: 732, percentage: 30 },
    { type: "Chat", count: 477, percentage: 19 }
  ];

  // Top Specializations
  const specializationData = [
    { name: "Clinical Psychology", volume: 856, revenue: 428000 },
    { name: "Psychiatry", volume: 624, revenue: 374400 },
    { name: "Family Counseling", volume: 412, revenue: 247200 },
    { name: "Stress Management", volume: 324, revenue: 194400 },
    { name: "Addiction Therapy", volume: 240, revenue: 168000 }
  ];

  // Payment Methods
  const paymentMethodsData = [
    { name: "EasyPaisa", value: 52, amount: 959100 },
    { name: "JazzCash", value: 38, amount: 702050 },
    { name: "Stripe (Card)", value: 10, amount: 184750 }
  ];

  // Doctor Performance
  const topDoctors = [
    { name: "Dr. Ayesha Khan", consultations: 156, revenue: 546000, rating: 4.9, specialty: "Clinical Psychology" },
    { name: "Dr. Bilal Ahmed", consultations: 142, revenue: 497000, rating: 4.8, specialty: "Psychiatry" },
    { name: "Dr. Zainab Ali", consultations: 128, revenue: 448000, rating: 4.9, specialty: "Family Counseling" },
    { name: "Dr. Hassan Raza", consultations: 118, revenue: 413000, rating: 4.7, specialty: "Stress Management" },
    { name: "Dr. Farah Jamil", consultations: 104, revenue: 364000, rating: 4.8, specialty: "Clinical Counselor" }
  ];

  // Peak Hours Analysis
  const peakHoursData = [
    { hour: "9 AM", bookings: 45 },
    { hour: "10 AM", bookings: 78 },
    { hour: "11 AM", bookings: 92 },
    { hour: "12 PM", bookings: 105 },
    { hour: "1 PM", bookings: 98 },
    { hour: "2 PM", bookings: 112 },
    { hour: "3 PM", bookings: 126 },
    { hour: "4 PM", bookings: 134 },
    { hour: "5 PM", bookings: 142 },
    { hour: "6 PM", bookings: 128 },
    { hour: "7 PM", bookings: 98 },
    { hour: "8 PM", bookings: 76 }
  ];

  // City-wise Distribution
  const cityData = [
    { city: "Karachi", patients: 542, percentage: 29.4 },
    { city: "Lahore", patients: 478, percentage: 25.9 },
    { city: "Islamabad", patients: 324, percentage: 17.6 },
    { city: "Faisalabad", patients: 198, percentage: 10.7 },
    { city: "Others", patients: 303, percentage: 16.4 }
  ];

  // Monthly Growth
  const growthMetrics = [
    { metric: "Revenue Growth", value: "+24.5%", status: "excellent" },
    { metric: "User Growth", value: "+18.2%", status: "good" },
    { metric: "Doctor Growth", value: "+6.3%", status: "good" },
    { metric: "Session Growth", value: "+21.7%", status: "excellent" },
    { metric: "Retention Rate", value: "87.4%", status: "excellent" },
    { metric: "Churn Rate", value: "3.2%", status: "good" }
  ];

  const COLORS = {
    primary: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"],
    payment: ["#10b981", "#f43f5e", "#6366f1"],
    gradient: {
      blue: ["#3b82f6", "#2563eb"],
      green: ["#10b981", "#059669"],
      purple: ["#8b5cf6", "#7c3aed"]
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-[1600px] mx-auto">
      {/* Header - Mobile Optimized */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">Reports & Analytics</h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">Comprehensive platform analytics and performance insights</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
            <RefreshCw className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
            <Filter className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Filters</span>
          </Button>
          <Button size="sm" className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700">
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      {/* Period Selector - Scrollable on Mobile */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-600 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-slate-900 whitespace-nowrap">Time Period:</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
              {(["7d", "30d", "90d", "1y", "all"] as ReportPeriod[]).map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant={period === p ? "default" : "outline"}
                  onClick={() => setPeriod(p)}
                  className="min-w-[70px] sm:min-w-[80px] flex-shrink-0 text-xs sm:text-sm"
                >
                  {p === "7d" && "7 Days"}
                  {p === "30d" && "30 Days"}
                  {p === "90d" && "90 Days"}
                  {p === "1y" && "1 Year"}
                  {p === "all" && "All Time"}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Grid - Responsive */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 xs:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, i) => {
          const Icon = metric.icon;
          const TrendIcon = metric.trend === "up" ? ArrowUpRight : ArrowDownRight;
          const isPositive = (metric.trend === "up" && !metric.title.includes("Cancellation")) ||
                             (metric.trend === "down" && metric.title.includes("Cancellation"));
          return (
            <Card key={i} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 sm:space-y-2 flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-slate-600 truncate">{metric.title}</p>
                    <div className="flex items-baseline gap-1 sm:gap-2 flex-wrap">
                      <h3 className="text-2xl sm:text-3xl font-semibold text-slate-900">{metric.value}</h3>
                      <span className={`text-xs sm:text-sm font-medium flex items-center gap-0.5 ${
                        isPositive ? 'text-green-600' : 'text-red-600'
                      }`}>
                        <TrendIcon className="h-3 w-3" />
                        {metric.change}
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-slate-500">{metric.description}</p>
                  </div>
                  <div className={`p-2 sm:p-3 rounded-lg ${metric.color} flex-shrink-0`}>
                    <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${metric.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Charts Section - Mobile Optimized */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-7">
        <div className="lg:col-span-5 space-y-4 sm:space-y-6">
          {/* Revenue Trend */}
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base sm:text-lg">Revenue & Appointments Trend</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Monthly performance overview</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  <span className="text-xs sm:text-sm">View Details</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              <div className="h-[250px] sm:h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="appointments" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                    <YAxis yAxisId="left" stroke="#94a3b8" fontSize={10} tickFormatter={(value) => `₨${value/1000}k`} />
                    <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={10} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        fontSize: '12px'
                      }}
                    />
                    <Area 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#revenue)"
                      name="Revenue (₨)"
                    />
                    <Area 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="appointments" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#appointments)"
                      name="Appointments"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Specializations & Peak Hours - Mobile Stacked */}
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            {/* Top Specializations */}
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Top Specializations</CardTitle>
                <CardDescription className="text-xs sm:text-sm">By consultation volume</CardDescription>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <div className="space-y-3 sm:space-y-4">
                  {specializationData.map((item, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex items-center justify-between text-xs sm:text-sm gap-2">
                        <span className="font-medium text-slate-900 truncate">{item.name}</span>
                        <span className="text-slate-600 whitespace-nowrap text-[10px] sm:text-xs">{item.volume} sessions</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                            style={{ width: `${(item.volume / specializationData[0].volume) * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] sm:text-xs font-medium text-green-600 min-w-[50px] sm:min-w-[70px] text-right">
                          ₨{(item.revenue / 1000).toFixed(0)}k
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <Link href="/admin/doctors">
                  <Button variant="outline" className="w-full mt-4" size="sm">
                    <span className="text-xs sm:text-sm">View All Specializations</span>
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Peak Hours */}
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Peak Booking Hours</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Hourly appointment distribution</CardDescription>
              </CardHeader>
              <CardContent className="px-2 sm:px-6">
                <div className="h-[250px] sm:h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={peakHoursData} margin={{ top: 5, right: 5, left: -20, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="hour" 
                        stroke="#94a3b8" 
                        fontSize={9} 
                        angle={-45} 
                        textAnchor="end" 
                        height={70}
                      />
                      <YAxis stroke="#94a3b8" fontSize={10} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Bar dataKey="bookings" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Performing Doctors - Mobile Optimized */}
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base sm:text-lg">Top Performing Doctors</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Highest revenue generators</CardDescription>
                </div>
                <Link href="/admin/doctors">
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    <span className="text-xs sm:text-sm">View All</span>
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-200">
                {topDoctors.map((doctor, i) => (
                  <div key={i} className="flex items-center justify-between p-4 sm:p-6 hover:bg-slate-50 transition-colors gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-xs sm:text-sm flex-shrink-0">
                        #{i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-sm sm:text-base text-slate-900 truncate">{doctor.name}</h3>
                        <p className="text-xs sm:text-sm text-slate-600 truncate">{doctor.specialty}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-6 text-xs sm:text-sm flex-shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="font-semibold text-green-600">₨{(doctor.revenue / 1000).toFixed(0)}k</p>
                        <p className="text-[10px] sm:text-xs text-slate-500">Revenue</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900">{doctor.consultations}</p>
                        <p className="text-[10px] sm:text-xs text-slate-500">Sessions</p>
                      </div>
                      <div className="flex items-center gap-1 text-yellow-600">
                        <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-yellow-600" />
                        <span className="font-semibold text-xs sm:text-sm">{doctor.rating}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Mobile Optimized */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Appointment Types */}
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">Appointment Types</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Session distribution</CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <div className="h-[180px] sm:h-[200px] w-full relative mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={appointmentTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="count"
                      stroke="none"
                    >
                      {appointmentTypeData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS.primary[index]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-xl sm:text-2xl font-bold text-slate-900">2,456</p>
                  <p className="text-[10px] sm:text-xs text-slate-600">Total</p>
                </div>
              </div>
              <div className="space-y-2 sm:space-y-3">
                {appointmentTypeData.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-2 sm:p-3 border border-slate-200 rounded-lg">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS.primary[i] }} />
                      <span className="text-xs sm:text-sm font-medium text-slate-900 truncate">{item.type}</span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs sm:text-sm font-semibold text-slate-900">{item.count}</p>
                      <p className="text-[10px] sm:text-xs text-slate-600">{item.percentage}%</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/admin/appointments">
                <Button variant="outline" className="w-full mt-4" size="sm">
                  <span className="text-xs sm:text-sm">View Appointments</span>
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">Payment Methods</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Transaction split</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
              {paymentMethodsData.map((method, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS.payment[i] }} />
                      <span className="font-medium text-slate-900 truncate">{method.name}</span>
                    </div>
                    <span className="font-semibold text-slate-900 flex-shrink-0">{method.value}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${method.value}%`,
                          backgroundColor: COLORS.payment[i]
                        }}
                      />
                    </div>
                    <span className="text-[10px] sm:text-xs text-slate-600 min-w-[50px] sm:min-w-[60px] text-right">
                      ₨{(method.amount / 1000).toFixed(0)}k
                    </span>
                  </div>
                </div>
              ))}
              <Link href="/admin/payments">
                <Button variant="outline" className="w-full mt-4" size="sm">
                  <span className="text-xs sm:text-sm">View Payments</span>
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Growth Metrics */}
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">Growth Metrics</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Month-over-month</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3 px-4 sm:px-6">
              {growthMetrics.map((metric, i) => (
                <div key={i} className="flex items-center justify-between p-2 sm:p-3 border border-slate-200 rounded-lg gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {metric.status === "excellent" && <Target className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />}
                    {metric.status === "good" && <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 flex-shrink-0" />}
                    {metric.status === "warning" && <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-600 flex-shrink-0" />}
                    <span className="text-xs sm:text-sm text-slate-900 truncate">{metric.metric}</span>
                  </div>
                  <span className={`text-xs sm:text-sm font-semibold flex-shrink-0 ${
                    metric.status === "excellent" ? "text-green-600" :
                    metric.status === "good" ? "text-blue-600" : "text-yellow-600"
                  }`}>
                    {metric.value}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* City Distribution */}
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">Geographic Distribution</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Patients by city</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3 px-4 sm:px-6">
              {cityData.map((city, i) => (
                <div key={i} className="flex items-center justify-between p-2 sm:p-3 border border-slate-200 rounded-lg gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-slate-900 truncate">{city.city}</p>
                    <p className="text-[10px] sm:text-xs text-slate-600">{city.percentage}% of total</p>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-900 flex-shrink-0">{city.patients}</p>
                </div>
              ))}
              <Link href="/admin/patients">
                <Button variant="outline" className="w-full mt-2" size="sm">
                  <span className="text-xs sm:text-sm">View All Patients</span>
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">Quick Reports</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-4 sm:px-6">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                <span className="text-xs sm:text-sm">Financial Report</span>
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                <span className="text-xs sm:text-sm">User Analytics</span>
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Activity className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                <span className="text-xs sm:text-sm">Performance Report</span>
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                <span className="text-xs sm:text-sm">Growth Analysis</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
