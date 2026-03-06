import { expect } from "chai";
import { ethers } from "hardhat";

describe("EscrowCampaign", function () {
  async function deployFixture() {
    const [owner, advertiser, recipient] = await ethers.getSigners();
    const EscrowCampaign = await ethers.getContractFactory("EscrowCampaign");
    const escrow = await EscrowCampaign.deploy();
    const campaignId = ethers.encodeBytes32String("campaign-1");
    return { escrow, owner, advertiser, recipient, campaignId };
  }

  it("should allow depositing budget", async function () {
    const { escrow, advertiser, campaignId } = await deployFixture();
    const costPerConversion = ethers.parseEther("0.01");
    const deposit = ethers.parseEther("1");

    await escrow.connect(advertiser).depositBudget(campaignId, costPerConversion, {
      value: deposit,
    });

    const campaign = await escrow.getCampaign(campaignId);
    expect(campaign.budget).to.equal(deposit);
    expect(campaign.advertiser).to.equal(advertiser.address);
  });

  it("should register conversion and release payment", async function () {
    const { escrow, owner, advertiser, recipient, campaignId } = await deployFixture();
    const costPerConversion = ethers.parseEther("0.01");
    const deposit = ethers.parseEther("1");

    await escrow.connect(advertiser).depositBudget(campaignId, costPerConversion, {
      value: deposit,
    });

    const balanceBefore = await ethers.provider.getBalance(recipient.address);

    await escrow.connect(owner).registerConversion(campaignId, recipient.address);

    const balanceAfter = await ethers.provider.getBalance(recipient.address);
    expect(balanceAfter - balanceBefore).to.equal(costPerConversion);
  });

  it("should allow refund", async function () {
    const { escrow, advertiser, campaignId } = await deployFixture();
    const costPerConversion = ethers.parseEther("0.01");
    const deposit = ethers.parseEther("1");

    await escrow.connect(advertiser).depositBudget(campaignId, costPerConversion, {
      value: deposit,
    });

    await escrow.connect(advertiser).refund(campaignId);

    const campaign = await escrow.getCampaign(campaignId);
    expect(campaign.budget).to.equal(0n);
    expect(campaign.active).to.equal(false);
  });
});
