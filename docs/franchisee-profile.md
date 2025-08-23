# Franchisee Profile Integration

This document explains how the franchisee profile functionality works in the IPA frontend application.

## Overview

When a franchisee logs in, the system automatically fetches their profile data from the `basurl/franchisee/profile` API endpoint and stores it in the user context for use throughout the application. This profile data is now displayed consistently across all franchisee pages.

## API Response Structure

The profile API returns the following structure:

```json
{
  "statusCode": 200,
  "timestamp": "2025-08-17T20:01:24.510Z",
  "method": "GET",
  "path": "/franchisee/profile",
  "message": "success",
  "result": {
    "id": 1,
    "name": "Ashwin",
    "dob": "2025-08-17T10:24:10.781Z",
    "bloodGroup": "O+",
    "address": "13/6, 11th Main Rd, Vijaya Nagar, Velachery, Chennai, Tamil Nadu 600042",
    "communicationAddress": "13/6, 11th Main Rd, Vijaya Nagar, Velachery, Chennai, Tamil Nadu 600042",
    "city": "Chennai",
    "phone": "8870860993",
    "mail": "ashwinpreyan@gmail.com",
    "education": "B.Tech",
    "occupation": "IT",
    "reference": "Ashwin",
    "createdAt": "2025-08-17T10:28:33.195Z",
    "updatedAt": "2025-08-17T19:56:11.705Z",
    "franchise": {
      "id": 1,
      "name": "Nanganallur",
      "type": "Area",
      "status": "Active",
      "programId": 1,
      "franchiseeId": 1,
      "approvedBy": 1,
      "approvedAt": "2025-08-17T11:11:00.366Z",
      "createdAt": "2025-08-17T10:28:33.210Z",
      "updatedAt": "2025-08-17T19:47:24.168Z"
    }
  }
}
```

## Implementation Details

### 1. Login Flow

The profile fetching is integrated into the login flow in `app/login/components/LoginCard.tsx`:

```typescript
// After successful login
let profileData = null;
try {
  const profileResponse = await getFranchiseeProfile();
  if (profileResponse.statusCode === 200) {
    profileData = profileResponse.result;
  }
} catch (profileError) {
  console.warn("Failed to fetch profile data:", profileError);
  // Continue with login even if profile fetch fails
}

const loggedInUser = {
  id: String(data.userId),
  name: data.name,
  role: "franchisee" as const,
  franchiseStatus: data.franchiseStatus,
  franchiseId: data.franchiseId,
  profile: profileData || undefined,
};
```

### 2. User Context

The profile data is stored in the user context and can be accessed throughout the application:

```typescript
import { useUser } from "@/context/user-context";

const { user } = useUser();
const profile = user?.profile;
```

### 3. Custom Hook

A custom hook `useFranchiseeProfile` is available for easy access to profile data:

```typescript
import { useFranchiseeProfile } from "@/hooks/use-franchisee-profile";

const { profile, isProfileLoaded, franchiseDetails, personalDetails } =
  useFranchiseeProfile();
```

### 4. Reusable Header Component

A reusable `FranchiseeProfileHeader` component is available for consistent display across pages:

```typescript
import { FranchiseeProfileHeader } from "@/components/franchisee-profile-header";

<FranchiseeProfileHeader
  title="My Students"
  subtitle="Manage your franchise students"
>
  <Button>Add Student</Button>
</FranchiseeProfileHeader>;
```

## Usage Examples

### 1. Accessing Profile Data in Components

```typescript
import { useFranchiseeProfile } from "@/hooks/use-franchisee-profile";

function MyComponent() {
  const { profile, isProfileLoaded } = useFranchiseeProfile();

  if (!isProfileLoaded) {
    return <div>Loading profile...</div>;
  }

  return (
    <div>
      <h2>Welcome, {profile.name}!</h2>
      <p>Franchise: {profile.franchise.name}</p>
      <p>Phone: {profile.phone}</p>
    </div>
  );
}
```

### 2. Using the Auth Service Directly

```typescript
import {
  getFranchiseeProfile,
  getCurrentFranchiseeProfile,
} from "@/services/auth.service";

// Fetch fresh profile data
const profileResponse = await getFranchiseeProfile();
const profile = profileResponse.result;

// Get profile from localStorage
const currentProfile = getCurrentFranchiseeProfile();
```

### 3. Dashboard Integration

The franchisee dashboard displays profile information in a dedicated card showing:

- Personal information (name, phone, email, city)
- Franchise details (name, type, status, approval date)

### 4. Agreement Page Integration

The franchisee agreement page now uses profile data instead of fetching separate franchise data:

- Franchisee information is populated from profile data
- Location details use profile address information
- Franchise details show the franchise information from profile
- All data is consistent with the profile API response

### 5. Page Headers Across Franchisee Section

All franchisee pages now display consistent profile information in their headers:

- **Students Page**: Shows franchisee name, phone, and city
- **Course Instructors Page**: Displays franchisee contact information
- **Orders Page**: Includes franchisee details in the header
- **Contests Page**: Shows franchisee information consistently

## Error Handling

- If profile fetching fails during login, the login process continues without profile data
- Components should check if profile data exists before rendering profile-dependent UI
- The `isProfileLoaded` flag from the custom hook helps determine if profile data is available

## TypeScript Types

The profile data is fully typed with the following interfaces:

- `FranchiseeProfileResponse` - API response structure
- `User` interface includes optional `profile` property
- Custom hook returns typed data with proper null checks

## Pages Updated

The following pages have been updated to use franchisee profile data:

1. **Dashboard** (`/franchisee/dashboard`) - Profile card with personal and franchise details
2. **Agreement** (`/franchisee/agreement`) - Uses profile data for all franchisee information
3. **Students** (`/franchisee/students`) - Header shows franchisee contact information
4. **Course Instructors** (`/franchisee/course-instructors`) - Displays franchisee details
5. **Orders** (`/franchisee/orders`) - Header includes franchisee information
6. **Contests** (`/franchisee/contests`) - Shows consistent franchisee details

## Future Enhancements

- Add profile editing functionality
- Implement profile data refresh mechanism
- Add profile data caching
- Create profile management pages
- Add profile picture upload functionality
- Implement profile data validation
