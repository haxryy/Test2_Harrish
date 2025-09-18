// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title OnChainOTP - simple on-chain OTP auth with seed stored on-chain
/// @notice WARNING: Storing seeds on-chain is public. This contract follows user request but is NOT safe for storing secrets on public chains.
contract TWOFA {
    struct User {
        bool isRegistered;
        string username;
        uint256 seed;            // stored on-chain (public)
        uint256 lastUsedTimestamp; // last successful timestamp used (replay protection)
    }

    mapping(address => User) public users;   // address -> User
    mapping(string => bool) private names;    // username -> exists (uniqueness)

    // Non-reentrancy guard (simple)
    uint256 private _locked = 1;
    modifier nonReentrant() {
        require(_locked == 1, "Reentrant call");
        _locked = 2;
        _;
        _locked = 1;
    }

    // Events
    event UserRegistered(address indexed userAddress, string username, uint256 indexed ts);
    event AuthenticationSuccess(address indexed userAddress, string username, uint256 indexed usedTimestamp, uint256 when);
    event AuthenticationFailed(address indexed userAddress, string username, uint256 indexed usedTimestamp, string reason, uint256 when);

    uint256 public constant AUTH_ALLOWED_DRIFT = 300;  // 5 minutes = 300 seconds

    /// @notice Register caller with a username and seed
    /// @param username chosen username (must be unique)
    /// @param seed user's otp seed (uint256). WARNING: this will be stored on-chain (public).
    function register(string calldata username, uint256 seed) external nonReentrant {
        require(!users[msg.sender].isRegistered, "Already registered");
        require(bytes(username).length > 0, "Username empty");
        require(!names[username], "Username taken");
        require(seed != 0, "Seed cannot be zero");

        // store user
        users[msg.sender] = User({
            isRegistered: true,
            username: username,
            seed: seed,
            lastUsedTimestamp: 0
        });

        names[username] = true;

        emit UserRegistered(msg.sender, username, block.timestamp);
    }

    /// @notice Authenticate by submitting an OTP and the timestamp used to compute it
    /// @param otp the 6-digit OTP produced by client
    /// @param timestamp the unix timestamp (seconds) used when generating the OTP on client side
    /// @dev contract checks: registered, timestamp within 5 minutes, timestamp > lastUsedTimestamp, otp matches
    function authenticate(uint256 otp, uint256 timestamp) external nonReentrant returns (bool) {
        // check registration
        User storage u = users[msg.sender];
        if (!u.isRegistered) {
            emit AuthenticationFailed(msg.sender, "", timestamp, "Not registered", block.timestamp);
            return false;
        }

        // time checks
        // prevent timestamps in future or too old (allow only timestamps <= now and within AUTH_ALLOWED_DRIFT)
        if (timestamp > block.timestamp) {
            emit AuthenticationFailed(msg.sender, u.username, timestamp, "Timestamp in future", block.timestamp);
            return false;
        }

        uint256 age = block.timestamp - timestamp;
        if (age > AUTH_ALLOWED_DRIFT) {
            emit AuthenticationFailed(msg.sender, u.username, timestamp, "Timestamp too old", block.timestamp);
            return false;
        }

        // Replay protection: require timestamp strictly greater than last used timestamp
        if (timestamp <= u.lastUsedTimestamp) {
            emit AuthenticationFailed(msg.sender, u.username, timestamp, "Replay/old timestamp", block.timestamp);
            return false;
        }

        // compute expected OTP: keccak(seed, timestamp) mod 1_000_000 (6 digits)
        uint256 expected = _generateOtp(u.seed, timestamp);

        if (expected != otp) {
            emit AuthenticationFailed(msg.sender, u.username, timestamp, "Invalid OTP", block.timestamp);
            return false;
        }

        // mark timestamp as used (prevent replay in same or older window)
        u.lastUsedTimestamp = timestamp;

        emit AuthenticationSuccess(msg.sender, u.username, timestamp, block.timestamp);
        return true;
    }

    /// @notice internal OTP generator
    /// @param seed user's stored seed
    /// @param timestamp timestamp used to generate OTP
    /// @return 6-digit OTP (0..999999)
    function _generateOtp(uint256 seed, uint256 timestamp) internal pure returns (uint256) {
        
        
        // Hash seed + timeslot
        uint256 h = uint256(keccak256(abi.encodePacked(seed, timestamp)));
        return h % 1_000_000; // 6 digits
    }

    // /// @notice helper: compute OTP off-chain format (view) for given address and timestamp
    // /// @dev exposes what the expected OTP would be (seed is public on-chain)
    // function viewExpectedOtp(address userAddress, uint256 timestamp) external view returns (uint256) {
    //     require(users[userAddress].isRegistered, "User not registered");
    //     return _generateOtp(users[userAddress].seed, timestamp);
    // }

    /// @notice helper to check if a username is available
    function isNameTaken(string calldata username) external view returns (bool) {
        return names[username];
    }

    function getUser(address user) external view returns(User memory){
        return users[user];
    }
     
    
}
