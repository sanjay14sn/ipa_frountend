import { MapPin } from "lucide-react";

interface LocationDetailsProps {
  franchiseData: any;
}

export default function LocationDetails({
  franchiseData,
}: LocationDetailsProps) {
  const cityLine = [
    [franchiseData.city, franchiseData.pincode].filter(Boolean).join(" - "),
    franchiseData.state,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <section className="p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-card-foreground">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        Location Details
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Centre Address
          </p>
          <p className="mt-1 text-sm text-card-foreground">
            {franchiseData.address}
          </p>
          {cityLine ? (
            <p className="text-xs text-muted-foreground">{cityLine}</p>
          ) : null}
        </div>
        {franchiseData.communicationAddress && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Communication Address
            </p>
            <p className="mt-1 text-sm text-card-foreground">
              {franchiseData.communicationAddress}
            </p>
            {franchiseData.communicationPincode ? (
              <p className="text-xs text-muted-foreground">
                {franchiseData.communicationPincode}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
