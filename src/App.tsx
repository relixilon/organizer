import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Habits } from './pages/Habits'
import { AddHabit } from './pages/AddHabit'
import './App.css'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/habits" element={<Habits />} />
        <Route path="/add" element={<AddHabit />} />
      </Route>
    </Routes>
  )
}
