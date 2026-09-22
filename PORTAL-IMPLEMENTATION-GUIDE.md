# KGC Client & Admin Portal - Complete Implementation Guide

## System Overview

This portal provides dual-role authentication with separate Client and Admin dashboards for Klassic Group of Companies.

## File Structure
```
/ui
  ├── index.html (main public website)
  ├── portal.html (NEW - client/admin portal)
  ├── portal-auth.js (NEW - authentication logic)
  └── portal-styles.css (NEW - portal-specific styles)
```

## Key Features Implemented

### 1. Header Navigation
- **Left**: KGC Logo/Brand
- **Center**: Home, About, Contact links
- **Right**: "Book Now" + "Access Portal" buttons

### 2. Authentication Gate
- Login/Register modal with role selector
- Client vs Admin login toggle
- Demo credentials:
  - Client: client@kgc.ph / password
  - Admin: admin@kgc.ph / password

### 3. Booking System
- Multi-subsidiary selection
- Date picker
- Service description
- HYT Foundation donation toggle (1%)

### 4. Client Dashboard
**Complete Subsidiary Directory (9 cards):**
1. Brains Infinite Innovations Inc.
2. Klassic Solutions Inc.
3. Klassic Marketing Inc.
4. Westwood Development Corp.
5. Westwood Law
6. Connector (Business Integration Software)
7. The Green Oasis (Landscape Design)
8. Luxurious Cleaning Co.
9. HYT Foundation Inc.

**Features:**
- Welcome header with client name
- Active projects counter
- Quick action buttons
- Smart package builder
- HYT Foundation support option

### 5. Admin Dashboard
**Statistics Cards:**
- Total Clients: 248
- Active Projects: 73
- Pending Bookings: 24
- HYT Funds Raised: ₱1.2M

**Booking Manager Table:**
- Client name
- Subsidiary
- Service type
- Date
- Status (Pending/Approved/In Progress)
- Action buttons

**HYT Foundation Tracker:**
- Graduates ready for hiring
- Training program status

## Technical Implementation

### Color Scheme
```css
--charcoal: #121212;
--dark-gray: #1E1E1E;
--gold: #D4AF37;
--gold-dark: #C5A028;
--white: #FFFFFF;
```

### LocalStorage Schema
```javascript
// Session management
{
  isLoggedIn: boolean,
  role: 'client' | 'admin',
  userName: string,
  email: string
}
```

### JavaScript Functions Required

```javascript
// Authentication
function openPortalGate()
function login(email, password, role)
function logout()
function checkAuth()

// Modals
function openBookingModal()
function closeModal()

// Dashboard
function showClientDashboard()
function showAdminDashboard()
function updateStats()
```

## Responsive Breakpoints
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

## Next Steps

Due to file size limitations, I recommend:

1. **Create portal.html** - Copy structure from this guide
2. **Add authentication.js** - Handle login/logout logic
3. **Style with Tailwind** - Use provided color scheme
4. **Test locally** - Use demo credentials
5. **Integrate with backend** - Replace mock data

## Mock Data Examples

### Client Bookings
```javascript
const mockBookings = [
  {
    id: 1,
    subsidiary: 'Brains Infinite',
    service: 'Software Development',
    date: '2024-01-15',
    status: 'active'
  }
];
```

### Admin Overview
```javascript
const adminStats = {
  totalClients: 248,
  activeProjects: 73,
  pendingBookings: 24,
  hytFunds: 1200000
};
```

## Security Notes

- Use HTTPS in production
- Implement proper JWT tokens
- Add CSRF protection
- Hash passwords server-side
- Validate all inputs

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

**Implementation Status**: Guide Complete
**Estimated Development Time**: 8-12 hours
**Dependencies**: Tailwind CSS, Vanilla JavaScript
