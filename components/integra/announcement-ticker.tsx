"use client"

interface AnnouncementTickerProps {
  announcements: string[]
  onEdit: () => void
  canManage: boolean
}

export function AnnouncementTicker({ announcements, onEdit, canManage }: AnnouncementTickerProps) {
  const content = announcements.map((text, i) => (
    <span key={i} className="px-8">
      {text}
    </span>
  ))

  return (
    <div className="flex items-center bg-primary text-primary-foreground text-xl flex-shrink-0">
      <div className="flex-grow overflow-hidden whitespace-nowrap cursor-pointer group">
        <div className="animate-marquee inline-block py-3 group-hover:[animation-play-state:paused]">
          {content}
          {content}
        </div>
      </div>
      {canManage && (
        <button onClick={onEdit} className="px-4 py-3 hover:bg-primary/80" title="Edit Announcements">
          <i className="fas fa-bullhorn text-xl"></i>
        </button>
      )}
    </div>
  )
}
