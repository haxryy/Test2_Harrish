# VaultAuth - Blockchain-Based Two-Factor Authentication

VaultAuth is a decentralized two-factor authentication system built on Ethereum that provides secure, time-based one-time password (TOTP) authentication using smart contracts. The system combines blockchain security with traditional 2FA mechanisms to create a tamper-proof authentication solution.

## Table of Contents

- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Smart Contract Deployment](#smart-contract-deployment)
- [Frontend Setup](#frontend-setup)
- [Testing](#testing)
- [Usage](#usage)
- [Security Considerations](#security-considerations)
- [Contributing](#contributing)

## Project Structure

```
vaultauth/
├── contracts/                 # Smart contract code
│   ├── src/
│   │   └── 2FA.sol           # Main TWOFA smart contract
│   ├── script/               # Deployment scripts
│   ├── test/                 # Smart contract tests
│   └── foundry.toml          # Foundry configuration
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── pages/           # Application pages
│   │   ├── hooks/           # Custom React hooks
│   │   ├── utils/           # Utility functions
│   │   └── context/         # React context providers
│   ├── package.json         # Frontend dependencies
│   └── vite.config.js       # Vite configuration
├── scripts/                 # Additional scripts
│   └── otp_generator.py     # Python OTP generator
├── README.md               # This file
└── DOCUMENTATION.md        # Detailed technical documentation
```

## Prerequisites

Before setting up VaultAuth, ensure you have the following installed:

### Required Tools

1. **Node.js** (v18 or higher)
   ```bash
   # Check version
   node --version
   ```

2. **Foundry** (for smart contract development)
   ```bash
   # Install Foundry
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

3. **Git**
   ```bash
   # Check version
   git --version
   ```

4. **MetaMask** browser extension for wallet connectivity

### Optional Tools

1. **Python 3.8+** (for running the OTP generator script)
2. **VS Code** with Solidity extension for development

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd vaultauth
```

### 2. Install Smart Contract Dependencies

```bash
cd contracts
forge install
```

### 3. Install Frontend Dependencies

```bash
cd frntend
npm install
```


## Quick Start

### 1. Start Local Blockchain (Optional)

For local testing, start a local Ethereum node:

```bash
cd contracts
anvil
```

### 2. Deploy Smart Contract

For Sepolia testnet deployment:

```bash
cd contracts
forge script script/DeployTWOFA.s.sol --rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KEY --broadcast
```

For local deployment:

```bash
cd contracts
forge script script/DeployTWOFA.s.sol --rpc-url http://localhost:8545 --private-key <anvil-private-key> --broadcast
```

### 3. Update Frontend Configuration

After deployment, update the contract address in the frontend:

```javascript
// frontend/src/utils/contract.js
export const CONTRACT_ADDRESS = 'YOUR_DEPLOYED_CONTRACT_ADDRESS'
```

### 4. Start Frontend Application

```bash
cd frntend
npm run dev
```

The application will be available at `http://localhost:5173`

## Smart Contract Deployment

### Environment Setup

Create a `.env` file in the contracts directory:

```bash
# contracts/.env
SEPOLIA_RPC_URL=https://api.zan.top/eth-sepolia
PRIVATE_KEY=your_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### Deployment Commands

#### Deploy to Sepolia Testnet

```bash
cd contracts
source .env
forge script script/DeployTWOFA.s.sol --rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KEY --broadcast --verify
```

#### Deploy to Local Network

```bash
cd contracts
forge script script/DeployTWOFA.s.sol --rpc-url http://localhost:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast
```

#### Verify Contract (Sepolia only)

```bash
forge verify-contract --chain-id 11155111 --num-of-optimizations 200 --watch --constructor-args $(cast abi-encode "constructor()") <CONTRACT_ADDRESS> src/2FA.sol:TWOFA --etherscan-api-key $ETHERSCAN_API_KEY
```

## Frontend Setup

### Configuration

1. **Install Dependencies**
   ```bash
   cd frntend
   npm install
   ```

2. **Update Contract Configuration**
   Edit `frontend/src/utils/contract.js` with your deployed contract address:
   ```javascript
   export const CONTRACT_ADDRESS = 'YOUR_CONTRACT_ADDRESS'
   ```

3. **Configure Network**
   The frontend is configured for Sepolia testnet by default. To change networks, update the chain configuration in `frontend/src/utils/contract.js`.

### Development Server

```bash
cd frntend
npm run dev
```

### Build for Production

```bash
cd frntend
npm run build
npm run preview
```

## Testing

### Smart Contract Tests

#### Run All Tests

```bash
cd contracts
forge test
```

#### Run Specific Test

```bash
cd contracts
forge test --match-test testUserRegistration
```

#### Run Tests with Verbosity

```bash
cd contracts
forge test -vvv
```

#### Generate Coverage Report

```bash
cd contracts
forge coverage
```

### Test Categories

1. **Registration Tests**
   - User registration functionality
   - Username uniqueness validation
   - Input validation

2. **Authentication Tests**
   - OTP generation and validation
   - Timestamp validation
   - Replay attack prevention

3. **Security Tests**
   - Reentrancy protection
   - Access control
   - Edge cases

4. **Integration Tests**
   - End-to-end authentication flow
   - Error handling

### Frontend Testing

Run frontend tests (if implemented):

```bash
cd frntend
npm run test
```

## Usage

### 1. Connect Wallet

1. Open the application in your browser
2. Ensure MetaMask is installed and connected to Sepolia testnet
3. Click "Connect Wallet" to connect your MetaMask account

### 2. Register for 2FA

1. Navigate to the Register page
2. Enter a unique username
3. Generate or enter a cryptographic seed
4. Submit the registration transaction
5. Wait for transaction confirmation

### 3. Authenticate

1. Navigate to the Authenticate page
2. View your current OTP (generated automatically)
3. Enter the 6-digit OTP in the input field
4. Submit the authentication transaction
5. Receive confirmation of successful authentication

### 4. OTP Generation

OTPs are generated using the formula:
```
OTP = keccak256(seed + timestamp) % 1,000,000
```

OTPs are valid for 5 minutes and cannot be reused.

## Security Considerations

### Important Security Notes

1. **Testnet Only**: This implementation is designed for educational and testing purposes on Sepolia testnet
2. **Public Seeds**: Seeds are stored on-chain and are publicly visible
3. **Not Production Ready**: This system should not be used for securing real-world applications or mainnet funds

### Security Features Implemented

1. **Replay Attack Prevention**: Used timestamps cannot be reused
2. **Time Window Validation**: OTPs expire after 5 minutes
3. **Reentrancy Protection**: Contract includes reentrancy guards
4. **Input Validation**: Comprehensive validation of all inputs

### Recommended Improvements for Production

1. Implement off-chain seed storage with encryption
2. Add multi-signature requirements for critical operations
3. Implement rate limiting for authentication attempts
4. Add comprehensive logging and monitoring
5. Conduct professional security audits

## Network Configuration

### Sepolia Testnet

- **Chain ID**: 11155111
- **RPC URL**: https://api.zan.top/eth-sepolia
- **Explorer**: https://sepolia.etherscan.io
- **Faucet**: https://sepoliafaucet.com

### Local Development

- **Chain ID**: 31337 (default Anvil)
- **RPC URL**: http://localhost:8545
- **Default Accounts**: Generated by Anvil

## Troubleshooting

### Common Issues

1. **Transaction Failures**
   - Ensure sufficient testnet ETH in wallet
   - Check network connection
   - Verify contract address is correct

2. **OTP Mismatch**
   - Ensure system time is synchronized
   - Verify timestamp calculation
   - Check for replay protection

3. **Frontend Connection Issues**
   - Confirm MetaMask is on correct network
   - Check contract address configuration
   - Verify RPC endpoint accessibility

### Error Messages

- `"User not registered"`: Complete registration first
- `"Timestamp too old"`: Generate a fresh OTP
- `"Replay/old timestamp"`: Cannot reuse timestamps
- `"Invalid OTP"`: Verify OTP calculation and timing




