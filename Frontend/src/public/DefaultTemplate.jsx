import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';

export default function ProfessionalTemplate({ profile }) {
  const [selectedProject, setSelectedProject] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTech, setSelectedTech] = useState([]);

  const safeProjects = Array.isArray(profile?.projects) ? profile.projects : [];

  const categories = ['all', ...new Set(safeProjects.map(p => p?.category ?? 'Uncategorized'))];
  const allTech = [...new Set(safeProjects.flatMap(p => p?.techStack ?? []))];

  const filteredProjects = safeProjects.filter(project => {
    const matchesCategory = filter === 'all' || project?.category === filter;
    const matchesSearch = project?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project?.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTech = selectedTech.length === 0 ||
      selectedTech.some(tech => project?.techStack?.includes(tech));
    return matchesCategory && matchesSearch && matchesTech;
  });

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="relative bg-white border-b border-neutral-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div className="flex-1">
              <motion.h1 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-4xl md:text-5xl font-bold text-neutral-800"
              >
                {profile?.profile?.name ?? 'Unnamed'}'s Portfolio
              </motion.h1>

              {profile?.profile?.bio && (
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="text-lg text-neutral-600 mt-4 max-w-2xl"
                >
                  {profile.profile.bio}
                </motion.p>
              )}
            </div>

            {profile?.profile?.socialLinks && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="flex space-x-4"
              >
                {profile.profile.socialLinks.github && (
                  <a 
                    href={profile.profile.socialLinks.github} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center hover:bg-neutral-200 transition-colors"
                    aria-label="GitHub"
                  >
                    <svg className="w-5 h-5 text-neutral-700" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504..." />
                    </svg>
                  </a>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Filters */}
        <div className="mb-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-neutral-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="..." clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search projects..."
                className="block w-full pl-10 pr-3 py-2.5 border border-neutral-200 rounded-lg leading-5 bg-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-neutral-700"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Category Filter */}
            <div className="flex space-x-2 overflow-x-auto pb-2">
              {categories.map(category => (
                <motion.button
                  key={category}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setFilter(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    filter === category
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50'
                  }`}
                >
                  {category === 'all' ? 'All Projects' : category}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Tech Stack Filter */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-neutral-700 mb-3">Filter by Technology</h3>
            <div className="flex flex-wrap gap-2">
              {allTech.map(tech => (
                <motion.button
                  key={tech}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() =>
                    setSelectedTech(prev =>
                      prev.includes(tech)
                        ? prev.filter(t => t !== tech)
                        : [...prev, tech]
                    )
                  }
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    selectedTech.includes(tech)
                      ? 'bg-blue-600 text-white'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  {tech}
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* Projects Grid */}
        {filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map(project => (
              <motion.div
                key={project?._id ?? project?.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                whileHover={{ y: -5 }}
                className="relative group"
              >
                <div
                  className="bg-white rounded-xl shadow-sm overflow-hidden h-full flex flex-col cursor-pointer border border-neutral-100 hover:shadow-md transition-all duration-300"
                  onClick={() => setSelectedProject(project)}
                >
                  {/* Preview */}
                  <div className="relative h-48 w-full bg-neutral-50 overflow-hidden">
                    {project?.images?.[0] ? (
                      <LazyLoadImage
                        src={project.images[0]}
                        alt={project.title}
                        effect="blur"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-neutral-100">
                        <span className="text-neutral-400">Project Preview</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-lg font-semibold text-neutral-800">
                        {project?.title}
                      </h3>
                      <span className="text-xs font-medium px-2 py-1 bg-neutral-100 text-neutral-600 rounded-full">
                        {project?.category ?? 'Uncategorized'}
                      </span>
                    </div>

                    <p className="text-neutral-600 text-sm mb-4 line-clamp-2">
                      {project?.description}
                    </p>

                    {project?.techStack?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {project.techStack.map(tech => (
                          <span
                            key={tech}
                            className="px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-xs font-medium"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex space-x-3 mt-auto pt-2">
                      {project?.liveUrl && (
                        <a
                          href={project.liveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                          onClick={e => e.stopPropagation()}
                        >
                          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0..." />
                          </svg>
                          Live
                        </a>
                      )}
                      {project?.githubUrl && (
                        <a
                          href={project.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-neutral-600 hover:text-neutral-800 flex items-center"
                          onClick={e => e.stopPropagation()}
                        >
                          <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 24 24">
                            <path fillRule="evenodd" clipRule="evenodd" d="..." />
                          </svg>
                          Code
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl border border-neutral-100">
            <div className="mx-auto w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 9.75h.008v.008H9.75V9.75z..." />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-neutral-800">No Projects Found</h3>
            <p className="text-sm text-neutral-600 mt-2">Try adjusting your filters or check back later.</p>
          </div>
        )}
      </main>
    </div>
  );
}
