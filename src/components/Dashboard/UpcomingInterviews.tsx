import Image from "next/image";

export function UpcomingInterviews() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-bold text-gray-900">
          Upcoming Interviews
        </h3>
        <button className="text-xs font-medium text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-all">
          View all
        </button>
      </div>

      <div className="flex flex-col items-center justify-center py-8 text-center">
        {/* Illustration */}
        <div className="relative w-48 h-32 mb-4">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-end gap-1">
              <div className="w-6 h-12 bg-blue-100 rounded-lg" />
              <div className="w-6 h-16 bg-blue-200 rounded-lg" />
              <div className="w-6 h-20 bg-blue-300 rounded-lg" />
              <div className="w-6 h-14 bg-blue-400 rounded-lg" />
              <div className="relative">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="white"
                      strokeWidth="2"
                    />
                    <path
                      d="M12 6v6l4 2"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <h4 className="text-base font-bold text-gray-900 mb-1">
          You&apos;re all caught up!
        </h4>
        <p className="text-sm text-gray-400 mb-5">
          No upcoming interviews scheduled.
        </p>

        <button className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md shadow-blue-200">
          Start a New Interview
        </button>
      </div>
    </div>
  );
}
