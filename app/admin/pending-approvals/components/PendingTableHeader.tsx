export default function PendingTableHeader() {
  return (
    <div className="flex flex-row items-center gap-4 p-2 border border-black bg-gray-50 font-medium text-gray-700 text-sm rounded-t-md bg-primary/80">
      <div className="flex-1 pl-2 flex items-center">Franchise Name</div>
      <div className="flex-1 text-center flex items-center justify-center">
        Program
      </div>
      <div className="flex-1 text-center flex items-center justify-center">
        Type
      </div>
      <div className="flex-1 text-center flex items-center justify-center">
        Application Date
      </div>
      <div className="flex-1 text-center flex items-center justify-center">
        Status
      </div>
      <div className="flex-1 text-center flex items-center justify-center">
        Actions
      </div>
    </div>
  );
}
