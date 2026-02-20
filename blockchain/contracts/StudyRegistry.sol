// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ResearchToken.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract StudyRegistry is AccessControl {
    ResearchToken public token;
    uint256 public constant REWARD_AMOUNT = 50 * 10**18; // 50 MEDI

    struct Contribution {
        string studyId;
        bytes32 dataHash;
        uint256 timestamp;
    }

    // Mapping from user address to list of contributions
    mapping(address => Contribution[]) public contributions;
    // Mapping to prevent double submission for same study by same user (optional but good)
    mapping(address => mapping(string => bool)) public hasContributed;

    event ContributionMade(address indexed patient, string studyId, uint256 reward);

    constructor(address tokenAddress) {
        token = ResearchToken(tokenAddress);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function contribute(string memory studyId, bytes32 dataHash) external {
        require(!hasContributed[msg.sender][studyId], "Already contributed to this study");
        require(bytes(studyId).length > 0, "Invalid Study ID");

        // Record contribution
        contributions[msg.sender].push(Contribution({
            studyId: studyId,
            dataHash: dataHash,
            timestamp: block.timestamp
        }));

        hasContributed[msg.sender][studyId] = true;

        // Reward user
        token.mint(msg.sender, REWARD_AMOUNT);

        emit ContributionMade(msg.sender, studyId, REWARD_AMOUNT);
    }

    function getContributionCount(address user) external view returns (uint256) {
        return contributions[user].length;
    }
}
