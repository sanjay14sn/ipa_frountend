import { useUser } from "@/context/user-context";

export function useFranchiseeProfile() {
  const { user } = useUser();

  const profile = user?.profile || null;
  const payroll = profile?.franchise?.franchisePayroll || null;

  return {
    profile,
    isProfileLoaded: !!profile,
    franchiseDetails: profile?.franchise || null,
    payroll,
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
