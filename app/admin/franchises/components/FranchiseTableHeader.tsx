export default function FranchiseTableHeader() {
  return (
    <div className="grid grid-cols-12 gap-4 p-2 border border-black bg-gray-50 text-sm font-medium text-gray-700 bg-primary/80 rounded-t-md items-center">
      <div className="col-span-3 pl-8 flex items-center">Franchise</div>
      <div className="col-span-2 text-center flex items-center justify-center">
        Type
      </div>
      <div className="col-span-2 text-center flex items-center justify-center">
        Program
      </div>
      <div className="col-span-2 text-center flex items-center justify-center">
        Created Date
      </div>
      <div className="col-span-2 text-center flex items-center justify-center">
        Status
      </div>
      <div className="col-span-1 text-center flex items-center justify-center">
        Actions
      </div>
    </div>
  );
}
