import { Link } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'

const Navbar = () => {
  const { account, connectWallet, disconnectWallet, isConnecting } = useWallet()

  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <nav className="bg-black bg-opacity-20 backdrop-blur-lg border-b border-purple-500/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-white">VaultAuth</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              to="/" 
              className="text-gray-300 hover:text-white transition-colors duration-200 font-medium"
            >
              Home
            </Link>
            <Link 
              to="/register" 
              className="text-gray-300 hover:text-white transition-colors duration-200 font-medium"
            >
              Register
            </Link>
            <Link 
              to="/authenticate" 
              className="text-gray-300 hover:text-white transition-colors duration-200 font-medium"
            >
              Authenticate
            </Link>
          </div>

          {/* Wallet Connection */}
          <div className="flex items-center space-x-4">
            {account ? (
              <div className="flex items-center space-x-3">
                <div className="hidden sm:flex items-center space-x-2 bg-purple-600/20 px-3 py-2 rounded-lg border border-purple-500/30">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-white font-mono">{formatAddress(account)}</span>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="bg-red-600/20 hover:bg-red-600/30 text-red-300 px-4 py-2 rounded-lg border border-red-500/30 transition-all duration-200"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
              >
                {isConnecting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m0 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>Connect Wallet</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-purple-500/20">
        <div className="px-4 py-3 space-y-1">
          <Link 
            to="/" 
            className="block px-3 py-2 text-gray-300 hover:text-white hover:bg-purple-600/20 rounded-lg transition-all duration-200"
          >
            Home
          </Link>
          <Link 
            to="/register" 
            className="block px-3 py-2 text-gray-300 hover:text-white hover:bg-purple-600/20 rounded-lg transition-all duration-200"
          >
            Register
          </Link>
          <Link 
            to="/authenticate" 
            className="block px-3 py-2 text-gray-300 hover:text-white hover:bg-purple-600/20 rounded-lg transition-all duration-200"
          >
            Authenticate
          </Link>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
