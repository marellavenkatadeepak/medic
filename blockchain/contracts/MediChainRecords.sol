// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MediChainRecords {
    // ─── Enums ───
    enum UserRole { None, Patient, Doctor }

    // ─── Structs ───
    struct MedicalRecord {
        bytes32 recordHash;
        string  metadataCID;
        address patient;
        uint256 timestamp;
        bool    exists;
    }

    // ─── State ───
    mapping(address => UserRole) public userRoles;
    mapping(uint256 => MedicalRecord) public records;
    mapping(uint256 => mapping(address => bool)) public accessPermissions;
    uint256 public recordCount;

    // ─── Events ───
    event UserRegistered(address indexed user, UserRole role);
    event RecordStored(uint256 indexed recordId, address indexed patient, bytes32 recordHash);
    event AccessGranted(uint256 indexed recordId, address indexed patient, address indexed doctor);
    event AccessRevoked(uint256 indexed recordId, address indexed patient, address indexed doctor);
    event EmergencyAccess(uint256 indexed recordId, address indexed doctor, address indexed patient, uint256 timestamp);

    // ─── Modifiers ───
    modifier onlyRegistered() {
        require(userRoles[msg.sender] != UserRole.None, "Not registered");
        _;
    }

    modifier onlyPatient() {
        require(userRoles[msg.sender] == UserRole.Patient, "Not a patient");
        _;
    }

    modifier onlyDoctor() {
        require(userRoles[msg.sender] == UserRole.Doctor, "Not a doctor");
        _;
    }

    modifier recordExists(uint256 _recordId) {
        require(records[_recordId].exists, "Record does not exist");
        _;
    }

    // ─── Registration ───
    function registerUser(UserRole _role) external {
        require(userRoles[msg.sender] == UserRole.None, "Already registered");
        require(_role == UserRole.Patient || _role == UserRole.Doctor, "Invalid role");
        userRoles[msg.sender] = _role;
        emit UserRegistered(msg.sender, _role);
    }

    // ─── Record Storage ───
    function storeRecord(bytes32 _recordHash, string calldata _metadataCID) external returns (uint256) {
        uint256 recordId = recordCount++;
        records[recordId] = MedicalRecord({
            recordHash: _recordHash,
            metadataCID: _metadataCID,
            patient: msg.sender,
            timestamp: block.timestamp,
            exists: true
        });
        emit RecordStored(recordId, msg.sender, _recordHash);
        return recordId;
    }

    // ─── Access Control ───
    function grantAccess(address _doctor, uint256 _recordId) external recordExists(_recordId) {
        require(records[_recordId].patient == msg.sender, "Not your record");
        // We removed the requirement that the target must be an on-chain registered doctor
        accessPermissions[_recordId][_doctor] = true;
        emit AccessGranted(_recordId, msg.sender, _doctor);
    }

    function revokeAccess(address _doctor, uint256 _recordId) external recordExists(_recordId) {
        require(records[_recordId].patient == msg.sender, "Not your record");
        accessPermissions[_recordId][_doctor] = false;
        emit AccessRevoked(_recordId, msg.sender, _doctor);
    }

    function emergencyAccess(address _patient, uint256 _recordId) external recordExists(_recordId) {
        require(records[_recordId].patient == _patient, "Record mismatch");
        // Emergency does NOT set permanent access — just logs the event
        emit EmergencyAccess(_recordId, msg.sender, _patient, block.timestamp);
    }

    // ─── Views ───
    function hasAccess(address _doctor, uint256 _recordId) external view recordExists(_recordId) returns (bool) {
        return records[_recordId].patient == _doctor || accessPermissions[_recordId][_doctor];
    }

    function getRecord(uint256 _recordId) external view recordExists(_recordId) returns (
        bytes32 recordHash,
        string memory metadataCID,
        address patient,
        uint256 timestamp
    ) {
        MedicalRecord storage r = records[_recordId];
        return (r.recordHash, r.metadataCID, r.patient, r.timestamp);
    }

    function getUserRole(address _user) external view returns (UserRole) {
        return userRoles[_user];
    }
}
