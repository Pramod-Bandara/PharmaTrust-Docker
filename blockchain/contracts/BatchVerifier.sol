// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title BatchVerifier
 * @dev Contract for verifying pharmaceutical batch authenticity and integrity
 * @author PharmaTrust Team
 */
contract BatchVerifier is AccessControl, Pausable, ReentrancyGuard {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // Roles
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // Verification status enum
    enum VerificationStatus {
        Pending,
        Verified,
        Rejected,
        Expired
    }

    // Verification request structure
    struct VerificationRequest {
        string batchId;
        address requester;
        uint256 timestamp;
        VerificationStatus status;
        string verificationData;
        bytes signature;
        address verifier;
        uint256 verifiedAt;
        string notes;
    }

    // Batch verification result
    struct VerificationResult {
        bool isValid;
        string batchId;
        uint256 tokenId;
        string medicineName;
        string manufacturerId;
        string qualityStatus;
        string currentStage;
        bool isExpired;
        uint256 expiryDate;
        string verificationHash;
    }

    // Mapping from batch ID to verification request
    mapping(string => VerificationRequest) public verificationRequests;
    
    // Mapping from batch ID to verification result
    mapping(string => VerificationResult) public verificationResults;
    
    // Mapping from batch ID to verification history
    mapping(string => VerificationRequest[]) public verificationHistory;
    
    // Mapping from batch ID to existence
    mapping(string => bool) public batchVerified;

    // Reference to PharmaTrust NFT contract
    address public pharmaTrustNFT;

    // Events
    event VerificationRequested(
        string indexed batchId,
        address indexed requester,
        uint256 timestamp
    );

    event VerificationCompleted(
        string indexed batchId,
        address indexed verifier,
        VerificationStatus status,
        string notes
    );

    event BatchVerified(
        string indexed batchId,
        bool isValid,
        string verificationHash
    );

    event VerificationDataUpdated(
        string indexed batchId,
        string newData,
        address indexed updatedBy
    );

    // Modifiers
    modifier onlyVerifier() {
        require(hasRole(VERIFIER_ROLE, msg.sender), "BatchVerifier: Only verifiers can call this function");
        _;
    }

    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "BatchVerifier: Only admin can call this function");
        _;
    }

    modifier batchExists(string memory _batchId) {
        require(bytes(_batchId).length > 0, "BatchVerifier: Invalid batch ID");
        _;
    }

    constructor(address _pharmaTrustNFT, address admin) {
        pharmaTrustNFT = _pharmaTrustNFT;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
    }

    /**
     * @dev Request batch verification
     * @param _batchId Batch identifier to verify
     * @param _verificationData Additional verification data
     */
    function requestVerification(
        string memory _batchId,
        string memory _verificationData
    ) external batchExists(_batchId) whenNotPaused nonReentrant {
        require(!batchVerified[_batchId], "BatchVerifier: Batch already verified");

        VerificationRequest memory request = VerificationRequest({
            batchId: _batchId,
            requester: msg.sender,
            timestamp: block.timestamp,
            status: VerificationStatus.Pending,
            verificationData: _verificationData,
            signature: "",
            verifier: address(0),
            verifiedAt: 0,
            notes: ""
        });

        verificationRequests[_batchId] = request;
        verificationHistory[_batchId].push(request);

        emit VerificationRequested(_batchId, msg.sender, block.timestamp);
    }

    /**
     * @dev Complete batch verification
     * @param _batchId Batch identifier
     * @param _status Verification status
     * @param _notes Verification notes
     * @param _signature Verifier signature
     */
    function completeVerification(
        string memory _batchId,
        VerificationStatus _status,
        string memory _notes,
        bytes memory _signature
    ) external onlyVerifier batchExists(_batchId) whenNotPaused nonReentrant {
        require(
            verificationRequests[_batchId].status == VerificationStatus.Pending,
            "BatchVerifier: Verification not pending"
        );

        // Update verification request
        verificationRequests[_batchId].status = _status;
        verificationRequests[_batchId].verifier = msg.sender;
        verificationRequests[_batchId].verifiedAt = block.timestamp;
        verificationRequests[_batchId].notes = _notes;
        verificationRequests[_batchId].signature = _signature;

        // If verified, create verification result
        if (_status == VerificationStatus.Verified) {
            _createVerificationResult(_batchId);
            batchVerified[_batchId] = true;
        }

        emit VerificationCompleted(_batchId, msg.sender, _status, _notes);
    }

    /**
     * @dev Create verification result for verified batch
     * @param _batchId Batch identifier
     */
    function _createVerificationResult(string memory _batchId) internal {
        // Get batch info from PharmaTrust NFT contract
        (bool success, bytes memory data) = pharmaTrustNFT.call(
            abi.encodeWithSignature("getBatchInfo(string)", _batchId)
        );
        
        require(success, "BatchVerifier: Failed to get batch info");

        // Decode batch info (simplified for this example)
        // In a real implementation, you would properly decode the struct
        string memory verificationHash = _generateVerificationHash(_batchId);

        VerificationResult memory result = VerificationResult({
            isValid: true,
            batchId: _batchId,
            tokenId: 0, // Would be populated from NFT contract
            medicineName: "", // Would be populated from NFT contract
            manufacturerId: "", // Would be populated from NFT contract
            qualityStatus: "verified", // Would be populated from NFT contract
            currentStage: "verified", // Would be populated from NFT contract
            isExpired: false, // Would be checked against expiry date
            expiryDate: 0, // Would be populated from NFT contract
            verificationHash: verificationHash
        });

        verificationResults[_batchId] = result;

        emit BatchVerified(_batchId, true, verificationHash);
    }

    /**
     * @dev Generate verification hash
     * @param _batchId Batch identifier
     * @return string verification hash
     */
    function _generateVerificationHash(string memory _batchId) internal view returns (string memory) {
        bytes32 hash = keccak256(abi.encodePacked(
            _batchId,
            block.timestamp,
            msg.sender,
            block.chainid
        ));
        return _toHexString(hash);
    }

    /**
     * @dev Convert bytes32 to hex string
     * @param _bytes32 bytes32 value
     * @return string hex string
     */
    function _toHexString(bytes32 _bytes32) internal pure returns (string memory) {
        bytes memory hexChars = "0123456789abcdef";
        bytes memory result = new bytes(64);
        
        for (uint256 i = 0; i < 32; i++) {
            result[i * 2] = hexChars[uint8(_bytes32[i] >> 4)];
            result[i * 2 + 1] = hexChars[uint8(_bytes32[i] & 0x0f)];
        }
        
        return string(result);
    }

    /**
     * @dev Verify batch authenticity
     * @param _batchId Batch identifier
     * @return VerificationResult verification result
     */
    function verifyBatch(string memory _batchId) 
        external 
        view 
        batchExists(_batchId) 
        returns (VerificationResult memory) 
    {
        require(batchVerified[_batchId], "BatchVerifier: Batch not verified");
        return verificationResults[_batchId];
    }

    /**
     * @dev Check if batch is verified
     * @param _batchId Batch identifier
     * @return bool verification status
     */
    function isBatchVerified(string memory _batchId) external view returns (bool) {
        return batchVerified[_batchId];
    }

    /**
     * @dev Get verification request
     * @param _batchId Batch identifier
     * @return VerificationRequest verification request
     */
    function getVerificationRequest(string memory _batchId) 
        external 
        view 
        batchExists(_batchId) 
        returns (VerificationRequest memory) 
    {
        return verificationRequests[_batchId];
    }

    /**
     * @dev Get verification history
     * @param _batchId Batch identifier
     * @return VerificationRequest[] verification history
     */
    function getVerificationHistory(string memory _batchId) 
        external 
        view 
        batchExists(_batchId) 
        returns (VerificationRequest[] memory) 
    {
        return verificationHistory[_batchId];
    }

    /**
     * @dev Update verification data
     * @param _batchId Batch identifier
     * @param _newData New verification data
     */
    function updateVerificationData(
        string memory _batchId,
        string memory _newData
    ) external onlyVerifier batchExists(_batchId) whenNotPaused {
        verificationRequests[_batchId].verificationData = _newData;
        
        emit VerificationDataUpdated(_batchId, _newData, msg.sender);
    }

    /**
     * @dev Set PharmaTrust NFT contract address
     * @param _pharmaTrustNFT New contract address
     */
    function setPharmaTrustNFT(address _pharmaTrustNFT) external onlyAdmin {
        require(_pharmaTrustNFT != address(0), "BatchVerifier: Invalid address");
        pharmaTrustNFT = _pharmaTrustNFT;
    }

    /**
     * @dev Pause contract
     */
    function pause() external onlyAdmin {
        _pause();
    }

    /**
     * @dev Unpause contract
     */
    function unpause() external onlyAdmin {
        _unpause();
    }

    /**
     * @dev Grant verifier role
     * @param verifier Address to grant verifier role
     */
    function addVerifier(address verifier) external onlyAdmin {
        _grantRole(VERIFIER_ROLE, verifier);
    }

    /**
     * @dev Revoke verifier role
     * @param verifier Address to revoke verifier role
     */
    function removeVerifier(address verifier) external onlyAdmin {
        _revokeRole(VERIFIER_ROLE, verifier);
    }
}
