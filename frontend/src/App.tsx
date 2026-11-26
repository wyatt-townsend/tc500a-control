import { Route, Routes } from 'react-router'
import ThermostatsPage from '@/pages/ThermostatsPage'
import SchedulePage from '@/pages/SchedulePage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<ThermostatsPage />} />
      <Route path="/thermostats/:id/schedule" element={<SchedulePage />} />
    </Routes>
  )
}

export default App
