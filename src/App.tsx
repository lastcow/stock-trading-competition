import { Routes, Route } from 'react-router'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import AdminEntry from './pages/AdminEntry'
import AdminParticipants from './pages/AdminParticipants'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/admin/entry" element={<AdminEntry />} />
        <Route path="/admin/participants" element={<AdminParticipants />} />
      </Routes>
    </Layout>
  )
}
