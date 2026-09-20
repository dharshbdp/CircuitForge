import { useState, useEffect } from 'react'
import { STARTER_PROJECTS, StarterProject } from '../data/starterProjects'

export interface StarterLibraryModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectProject: (project: StarterProject) => void
}

type Difficulty = 'All' | 'Beginner' | 'Intermediate'

export default function StarterLibraryModal({
  isOpen,
  onClose,
  onSelectProject
}: StarterLibraryModalProps): React.JSX.Element | null {
  const [searchQuery, setSearchQuery] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty>('All')

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const filteredProjects = STARTER_PROJECTS.filter((p) => {
    const matchesDifficulty = difficultyFilter === 'All' || p.difficulty === difficultyFilter
    const query = searchQuery.toLowerCase().trim()
    if (!query) return matchesDifficulty

    const matchesName = p.name.toLowerCase().includes(query)
    const matchesDesc = p.description.toLowerCase().includes(query)
    const matchesTag = p.hardwareTags.some((tag) => tag.toLowerCase().includes(query))
    return matchesDifficulty && (matchesName || matchesDesc || matchesTag)
  })

  return (
    <div className="cf-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="cf-modal-container cf-modal-starter"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cf-starter-modal-title"
      >
        {/* Modal Header */}
        <div className="cf-modal-header">
          <div className="cf-modal-title-group">
            <h2 id="cf-starter-modal-title" className="cf-modal-title">
              STARTER PROJECT LIBRARY
            </h2>
            <p className="cf-modal-subtitle">
              Pre-configured embedded hardware templates ready for one-click loading and
              compilation.
            </p>
          </div>
          <button
            className="cf-modal-close-btn"
            onClick={onClose}
            title="Close modal (Esc)"
            aria-label="Close modal"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Modal Toolbar: Search & Difficulty Filters */}
        <div className="cf-modal-toolbar">
          <div className="cf-search-box">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, sensor, or component..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {searchQuery && (
              <button
                className="cf-search-clear"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                &times;
              </button>
            )}
          </div>

          <div className="cf-filter-chips" role="group" aria-label="Filter by difficulty">
            {(['All', 'Beginner', 'Intermediate'] as const).map((diff) => (
              <button
                key={diff}
                className={`cf-chip ${difficultyFilter === diff ? 'active' : ''}`}
                onClick={() => setDifficultyFilter(diff)}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>

        {/* Project Cards Grid */}
        <div className="cf-starter-grid">
          {filteredProjects.length === 0 ? (
            <div className="cf-starter-empty">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <p>No starter projects match your query &quot;{searchQuery}&quot;</p>
              <button
                className="cf-btn-sm"
                onClick={() => {
                  setSearchQuery('')
                  setDifficultyFilter('All')
                }}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            filteredProjects.map((proj) => (
              <div key={proj.id} className="cf-starter-card">
                <div className="cf-starter-card-top">
                  <div className="cf-starter-card-header">
                    <h3 className="cf-starter-card-title">{proj.name}</h3>
                    <span
                      className={`cf-starter-diff-badge ${
                        proj.difficulty === 'Beginner' ? 'badge-beginner' : 'badge-intermediate'
                      }`}
                    >
                      {proj.difficulty}
                    </span>
                  </div>
                  <p className="cf-starter-card-desc">{proj.description}</p>
                </div>

                <div className="cf-starter-card-bottom">
                  <div className="cf-starter-tags">
                    {proj.hardwareTags.map((tag) => (
                      <span key={tag} className="cf-starter-tag">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <button
                    className="cf-btn cf-btn-primary cf-starter-load-btn"
                    onClick={() => onSelectProject(proj)}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14" />
                      <path d="M12 5l7 7-7 7" />
                    </svg>
                    <span>Load Project</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
