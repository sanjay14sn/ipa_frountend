interface FranchiseeInformationProps {
  franchiseData: any;
}

export default function FranchiseeInformation({
  franchiseData,
}: FranchiseeInformationProps) {
  return (
    <div className="border-2 border-primary rounded-lg p-5 bg-white shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-primary">
        Franchisee Information
      </h3>
      <div className="space-y-3">
        <div className="flex justify-between items-start">
          <span className="text-sm font-medium text-gray-600">
            Contact Person:
          </span>
          <span className="text-sm text-gray-900 font-medium">
            {franchiseData.contactPerson}
          </span>
        </div>
        <div className="flex justify-between items-start">
          <span className="text-sm font-medium text-gray-600">Email:</span>
          <span className="text-sm text-gray-900 break-all text-right">
            {franchiseData.email}
          </span>
        </div>
        <div className="flex justify-between items-start">
          <span className="text-sm font-medium text-gray-600">Phone:</span>
          <span className="text-sm text-gray-900">{franchiseData.phone}</span>
        </div>
        {franchiseData.dob && (
          <div className="flex justify-between items-start">
            <span className="text-sm font-medium text-gray-600">
              Date of Birth:
            </span>
            <span className="text-sm text-gray-900">
              {new Date(franchiseData.dob).toLocaleDateString()}
            </span>
          </div>
        )}
        {franchiseData.bloodGroup && (
          <div className="flex justify-between items-start">
            <span className="text-sm font-medium text-gray-600">
              Blood Group:
            </span>
            <span className="text-sm bg-gray-100 px-2 py-1 rounded text-gray-900">
              {franchiseData.bloodGroup}
            </span>
          </div>
        )}
        {franchiseData.educationalQualification && (
          <div className="flex justify-between items-start">
            <span className="text-sm font-medium text-gray-600">
              Education:
            </span>
            <span className="text-sm text-gray-900 text-right">
              {franchiseData.educationalQualification}
            </span>
          </div>
        )}
        {franchiseData.presentOccupation && (
          <div className="flex justify-between items-start">
            <span className="text-sm font-medium text-gray-600">
              Occupation:
            </span>
            <span className="text-sm text-gray-900 text-right">
              {franchiseData.presentOccupation}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
