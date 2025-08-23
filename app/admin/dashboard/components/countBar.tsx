import { useState } from "react";

interface CountBarProps {
  label: string;
  count: number;
  max: number; // max value for scaling
}

const CountBar: React.FC<CountBarProps> = ({ label, count, max }) => {
  const [hovered, setHovered] = useState(false);

  const height = (count / max) * 160; // scale bar height

  return (
    <>
      <div
        className="relative"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="flex flex-col items-center justify-end cursor-pointer h-[250px] w-[50px] group gap-2">
          <div
            className={`flex flex-col items-center justify-end gap-2 w-[40px] p-5 rounded-b-full ${
              hovered
                ? "bg-gradient-to-t from-primary via-primary/50 to-transparent"
                : ""
            }`}
          >
            <div className="h-6">
              {hovered ? (
                <p className="text-sm rounded-full bg-black text-white px-2 py-1">
                  {count}
                </p>
              ) : (
                <div className="rounded-full bg-primary w-[5px] h-[5px]"></div>
              )}
            </div>
            <div
              className="w-[2px] bg-gray-200 rounded-full max-h-[160px] min-h-[10px]"
              style={{ height: `${height}px` }}
            ></div>
          </div>
          <p className="mt-2">{label}</p>
        </div>
      </div>
    </>
  );
};

export default CountBar;
