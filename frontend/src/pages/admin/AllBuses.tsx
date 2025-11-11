import { useBuses } from '../../hooks/useBuses';

export function AllBuses() {
  const { buses, loading, error } = useBuses();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <p className="text-gray-600">Loading buses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <p className="text-red-600">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-primary-700 mb-6">All Bus Information</h1>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-3 text-left font-semibold">Bus #</th>
                  <th className="border border-gray-300 p-3 text-left font-semibold">Main Street</th>
                  <th className="border border-gray-300 p-3 text-left font-semibold">Cross Street 1</th>
                  <th className="border border-gray-300 p-3 text-left font-semibold">Cross Street 2</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 225 }, (_, i) => i + 1).map((num) => {
                  const bus = buses.find((b) => b.busNumber === num.toString());
                  return (
                    <tr key={num}>
                      <td className="border border-gray-300 p-3 text-center">{num}</td>
                      <td className="border border-gray-300 p-3">{bus?.main_street || ''}</td>
                      <td className="border border-gray-300 p-3">{bus?.primary_cross_street || ''}</td>
                      <td className="border border-gray-300 p-3">{bus?.secondary_cross_street || ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
