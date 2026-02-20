export const RESEARCH_TOKEN_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address) view returns (uint256)",
    "function mint(address to, uint256 amount) external",
    "function transfer(address to, uint256 amount) external returns (bool)"
];

export const STUDY_REGISTRY_ABI = [
    "function contribute(string studyId, bytes32 dataHash) external",
    "function getContributionCount(address user) external view returns (uint256)",
    "event ContributionMade(address indexed patient, string studyId, uint256 reward)"
];

export const RESEARCH_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_RESEARCH_TOKEN_ADDRESS || "";
export const STUDY_REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_STUDY_REGISTRY_ADDRESS || "";
