import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { useWallet } from '../context/WalletContext'
import { CONTRACT_ADDRESS, CONTRACT_ABI, checkNetwork, switchToSepolia, getEtherscanUrl } from '../utils/contract'

const Register = () => {
  const { account, signer, provider } = useWallet()
  const [username, setUsername] = useState('')
  const [seed, setSeed] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingUsername, setIsCheckingUsername] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState(null)
  const [txHash, setTxHash] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Check username availability
  const checkUsername = async (usernameToCheck) => {
    if (!usernameToCheck || !provider) return
    
    try {
      setIsCheckingUsername(true)
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider)
      const isTaken = await contract.isNameTaken(usernameToCheck)
      setUsernameAvailable(!isTaken)
    } catch (error) {
      console.error('Error checking username:', error)
      setUsernameAvailable(null)
    } finally {
      setIsCheckingUsername(false)
    }
  }

  // Generate random seed
  const generateRandomSeed = () => {
    const randomSeed = Math.floor(Math.random() * 1000000000000).toString()
    setSeed(randomSeed)
  }

  // Auto-generate seed when account changes
  useEffect(() => {
    if (account) {
      generateRandomSeed()
    }
  }, [account])

  // Handle username change with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (username.length > 0) {
        checkUsername(username)
      } else {
        setUsernameAvailable(null)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [username, provider])

  const handleRegister = async (e) => {
    e.preventDefault()
    
    if (!account) {
      setError('Please connect your wallet first')
      return
    }

    if (!username || !seed) {
      setError('Please fill in all fields')
      return
    }

    if (usernameAvailable === false) {
      setError('Username is already taken')
      return
    }

    if (parseInt(seed) === 0) {
      setError('Seed cannot be zero')
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
      
      // Call register function
      const tx = await contract.register(username, seed)
      setTxHash(tx.hash)
      
      // Wait for transaction confirmation
      const receipt = await tx.wait()
      
      if (receipt.status === 1) {
        setSuccess('Registration successful! You can now authenticate with your credentials.')
        setUsername('')
        setSeed('')
        setUsernameAvailable(null)
        
        // Parse events to show registration details
        const userRegisteredEvent = receipt.logs.find(log => {
          try {
            const parsedLog = contract.interface.parseLog(log)
            return parsedLog.name === 'UserRegistered'
          } catch {
            return false
          }
        })

        if (userRegisteredEvent) {
          const parsedEvent = contract.interface.parseLog(userRegisteredEvent)
          console.log('Registration Event:', {
            userAddress: parsedEvent.args.userAddress,
            username: parsedEvent.args.username,
            timestamp: parsedEvent.args.ts.toString()
          })
        }
      } else {
        setError('Transaction failed')
      }
    } catch (error) {
      console.error('Registration error:', error)
      if (error.code === 'ACTION_REJECTED') {
        setError('Transaction was rejected by user')
      } else if (error.reason) {
        setError(`Registration failed: ${error.reason}`)
      } else {
        setError('Registration failed. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const getUsernameStatus = () => {
    if (isCheckingUsername) {
      return (
        <div className="flex items-center space-x-2 text-gray-400">
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Checking...</span>
        </div>
      )
    }
    
    if (usernameAvailable === true) {
      return (
        <div className="flex items-center space-x-2 text-green-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Username available</span>
        </div>
      )
    }
    
    if (usernameAvailable === false) {
      return (
        <div className="flex items-center space-x-2 text-red-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>Username taken</span>
        </div>
      )
    }
    
    return null
  }

  if (!account) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 text-center max-w-md">
          <svg className="w-16 h-16 text-purple-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m0 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h2 className="text-2xl font-bold text-white mb-2">Connect Wallet Required</h2>
          <p className="text-gray-400 mb-6">Please connect your MetaMask wallet to register for VaultAuth</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Register</h1>
            <p className="text-gray-400">Create your VaultAuth account</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter username"
                required
              />
              {username && getUsernameStatus()}
            </div>

            <div>
              <label htmlFor="seed" className="block text-sm font-medium text-gray-300 mb-2">
                Seed (Cryptographic Key)
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="seed"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  className="w-full px-4 py-3 pr-12 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter numeric seed"
                  required
                />
                <button
                  type="button"
                  onClick={generateRandomSeed}
                  className="absolute right-2 top-2 p-2 text-gray-400 hover:text-white transition-colors"
                  title="Generate random seed"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                ⚠️ Seed will be stored on-chain and publicly visible. Use only for testing.
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
              disabled={isLoading || !usernameAvailable}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 text-white py-3 px-6 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Registering...</span>
                </>
              ) : (
                <span>Register</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Register
