import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { WalletProvider } from './context/WalletContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Register from './pages/Register'
import Authenticate from './pages/Authenticate'

function App() {
  return (
    <WalletProvider>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/register" element={<Register />} />
            <Route path="/authenticate" element={<Authenticate />} />
          </Routes>
        </div>
      </Router>
    </WalletProvider>
  )
}

export default App
