import { expect } from "chai";
import { ethers } from "hardhat";
import type { EscrowCampaign } from "../typechain-types";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function campaignKey(slug: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(slug));
}

function conversionKey(id: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(id));
}

// ─── Fixture ───────────────────────────────────────────────────────────────────

async function deployFixture() {
  const [owner, advertiser, recipient, treasury, attacker, other] =
    await ethers.getSigners();

  const verifier = owner; // owner doubles as verifier in tests

  const EscrowCampaign = await ethers.getContractFactory("EscrowCampaign");
  const escrow = (await EscrowCampaign.deploy(
    verifier.address,
    treasury.address
  )) as EscrowCampaign;

  const campaignId = campaignKey("campaign-veridica-001");
  const costPerConversion = ethers.parseEther("0.1"); // 0.1 SYS per conversion
  const depositAmount = ethers.parseEther("1");       // 1 SYS budget → 10 conversions

  return {
    escrow,
    owner,
    verifier,
    advertiser,
    recipient,
    treasury,
    attacker,
    other,
    campaignId,
    costPerConversion,
    depositAmount,
  };
}

async function deployAndDeposit() {
  const ctx = await deployFixture();
  await ctx.escrow
    .connect(ctx.advertiser)
    .deposit(ctx.campaignId, ctx.costPerConversion, { value: ctx.depositAmount });
  return ctx;
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("EscrowCampaign", function () {
  // ── Constructor ──────────────────────────────────────────────────────────────

  describe("constructor", function () {
    it("stores verifier, treasury, and default fee tiers", async function () {
      const { escrow, verifier, treasury } = await deployFixture();
      expect(await escrow.verifier()).to.equal(verifier.address);
      expect(await escrow.treasury()).to.equal(treasury.address);

      // Default tiers: 1-10 → 10%, 11-30 → 8%, 31+ → 6%
      const tiers = await escrow.getFeeTiers();
      expect(tiers.length).to.equal(3);
      expect(tiers[0].bps).to.equal(1000); // 10%
      expect(tiers[1].bps).to.equal(800);  // 8%
      expect(tiers[2].bps).to.equal(600);  // 6%
    });

    it("reverts if verifier is zero address", async function () {
      const [, , , treasury] = await ethers.getSigners();
      const Factory = await ethers.getContractFactory("EscrowCampaign");
      await expect(
        Factory.deploy(ethers.ZeroAddress, treasury.address)
      ).to.be.revertedWithCustomError(Factory, "ZeroAddress");
    });
  });

  // ── Tiered fees ─────────────────────────────────────────────────────────────

  describe("Tiered fee structure", function () {
    it("applies 10% for conversions 1-10", async function () {
      const { escrow } = await deployFixture();
      expect(await escrow.getFeeBps(1)).to.equal(1000);
      expect(await escrow.getFeeBps(10)).to.equal(1000);
    });

    it("applies 8% for conversions 11-30", async function () {
      const { escrow } = await deployFixture();
      expect(await escrow.getFeeBps(11)).to.equal(800);
      expect(await escrow.getFeeBps(30)).to.equal(800);
    });

    it("applies 6% for conversions 31+", async function () {
      const { escrow } = await deployFixture();
      expect(await escrow.getFeeBps(31)).to.equal(600);
      expect(await escrow.getFeeBps(100)).to.equal(600);
    });

    it("first conversion uses 10% fee", async function () {
      const ctx = await deployAndDeposit();
      const convId = conversionKey("conv-tier1");

      await ctx.escrow
        .connect(ctx.verifier)
        .registerConversion(ctx.campaignId, convId, ctx.recipient.address);

      const conv = await ctx.escrow.getConversion(convId);
      // 10% of 0.1 ETH = 0.01 ETH fee, 0.09 ETH net
      expect(conv.fee).to.equal(ethers.parseEther("0.01"));
      expect(conv.netAmount).to.equal(ethers.parseEther("0.09"));
    });
  });

  // ── deposit() ────────────────────────────────────────────────────────────────

  describe("deposit()", function () {
    it("initialises a new campaign on first deposit", async function () {
      const { escrow, advertiser, campaignId, costPerConversion, depositAmount } =
        await deployFixture();

      await expect(
        escrow.connect(advertiser).deposit(campaignId, costPerConversion, {
          value: depositAmount,
        })
      )
        .to.emit(escrow, "Deposited")
        .withArgs(campaignId, advertiser.address, depositAmount, costPerConversion);

      const c = await escrow.getCampaign(campaignId);
      expect(c.advertiser).to.equal(advertiser.address);
      expect(c.balance).to.equal(depositAmount);
      expect(c.totalDeposited).to.equal(depositAmount);
      expect(c.costPerConversion).to.equal(costPerConversion);
      expect(c.active).to.equal(true);
    });

    it("allows top-up deposits to an existing campaign", async function () {
      const ctx = await deployAndDeposit();
      const topUp = ethers.parseEther("0.5");

      await ctx.escrow
        .connect(ctx.advertiser)
        .deposit(ctx.campaignId, ctx.costPerConversion, { value: topUp });

      const c = await ctx.escrow.getCampaign(ctx.campaignId);
      expect(c.balance).to.equal(ctx.depositAmount + topUp);
      expect(c.totalDeposited).to.equal(ctx.depositAmount + topUp);
    });

    it("reverts with ZeroDeposit when msg.value is 0", async function () {
      const { escrow, advertiser, campaignId, costPerConversion } = await deployFixture();
      await expect(
        escrow.connect(advertiser).deposit(campaignId, costPerConversion, { value: 0 })
      ).to.be.revertedWithCustomError(escrow, "ZeroDeposit");
    });

    it("reverts with InvalidCostPerConversion when costPerConversion is 0", async function () {
      const { escrow, advertiser, campaignId } = await deployFixture();
      await expect(
        escrow.connect(advertiser).deposit(campaignId, 0, { value: ethers.parseEther("1") })
      ).to.be.revertedWithCustomError(escrow, "InvalidCostPerConversion");
    });

    it("reverts with NotAdvertiser when a different address tries to top-up", async function () {
      const ctx = await deployAndDeposit();
      await expect(
        ctx.escrow
          .connect(ctx.attacker)
          .deposit(ctx.campaignId, ctx.costPerConversion, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWithCustomError(ctx.escrow, "NotAdvertiser");
    });
  });

  // ── registerConversion() ─────────────────────────────────────────────────────

  describe("registerConversion()", function () {
    it("records a conversion and reduces campaign balance", async function () {
      const ctx = await deployAndDeposit();
      const convId = conversionKey("conv-001");

      // First conversion → 10% fee tier
      await expect(
        ctx.escrow
          .connect(ctx.verifier)
          .registerConversion(ctx.campaignId, convId, ctx.recipient.address)
      )
        .to.emit(ctx.escrow, "ConversionRegistered")
        .withArgs(
          ctx.campaignId,
          convId,
          ctx.recipient.address,
          ethers.parseEther("0.09"), // 0.1 - 10% fee
          ethers.parseEther("0.01")  // 10% fee
        );

      const c = await ctx.escrow.getCampaign(ctx.campaignId);
      expect(c.balance).to.equal(ctx.depositAmount - ctx.costPerConversion);
      expect(c.conversionsCount).to.equal(1n);

      const conv = await ctx.escrow.getConversion(convId);
      expect(conv.released).to.equal(false);
      expect(conv.netAmount).to.equal(ethers.parseEther("0.09"));
      expect(conv.fee).to.equal(ethers.parseEther("0.01"));
      expect(conv.recipient).to.equal(ctx.recipient.address);
    });

    it("marks conversion as processed (prevents replay)", async function () {
      const ctx = await deployAndDeposit();
      const convId = conversionKey("conv-replay");

      await ctx.escrow
        .connect(ctx.verifier)
        .registerConversion(ctx.campaignId, convId, ctx.recipient.address);

      await expect(
        ctx.escrow
          .connect(ctx.verifier)
          .registerConversion(ctx.campaignId, convId, ctx.recipient.address)
      ).to.be.revertedWithCustomError(ctx.escrow, "ConversionAlreadyRegistered");

      expect(await ctx.escrow.isConversionProcessed(convId)).to.equal(true);
    });

    it("reverts with NotVerifier when called by non-verifier", async function () {
      const ctx = await deployAndDeposit();
      await expect(
        ctx.escrow
          .connect(ctx.attacker)
          .registerConversion(ctx.campaignId, conversionKey("conv-x"), ctx.recipient.address)
      ).to.be.revertedWithCustomError(ctx.escrow, "NotVerifier");
    });

    it("reverts with CampaignNotFound for unknown campaignId", async function () {
      const ctx = await deployFixture();
      await expect(
        ctx.escrow
          .connect(ctx.verifier)
          .registerConversion(campaignKey("nonexistent"), conversionKey("c"), ctx.recipient.address)
      ).to.be.revertedWithCustomError(ctx.escrow, "CampaignNotFound");
    });

    it("reverts with CampaignInactive after refund", async function () {
      const ctx = await deployAndDeposit();
      await ctx.escrow.connect(ctx.advertiser).refund(ctx.campaignId);

      await expect(
        ctx.escrow
          .connect(ctx.verifier)
          .registerConversion(ctx.campaignId, conversionKey("c"), ctx.recipient.address)
      ).to.be.revertedWithCustomError(ctx.escrow, "CampaignInactive");
    });

    it("reverts with InsufficientBudget when balance < costPerConversion", async function () {
      const ctx = await deployFixture();
      await ctx.escrow
        .connect(ctx.advertiser)
        .deposit(ctx.campaignId, ctx.costPerConversion, { value: ctx.costPerConversion });

      await ctx.escrow
        .connect(ctx.verifier)
        .registerConversion(ctx.campaignId, conversionKey("c1"), ctx.recipient.address);

      await expect(
        ctx.escrow
          .connect(ctx.verifier)
          .registerConversion(ctx.campaignId, conversionKey("c2"), ctx.recipient.address)
      ).to.be.revertedWithCustomError(ctx.escrow, "InsufficientBudget");
    });
  });

  // ── releasePayment() ──────────────────────────────────────────────────────────

  describe("releasePayment()", function () {
    it("transfers netAmount to recipient and fee to treasury", async function () {
      const ctx = await deployAndDeposit();
      const convId = conversionKey("conv-release-001");

      await ctx.escrow
        .connect(ctx.verifier)
        .registerConversion(ctx.campaignId, convId, ctx.recipient.address);

      const recipientBefore = await ethers.provider.getBalance(ctx.recipient.address);
      const treasuryBefore = await ethers.provider.getBalance(ctx.treasury.address);

      // First conversion → 10% fee: net=0.09, fee=0.01
      await expect(ctx.escrow.connect(ctx.other).releasePayment(convId))
        .to.emit(ctx.escrow, "PaymentReleased")
        .withArgs(
          ctx.campaignId,
          convId,
          ctx.recipient.address,
          ethers.parseEther("0.09")
        );

      const recipientAfter = await ethers.provider.getBalance(ctx.recipient.address);
      const treasuryAfter = await ethers.provider.getBalance(ctx.treasury.address);

      expect(recipientAfter - recipientBefore).to.equal(ethers.parseEther("0.09"));
      expect(treasuryAfter - treasuryBefore).to.equal(ethers.parseEther("0.01"));
    });

    it("marks conversion as released and prevents double-release", async function () {
      const ctx = await deployAndDeposit();
      const convId = conversionKey("conv-double");

      await ctx.escrow
        .connect(ctx.verifier)
        .registerConversion(ctx.campaignId, convId, ctx.recipient.address);
      await ctx.escrow.releasePayment(convId);

      const conv = await ctx.escrow.getConversion(convId);
      expect(conv.released).to.equal(true);

      await expect(
        ctx.escrow.releasePayment(convId)
      ).to.be.revertedWithCustomError(ctx.escrow, "ConversionAlreadyReleased");
    });

    it("reverts with ConversionNotFound for unknown conversionId", async function () {
      const ctx = await deployFixture();
      await expect(
        ctx.escrow.releasePayment(conversionKey("ghost-conv"))
      ).to.be.revertedWithCustomError(ctx.escrow, "ConversionNotFound");
    });

    it("is callable by anyone (trustless)", async function () {
      const ctx = await deployAndDeposit();
      const convId = conversionKey("conv-trustless");

      await ctx.escrow
        .connect(ctx.verifier)
        .registerConversion(ctx.campaignId, convId, ctx.recipient.address);

      await expect(ctx.escrow.connect(ctx.attacker).releasePayment(convId)).to.not.be.reverted;
    });

    it("correctly handles zero-fee scenario (setPlatformFee to 0)", async function () {
      const ctx = await deployFixture();
      // Set flat 0% fee
      await ctx.escrow.connect(ctx.owner).setPlatformFee(0);

      const cId = campaignKey("campaign-nofee");
      const cost = ethers.parseEther("0.1");

      await ctx.escrow.connect(ctx.advertiser).deposit(cId, cost, { value: cost });
      const convId = conversionKey("conv-nofee");
      await ctx.escrow.connect(ctx.verifier).registerConversion(cId, convId, ctx.recipient.address);

      const before = await ethers.provider.getBalance(ctx.recipient.address);
      await ctx.escrow.releasePayment(convId);
      const after = await ethers.provider.getBalance(ctx.recipient.address);

      expect(after - before).to.equal(cost); // full amount, no fee
    });
  });

  // ── Full 3-step flow ──────────────────────────────────────────────────────────

  describe("Full flow: deposit → registerConversion → releasePayment", function () {
    it("processes multiple conversions until budget exhausted", async function () {
      const ctx = await deployAndDeposit();
      // Budget: 1 ETH, costPerConversion: 0.1 ETH → 10 conversions

      for (let i = 0; i < 10; i++) {
        const convId = conversionKey(`conv-multi-${i}`);
        await ctx.escrow
          .connect(ctx.verifier)
          .registerConversion(ctx.campaignId, convId, ctx.recipient.address);
        await ctx.escrow.releasePayment(convId);
      }

      const c = await ctx.escrow.getCampaign(ctx.campaignId);
      expect(c.balance).to.equal(0n);
      expect(c.conversionsCount).to.equal(10n);

      // 11th conversion should fail
      await expect(
        ctx.escrow
          .connect(ctx.verifier)
          .registerConversion(ctx.campaignId, conversionKey("conv-extra"), ctx.recipient.address)
      ).to.be.revertedWithCustomError(ctx.escrow, "InsufficientBudget");
    });

    it("unreleased conversions remain payable after advertiser refunds remaining balance", async function () {
      const ctx = await deployAndDeposit();
      const convId = conversionKey("conv-prerefund");

      await ctx.escrow
        .connect(ctx.verifier)
        .registerConversion(ctx.campaignId, convId, ctx.recipient.address);

      await ctx.escrow.connect(ctx.advertiser).refund(ctx.campaignId);

      const before = await ethers.provider.getBalance(ctx.recipient.address);
      await ctx.escrow.releasePayment(convId);
      const after = await ethers.provider.getBalance(ctx.recipient.address);

      expect(after).to.be.gt(before);
    });
  });

  // ── refund() ──────────────────────────────────────────────────────────────────

  describe("refund()", function () {
    it("returns remaining balance to advertiser and deactivates campaign", async function () {
      const ctx = await deployAndDeposit();

      const balanceBefore = await ethers.provider.getBalance(ctx.advertiser.address);
      const tx = await ctx.escrow.connect(ctx.advertiser).refund(ctx.campaignId);
      const receipt = await tx.wait();
      const gasCost = receipt!.gasUsed * (receipt!.gasPrice ?? 0n);
      const balanceAfter = await ethers.provider.getBalance(ctx.advertiser.address);

      expect(balanceAfter + gasCost - balanceBefore).to.equal(ctx.depositAmount);

      const c = await ctx.escrow.getCampaign(ctx.campaignId);
      expect(c.balance).to.equal(0n);
      expect(c.active).to.equal(false);
    });

    it("emits Refunded event", async function () {
      const ctx = await deployAndDeposit();
      await expect(ctx.escrow.connect(ctx.advertiser).refund(ctx.campaignId))
        .to.emit(ctx.escrow, "Refunded")
        .withArgs(ctx.campaignId, ctx.advertiser.address, ctx.depositAmount);
    });

    it("reverts with NotAdvertiser when called by non-advertiser", async function () {
      const ctx = await deployAndDeposit();
      await expect(
        ctx.escrow.connect(ctx.attacker).refund(ctx.campaignId)
      ).to.be.revertedWithCustomError(ctx.escrow, "NotAdvertiser");
    });

    it("reverts with ZeroDeposit when balance is already 0", async function () {
      const ctx = await deployAndDeposit();
      await ctx.escrow.connect(ctx.advertiser).refund(ctx.campaignId);
      await expect(
        ctx.escrow.connect(ctx.advertiser).refund(ctx.campaignId)
      ).to.be.revertedWithCustomError(ctx.escrow, "ZeroDeposit");
    });

    it("reverts with CampaignNotFound for unknown campaign", async function () {
      const ctx = await deployFixture();
      await expect(
        ctx.escrow.connect(ctx.advertiser).refund(campaignKey("ghost"))
      ).to.be.revertedWithCustomError(ctx.escrow, "CampaignNotFound");
    });
  });

  // ── Admin functions ───────────────────────────────────────────────────────────

  describe("Admin — setVerifier()", function () {
    it("owner can update verifier", async function () {
      const ctx = await deployFixture();
      await expect(ctx.escrow.connect(ctx.owner).setVerifier(ctx.other.address))
        .to.emit(ctx.escrow, "VerifierSet")
        .withArgs(ctx.other.address);
      expect(await ctx.escrow.verifier()).to.equal(ctx.other.address);
    });

    it("reverts when non-owner calls setVerifier", async function () {
      const ctx = await deployFixture();
      await expect(
        ctx.escrow.connect(ctx.attacker).setVerifier(ctx.attacker.address)
      ).to.be.reverted;
    });

    it("reverts with ZeroAddress for zero verifier", async function () {
      const ctx = await deployFixture();
      await expect(
        ctx.escrow.connect(ctx.owner).setVerifier(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(ctx.escrow, "ZeroAddress");
    });
  });

  describe("Admin — setPlatformFee()", function () {
    it("owner can set flat platform fee (replaces tiers)", async function () {
      const ctx = await deployFixture();
      await expect(ctx.escrow.connect(ctx.owner).setPlatformFee(500))
        .to.emit(ctx.escrow, "PlatformFeeSet")
        .withArgs(500);

      // Should now have a single flat tier
      const tiers = await ctx.escrow.getFeeTiers();
      expect(tiers.length).to.equal(1);
      expect(tiers[0].bps).to.equal(500);
    });

    it("reverts with FeeTooHigh when bps > 1000", async function () {
      const ctx = await deployFixture();
      await expect(
        ctx.escrow.connect(ctx.owner).setPlatformFee(1001)
      ).to.be.revertedWithCustomError(ctx.escrow, "FeeTooHigh");
    });
  });

  describe("Admin — setFeeTiers()", function () {
    it("owner can set custom fee tiers", async function () {
      const ctx = await deployFixture();
      const maxUint = ethers.MaxUint256;

      await expect(
        ctx.escrow.connect(ctx.owner).setFeeTiers([
          { upperBound: 5, bps: 1000 },
          { upperBound: 20, bps: 500 },
          { upperBound: maxUint, bps: 300 },
        ])
      ).to.emit(ctx.escrow, "FeeTiersUpdated").withArgs(3);

      expect(await ctx.escrow.getFeeBps(1)).to.equal(1000);
      expect(await ctx.escrow.getFeeBps(5)).to.equal(500);
      expect(await ctx.escrow.getFeeBps(100)).to.equal(300);
    });

    it("reverts with FeeTooHigh if any tier bps > 1000", async function () {
      const ctx = await deployFixture();
      await expect(
        ctx.escrow.connect(ctx.owner).setFeeTiers([
          { upperBound: ethers.MaxUint256, bps: 1001 },
        ])
      ).to.be.revertedWithCustomError(ctx.escrow, "FeeTooHigh");
    });
  });

  describe("Admin — setTreasury()", function () {
    it("owner can update treasury", async function () {
      const ctx = await deployFixture();
      await expect(ctx.escrow.connect(ctx.owner).setTreasury(ctx.other.address))
        .to.emit(ctx.escrow, "TreasurySet")
        .withArgs(ctx.other.address);
      expect(await ctx.escrow.treasury()).to.equal(ctx.other.address);
    });

    it("reverts with ZeroAddress for zero treasury", async function () {
      const ctx = await deployFixture();
      await expect(
        ctx.escrow.connect(ctx.owner).setTreasury(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(ctx.escrow, "ZeroAddress");
    });
  });

  // ── View helpers ──────────────────────────────────────────────────────────────

  describe("View helpers", function () {
    it("isConversionProcessed returns false before registration", async function () {
      const ctx = await deployFixture();
      expect(await ctx.escrow.isConversionProcessed(conversionKey("unregistered"))).to.equal(false);
    });

    it("isConversionProcessed returns true after registration", async function () {
      const ctx = await deployAndDeposit();
      const convId = conversionKey("conv-view");
      await ctx.escrow
        .connect(ctx.verifier)
        .registerConversion(ctx.campaignId, convId, ctx.recipient.address);
      expect(await ctx.escrow.isConversionProcessed(convId)).to.equal(true);
    });
  });
});
