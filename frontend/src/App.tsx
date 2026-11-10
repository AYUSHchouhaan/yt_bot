import { Route, Routes } from 'react-router-dom'

function Placeholder() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">yt_bot</h1>
        <p className="mt-2 text-zinc-400">
          Frontend shell is ready. Routes arrive in later steps.
        </p>
      </div>
    </main>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="*" element={<Placeholder />} />
    </Routes>
  )
}
