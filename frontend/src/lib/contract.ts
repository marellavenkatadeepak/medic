export const MEDICHAIN_ABI = [
    {
        "inputs": [{ "internalType": "enum MediChainRecords.UserRole", "name": "_role", "type": "uint8" }],
        "name": "registerUser",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "bytes32", "name": "_recordHash", "type": "bytes32" },
            { "internalType": "string", "name": "_metadataCID", "type": "string" }
        ],
        "name": "storeRecord",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "_doctor", "type": "address" },
            { "internalType": "uint256", "name": "_recordId", "type": "uint256" }
        ],
        "name": "grantAccess",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "_doctor", "type": "address" },
            { "internalType": "uint256", "name": "_recordId", "type": "uint256" }
        ],
        "name": "revokeAccess",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "_patient", "type": "address" },
            { "internalType": "uint256", "name": "_recordId", "type": "uint256" }
        ],
        "name": "emergencyAccess",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "_doctor", "type": "address" },
            { "internalType": "uint256", "name": "_recordId", "type": "uint256" }
        ],
        "name": "hasAccess",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "_recordId", "type": "uint256" }],
        "name": "getRecord",
        "outputs": [
            { "internalType": "bytes32", "name": "recordHash", "type": "bytes32" },
            { "internalType": "string", "name": "metadataCID", "type": "string" },
            { "internalType": "address", "name": "patient", "type": "address" },
            { "internalType": "uint256", "name": "timestamp", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "_user", "type": "address" }],
        "name": "getUserRole",
        "outputs": [{ "internalType": "enum MediChainRecords.UserRole", "name": "", "type": "uint8" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "recordCount",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
            { "indexed": false, "internalType": "enum MediChainRecords.UserRole", "name": "role", "type": "uint8" }
        ],
        "name": "UserRegistered",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "uint256", "name": "recordId", "type": "uint256" },
            { "indexed": true, "internalType": "address", "name": "patient", "type": "address" },
            { "indexed": false, "internalType": "bytes32", "name": "recordHash", "type": "bytes32" }
        ],
        "name": "RecordStored",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "uint256", "name": "recordId", "type": "uint256" },
            { "indexed": true, "internalType": "address", "name": "patient", "type": "address" },
            { "indexed": true, "internalType": "address", "name": "doctor", "type": "address" }
        ],
        "name": "AccessGranted",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "uint256", "name": "recordId", "type": "uint256" },
            { "indexed": true, "internalType": "address", "name": "patient", "type": "address" },
            { "indexed": true, "internalType": "address", "name": "doctor", "type": "address" }
        ],
        "name": "AccessRevoked",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "uint256", "name": "recordId", "type": "uint256" },
            { "indexed": true, "internalType": "address", "name": "doctor", "type": "address" },
            { "indexed": true, "internalType": "address", "name": "patient", "type": "address" },
            { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
        ],
        "name": "EmergencyAccess",
        "type": "event"
    }
] as const;

export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';
