import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import {
  Gauge,
  Wrench,
  Search,
  FileText,
  AlertTriangle,
  FileSpreadsheet,
  UserCog,
  Clock,
  XCircle,
  Timer,
  FileBarChart,
  Activity,
  HeartPulse,
  ScanBarcode,
  ClipboardCheck,
  Factory,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DemoBanner } from './DemoBanner'

const SIDEBAR_KEY = 'ask-sidebar-collapsed'

const navigation = [
  { name: 'Plant Overview', href: '/plant-overview', icon: Factory },
  { name: 'Line Dashboard', href: '/line-dashboard', icon: Activity },
  { name: 'Part Loading', href: '/part-loading', icon: ScanBarcode },
  { name: 'Final Inspection', href: '/final-inspection', icon: ClipboardCheck },
  { name: 'Operator Assignment', href: '/operator-assignment', icon: UserCog },
  { name: 'Production MIS', href: '/mis', icon: FileSpreadsheet },
  { name: 'Hourly Planning', href: '/hourly-planning', icon: Clock },
  { name: 'Hourly Report', href: '/hourly-report', icon: FileBarChart },
  { name: 'OEE', href: '/oee', icon: Gauge },
  { name: 'Quality Skips', href: '/quality-skips', icon: AlertTriangle },
  { name: 'Record Rejects', href: '/record-rejects', icon: XCircle },
  { name: 'Downtime Recording', href: '/downtime-recording', icon: Timer },
  { name: 'Tool Management', href: '/tools', icon: Wrench },
  { name: 'Tool Life', href: '/tool-life-dashboard', icon: HeartPulse },
  { name: 'Traceability', href: '/traceability', icon: Search },
  { name: 'Reports', href: '/reports', icon: FileText },
]

export function Layout() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, String(collapsed))
    } catch {
      // ignore
    }
  }, [collapsed])

  const handleReset = () => {
    if (confirm('Reset all demo data? This will clear everything and re-seed defaults.')) {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('ask-demo:'))
      keys.forEach(k => localStorage.removeItem(k))
      localStorage.removeItem('ask-demo:seeded')
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <DemoBanner />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center px-4">
          <div className="flex items-center gap-4">
            <Link to="/plant-overview" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">ASK</span>
              </div>
              <span className="font-semibold text-lg hidden md:inline">Production System</span>
            </Link>
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-300">
              DEMO
            </span>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            'hidden md:flex flex-col border-r bg-background transition-all duration-200',
            collapsed ? 'w-16' : 'w-64'
          )}
        >
          <nav className="flex-1 space-y-1 p-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  title={item.name}
                  className={cn(
                    'flex items-center rounded-lg text-sm font-medium transition-colors',
                    collapsed ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              )
            })}
          </nav>

          {/* Collapse toggle + reset + version */}
          <div className="border-t p-2 space-y-1">
            <button
              onClick={handleReset}
              className="flex w-full items-center rounded-lg px-2 py-2 text-destructive hover:bg-destructive/10 transition-colors"
              title="Reset demo data"
            >
              <RotateCcw className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="ml-2 text-xs">Reset Data</span>}
            </button>
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="flex w-full items-center justify-center rounded-lg px-2 py-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              {!collapsed && <span className="ml-2 text-xs">Collapse</span>}
            </button>
            {!collapsed && (
              <p className="text-xs text-muted-foreground mt-2 px-2">
                ASK Production v1.0.0 (Demo)
              </p>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background">
        <div className="flex justify-around py-2">
          {navigation.slice(0, 5).map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 p-2 text-xs',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
