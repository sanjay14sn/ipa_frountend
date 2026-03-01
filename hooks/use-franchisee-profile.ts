import { useUser } from "@/context/user-context";

export function useFranchiseeProfile() {
  const { user } = useUser();

  const profile = user?.profile || null;
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
          city: (profile as any).franchise?.city ?? (profile as any).city,
          address: (profile as any).franchise?.address ?? (profile as any).address,
          education: profile.education,
          occupation: profile.occupation,
          bloodGroup: profile.bloodGroup,
          dob: profile.dob,
        }
      : null,
  };
}
