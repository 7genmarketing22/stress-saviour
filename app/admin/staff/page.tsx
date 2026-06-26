"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Search, Eye, Trash2, Download, Users, UserPlus, Shield,
  Activity, Mail, Phone, XCircle, CheckCircle, Clock,
  ShieldCheck, ShieldAlert, Settings, FileText, AlertCircle,
  Edit
} from "lucide-react";

type StaffRole = "Super Admin" | "Admin" | "Support Moderator" | "Content Manager" | "Finance Manager";
type StaffStatus = "active" | "inactive" | "suspended";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  status: StaffStatus;
  joinDate: string;
  lastActive: string;
  actionsToday: number;
  totalActions: number;
  permissions: string[];
  department: string;
}

export default function AdminStaffPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | StaffRole>("all");
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const staffMembers: StaffMember[] = [
    {
      id: "ST-001",
      name: "Salman Khan",
      email: "salman@stresssaviors.pk",
      phone: "+92 347 6894686",
      role: "Super Admin",
      status: "active",
      joinDate: "2023-01-15",
      lastActive: "Just now",
      actionsToday: 47,
      totalActions: 12458,
      permissions: ["Full Access", "User Management", "Content Management", "Financial Access", "System Settings"],
      department: "Administration"
    },
    {
      id: "ST-002",
      name: "Amna Bibi",
      email: "amna.support@stresssaviors.pk",
      phone: "+92 300 1234567",
      role: "Support Moderator",
      status: "active",
      joinDate: "2023-05-20",
      lastActive: "2 hours ago",
      actionsToday: 28,
      totalActions: 8945,
      permissions: ["Approve Doctors", "View Logs", "Reset Passwords", "Manage Patients"],
      department: "Support"
    },
    {
      id: "ST-003",
      name: "Hassan Ahmed",
      email: "hassan.admin@stresssaviors.pk",
      phone: "+92 321 9876543",
      role: "Admin",
      status: "active",
      joinDate: "2023-08-10",
      lastActive: "5 hours ago",
      actionsToday: 15,
      totalActions: 5624,
      permissions: ["User Management", "Content Management", "View Reports"],
      department: "Administration"
    },
    {
      id: "ST-004",
      name: "Fatima Noor",
      email: "fatima.content@stresssaviors.pk",
      phone: "+92 333 5556677",
      role: "Content Manager",
      status: "active",
      joinDate: "2024-02-14",
      lastActive: "1 day ago",
      actionsToday: 8,
      totalActions: 2145,
      permissions: ["Edit Content", "Publish Articles", "Manage Media"],
      department: "Content"
    },
    {
      id: "ST-005",
      name: "Ali Raza",
      email: "ali.finance@stresssaviors.pk",
      phone: "+92 345 8889990",
      role: "Finance Manager",
      status: "active",
      joinDate: "2023-11-01",
      lastActive: "3 hours ago",
      actionsToday: 12,
      totalActions: 4287,
      permissions: ["View Payments", "Process Refunds", "Generate Financial Reports"],
      department: "Finance"
    },
    {
      id: "ST-006",
      name: "Zainab Malik",
      email: "zainab.support@stresssaviors.pk",
      phone: "+92 301 4445566",
      role: "Support Moderator",
      status: "inactive",
      joinDate: "2024-01-05",
      lastActive: "2 weeks ago",
      actionsToday: 0,
      totalActions: 892,
      permissions: ["Approve Doctors", "View Logs", "Reset Passwords"],
      department: "Support"
    }
  ];

  const filteredStaff = staffMembers.filter(staff => {
    const matchesSearch = staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         staff.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         staff.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || staff.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const stats = {
    total: staffMembers.length,
    active: staffMembers.filter(s => s.status === "active").length,
    inactive: staffMembers.filter(s => s.status === "inactive").length,
    suspended: staffMembers.filter(s => s.status === "suspended").length,
    actionsToday: staffMembers.reduce((acc, s) => acc + s.actionsToday, 0),
    onlineNow: 2
  };

  const roleBreakdown = {
    "Super Admin": staffMembers.filter(s => s.role === "Super Admin").length,
    "Admin": staffMembers.filter(s => s.role === "Admin").length,
    "Support Moderator": staffMembers.filter(s => s.role === "Support Moderator").length,
    "Content Manager": staffMembers.filter(s => s.role === "Content Manager").length,
    "Finance Manager": staffMembers.filter(s => s.role === "Finance Manager").length
  };

  const recentActivity = [
    { staff: "Salman Khan", action: "Approved doctor: Dr. Farah Jamil", time: "5 min ago" },
    { staff: "Hassan Ahmed", action: "Updated payment settings", time: "1 hour ago" },
    { staff: "Amna Bibi", action: "Reset patient password", time: "2 hours ago" },
    { staff: "Ali Raza", action: "Generated financial report", time: "3 hours ago" },
    { staff: "Fatima Noor", action: "Published new article", time: "5 hours ago" }
  ];

  const getStatusBadge = (status: StaffStatus) => {
    const badges = {
      active: "bg-green-100 text-green-700 border-green-200",
      inactive: "bg-gray-100 text-gray-700 border-gray-200",
      suspended: "bg-red-100 text-red-700 border-red-200"
    };
    return badges[status];
  };

  const getRoleColor = (role: StaffRole) => {
    const colors = {
      "Super Admin": "from-purple-500 to-pink-600",
      "Admin": "from-blue-500 to-blue-600",
      "Support Moderator": "from-green-500 to-teal-600",
      "Content Manager": "from-yellow-500 to-orange-600",
      "Finance Manager": "from-emerald-500 to-cyan-600"
    };
    return colors[role];
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Staff Management</h1>
          <p className="text-sm text-slate-600 mt-1">Manage team members, roles, and permissions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setShowAddModal(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Staff Member
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Staff</p>
                <h3 className="text-3xl font-semibold text-slate-900 mt-2">{stats.total}</h3>
                <p className="text-xs text-slate-500 mt-2">{stats.onlineNow} online now</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Active Members</p>
                <h3 className="text-3xl font-semibold text-green-600 mt-2">{stats.active}</h3>
                <p className="text-xs text-slate-500 mt-2">{((stats.active / stats.total) * 100).toFixed(0)}% of total</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Actions Today</p>
                <h3 className="text-3xl font-semibold text-slate-900 mt-2">{stats.actionsToday}</h3>
                <p className="text-xs text-slate-500 mt-2">Admin activities</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-50">
                <Activity className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Roles</p>
                <h3 className="text-3xl font-semibold text-slate-900 mt-2">{Object.keys(roleBreakdown).length}</h3>
                <p className="text-xs text-slate-500 mt-2">Different access levels</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-50">
                <Shield className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="border-b border-slate-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex-1 w-full sm:w-auto">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search by name, email, or ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-10"
                    />
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant={roleFilter === "all" ? "default" : "outline"}
                    onClick={() => setRoleFilter("all")}
                  >
                    All
                    <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-background rounded">
                      {staffMembers.length}
                    </span>
                  </Button>
                  {Object.entries(roleBreakdown).map(([role, count]) => (
                    count > 0 && (
                      <Button
                        key={role}
                        size="sm"
                        variant={roleFilter === role ? "default" : "outline"}
                        onClick={() => setRoleFilter(role as StaffRole)}
                        className="text-xs"
                      >
                        {role.split(' ')[0]}
                        <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-background rounded">
                          {count}
                        </span>
                      </Button>
                    )
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-200">
                {filteredStaff.map((staff) => (
                  <div key={staff.id} className="flex items-center justify-between p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`h-12 w-12 rounded-full bg-gradient-to-br ${getRoleColor(staff.role)} flex items-center justify-center text-white font-semibold flex-shrink-0`}>
                        {staff.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-slate-900">{staff.name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(staff.status)}`}>
                            {staff.status}
                          </span>
                          <span className="text-xs text-slate-500">ID: {staff.id}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-sm text-slate-600">
                          <Shield className="h-3 w-3" />
                          {staff.role}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {staff.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Activity className="h-3 w-3" />
                            {staff.actionsToday} actions today
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {staff.lastActive}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button size="sm" variant="outline" onClick={() => setSelectedStaff(staff)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {staff.role !== "Super Admin" && (
                        <>
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {filteredStaff.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto mb-3 text-slate-400" />
                    <p className="text-sm font-medium text-slate-900">No staff members found</p>
                    <p className="text-sm text-slate-600 mt-1">Try adjusting your search or filters</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Admin Activity</CardTitle>
              <CardDescription>Latest actions by staff members</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity, i) => (
                  <div key={i} className="flex items-start gap-3 pb-4 border-b border-slate-200 last:border-0 last:pb-0">
                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Activity className="h-4 w-4 text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900">
                        <span className="font-medium">{activity.staff}</span>
                        {' - '}
                        {activity.action}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                View Full Activity Log
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Roles Breakdown</CardTitle>
              <CardDescription>Staff distribution by role</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(roleBreakdown).map(([role, count]) => (
                count > 0 && (
                  <div key={role} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${getRoleColor(role as StaffRole)}`}>
                        <Shield className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{role}</p>
                        <p className="text-xs text-slate-600">{count} {count === 1 ? 'member' : 'members'}</p>
                      </div>
                    </div>
                  </div>
                )
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Staff Status</CardTitle>
              <CardDescription>Current availability</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Active</p>
                    <p className="text-xs text-slate-600">{stats.active} members</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-50">
                    <Clock className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Inactive</p>
                    <p className="text-xs text-slate-600">{stats.inactive} members</p>
                  </div>
                </div>
              </div>
              {stats.suspended > 0 && (
                <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-50">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">Suspended</p>
                      <p className="text-xs text-slate-600">{stats.suspended} members</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" size="sm" onClick={() => setShowAddModal(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add New Staff
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Manage Roles
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                View Activity Logs
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Staff List
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Contributors</CardTitle>
              <CardDescription>Most active this month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {staffMembers
                  .filter(s => s.status === "active")
                  .sort((a, b) => b.totalActions - a.totalActions)
                  .slice(0, 3)
                  .map((staff, i) => (
                    <div key={staff.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-xs">
                          #{i + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{staff.name}</p>
                          <p className="text-xs text-slate-600">{staff.role}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">{staff.totalActions}</p>
                        <p className="text-xs text-slate-500">actions</p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Staff Details Modal */}
      {selectedStaff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedStaff(null)}>
          <Card className="max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={`h-16 w-16 rounded-full bg-gradient-to-br ${getRoleColor(selectedStaff.role)} flex items-center justify-center text-white font-semibold text-xl`}>
                    {selectedStaff.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <CardTitle className="text-xl">{selectedStaff.name}</CardTitle>
                    <CardDescription>{selectedStaff.role} • {selectedStaff.department}</CardDescription>
                    <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(selectedStaff.status)}`}>
                      {selectedStaff.status}
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedStaff(null)}>
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 border border-slate-200 rounded-lg">
                  <div className="text-sm text-slate-600">Actions Today</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{selectedStaff.actionsToday}</div>
                </div>
                <div className="p-3 border border-slate-200 rounded-lg">
                  <div className="text-sm text-slate-600">Total Actions</div>
                  <div className="text-2xl font-bold text-blue-600 mt-1">{selectedStaff.totalActions.toLocaleString()}</div>
                </div>
                <div className="p-3 border border-slate-200 rounded-lg">
                  <div className="text-sm text-slate-600">Member Since</div>
                  <div className="text-lg font-bold text-slate-900 mt-1">{new Date(selectedStaff.joinDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>
                </div>
                <div className="p-3 border border-slate-200 rounded-lg">
                  <div className="text-sm text-slate-600">Last Active</div>
                  <div className="text-lg font-bold text-green-600 mt-1">{selectedStaff.lastActive}</div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Contact Information
                </h4>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <Mail className="h-4 w-4 text-slate-600" />
                    <div>
                      <div className="text-xs text-slate-600">Email</div>
                      <div className="font-medium text-sm">{selectedStaff.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <Phone className="h-4 w-4 text-slate-600" />
                    <div>
                      <div className="text-xs text-slate-600">Phone</div>
                      <div className="font-medium text-sm">{selectedStaff.phone}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Permissions */}
              <div>
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Access Permissions
                </h4>
                <div className="grid sm:grid-cols-2 gap-2">
                  {selectedStaff.permissions.map((permission, i) => (
                    <div key={i} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="text-sm text-slate-900">{permission}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Account Info */}
              <div>
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Account Information
                </h4>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="text-xs text-slate-600">Staff ID</div>
                    <div className="font-medium text-sm mt-1">{selectedStaff.id}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="text-xs text-slate-600">Department</div>
                    <div className="font-medium text-sm mt-1">{selectedStaff.department}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="text-xs text-slate-600">Join Date</div>
                    <div className="font-medium text-sm mt-1">{new Date(selectedStaff.joinDate).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>

              {/* Recent Activity Timeline */}
              <div>
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Recent Activity
                </h4>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {recentActivity
                    .filter(a => a.staff === selectedStaff.name)
                    .map((activity, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <Activity className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-900">{activity.action}</p>
                          <p className="text-xs text-slate-500 mt-1">{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  {recentActivity.filter(a => a.staff === selectedStaff.name).length === 0 && (
                    <div className="text-center py-6 text-sm text-slate-500">
                      No recent activity recorded
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t border-slate-200">
                {selectedStaff.role !== "Super Admin" && (
                  <>
                    <Button variant="outline" className="flex-1">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Details
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <Settings className="h-4 w-4 mr-2" />
                      Manage Permissions
                    </Button>
                    {selectedStaff.status === "active" && (
                      <Button variant="outline" className="text-red-600 hover:bg-red-50">
                        <ShieldAlert className="h-4 w-4 mr-2" />
                        Suspend
                      </Button>
                    )}
                    {selectedStaff.status === "suspended" && (
                      <Button variant="outline" className="text-green-600 hover:bg-green-50">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Activate
                      </Button>
                    )}
                  </>
                )}
                {selectedStaff.role === "Super Admin" && (
                  <div className="flex-1 text-center p-3 bg-purple-50 rounded-lg">
                    <p className="text-sm text-purple-900 font-medium">Super Admin accounts cannot be modified</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">Add New Staff Member</CardTitle>
                  <CardDescription>Invite a team member and assign their role</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Full Name</label>
                    <Input placeholder="Enter full name" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Email Address</label>
                    <Input type="email" placeholder="email@example.com" />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Phone Number</label>
                    <Input placeholder="+92 XXX XXXXXXX" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Department</label>
                    <select className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm">
                      <option value="">Select department</option>
                      <option value="Administration">Administration</option>
                      <option value="Support">Support</option>
                      <option value="Content">Content</option>
                      <option value="Finance">Finance</option>
                      <option value="Technical">Technical</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Role</label>
                  <select className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm">
                    <option value="">Select role</option>
                    <option value="Admin">Admin</option>
                    <option value="Support Moderator">Support Moderator</option>
                    <option value="Content Manager">Content Manager</option>
                    <option value="Finance Manager">Finance Manager</option>
                  </select>
                  <p className="text-xs text-slate-500">Role determines access permissions</p>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-700">Permissions</label>
                  <div className="grid sm:grid-cols-2 gap-3 p-4 border border-slate-200 rounded-lg">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded border-slate-300" />
                      <span className="text-sm text-slate-700">User Management</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded border-slate-300" />
                      <span className="text-sm text-slate-700">Content Management</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded border-slate-300" />
                      <span className="text-sm text-slate-700">View Reports</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded border-slate-300" />
                      <span className="text-sm text-slate-700">Financial Access</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded border-slate-300" />
                      <span className="text-sm text-slate-700">Approve Doctors</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded border-slate-300" />
                      <span className="text-sm text-slate-700">View Activity Logs</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded border-slate-300" />
                      <span className="text-sm text-slate-700">Manage Patients</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded border-slate-300" />
                      <span className="text-sm text-slate-700">System Settings</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <Button variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Send Invite
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
