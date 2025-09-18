import { ethers } from 'ethers'

// Contract configuration
export const CONTRACT_ADDRESS = '0x8e00e4F3630363CC1e5D92B9B03CD20A2F2e32b5' // You'll provide this after deployment
export const SEPOLIA_CHAIN_ID = '0xaa36a7' // 11155111 in hex

// Contract ABI
export const CONTRACT_ABI = [
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "otp",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "timestamp",
				"type": "uint256"
			}
		],
		"name": "authenticate",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "userAddress",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "username",
				"type": "string"
			},
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "usedTimestamp",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "reason",
				"type": "string"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "when",
				"type": "uint256"
			}
		],
		"name": "AuthenticationFailed",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "userAddress",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "username",
				"type": "string"
			},
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "usedTimestamp",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "when",
				"type": "uint256"
			}
		],
		"name": "AuthenticationSuccess",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "username",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "seed",
				"type": "uint256"
			}
		],
		"name": "register",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "userAddress",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "username",
				"type": "string"
			},
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "ts",
				"type": "uint256"
			}
		],
		"name": "UserRegistered",
		"type": "event"
	},
	{
		"inputs": [],
		"name": "AUTH_ALLOWED_DRIFT",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "user",
				"type": "address"
			}
		],
		"name": "getUser",
		"outputs": [
			{
				"components": [
					{
						"internalType": "bool",
						"name": "isRegistered",
						"type": "bool"
					},
					{
						"internalType": "string",
						"name": "username",
						"type": "string"
					},
					{
						"internalType": "uint256",
						"name": "seed",
						"type": "uint256"
					},
					{
						"internalType": "uint256",
						"name": "lastUsedTimestamp",
						"type": "uint256"
					}
				],
				"internalType": "struct TWOFA.User",
				"name": "",
				"type": "tuple"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "username",
				"type": "string"
			}
		],
		"name": "isNameTaken",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "users",
		"outputs": [
			{
				"internalType": "bool",
				"name": "isRegistered",
				"type": "bool"
			},
			{
				"internalType": "string",
				"name": "username",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "seed",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "lastUsedTimestamp",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
]

// Get user data from contract
export const getUserData = async (provider, userAddress) => {
  try {
    if (!provider || !userAddress) {
      throw new Error('Provider and user address are required')
    }
    
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider)
    const userData = await contract.users(userAddress)
    
    return {
      isRegistered: userData.isRegistered,
      username: userData.username,
      seed: Number(userData.seed),
      lastUsedTimestamp: Number(userData.lastUsedTimestamp)
    }
  } catch (error) {
    console.error('Error fetching user data:', error)
    throw error
  }
}

// Generate OTP using the same algorithm as the contract
export const generateOTP = (seed, timestamp) => {
  // Convert to hex strings and pad to 32 bytes
  const seedHex = ethers.toBeHex(BigInt(seed), 32)
  const timestampHex = ethers.toBeHex(BigInt(timestamp), 32)

  
  
  // Concatenate and hash
  const data = seedHex + timestampHex.slice(2) // Remove '0x' from second hex string
  const hash = ethers.keccak256(data)
  
  // Convert to BigInt and get 6-digit OTP
  const hashBigInt = BigInt(hash)
  const otp = hashBigInt % 1000000n
console.log("seed is",seed);
  console.log("otp and timestamp is ", otp,timestamp)
  
  return Number(otp)
}

// Get current timestamp from blockchain
export const getCurrentTimestamp = async (provider) => {
  try {
    if (!provider) {
      throw new Error('Provider is required')
    }
    
    // Get the latest block to fetch blockchain timestamp
    const block = await provider.getBlock('latest')
    return Number(block.timestamp)
  } catch (error) {
    console.error('Error fetching blockchain timestamp:', error)
    // Fallback to local timestamp if blockchain call fails
    return Math.floor(Date.now() / 1000)
  }
}

// Format OTP to 6 digits with leading zeros
export const formatOTP = (otp) => {
  return otp.toString().padStart(6, '0')
}

// Get Etherscan URL for transaction
export const getEtherscanUrl = (txHash) => {
  return `https://sepolia.etherscan.io/tx/${txHash}`
}

// Check if user is on Sepolia network
export const checkNetwork = async (provider) => {
  const network = await provider.getNetwork()
  return network.chainId === 11155111n // Sepolia chain ID
}

// Switch to Sepolia network
export const switchToSepolia = async () => {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: SEPOLIA_CHAIN_ID }],
    })
  } catch (switchError) {
    // This error code indicates that the chain has not been added to MetaMask
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: SEPOLIA_CHAIN_ID,
              chainName: 'Sepolia test network',
              rpcUrls: ['https://api.zan.top/eth-sepolia'],
              blockExplorerUrls: ['https://sepolia.etherscan.io'],
            },
          ],
        })
      } catch (addError) {
        console.error('Error adding Sepolia network:', addError)
      }
    }
    console.error('Error switching to Sepolia:', switchError)
  }
}
