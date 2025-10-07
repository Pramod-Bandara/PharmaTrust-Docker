// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title PharmaTrustNFT
 * @dev ERC721 NFT contract for pharmaceutical batch tracking
 * @author PharmaTrust Team
 */
contract PharmaTrustNFT is 
    ERC721, 
    ERC721URIStorage, 
    ERC721Enumerable, 
    AccessControl, 
    Pausable, 
    ReentrancyGuard 
{
    using Counters for Counters.Counter;
    using Strings for uint256;

    // Roles
    bytes32 public constant MANUFACTURER_ROLE = keccak256("MANUFACTURER_ROLE");
    bytes32 public constant SUPPLIER_ROLE = keccak256("SUPPLIER_ROLE");
    bytes32 public constant PHARMACIST_ROLE = keccak256("PHARMACIST_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // Token counter
    Counters.Counter private _tokenIdCounter;

    // Batch information
    struct BatchInfo {
        string batchId;
        string medicineName;
        string manufacturerId;
        string manufacturerName;
        uint256 manufacturingDate;
        uint256 expiryDate;
        string dosage;
        string form;
        string category;
        uint256 quantity;
        string unit;
        string qualityStatus;
        string currentStage;
        bool isVerified;
        uint256 createdAt;
        uint256 updatedAt;
    }

    // Mapping from token ID to batch info
    mapping(uint256 => BatchInfo) public batchInfo;
    
    // Mapping from batch ID to token ID
    mapping(string => uint256) public batchIdToTokenId;
    
    // Mapping from batch ID to existence
    mapping(string => bool) public batchExists;

    // Events
    event BatchMinted(
        uint256 indexed tokenId,
        string indexed batchId,
        address indexed manufacturer,
        string medicineName
    );

    event BatchUpdated(
        uint256 indexed tokenId,
        string indexed batchId,
        string newStage,
        address indexed updatedBy
    );

    event BatchVerified(
        uint256 indexed tokenId,
        string indexed batchId,
        bool verified,
        address indexed verifiedBy
    );

    event QualityAlert(
        uint256 indexed tokenId,
        string indexed batchId,
        string alertType,
        string message,
        address indexed reportedBy
    );

    // Modifiers
    modifier onlyAuthorizedRoles() {
        require(
            hasRole(MANUFACTURER_ROLE, msg.sender) ||
            hasRole(SUPPLIER_ROLE, msg.sender) ||
            hasRole(PHARMACIST_ROLE, msg.sender) ||
            hasRole(ADMIN_ROLE, msg.sender),
            "PharmaTrustNFT: Unauthorized role"
        );
        _;
    }

    modifier batchExistsModifier(string memory _batchId) {
        require(batchExists[_batchId], "PharmaTrustNFT: Batch does not exist");
        _;
    }

    constructor(
        string memory name,
        string memory symbol,
        address admin
    ) ERC721(name, symbol) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(MANUFACTURER_ROLE, admin);
    }

    /**
     * @dev Mint a new pharmaceutical batch NFT
     * @param to Address to mint the NFT to
     * @param _batchId Unique batch identifier
     * @param _medicineName Name of the medicine
     * @param _manufacturerId Manufacturer identifier
     * @param _manufacturerName Manufacturer name
     * @param _manufacturingDate Manufacturing date (timestamp)
     * @param _expiryDate Expiry date (timestamp)
     * @param _dosage Medicine dosage
     * @param _form Medicine form (tablet, capsule, etc.)
     * @param _category Medicine category
     * @param _quantity Batch quantity
     * @param _unit Unit of measurement
     * @param _qualityStatus Initial quality status
     * @param _tokenURI Metadata URI
     */
    function mintBatch(
        address to,
        string memory _batchId,
        string memory _medicineName,
        string memory _manufacturerId,
        string memory _manufacturerName,
        uint256 _manufacturingDate,
        uint256 _expiryDate,
        string memory _dosage,
        string memory _form,
        string memory _category,
        uint256 _quantity,
        string memory _unit,
        string memory _qualityStatus,
        string memory _tokenURI
    ) external onlyRole(MANUFACTURER_ROLE) whenNotPaused nonReentrant {
        require(!batchExists[_batchId], "PharmaTrustNFT: Batch already exists");
        require(bytes(_batchId).length > 0, "PharmaTrustNFT: Invalid batch ID");
        require(bytes(_medicineName).length > 0, "PharmaTrustNFT: Invalid medicine name");
        require(_expiryDate > block.timestamp, "PharmaTrustNFT: Expired batch");

        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        // Store batch information
        batchInfo[tokenId] = BatchInfo({
            batchId: _batchId,
            medicineName: _medicineName,
            manufacturerId: _manufacturerId,
            manufacturerName: _manufacturerName,
            manufacturingDate: _manufacturingDate,
            expiryDate: _expiryDate,
            dosage: _dosage,
            form: _form,
            category: _category,
            quantity: _quantity,
            unit: _unit,
            qualityStatus: _qualityStatus,
            currentStage: "manufacturer",
            isVerified: false,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        // Update mappings
        batchIdToTokenId[_batchId] = tokenId;
        batchExists[_batchId] = true;

        // Mint NFT
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, _tokenURI);

        emit BatchMinted(tokenId, _batchId, to, _medicineName);
    }

    /**
     * @dev Update batch stage in supply chain
     * @param _batchId Batch identifier
     * @param _newStage New stage in supply chain
     */
    function updateBatchStage(
        string memory _batchId,
        string memory _newStage
    ) external onlyAuthorizedRoles batchExistsModifier(_batchId) whenNotPaused {
        uint256 tokenId = batchIdToTokenId[_batchId];
        require(bytes(_newStage).length > 0, "PharmaTrustNFT: Invalid stage");

        batchInfo[tokenId].currentStage = _newStage;
        batchInfo[tokenId].updatedAt = block.timestamp;

        emit BatchUpdated(tokenId, _batchId, _newStage, msg.sender);
    }

    /**
     * @dev Update batch quality status
     * @param _batchId Batch identifier
     * @param _qualityStatus New quality status
     */
    function updateQualityStatus(
        string memory _batchId,
        string memory _qualityStatus
    ) external onlyAuthorizedRoles batchExistsModifier(_batchId) whenNotPaused {
        uint256 tokenId = batchIdToTokenId[_batchId];
        require(bytes(_qualityStatus).length > 0, "PharmaTrustNFT: Invalid quality status");

        batchInfo[tokenId].qualityStatus = _qualityStatus;
        batchInfo[tokenId].updatedAt = block.timestamp;

        emit BatchUpdated(tokenId, _batchId, _qualityStatus, msg.sender);
    }

    /**
     * @dev Verify batch authenticity
     * @param _batchId Batch identifier
     * @param _verified Verification status
     */
    function verifyBatch(
        string memory _batchId,
        bool _verified
    ) external onlyRole(ADMIN_ROLE) batchExistsModifier(_batchId) whenNotPaused {
        uint256 tokenId = batchIdToTokenId[_batchId];

        batchInfo[tokenId].isVerified = _verified;
        batchInfo[tokenId].updatedAt = block.timestamp;

        emit BatchVerified(tokenId, _batchId, _verified, msg.sender);
    }

    /**
     * @dev Report quality alert
     * @param _batchId Batch identifier
     * @param _alertType Type of alert
     * @param _message Alert message
     */
    function reportQualityAlert(
        string memory _batchId,
        string memory _alertType,
        string memory _message
    ) external onlyAuthorizedRoles batchExistsModifier(_batchId) whenNotPaused {
        uint256 tokenId = batchIdToTokenId[_batchId];
        
        emit QualityAlert(tokenId, _batchId, _alertType, _message, msg.sender);
    }

    /**
     * @dev Get batch information by batch ID
     * @param _batchId Batch identifier
     * @return BatchInfo struct
     */
    function getBatchInfo(string memory _batchId) 
        external 
        view 
        batchExistsModifier(_batchId) 
        returns (BatchInfo memory) 
    {
        uint256 tokenId = batchIdToTokenId[_batchId];
        return batchInfo[tokenId];
    }

    /**
     * @dev Get batch information by token ID
     * @param tokenId Token identifier
     * @return BatchInfo struct
     */
    function getBatchInfoByTokenId(uint256 tokenId) 
        external 
        view 
        returns (BatchInfo memory) 
    {
        require(_exists(tokenId), "PharmaTrustNFT: Token does not exist");
        return batchInfo[tokenId];
    }

    /**
     * @dev Check if batch exists
     * @param _batchId Batch identifier
     * @return bool
     */
    function isBatchExists(string memory _batchId) external view returns (bool) {
        return batchExists[_batchId];
    }

    /**
     * @dev Get total number of batches
     * @return uint256
     */
    function getTotalBatches() external view returns (uint256) {
        return _tokenIdCounter.current();
    }

    /**
     * @dev Pause contract
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause contract
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Grant role to address
     * @param role Role to grant
     * @param account Address to grant role to
     */
    function grantRole(bytes32 role, address account) public override onlyRole(ADMIN_ROLE) {
        _grantRole(role, account);
    }

    /**
     * @dev Revoke role from address
     * @param role Role to revoke
     * @param account Address to revoke role from
     */
    function revokeRole(bytes32 role, address account) public override onlyRole(ADMIN_ROLE) {
        _revokeRole(role, account);
    }

    // Required overrides for multiple inheritance
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) whenNotPaused {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
