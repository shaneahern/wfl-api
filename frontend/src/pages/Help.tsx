export function Help() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-primary-700 mb-6">Help</h1>
          
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-700">
                Can't find your bus? Please report to Walk for Life Staff at the end of the walk for help.
              </p>
            </div>

            <div>
              <a
                href="http://www.walkforlifewc.com/event-info/event-schedule/"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 text-center"
              >
                Event Schedule
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
