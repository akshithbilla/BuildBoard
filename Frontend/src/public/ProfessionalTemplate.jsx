// src/components/templates/ProfessionalTemplate.jsx
export default function ProfessionalTemplate({ profile }) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <header className="text-center mb-16">
        <h1 className="text-5xl font-bold text-gray-800 mb-4">{profile.profile.name}</h1>
        {profile.profile.bio && (
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">{profile.profile.bio}</p>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {profile.projects.map((project) => (
          <div key={project._id} className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Add professional project cards with more details */}
          </div>
        ))}
      </div>
    </div>
  );
}