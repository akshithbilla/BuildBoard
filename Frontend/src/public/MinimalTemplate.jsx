// src/components/templates/MinimalTemplate.jsx
export default function MinimalTemplate({ profile }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <header className="mb-12">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">{profile.profile.name}</h1>
        {profile.profile.bio && (
          <p className="text-lg text-gray-600">{profile.profile.bio}</p>
        )}
      </header>

      <div className="space-y-8">
        {profile.projects.map((project) => (
          <div key={project._id} className="border-b pb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">{project.title}</h2>
            <p className="text-gray-600 mb-4">{project.description}</p>
            {/* Add more project details as needed */}
          </div>
        ))}
      </div>
    </div>
  );
}