import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { Link } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { useOTP } from '../hooks/useOTP'
import { 
  CONTRACT_ADDRESS, 
  CONTRACT_ABI, 
  generateOTP, 
  getCurrentTimestamp, 
  formatOTP, 
  checkNetwork, 
  switchToSepolia, 
  getEtherscanUrl,
  getUserData 
} from '../utils/contract'

const Authenticate = () => {
  const { account, signer, provider } = useWallet()
  const [otp, setOtp] = useState('')
  const [isRegistered, setIsRegistered] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingRegistration, setIsCheckingRegistration] = useState(false)
  const [txHash, setTxHash] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Use the OTP hook for managing blockchain timestamp and OTP generation
  const {
    currentOtp,
    currentTimestamp,
    countdown,
    isLoading: otpLoading,
    error: otpError,
    refreshOtp,
    userSeed
  } = useOTP(account, provider, isRegistered)

  // Check if user is registered using the contract's users mapping
  const checkUserRegistration = async () => {
    if (!account || !provider) return
    
    try {
      setIsCheckingRegistration(true)
      const userData = await getUserData(provider, account)
      setIsRegistered(userData.isRegistered)
      
    } catch (error) {
      console.error('Error checking registration:', error)
      setIsRegistered(false)
    } finally {
      setIsCheckingRegistration(false)
    }
  }

  // Handle authentication using blockchain timestamp
  const handleAuthenticate = async (e) => {
    e.preventDefault()
    
    if (!account) {
      setError('Please connect your wallet first')
      return
    }

    if (!isRegistered) {
      setError('You are not registered. Please register first.')
      return
    }

    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP')
      return
    }

    if (!currentTimestamp || !userSeed) {
      setError('Authentication data not ready. Please wait for OTP to generate.')
      return
    }

    try {
      setIsLoading(true)
      setError('')
      setSuccess('')
      setTxHash('')

      // Check if on Sepolia network
      const isCorrectNetwork = await checkNetwork(provider)
      if (!isCorrectNetwork) {
        await switchToSepolia()
        setError('Please switch to Sepolia network and try again')
        return
      }

      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer)
      
      // Use the same timestamp that was used to generate the current OTP
      console.log('Authenticating with timestamp:', currentTimestamp, 'and OTP:', otp)
      
      // Call authenticate function with the blockchain timestamp
      const tx = await contract.authenticate(parseInt(otp), currentTimestamp)
      setTxHash(tx.hash)
      
      // Wait for transaction confirmation
      const receipt = await tx.wait()
      
      if (receipt.status === 1) {
        // Parse events to check if authentication was successful
        const authEvent = receipt.logs.find(log => {
          try {
            const parsedLog = contract.interface.parseLog(log)
            return parsedLog.name === 'AuthenticationSuccess' || parsedLog.name === 'AuthenticationFailed'
          } catch {
            return false
          }
        })

        if (authEvent) {
          const parsedEvent = contract.interface.parseLog(authEvent)
          
          if (parsedEvent.name === 'AuthenticationSuccess') {
            setSuccess('Authentication successful! ✨')
            setOtp('')
          } else if (parsedEvent.name === 'AuthenticationFailed') {
            setError(`Authentication failed: ${parsedEvent.args.reason}`)
          }
        } else {
          setSuccess('Transaction completed successfully')
        }
      } else {
        setError('Transaction failed')
      }
    } catch (error) {
      console.error('Authentication error:', error)
      if (error.code === 'ACTION_REJECTED') {
        setError('Transaction was rejected by user')
      } else if (error.reason) {
        setError(`Authentication failed: ${error.reason}`)
      } else {
        setError('Authentication failed. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Check registration on mount and account change
  useEffect(() => {
    checkUserRegistration()
  }, [account, provider])

  // Display OTP error if any
  useEffect(() => {
    if (otpError) {
      setError(otpError)
    }
  }, [otpError])

  if (!account) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 text-center max-w-md">
          <svg className="w-16 h-16 text-purple-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m0 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h2 className="text-2xl font-bold text-white mb-2">Connect Wallet Required</h2>
          <p className="text-gray-400 mb-6">Please connect your MetaMask wallet to authenticate</p>
        </div>
      </div>
    )
  }

  if (isCheckingRegistration) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 text-center max-w-md">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-white mb-2">Checking Registration</h2>
          <p className="text-gray-400">Please wait while we verify your account...</p>
        </div>
      </div>
    )
  }

  if (!isRegistered) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 text-center max-w-md">
          <svg className="w-16 h-16 text-yellow-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 14.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h2 className="text-2xl font-bold text-white mb-2">Registration Required</h2>
          <p className="text-gray-400 mb-6">
            You need to register first before you can authenticate with VaultAuth
          </p>
          <Link
            to="/register"
            className="inline-block bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200"
          >
            Register Now
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Authenticate</h1>
            <p className="text-gray-400">Enter your 6-digit OTP to verify your identity</p>
          </div>

          {/* Current OTP Display */}
          {currentOtp && (
            <div className="mb-6 p-6 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-xl">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-white mb-2">Your Current OTP</h3>
                <div className="text-3xl font-mono font-bold text-purple-300 mb-2 tracking-widest">
                  {currentOtp}
                </div>
                <div className="text-xs text-gray-400 mb-3">
                  Blockchain Timestamp: {currentTimestamp}
                </div>
                <div className="flex items-center justify-center space-x-4 text-sm text-gray-400">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Refreshes in {countdown}s</span>
                  </div>
                  <button
                    onClick={refreshOtp}
                    disabled={otpLoading}
                    className="text-purple-400 hover:text-purple-300 disabled:opacity-50 flex items-center space-x-1"
                  >
                    <svg className={`w-4 h-4 ${otpLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Refresh</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleAuthenticate} className="space-y-6">
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-300 mb-2">
                One-Time Password (OTP)
              </label>
              <input
                type="text"
                id="otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white text-center text-2xl font-mono tracking-widest placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="000000"
                maxLength="6"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the 6-digit code generated for the current time
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-600/20 border border-red-500/30 rounded-lg">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-600/20 border border-green-500/30 rounded-lg">
                <p className="text-green-300 text-sm">{success}</p>
              </div>
            )}

            {txHash && (
              <div className="p-4 bg-blue-600/20 border border-blue-500/30 rounded-lg">
                <p className="text-blue-300 text-sm mb-2">Transaction submitted:</p>
                <a
                  href={getEtherscanUrl(txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-xs font-mono break-all underline"
                >
                  {txHash}
                </a>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || otp.length !== 6}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 text-white py-3 px-6 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Authenticate</span>
              )}
            </button>
          </form>

          <div className="mt-6 p-4 bg-blue-600/10 border border-blue-500/20 rounded-lg">
            <p className="text-blue-300 text-xs">
              <strong>Tip:</strong> Use the OTP displayed above, which is generated using the current blockchain timestamp.
              This ensures perfect synchronization with the smart contract. OTPs are valid for 5 minutes and cannot be reused.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Authenticate
