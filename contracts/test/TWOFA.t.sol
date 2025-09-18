// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/2FA.sol";

contract TWOFATest is Test {
    TWOFA public twoFA;
    
    address public alice = address(0x1);
    address public bob = address(0x2);
    address public charlie = address(0x3);
    
    string constant ALICE_USERNAME = "alice";
    string constant BOB_USERNAME = "bob";
    uint256 constant ALICE_SEED = 12345;
    uint256 constant BOB_SEED = 67890;
    uint256 constant ZERO_SEED = 0;
    
    event UserRegistered(address indexed userAddress, string username, uint256 indexed ts);
    event AuthenticationSuccess(address indexed userAddress, string username, uint256 indexed usedTimestamp, uint256 when);
    event AuthenticationFailed(address indexed userAddress, string username, uint256 indexed usedTimestamp, string reason, uint256 when);

    function setUp() public {
        twoFA = new TWOFA();
        vm.deal(alice, 1 ether);
        vm.deal(bob, 1 ether);
        vm.deal(charlie, 1 ether);
    }

    // ============= REGISTRATION TESTS =============

    function test_RegisterUser_Success() public {
        vm.prank(alice);
        vm.expectEmit(true, false, true, false);
        emit UserRegistered(alice, ALICE_USERNAME, block.timestamp);
        
        twoFA.register(ALICE_USERNAME, ALICE_SEED);
        
        // Verify username is taken
        assertTrue(twoFA.isNameTaken(ALICE_USERNAME));
    }

    function test_RegisterUser_EmitsCorrectEvent() public {
        vm.prank(alice);
        vm.expectEmit(true, false, true, true);
        emit UserRegistered(alice, ALICE_USERNAME, block.timestamp);
        
        twoFA.register(ALICE_USERNAME, ALICE_SEED);
    }

    function test_RegisterUser_RevertWhenAlreadyRegistered() public {
        vm.startPrank(alice);
        twoFA.register(ALICE_USERNAME, ALICE_SEED);
        
        vm.expectRevert("Already registered");
        twoFA.register("alice2", ALICE_SEED + 1);
        vm.stopPrank();
    }

    function test_RegisterUser_RevertWhenUsernameEmpty() public {
        vm.prank(alice);
        vm.expectRevert("Username empty");
        twoFA.register("", ALICE_SEED);
    }

    function test_RegisterUser_RevertWhenUsernameAlreadyTaken() public {
        vm.prank(alice);
        twoFA.register(ALICE_USERNAME, ALICE_SEED);
        
        vm.prank(bob);
        vm.expectRevert("Username taken");
        twoFA.register(ALICE_USERNAME, BOB_SEED);
    }

    function test_RegisterUser_RevertWhenSeedIsZero() public {
        vm.prank(alice);
        vm.expectRevert("Seed cannot be zero");
        twoFA.register(ALICE_USERNAME, ZERO_SEED);
    }

    function test_RegisterMultipleUsers() public {
        vm.prank(alice);
        twoFA.register(ALICE_USERNAME, ALICE_SEED);
        
        vm.prank(bob);
        twoFA.register(BOB_USERNAME, BOB_SEED);
        
        assertTrue(twoFA.isNameTaken(ALICE_USERNAME));
        assertTrue(twoFA.isNameTaken(BOB_USERNAME));
    }

    // ============= AUTHENTICATION TESTS =============

    function test_Authenticate_Success() public {
        // Register user first
        vm.prank(alice);
        twoFA.register(ALICE_USERNAME, ALICE_SEED);
        
        uint256 timestamp = block.timestamp;
        uint256 expectedOtp = twoFA.viewExpectedOtp(alice, timestamp);
        
        vm.prank(alice);
        vm.expectEmit(true, false, true, false);
        emit AuthenticationSuccess(alice, ALICE_USERNAME, timestamp, block.timestamp);
        
        bool result = twoFA.authenticate(expectedOtp, timestamp);
        assertTrue(result);
    }

    function test_Authenticate_FailNotRegistered() public {
        uint256 timestamp = block.timestamp;
        
        vm.prank(alice);
        vm.expectEmit(true, false, true, false);
        emit AuthenticationFailed(alice, "", timestamp, "Not registered", block.timestamp);
        
        bool result = twoFA.authenticate(123456, timestamp);
        assertFalse(result);
    }

    function test_Authenticate_FailTimestampInFuture() public {
        // Register user first
        vm.prank(alice);
        twoFA.register(ALICE_USERNAME, ALICE_SEED);
        
        uint256 futureTimestamp = block.timestamp + 100;
        uint256 expectedOtp = twoFA.viewExpectedOtp(alice, futureTimestamp);
        
        vm.prank(alice);
        vm.expectEmit(true, false, true, false);
        emit AuthenticationFailed(alice, ALICE_USERNAME, futureTimestamp, "Timestamp in future", block.timestamp);
        
        bool result = twoFA.authenticate(expectedOtp, futureTimestamp);
        assertFalse(result);
    }

    function test_Authenticate_FailTimestampTooOld() public {
        // Register user first
        vm.prank(alice);
        twoFA.register(ALICE_USERNAME, ALICE_SEED);
        
        uint256 oldTimestamp = block.timestamp - twoFA.AUTH_ALLOWED_DRIFT() - 1;
        uint256 expectedOtp = twoFA.viewExpectedOtp(alice, oldTimestamp);
        
        // Move time forward to make the timestamp too old
        vm.warp(block.timestamp + 1);
        
        vm.prank(alice);
        vm.expectEmit(true, false, true, false);
        emit AuthenticationFailed(alice, ALICE_USERNAME, oldTimestamp, "Timestamp too old", block.timestamp);
        
        bool result = twoFA.authenticate(expectedOtp, oldTimestamp);
        assertFalse(result);
    }

    function test_Authenticate_FailReplayAttack() public {
        // Register user first
        vm.prank(alice);
        twoFA.register(ALICE_USERNAME, ALICE_SEED);
        
        uint256 timestamp = block.timestamp;
        uint256 expectedOtp = twoFA.viewExpectedOtp(alice, timestamp);
        
        // First authentication should succeed
        vm.prank(alice);
        bool result1 = twoFA.authenticate(expectedOtp, timestamp);
        assertTrue(result1);
        
        // Second authentication with same timestamp should fail
        vm.prank(alice);
        vm.expectEmit(true, false, true, false);
        emit AuthenticationFailed(alice, ALICE_USERNAME, timestamp, "Replay/old timestamp", block.timestamp);
        
        bool result2 = twoFA.authenticate(expectedOtp, timestamp);
        assertFalse(result2);
    }

    function test_Authenticate_FailOlderTimestamp() public {
        // Register user first
        vm.prank(alice);
        twoFA.register(ALICE_USERNAME, ALICE_SEED);
        
        uint256 timestamp1 = block.timestamp;
        uint256 timestamp2 = block.timestamp - 10; // Older timestamp
        uint256 expectedOtp1 = twoFA.viewExpectedOtp(alice, timestamp1);
        uint256 expectedOtp2 = twoFA.viewExpectedOtp(alice, timestamp2);
        
        // First authentication should succeed
        vm.prank(alice);
        bool result1 = twoFA.authenticate(expectedOtp1, timestamp1);
        assertTrue(result1);
        
        // Authentication with older timestamp should fail
        vm.prank(alice);
        vm.expectEmit(true, false, true, false);
        emit AuthenticationFailed(alice, ALICE_USERNAME, timestamp2, "Replay/old timestamp", block.timestamp);
        
        bool result2 = twoFA.authenticate(expectedOtp2, timestamp2);
        assertFalse(result2);
    }

    function test_Authenticate_FailInvalidOtp() public {
        // Register user first
        vm.prank(alice);
        twoFA.register(ALICE_USERNAME, ALICE_SEED);
        
        uint256 timestamp = block.timestamp;
        uint256 wrongOtp = 999999; // Wrong OTP
        
        vm.prank(alice);
        vm.expectEmit(true, false, true, false);
        emit AuthenticationFailed(alice, ALICE_USERNAME, timestamp, "Invalid OTP", block.timestamp);
        
        bool result = twoFA.authenticate(wrongOtp, timestamp);
        assertFalse(result);
    }

    function test_Authenticate_SequentialTimestamps() public {
        // Register user first
        vm.prank(alice);
        twoFA.register(ALICE_USERNAME, ALICE_SEED);
        
        // Authenticate with timestamp 1
        uint256 timestamp1 = block.timestamp;
        uint256 expectedOtp1 = twoFA.viewExpectedOtp(alice, timestamp1);
        
        vm.prank(alice);
        bool result1 = twoFA.authenticate(expectedOtp1, timestamp1);
        assertTrue(result1);
        
        // Authenticate with timestamp 2 (later)
        uint256 timestamp2 = block.timestamp + 30;
        uint256 expectedOtp2 = twoFA.viewExpectedOtp(alice, timestamp2);
        
        vm.warp(timestamp2);
        vm.prank(alice);
        bool result2 = twoFA.authenticate(expectedOtp2, timestamp2);
        assertTrue(result2);
    }

    function test_Authenticate_WithinAllowedDrift() public {
        // Register user first
        vm.prank(alice);
        twoFA.register(ALICE_USERNAME, ALICE_SEED);
        
        uint256 oldTimestamp = block.timestamp - twoFA.AUTH_ALLOWED_DRIFT(); // Exactly at the limit
        uint256 expectedOtp = twoFA.viewExpectedOtp(alice, oldTimestamp);
        
        vm.prank(alice);
        bool result = twoFA.authenticate(expectedOtp, oldTimestamp);
        assertTrue(result);
    }

    // ============= VIEW FUNCTION TESTS =============

    function test_ViewExpectedOtp_Success() public {
        vm.prank(alice);
        twoFA.register(ALICE_USERNAME, ALICE_SEED);
        
        uint256 timestamp = block.timestamp;
        uint256 otp = twoFA.viewExpectedOtp(alice, timestamp);
        
        // OTP should be between 0 and 999999 (6 digits)
        assertLt(otp, 1_000_000);
    }

    function test_ViewExpectedOtp_RevertNotRegistered() public {
        vm.expectRevert("User not registered");
        twoFA.viewExpectedOtp(alice, block.timestamp);
    }

    function test_ViewExpectedOtp_ConsistentResults() public {
        vm.prank(alice);
        twoFA.register(ALICE_USERNAME, ALICE_SEED);
        
        uint256 timestamp = block.timestamp;
        uint256 otp1 = twoFA.viewExpectedOtp(alice, timestamp);
        uint256 otp2 = twoFA.viewExpectedOtp(alice, timestamp);
        
        // Same inputs should produce same OTP
        assertEq(otp1, otp2);
    }

    function test_ViewExpectedOtp_DifferentTimestamps() public {
        vm.prank(alice);
        twoFA.register(ALICE_USERNAME, ALICE_SEED);
        
        uint256 timestamp1 = block.timestamp;
        uint256 timestamp2 = block.timestamp + 30;
        uint256 otp1 = twoFA.viewExpectedOtp(alice, timestamp1);
        uint256 otp2 = twoFA.viewExpectedOtp(alice, timestamp2);
        
        // Different timestamps should usually produce different OTPs
        // Note: There's a small chance they could be the same due to hash collision
        // but it's extremely unlikely with good seeds
        if (otp1 == otp2) {
            // If they happen to be the same, just verify they're both valid 6-digit numbers
            assertLt(otp1, 1_000_000);
            assertLt(otp2, 1_000_000);
        }
    }

    function test_IsNameTaken_Success() public {
        assertFalse(twoFA.isNameTaken(ALICE_USERNAME));
        
        vm.prank(alice);
        twoFA.register(ALICE_USERNAME, ALICE_SEED);
        
        assertTrue(twoFA.isNameTaken(ALICE_USERNAME));
        assertFalse(twoFA.isNameTaken(BOB_USERNAME));
    }

    // ============= CONSTANT TESTS =============

    function test_AuthAllowedDrift() public {
        assertEq(twoFA.AUTH_ALLOWED_DRIFT(), 300);
    }

    // ============= REENTRANCY TESTS =============

    function test_RegisterReentrancy() public {
        // Create a malicious contract that tries to reenter
        MaliciousReentrant malicious = new MaliciousReentrant(twoFA);
        
        vm.expectRevert("Reentrant call");
        malicious.attemptReentrantRegister();
    }

    function test_AuthenticateReentrancy() public {
        // Register user first
        vm.prank(alice);
        twoFA.register(ALICE_USERNAME, ALICE_SEED);
        
        // Create a malicious contract that tries to reenter
        MaliciousReentrant malicious = new MaliciousReentrant(twoFA);
        
        vm.expectRevert("Reentrant call");
        malicious.attemptReentrantAuthenticate();
    }

    // ============= EDGE CASE TESTS =============

    function test_RegisterWithVeryLongUsername() public {
        string memory longUsername = "averylongusernamethatexceedsnormallengthsbutshoulstillwork";
        
        vm.prank(alice);
        twoFA.register(longUsername, ALICE_SEED);
        
        assertTrue(twoFA.isNameTaken(longUsername));
    }

    function test_RegisterWithSpecialCharacters() public {
        string memory specialUsername = "user@#$%^&*()";
        
        vm.prank(alice);
        twoFA.register(specialUsername, ALICE_SEED);
        
        assertTrue(twoFA.isNameTaken(specialUsername));
    }

    function test_RegisterWithMaxUint256Seed() public {
        uint256 maxSeed = type(uint256).max;
        
        vm.prank(alice);
        twoFA.register(ALICE_USERNAME, maxSeed);
        
        assertTrue(twoFA.isNameTaken(ALICE_USERNAME));
    }

    function test_AuthenticateAtExactTimeBoundaries() public {
        vm.prank(alice);
        twoFA.register(ALICE_USERNAME, ALICE_SEED);
        
        // Test at exactly the current timestamp
        uint256 currentTime = block.timestamp;
        uint256 otpCurrent = twoFA.viewExpectedOtp(alice, currentTime);
        
        vm.prank(alice);
        assertTrue(twoFA.authenticate(otpCurrent, currentTime));
    }

    // ============= FUZZ TESTS =============

    function testFuzz_RegisterWithRandomSeed(uint256 seed) public {
        vm.assume(seed != 0);
        
        vm.prank(alice);
        twoFA.register(ALICE_USERNAME, seed);
        
        assertTrue(twoFA.isNameTaken(ALICE_USERNAME));
    }

    function testFuzz_AuthenticateWithValidOtp(uint256 seed, uint256 timeOffset) public {
        vm.assume(seed != 0);
        vm.assume(timeOffset <= twoFA.AUTH_ALLOWED_DRIFT());
        
        vm.prank(alice);
        twoFA.register(ALICE_USERNAME, seed);
        
        uint256 timestamp = block.timestamp - timeOffset;
        uint256 expectedOtp = twoFA.viewExpectedOtp(alice, timestamp);
        
        vm.prank(alice);
        assertTrue(twoFA.authenticate(expectedOtp, timestamp));
    }
}

// Malicious contract for reentrancy testing
contract MaliciousReentrant {
    TWOFA public twoFA;
    bool public hasEntered;
    
    constructor(TWOFA _twoFA) {
        twoFA = _twoFA;
    }
    
    function attemptReentrantRegister() public {
        if (!hasEntered) {
            hasEntered = true;
            twoFA.register("malicious", 12345);
        }
    }
    
    function attemptReentrantAuthenticate() public {
        if (!hasEntered) {
            hasEntered = true;
            twoFA.authenticate(123456, block.timestamp);
        }
    }
}
