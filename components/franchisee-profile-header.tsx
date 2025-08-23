import { useFranchiseeProfile } from "@/hooks/use-franchisee-profile";

interface FranchiseeProfileHeaderProps {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}

export function FranchiseeProfileHeader({
  title,
  subtitle,
  children,
}: FranchiseeProfileHeaderProps) {
  const { profile, isProfileLoaded } = useFranchiseeProfile();

  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">
          {subtitle}
          {isProfileLoaded && profile && (
            <span className="block text-sm text-muted-foreground mt-1">
              Franchisee: {profile.name} • {profile.phone} • {profile.city}
            </span>
          )}
        </p>
      </div>
      {children}
    </div>
  );
}
