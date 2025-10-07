// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title SupplyChainManager
 * @dev Contract for managing pharmaceutical supply chain stages and transfers
 * @author PharmaTrust Team
 */
contract SupplyChainManager is AccessControl, Pausable, ReentrancyGuard {
    
    // Roles
    bytes32 public constant MANUFACTURER_ROLE = keccak256("MANUFACTURER_ROLE");
    bytes32 public constant SUPPLIER_ROLE = keccak256("SUPPLIER_ROLE");
    bytes32 public constant PHARMACIST_ROLE = keccak256("PHARMACIST_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // Supply chain stages
    enum Stage {
        Manufacturing,
        QualityControl,
        Packaging,
        Supplier,
        Distribution,
        Pharmacist,
        Customer,
        Recalled
    }

    // Transfer record structure
    struct TransferRecord {
        string batchId;
        Stage fromStage;
        Stage toStage;
        address fromAddress;
        address toAddress;
        uint256 timestamp;
        string location;
        string notes;
        string temperature;
        string humidity;
        bool qualityCheck;
        bytes signature;
    }

    // Batch location tracking
    struct LocationRecord {
        string batchId;
        string location;
        string coordinates;
        uint256 timestamp;
        address recordedBy;
        string notes;
    }

    // Environmental conditions
    struct EnvironmentalData {
        string batchId;
        uint256 timestamp;
        int256 temperature; // in Celsius * 100 (e.g., 2500 = 25.00°C)
        uint256 humidity; // in percentage * 100 (e.g., 4500 = 45.00%)
        uint256 pressure; // in hPa
        bool isAnomaly;
        string anomalyReason;
    }

    // Mapping from batch ID to transfer history
    mapping(string => TransferRecord[]) public transferHistory;
    
    // Mapping from batch ID to location history
    mapping(string => LocationRecord[]) public locationHistory;
    
    // Mapping from batch ID to environmental data
    mapping(string => EnvironmentalData[]) public environmentalData;
    
    // Mapping from batch ID to current stage
    mapping(string => Stage) public currentStage;
    
    // Mapping from batch ID to current holder
    mapping(string => address) public currentHolder;
    
    // Mapping from batch ID to existence
    mapping(string => bool) public batchExists;

    // Reference to PharmaTrust NFT contract
    address public pharmaTrustNFT;

    // Events
    event BatchTransferred(
        string indexed batchId,
        Stage indexed fromStage,
        Stage indexed toStage,
        address fromAddress,
        address toAddress,
        uint256 timestamp
    );

    event LocationUpdated(
        string indexed batchId,
        string location,
        string coordinates,
        address indexed recordedBy
    );

    event EnvironmentalDataRecorded(
        string indexed batchId,
        int256 temperature,
        uint256 humidity,
        bool isAnomaly,
        address indexed recordedBy
    );

    event QualityAlert(
        string indexed batchId,
        string alertType,
        string message,
        address indexed reportedBy
    );

    event StageUpdated(
        string indexed batchId,
        Stage indexed newStage,
        address indexed updatedBy
    );

    // Modifiers
    modifier onlyAuthorizedRoles() {
        require(
            hasRole(MANUFACTURER_ROLE, msg.sender) ||
            hasRole(SUPPLIER_ROLE, msg.sender) ||
            hasRole(PHARMACIST_ROLE, msg.sender) ||
            hasRole(ADMIN_ROLE, msg.sender),
            "SupplyChainManager: Unauthorized role"
        );
        _;
    }

    modifier batchExistsModifier(string memory _batchId) {
        require(batchExists[_batchId], "SupplyChainManager: Batch does not exist");
        _;
    }

    modifier validStage(Stage _stage) {
        require(uint8(_stage) <= 7, "SupplyChainManager: Invalid stage");
        _;
    }

    constructor(address _pharmaTrustNFT, address admin) {
        pharmaTrustNFT = _pharmaTrustNFT;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
    }

    /**
     * @dev Register a new batch in the supply chain
     * @param _batchId Batch identifier
     * @param _manufacturer Manufacturer address
     */
    function registerBatch(
        string memory _batchId,
        address _manufacturer
    ) external onlyRole(MANUFACTURER_ROLE) whenNotPaused nonReentrant {
        require(!batchExists[_batchId], "SupplyChainManager: Batch already exists");
        require(bytes(_batchId).length > 0, "SupplyChainManager: Invalid batch ID");

        batchExists[_batchId] = true;
        currentStage[_batchId] = Stage.Manufacturing;
        currentHolder[_batchId] = _manufacturer;

        emit StageUpdated(_batchId, Stage.Manufacturing, msg.sender);
    }

    /**
     * @dev Transfer batch to next stage
     * @param _batchId Batch identifier
     * @param _toStage Target stage
     * @param _toAddress Recipient address
     * @param _location Transfer location
     * @param _notes Transfer notes
     * @param _temperature Temperature during transfer
     * @param _humidity Humidity during transfer
     * @param _qualityCheck Quality check performed
     * @param _signature Transfer signature
     */
    function transferBatch(
        string memory _batchId,
        Stage _toStage,
        address _toAddress,
        string memory _location,
        string memory _notes,
        string memory _temperature,
        string memory _humidity,
        bool _qualityCheck,
        bytes memory _signature
    ) external onlyAuthorizedRoles batchExistsModifier(_batchId) validStage(_toStage) whenNotPaused nonReentrant {
        Stage fromStage = currentStage[_batchId];
        address fromAddress = currentHolder[_batchId];

        require(_toAddress != address(0), "SupplyChainManager: Invalid recipient address");
        require(_toStage != fromStage, "SupplyChainManager: Cannot transfer to same stage");

        // Create transfer record
        TransferRecord memory transfer = TransferRecord({
            batchId: _batchId,
            fromStage: fromStage,
            toStage: _toStage,
            fromAddress: fromAddress,
            toAddress: _toAddress,
            timestamp: block.timestamp,
            location: _location,
            notes: _notes,
            temperature: _temperature,
            humidity: _humidity,
            qualityCheck: _qualityCheck,
            signature: _signature
        });

        transferHistory[_batchId].push(transfer);

        // Update current stage and holder
        currentStage[_batchId] = _toStage;
        currentHolder[_batchId] = _toAddress;

        emit BatchTransferred(_batchId, fromStage, _toStage, fromAddress, _toAddress, block.timestamp);
        emit StageUpdated(_batchId, _toStage, msg.sender);
    }

    /**
     * @dev Update batch location
     * @param _batchId Batch identifier
     * @param _location New location
     * @param _coordinates GPS coordinates
     * @param _notes Location notes
     */
    function updateLocation(
        string memory _batchId,
        string memory _location,
        string memory _coordinates,
        string memory _notes
    ) external onlyAuthorizedRoles batchExistsModifier(_batchId) whenNotPaused {
        require(bytes(_location).length > 0, "SupplyChainManager: Invalid location");

        LocationRecord memory locationRecord = LocationRecord({
            batchId: _batchId,
            location: _location,
            coordinates: _coordinates,
            timestamp: block.timestamp,
            recordedBy: msg.sender,
            notes: _notes
        });

        locationHistory[_batchId].push(locationRecord);

        emit LocationUpdated(_batchId, _location, _coordinates, msg.sender);
    }

    /**
     * @dev Record environmental data
     * @param _batchId Batch identifier
     * @param _temperature Temperature in Celsius * 100
     * @param _humidity Humidity percentage * 100
     * @param _pressure Pressure in hPa
     * @param _anomalyReason Reason for anomaly if any
     */
    function recordEnvironmentalData(
        string memory _batchId,
        int256 _temperature,
        uint256 _humidity,
        uint256 _pressure,
        string memory _anomalyReason
    ) external onlyAuthorizedRoles batchExistsModifier(_batchId) whenNotPaused {
        bool isAnomaly = _temperature < 200 || _temperature > 300 || _humidity < 3000 || _humidity > 8000;
        
        EnvironmentalData memory envData = EnvironmentalData({
            batchId: _batchId,
            timestamp: block.timestamp,
            temperature: _temperature,
            humidity: _humidity,
            pressure: _pressure,
            isAnomaly: isAnomaly,
            anomalyReason: isAnomaly ? _anomalyReason : ""
        });

        environmentalData[_batchId].push(envData);

        emit EnvironmentalDataRecorded(_batchId, _temperature, _humidity, isAnomaly, msg.sender);

        if (isAnomaly) {
            emit QualityAlert(_batchId, "environmental", _anomalyReason, msg.sender);
        }
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
        emit QualityAlert(_batchId, _alertType, _message, msg.sender);
    }

    /**
     * @dev Recall batch
     * @param _batchId Batch identifier
     * @param _reason Recall reason
     */
    function recallBatch(
        string memory _batchId,
        string memory _reason
    ) external onlyRole(ADMIN_ROLE) batchExistsModifier(_batchId) whenNotPaused {
        currentStage[_batchId] = Stage.Recalled;
        
        emit StageUpdated(_batchId, Stage.Recalled, msg.sender);
        emit QualityAlert(_batchId, "recall", _reason, msg.sender);
    }

    /**
     * @dev Get transfer history for a batch
     * @param _batchId Batch identifier
     * @return TransferRecord[] Transfer history
     */
    function getTransferHistory(string memory _batchId) 
        external 
        view 
        batchExistsModifier(_batchId) 
        returns (TransferRecord[] memory) 
    {
        return transferHistory[_batchId];
    }

    /**
     * @dev Get location history for a batch
     * @param _batchId Batch identifier
     * @return LocationRecord[] Location history
     */
    function getLocationHistory(string memory _batchId) 
        external 
        view 
        batchExistsModifier(_batchId) 
        returns (LocationRecord[] memory) 
    {
        return locationHistory[_batchId];
    }

    /**
     * @dev Get environmental data for a batch
     * @param _batchId Batch identifier
     * @return EnvironmentalData[] Environmental data
     */
    function getEnvironmentalData(string memory _batchId) 
        external 
        view 
        batchExistsModifier(_batchId) 
        returns (EnvironmentalData[] memory) 
    {
        return environmentalData[_batchId];
    }

    /**
     * @dev Get current stage of a batch
     * @param _batchId Batch identifier
     * @return Stage Current stage
     */
    function getCurrentStage(string memory _batchId) 
        external 
        view 
        batchExistsModifier(_batchId) 
        returns (Stage) 
    {
        return currentStage[_batchId];
    }

    /**
     * @dev Get current holder of a batch
     * @param _batchId Batch identifier
     * @return address Current holder
     */
    function getCurrentHolder(string memory _batchId) 
        external 
        view 
        batchExistsModifier(_batchId) 
        returns (address) 
    {
        return currentHolder[_batchId];
    }

    /**
     * @dev Check if batch exists
     * @param _batchId Batch identifier
     * @return bool Batch existence
     */
    function isBatchExists(string memory _batchId) external view returns (bool) {
        return batchExists[_batchId];
    }

    /**
     * @dev Get stage name as string
     * @param _stage Stage enum
     * @return string Stage name
     */
    function getStageName(Stage _stage) external pure returns (string memory) {
        if (_stage == Stage.Manufacturing) return "Manufacturing";
        if (_stage == Stage.QualityControl) return "Quality Control";
        if (_stage == Stage.Packaging) return "Packaging";
        if (_stage == Stage.Supplier) return "Supplier";
        if (_stage == Stage.Distribution) return "Distribution";
        if (_stage == Stage.Pharmacist) return "Pharmacist";
        if (_stage == Stage.Customer) return "Customer";
        if (_stage == Stage.Recalled) return "Recalled";
        return "Unknown";
    }

    /**
     * @dev Set PharmaTrust NFT contract address
     * @param _pharmaTrustNFT New contract address
     */
    function setPharmaTrustNFT(address _pharmaTrustNFT) external onlyRole(ADMIN_ROLE) {
        require(_pharmaTrustNFT != address(0), "SupplyChainManager: Invalid address");
        pharmaTrustNFT = _pharmaTrustNFT;
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
}
