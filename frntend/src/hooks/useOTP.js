import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import { CONTRACT_ADDRESS, CONTRACT_ABI, generateOTP, getCurrentTimestamp, formatOTP, getUserData } from '../utils/contract'

export const useOTP = (account, provider, isRegistered) => {
  const [currentOtp, setCurrentOtp] = useState('')
  const [currentTimestamp, setCurrentTimestamp] = useState(null)
  const [userSeed, setUserSeed] = useState(null)
  const [countdown, setCountdown] = useState(30)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Fetch user's seed from the contract's public users mapping
  const fetchUserSeed = useCallback(async () => {
    if (!account || !provider || !isRegistered) return

    try {
      setIsLoading(true)
      setError('')
      
      const userData = await getUserData(provider, account)
      
      if (userData.isRegistered) {
        setUserSeed(userData.seed)
        console.log('Fetched seed from contract for user:', account, 'seed:', userData.seed)
      } else {
        setError('User not found in contract')
      }
      
    } catch (error) {
      console.error('Error fetching user seed from contract:', error)
      setError('Failed to fetch user authentication data from contract')
    } finally {
      setIsLoading(false)
    }
  }, [account, provider, isRegistered])

  // Initialize user seed when account changes
  useEffect(() => {
    if (account && isRegistered) {
      fetchUserSeed()
    }
  }, [account, isRegistered, fetchUserSeed])

  // Generate OTP using blockchain timestamp
  const generateCurrentOtp = useCallback(async () => {
    if (!account || !provider || !isRegistered || !userSeed) return

    try {
      setIsLoading(true)
      setError('')
      
      // Get current blockchain timestamp
      const timestamp = await getCurrentTimestamp(provider)
      setCurrentTimestamp(timestamp)
      
      // Generate OTP using the blockchain timestamp
      const otp = generateOTP(userSeed, timestamp)
      const formattedOtp = formatOTP(otp)
      setCurrentOtp(formattedOtp)
      
      console.log('Generated OTP:', formattedOtp, 'for timestamp:', timestamp)
      
    } catch (error) {
      console.error('Error generating OTP:', error)
      setError('Failed to generate OTP')
    } finally {
      setIsLoading(false)
    }
  }, [account, provider, isRegistered, userSeed])

  // Refresh OTP with new blockchain timestamp
  const refreshOtp = useCallback(async () => {
    await generateCurrentOtp()
    setCountdown(30)
  }, [generateCurrentOtp])

  // Auto-refresh OTP every 30 seconds
  useEffect(() => {
    if (isRegistered && userSeed) {
      generateCurrentOtp()
      
      const interval = setInterval(() => {
        generateCurrentOtp()
        setCountdown(30)
      }, 30000)

      const countdownInterval = setInterval(() => {
        setCountdown(prev => prev > 0 ? prev - 1 : 30)
      }, 1000)

      return () => {
        clearInterval(interval)
        clearInterval(countdownInterval)
      }
    }
  }, [isRegistered, userSeed, generateCurrentOtp])

  return {
    currentOtp,
    currentTimestamp,
    countdown,
    isLoading,
    error,
    refreshOtp,
    userSeed,
    fetchUserSeed
  }
}
