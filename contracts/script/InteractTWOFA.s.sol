// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/2FA.sol";

contract InteractTWOFA is Script {
    TWOFA public twoFA;
    
    function run() external {
        // Get environment variables
        uint256 userPrivateKey = vm.envUint("PRIVATE_KEY");
        address contractAddress = vm.envAddress("CONTRACT_ADDRESS");
        
        // Connect to the deployed contract
        twoFA = TWOFA(contractAddress);
        
        vm.startBroadcast(userPrivateKey);
        
        address userAddress = vm.addr(userPrivateKey);
        console.log("Interacting with TWOFA contract at:", contractAddress);
        console.log("User address:", userAddress);
        
        // Demo interaction flow
        demoFullFlow(userAddress);
        
        vm.stopBroadcast();
    }
    
    function demoFullFlow(address userAddress) internal {
        console.log("\n=== TWOFA Demo Flow ===");
        
        // 1. Check if username is available
        string memory username = "demo_user";
        uint256 seed = 123456789;
        
        bool isTaken = twoFA.isNameTaken(username);
        console.log("Username 'demo_user' taken:", isTaken);
        
        if (isTaken) {
            console.log("Username already taken, trying alternative...");
            username = string(abi.encodePacked("user_", vm.toString(block.timestamp)));
        }
        
        try twoFA.register(username, seed) {
            console.log("Successfully registered user:", username);
            console.log("Seed:", seed);
            console.log("WARNING: Seed is stored on-chain and publicly visible!");
        } catch Error(string memory reason) {
            console.log("Registration failed:", reason);
            return;
        }
        
        // 2. Generate and display OTP for current timestamp
        uint256 currentTimestamp = block.timestamp;
        console.log("\nCurrent timestamp:", currentTimestamp);
        
        try twoFA.viewExpectedOtp(userAddress, currentTimestamp) returns (uint256 otp) {
            console.log("Expected OTP for current timestamp:", otp);
            
            // 3. Authenticate with the generated OTP
            console.log("\nAttempting authentication...");
            bool authResult = twoFA.authenticate(otp, currentTimestamp);
            console.log("Authentication result:", authResult);
            
            if (authResult) {
                console.log("Authentication successful!");
                
                // 4. Try to authenticate again with same timestamp (should fail - replay protection)
                console.log("\nTrying replay attack...");
                bool replayResult = twoFA.authenticate(otp, currentTimestamp);
                console.log("Replay attack result:", replayResult);
                console.log(" Replay protection working!");
                
                // 5. Authenticate with new timestamp
                uint256 newTimestamp = currentTimestamp + 30;
                uint256 newOtp = twoFA.viewExpectedOtp(userAddress, newTimestamp);
                console.log("\nNew timestamp:", newTimestamp);
                console.log("New OTP:", newOtp);
                
                // Simulate time passing
                vm.warp(newTimestamp);
                bool newAuthResult = twoFA.authenticate(newOtp, newTimestamp);
                console.log("New authentication result:", newAuthResult);
                
            } else {
                console.log(" Authentication failed!");
            }
        } catch Error(string memory reason) {
            console.log("Failed to get expected OTP:", reason);
        }
    }
}

contract InteractTWOFALocal is Script {
    TWOFA public twoFA;
    
    function run() external {
        // For local testing with known contract address
        address contractAddress = vm.envOr("CONTRACT_ADDRESS", address(0));
        require(contractAddress != address(0), "CONTRACT_ADDRESS not set");
        
        uint256 userPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        
        twoFA = TWOFA(contractAddress);
        
        vm.startBroadcast(userPrivateKey);
        
        address userAddress = vm.addr(userPrivateKey);
        console.log("Local interaction with TWOFA at:", contractAddress);
        
        // Run multiple user scenarios
        demoMultipleUsers();
        
        vm.stopBroadcast();
    }
    
    function demoMultipleUsers() internal {
        console.log("\n=== Multiple Users Demo ===");
        
        // User 1
        registerAndAuthUser("alice", 111111, 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80);
        
        // User 2
        registerAndAuthUser("bob", 222222, 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d);
        
        // User 3
        registerAndAuthUser("charlie", 333333, 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a);
    }
    
    function registerAndAuthUser(string memory username, uint256 seed, uint256 privateKey) internal {
        console.log("\n--- User:", username, "---");
        
        vm.stopBroadcast();
        vm.startBroadcast(privateKey);
        
        address userAddr = vm.addr(privateKey);
        
        try twoFA.register(username, seed) {
            console.log("Registered:", username);
            
            uint256 timestamp = block.timestamp;
            uint256 otp = twoFA.viewExpectedOtp(userAddr, timestamp);
            console.log("OTP:", otp);
            
            bool result = twoFA.authenticate(otp, timestamp);
            console.log("Auth success:", result);
        } catch Error(string memory reason) {
            console.log("Failed for", username, ":", reason);
        }
    }
}

contract GenerateOTP is Script {
    function run() external view {
        address contractAddress = vm.envAddress("CONTRACT_ADDRESS");
        address userAddress = vm.envAddress("USER_ADDRESS");
        
        TWOFA twoFA = TWOFA(contractAddress);
        
        uint256 currentTimestamp = block.timestamp;
        console.log("Current timestamp:", currentTimestamp);
        
        try twoFA.viewExpectedOtp(userAddress, currentTimestamp) returns (uint256 otp) {
            console.log("Current OTP for user", userAddress, ":", otp);
            
            // Show OTPs for next few time windows (useful for testing)
            console.log("\nUpcoming OTPs:");
            for (uint i = 1; i <= 5; i++) {
                uint256 futureTimestamp = currentTimestamp + (i * 30);
                uint256 futureOtp = twoFA.viewExpectedOtp(userAddress, futureTimestamp);
                console.log("Timestamp", futureTimestamp, "OTP:", futureOtp);
            }
        } catch Error(string memory reason) {
            console.log("Error:", reason);
        }
    }
}

contract CheckUserStatus is Script {
    function run() external view {
        address contractAddress = vm.envAddress("CONTRACT_ADDRESS");
        string memory username = vm.envString("USERNAME");
        
        TWOFA twoFA = TWOFA(contractAddress);
        
        console.log("Checking status for username:", username);
        console.log("Username taken:", twoFA.isNameTaken(username));
        console.log("Auth allowed drift:", twoFA.AUTH_ALLOWED_DRIFT(), "seconds");
    }
}
