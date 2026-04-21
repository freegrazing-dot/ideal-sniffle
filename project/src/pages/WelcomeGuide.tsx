export default function WelcomeGuide() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-xl p-8">

        <h1 className="text-3xl font-bold mb-4">
          Welcome to Seafoam Oasis
        </h1>

        <p className="mb-4">
          We're excited to host you at our coastal getaway just minutes from the beach.
          Our goal is to provide a relaxing and memorable stay for you and your family.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">
          During your stay
        </h2>

        <ul className="list-disc ml-6 space-y-2">
          <li>Enjoy the screened lanai and hot tub</li>
          <li>Beach gear and paddle board are available</li>
          <li>Parking available for 2–3 vehicles</li>
          <li>Self check-in for convenience</li>
        </ul>

        <h2 className="text-xl font-semibold mt-6 mb-2">
          Guest Supplies
        </h2>

        <p>
          Feel free to use available items such as coffee, condiments,
          shampoo, and beach accessories. Guests often leave useful items
          behind for the next visitor.
        </p>

        <div className="mt-6 text-sm text-gray-500">
          Thank you for choosing Seafoam Oasis.
        </div>

      </div>
    </div>
  );
}