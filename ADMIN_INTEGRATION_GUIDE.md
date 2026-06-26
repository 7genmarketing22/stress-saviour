# Admin Dashboard & Manage Doctors Integration Guide

## Overview
This guide explains how the Admin Dashboard and Manage Doctors pages are integrated and work together as a cohesive admin control panel.

## Navigation Flow

### From Dashboard to Manage Doctors

#### 1. **Pending Approvals Card**
- **Dashboard Location**: Statistics grid (5th card)
- **Shows**: Number of pending doctor applications
- **Click Action**: Navigate to `/admin/doctors?filter=pending`
- **Expected Behavior**: Opens Manage Doctors page with pending filter pre-selected

```typescript
// Dashboard navigation
<Button onClick={() => router.push('/admin/doctors?filter=pending')}>
  View Pending ({pendingCount})
</Button>
```

#### 2. **Active Doctors Card**
- **Dashboard Location**: Statistics grid (2nd card)
- **Shows**: Total approved doctors
- **Click Action**: Navigate to `/admin/doctors?filter=approved`
- **Expected Behavior**: Opens Manage Doctors page showing all approved doctors

#### 3. **Verification Queue Section**
- **Dashboard Location**: Main grid, left column
- **Shows**: List of pending doctors with inline approve/reject
- **Quick Actions**:
  - **Approve**: Approve doctor inline → Updates both pages
  - **Reject**: Reject doctor inline → Updates both pages
  - **View**: Navigate to `/admin/doctors/{id}` → Opens detailed modal
- **View All**: Button at bottom navigates to `/admin/doctors?filter=pending`

#### 4. **Top Doctors Section**
- **Dashboard Location**: Right column
- **Shows**: Top 5 performing doctors by earnings
- **Click Action**: Navigate to `/admin/doctors/{id}` → Opens doctor detail modal
- **View All Doctors**: Bottom button → `/admin/doctors?sort=earnings&order=desc`

### From Manage Doctors to Dashboard

#### Back Navigation
- Breadcrumb: Dashboard > Manage Doctors
- Back button in header
- Browser back button support

#### Quick Stats Link
- "View Analytics" button in any doctor profile → Can link to dashboard analytics section

## Shared Data & State

### Statistics That Must Match

#### 1. **Doctor Counts**
- **Pending**: Must be identical on both pages
- **Approved**: Must be identical
- **Rejected**: Must be identical
- **Suspended**: Must be identical

#### 2. **Financial Metrics**
- **Total Revenue**: Aggregate of all doctor earnings
- **Platform Commission**: 10% of total revenue
- **Calculations must be synchronized**

#### 3. **Performance Metrics**
- **Rating calculations**: Same algorithm
- **Consultation counts**: Real-time sync
- **Online status**: Shared state

### Data Synchronization

```typescript
// Shared hook for doctor statistics
const useDoctorStats = () => {
  const { data, refetch } = useQuery('doctorStats', fetchDoctorStats);
  
  return {
    total: data?.total || 0,
    pending: data?.pending || 0,
    approved: data?.approved || 0,
    rejected: data?.rejected || 0,
    suspended: data?.suspended || 0,
    avgRating: data?.avgRating || 0,
    totalRevenue: data?.totalRevenue || 0,
    refetch,
  };
};

// Use in both Dashboard and Manage Doctors
const Dashboard = () => {
  const stats = useDoctorStats();
  // ...
};

const ManageDoctors = () => {
  const stats = useDoctorStats();
  // ...
};
```

## Shared Components

### 1. **Status Badge Component**
Used in both pages with identical styling:

```typescript
// components/admin/DoctorStatusBadge.tsx
export const DoctorStatusBadge = ({ status }: { status: DoctorStatus }) => {
  const config = {
    approved: { label: "Approved", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
    pending: { label: "Pending", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
    rejected: { label: "Rejected", color: "bg-red-500/10 text-red-600 border-red-500/20" },
    suspended: { label: "Suspended", color: "bg-slate-500/10 text-slate-600 border-slate-500/20" },
  };
  
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold border ${config[status].color}`}>
      {config[status].label}
    </span>
  );
};
```

### 2. **Doctor Avatar Component**
Consistent avatar generation:

```typescript
// components/admin/DoctorAvatar.tsx
export const DoctorAvatar = ({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) => {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2);
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-16 w-16 text-xl"
  };
  
  return (
    <div className={`${sizes[size]} flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold`}>
      {initials}
    </div>
  );
};
```

### 3. **Quick Action Buttons**
Standardized action handlers:

```typescript
// lib/admin/doctorActions.ts
export const approveDoctorAction = async (doctorId: string) => {
  // API call to approve
  await fetch(`/api/admin/doctors/${doctorId}/approve`, { method: 'POST' });
  
  // Invalidate queries to refresh both pages
  queryClient.invalidateQueries('doctorStats');
  queryClient.invalidateQueries('doctors');
  queryClient.invalidateQueries(['doctor', doctorId]);
  
  // Show toast
  toast.success('Doctor approved successfully');
};

export const rejectDoctorAction = async (doctorId: string, reason: string) => {
  await fetch(`/api/admin/doctors/${doctorId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason })
  });
  
  queryClient.invalidateQueries('doctorStats');
  queryClient.invalidateQueries('doctors');
  
  toast.success('Doctor application rejected');
};
```

## URL Parameters & Deep Linking

### Manage Doctors Page URL Structure
```
/admin/doctors
/admin/doctors?filter=pending
/admin/doctors?filter=approved
/admin/doctors?filter=rejected
/admin/doctors?filter=suspended
/admin/doctors?sort=rating&order=desc
/admin/doctors?sort=earnings&order=desc
/admin/doctors?search=Dr.%20Khan
/admin/doctors/{doctorId}  // Opens modal with ID
```

### Dashboard Links
```typescript
// Examples of dashboard navigation
<Link href="/admin/doctors?filter=pending">
  View {pendingCount} Pending
</Link>

<Link href={`/admin/doctors?id=${doctor.id}`}>
  View Details
</Link>

<Link href="/admin/doctors?sort=earnings&order=desc">
  View All Top Doctors
</Link>
```

## Real-time Updates

### WebSocket Events (Future)
```typescript
// Listen for doctor status changes
socket.on('doctor:approved', (doctorId) => {
  // Refresh stats in dashboard
  refetchDashboardStats();
  
  // Update doctor list in manage page
  refetchDoctors();
  
  // Show notification
  toast.success('A new doctor has been approved');
});

socket.on('doctor:application', (doctor) => {
  // Increment pending count
  // Show notification to admin
  toast.info('New doctor application received');
});
```

### Polling Strategy (Current)
```typescript
// Dashboard: Poll every 30 seconds
useQuery('doctorStats', fetchDoctorStats, {
  refetchInterval: 30000,
});

// Manage Doctors: Poll every 60 seconds
useQuery('doctors', fetchDoctors, {
  refetchInterval: 60000,
});

// Manual refresh on both pages
const handleRefresh = () => {
  refetchDoctorStats();
  refetchDoctors();
};
```

## Workflow Examples

### Example 1: Approving a Doctor from Dashboard

1. Admin opens Dashboard
2. Sees "3 Pending" in Verification Queue
3. Clicks "View" on "Dr. Farah Jamil"
4. Reviews credentials in inline card
5. Clicks "Approve" button
6. Doctor status updates to "approved"
7. Pending count updates from 3 to 2
8. Active Doctors card updates from 127 to 128
9. Doctor disappears from Verification Queue
10. Success toast appears

### Example 2: Managing Doctor from Dedicated Page

1. Admin clicks "View All" in Verification Queue
2. Navigates to `/admin/doctors?filter=pending`
3. Sees all 3 pending doctors in detailed table
4. Clicks "View" on "Dr. Farah Jamil"
5. Modal opens with full profile
6. Reviews all documents and credentials
7. Clicks "Approve" in modal
8. Modal closes
9. Doctor removed from pending list
10. Statistics cards update
11. Success toast appears
12. Can return to dashboard - counts will match

### Example 3: Bulk Actions

1. Admin in Manage Doctors page
2. Filters by "Pending" status
3. Selects multiple doctors using checkboxes
4. Bulk action bar appears
5. Clicks "Send Message"
6. Compose bulk email/notification
7. Sends message to all selected doctors
8. Confirmation dialog
9. Success notification

## Error Handling

### Network Errors
```typescript
// Retry logic
const { data, error, refetch } = useQuery('doctors', fetchDoctors, {
  retry: 3,
  retryDelay: 1000,
});

if (error) {
  return (
    <ErrorState
      message="Failed to load doctors"
      action={<Button onClick={refetch}>Retry</Button>}
    />
  );
}
```

### Permission Errors
```typescript
// Check admin permissions
const { user } = useAuth();

if (user.role !== 'admin' && user.role !== 'super_admin') {
  return <Redirect to="/admin/dashboard" />;
}
```

## Performance Optimization

### Lazy Loading
```typescript
// Load modal content only when opened
const DoctorModal = lazy(() => import('@/components/admin/DoctorModal'));

{showModal && (
  <Suspense fallback={<LoadingSpinner />}>
    <DoctorModal doctor={selectedDoctor} />
  </Suspense>
)}
```

### Pagination
```typescript
// Manage Doctors with pagination
const { data, fetchNextPage } = useInfiniteQuery('doctors', fetchDoctors, {
  getNextPageParam: (lastPage) => lastPage.nextCursor,
});
```

### Caching Strategy
```typescript
// Cache doctor details for 5 minutes
const { data } = useQuery(['doctor', id], () => fetchDoctor(id), {
  staleTime: 5 * 60 * 1000,
  cacheTime: 10 * 60 * 1000,
});
```

## Testing Integration

### Integration Tests
```typescript
describe('Dashboard to Manage Doctors Navigation', () => {
  it('navigates to pending doctors when clicking pending card', async () => {
    render(<Dashboard />);
    const pendingCard = screen.getByText(/Pending Approvals/i);
    fireEvent.click(pendingCard);
    
    await waitFor(() => {
      expect(window.location.pathname).toBe('/admin/doctors');
      expect(window.location.search).toBe('?filter=pending');
    });
  });
  
  it('maintains consistent counts between pages', async () => {
    const { rerender } = render(<Dashboard />);
    const dashboardCount = screen.getByText(/\d+ Pending/i);
    
    rerender(<ManageDoctors />);
    const manageDoctorsCount = screen.getByText(/\d+ Pending/i);
    
    expect(dashboardCount.textContent).toBe(manageDoctorsCount.textContent);
  });
});
```

## Deployment Checklist

- [ ] Both pages fetch from same API endpoints
- [ ] Status badge colors match exactly
- [ ] Avatar generation algorithm identical
- [ ] All navigation links tested
- [ ] URL parameters properly parsed
- [ ] Deep linking works correctly
- [ ] Statistics calculations synchronized
- [ ] Error states handled gracefully
- [ ] Loading states consistent
- [ ] Toast notifications appear on both pages
- [ ] Mobile responsive on both pages
- [ ] Query cache invalidation working
- [ ] Real-time updates (if implemented)
- [ ] Permission checks in place
- [ ] Analytics tracking configured

---

**Last Updated**: June 22, 2026
**Version**: 1.0
