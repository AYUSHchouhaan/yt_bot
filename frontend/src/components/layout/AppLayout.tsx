import { Outlet } from 'react-router-dom'

import Navbar from './Navbar'

export default function AppLayout() {
  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
      <Navbar />
      <div className="relative min-h-0 flex-1">
        <Outlet />
      </div>
    </div>
  )
}
