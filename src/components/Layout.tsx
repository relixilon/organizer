import { Link, Outlet } from 'react-router-dom'

export function Layout() {
  return (
    <div className="layout">
      <header className="layout__header">
        <h1>Habit Tracker</h1>
        <nav className="layout__nav">
          <Link to="/">Dashboard</Link>
          <Link to="/habits">Habits</Link>
          <Link to="/add">Add habit</Link>
        </nav>
      </header>
      <main className="layout__main">
        <Outlet />
      </main>
    </div>
  )
}
