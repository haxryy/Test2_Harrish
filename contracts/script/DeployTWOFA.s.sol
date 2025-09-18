// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/2FA.sol";

contract DeployTWOFA is Script {
    function run() external {
        // Get the private key from environment variable
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy the TWOFA contract
        TWOFA twoFA = new TWOFA();
        
        // Log the deployed contract address
        console.log("TWOFA contract deployed at:", address(twoFA));
        console.log("AUTH_ALLOWED_DRIFT:", twoFA.AUTH_ALLOWED_DRIFT());
        
        // Stop broadcasting
        vm.stopBroadcast();
        
        // Save deployment info to file (optional)
        string memory deploymentInfo = string(
            abi.encodePacked(
                "TWOFA Contract Deployment\n",
                "========================\n",
                "Contract Address: ", vm.toString(address(twoFA)), "\n",
                "Deployer: ", vm.toString(vm.addr(deployerPrivateKey)), "\n",
                "Block Number: ", vm.toString(block.number), "\n",
                "Timestamp: ", vm.toString(block.timestamp), "\n",
                "AUTH_ALLOWED_DRIFT: ", vm.toString(twoFA.AUTH_ALLOWED_DRIFT()), " seconds\n"
            )
        );
        
        vm.writeFile("./deployment.log", deploymentInfo);
        console.log("Deployment information saved to deployment.log");
    }
}

contract DeployTWOFALocal is Script {
    function run() external {
        // For local deployment (anvil), use a default private key
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        
        vm.startBroadcast(deployerPrivateKey);
        
        TWOFA twoFA = new TWOFA();
        
        console.log("TWOFA contract deployed locally at:", address(twoFA));
        console.log("Deployer address:", vm.addr(deployerPrivateKey));
        
        vm.stopBroadcast();
    }
}
