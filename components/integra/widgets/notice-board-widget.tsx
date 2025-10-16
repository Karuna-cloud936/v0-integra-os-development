"use client"

import type { Notice } from "@/lib/integra-state"

interface NoticeBoardWidgetProps {
  iconColor: string
  notices: Notice[]
  onNoticeClick: (notice: Notice) => void
  onManageClick?: () => void
  canManage?: boolean
}

export function NoticeBoardWidget({
  iconColor,
  notices,
  onNoticeClick,
  onManageClick,
  canManage,
}: NoticeBoardWidgetProps) {
  const pinnedNotices = notices.filter((n) => n.pinned).slice(0, 4)

  return (
    <div className="widget-container p-0 overflow-hidden h-full flex flex-col">
      <div className="flex items-center justify-between gap-2 p-4 bg-muted flex-shrink-0">
        <div className="flex items-center gap-2">
          <i className={`fas fa-thumbtack ${iconColor}`}></i>
          <span className="font-semibold">Notice Board</span>
        </div>
        {canManage && onManageClick && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onManageClick()
            }}
            className="touch-target touch-feedback p-2 hover:bg-primary/10 rounded-lg transition-colors text-muted-foreground hover:text-primary"
            title="Manage notices"
          >
            <i className="fas fa-cog text-lg"></i>
          </button>
        )}
      </div>
      <div className="bg-[#D2B48C] bg-[url('data:image/svg+xml,%3Csvg width=40 height=40 viewBox=0 0 40 40 xmlns=http://www.w3.org/2000/svg%3E%3Cg fill=%239C6E3C fillOpacity=0.2 fillRule=evenodd%3E%3Cpath d=M0 40L40 0H20L0 20M40 40V20L20 40/%3E%3C/g%3E%3C/svg%3E')] p-4 flex-1 grid grid-cols-2 gap-4 overflow-y-auto">
        {pinnedNotices.length === 0 ? (
          <div className="col-span-2 flex items-center justify-center text-center text-muted-foreground p-4">
            <div>
              <i className="fas fa-thumbtack text-4xl mb-2 block opacity-50"></i>
              <p className="text-sm">No pinned notices</p>
              {canManage && <p className="text-xs mt-1">Click the settings icon to add notices</p>}
            </div>
          </div>
        ) : (
          pinnedNotices.map((notice, index) => (
            <div
              key={notice.id}
              onClick={() => onNoticeClick(notice)}
              className={`cursor-pointer bg-yellow-100 text-black shadow-lg p-4 relative transition-all hover:scale-105 hover:rotate-0 hover:z-10 ${
                index % 2 === 0 ? "rotate-[-2deg]" : "rotate-[2deg]"
              } ${index % 3 === 0 ? "rotate-[-3deg]" : ""}`}
            >
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-destructive rounded-full shadow-md border-2 border-white"></div>
              <p className="mt-4 text-center font-semibold text-sm leading-tight">{notice.title}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
