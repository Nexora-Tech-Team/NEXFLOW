import React, { createContext, useState, useCallback } from 'react'

interface Notification {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
}

interface NotifContextType {
  notifications: Notification[]
  taskBadge: number
  showNotif: (type: Notification['type'], message: string) => void
  dismissNotif: (id: string) => void
  setTaskBadge: (count: number) => void
}

export const NotifContext = createContext<NotifContextType>({
  notifications: [],
  taskBadge: 0,
  showNotif: () => {},
  dismissNotif: () => {},
  setTaskBadge: () => {},
})

let notifCounter = 0

export function NotifProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [taskBadge, setTaskBadge] = useState(0)

  const showNotif = useCallback((type: Notification['type'], message: string) => {
    const id = `notif_${++notifCounter}`
    setNotifications(prev => [...prev, { id, type, message }])
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 4000)
  }, [])

  const dismissNotif = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  return (
    <NotifContext.Provider value={{ notifications, taskBadge, showNotif, dismissNotif, setTaskBadge }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {notifications.map(notif => (
          <div
            key={notif.id}
            className={`flex items-start gap-3 p-4 rounded-lg shadow-lg border text-sm animate-fadeIn
              ${notif.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : ''}
              ${notif.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : ''}
              ${notif.type === 'info' ? 'bg-blue-50 border-blue-200 text-blue-800' : ''}
              ${notif.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : ''}
            `}
          >
            <span className="flex-1">{notif.message}</span>
            <button
              onClick={() => dismissNotif(notif.id)}
              className="text-current opacity-60 hover:opacity-100"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </NotifContext.Provider>
  )
}
