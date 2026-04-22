import { Routes, Route } from 'react-router'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import AdminEntry from './pages/AdminEntry'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/admin/entry" element={<AdminEntry />} />
      </Routes>
    </Layout>
  )
}
