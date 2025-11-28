import { useUser } from "@/context/user-context";

export function useFranchiseeProfile() {
  const { user } = useUser();

  const profile = user?.profile || null;
  // Support both new (array) and legacy (single) payroll structure
  const payroll = profile?.franchise?.franchisePayrolls?.[0] || 
                  profile?.franchise?.franchisePayroll || null;
  const payrolls = profile?.franchise?.franchisePayrolls || null;

  return {
    profile,
    isProfileLoaded: !!profile,
    franchiseDetails: profile?.franchise || null,
    payroll,
    payrolls,
    personalDetails: profile
      ? {
          name: profile.name,
          phone: profile.phone,
          email: profile.mail,
          city: profile.city,
          address: profile.address,
          education: profile.education,
          occupation: profile.occupation,
          bloodGroup: profile.bloodGroup,
          dob: profile.dob,
        }
      : null,
  };
}
