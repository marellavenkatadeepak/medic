import { expect } from "chai";
import { ethers } from "hardhat";

describe("MediMatch Ecosystem", function () {
    let ResearchToken: any;
    let StudyRegistry: any;
    let token: any;
    let registry: any;
    let owner: any;
    let addr1: any;
    let addr2: any;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();

        // Deploy Token
        ResearchToken = await ethers.getContractFactory("ResearchToken");
        token = await ResearchToken.deploy();

        // Deploy Registry
        StudyRegistry = await ethers.getContractFactory("StudyRegistry");
        registry = await StudyRegistry.deploy(await token.getAddress());

        // Grant Minter Role
        const MINTER_ROLE = await token.MINTER_ROLE();
        await token.grantRole(MINTER_ROLE, await registry.getAddress());
    });

    describe("ResearchToken", function () {
        it("Should have correct name and symbol", async function () {
            expect(await token.name()).to.equal("MediLock Research Token");
            expect(await token.symbol()).to.equal("MEDI");
        });

        it("Should not allow random users to mint", async function () {
            const MINTER_ROLE = await token.MINTER_ROLE();
            await expect(
                token.connect(addr1).mint(addr1.address, 100)
            ).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount");
        });
    });

    describe("StudyRegistry", function () {
        it("Should allow contribution and reward user", async function () {
            const studyId = "NCT12345678";
            const dataHash = ethers.keccak256(ethers.toUtf8Bytes("medical-data"));

            // Contribute
            await expect(registry.connect(addr1).contribute(studyId, dataHash))
                .to.emit(registry, "ContributionMade")
                .withArgs(addr1.address, studyId, ethers.parseUnits("50", 18));

            // Check Balance
            const balance = await token.balanceOf(addr1.address);
            expect(balance).to.equal(ethers.parseUnits("50", 18));

            // Check Contribution Count
            expect(await registry.getContributionCount(addr1.address)).to.equal(1);
        });

        it("Should prevent double contribution to same study", async function () {
            const studyId = "NCT12345678";
            const dataHash = ethers.keccak256(ethers.toUtf8Bytes("medical-data"));

            await registry.connect(addr1).contribute(studyId, dataHash);

            await expect(
                registry.connect(addr1).contribute(studyId, dataHash)
            ).to.be.revertedWith("Already contributed to this study");
        });
    });
});
