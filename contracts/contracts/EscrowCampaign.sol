// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title EscrowCampaign
 * @author Veridica Labs
 * @notice Performance-based marketing escrow on Syscoin NEVM.
 *
 * Flow:
 *   1. deposit()              — PYME locks campaign budget in escrow.
 *   2. registerConversion()   — Backend oracle records a verified conversion
 *                               and earmarks funds (net + platform fee).
 *   3. releasePayment()       — Anyone triggers the on-chain transfer for a
 *                               registered conversion (trustless settlement).
 *
 * Admin can update verifier, treasury, and fee tiers.
 *
 * Tiered fee structure (per campaign, based on monthly conversions):
 *   1–10 conversions  → 10 % (1000 bps)
 *   11–30 conversions →  8 % (800 bps)
 *   31+ conversions   →  6 % (600 bps)
 */
contract EscrowCampaign is ReentrancyGuard, Ownable2Step {
    // ─── Structs ─────────────────────────────────────────────────────────────────

    struct Campaign {
        address advertiser;        // PYME wallet
        uint256 balance;           // available escrow funds (unreserved)
        uint256 totalDeposited;    // cumulative deposits
        uint256 totalReleased;     // cumulative payouts (net + fees)
        uint256 costPerConversion; // wei earmarked per verified conversion
        uint256 conversionsCount;  // total conversions registered
        bool active;               // accepts new conversions when true
    }

    /// @notice Fee tier: applies `bps` when conversionsCount < `upperBound`
    struct FeeTier {
        uint256 upperBound;  // exclusive upper bound (use type(uint256).max for last tier)
        uint256 bps;         // fee in basis points
    }

    struct ConversionRecord {
        bytes32 campaignId;
        address payable recipient; // marketing provider
        uint256 netAmount;         // amount recipient receives
        uint256 fee;               // platform fee amount
        bool released;             // payment executed?
        uint256 registeredAt;      // block.timestamp of registration
    }

    // ─── State ───────────────────────────────────────────────────────────────────

    address public verifier;       // backend oracle — only address that can register conversions
    address public treasury;       // platform fee destination

    FeeTier[] public feeTiers;     // sorted ascending by upperBound

    mapping(bytes32 => Campaign) public campaigns;
    mapping(bytes32 => ConversionRecord) public conversions; // conversionId → record

    // ─── Events ──────────────────────────────────────────────────────────────────

    event Deposited(
        bytes32 indexed campaignId,
        address indexed advertiser,
        uint256 amount,
        uint256 costPerConversion
    );
    event ConversionRegistered(
        bytes32 indexed campaignId,
        bytes32 indexed conversionId,
        address indexed recipient,
        uint256 netAmount,
        uint256 fee
    );
    event PaymentReleased(
        bytes32 indexed campaignId,
        bytes32 indexed conversionId,
        address indexed recipient,
        uint256 netAmount
    );
    event Refunded(bytes32 indexed campaignId, address indexed advertiser, uint256 amount);
    event VerifierSet(address indexed verifier);
    event TreasurySet(address indexed treasury);
    event PlatformFeeSet(uint256 bps);
    event FeeTiersUpdated(uint256 tiersCount);

    // ─── Custom Errors ────────────────────────────────────────────────────────────

    error ZeroDeposit();
    error InvalidCostPerConversion();
    error CampaignNotFound();
    error NotAdvertiser();
    error CampaignInactive();
    error InsufficientBudget();
    error ConversionAlreadyRegistered();
    error ConversionNotFound();
    error ConversionAlreadyReleased();
    error PaymentFailed();
    error FeeTooHigh();
    error ZeroAddress();
    error NotVerifier();

    // ─── Modifiers ───────────────────────────────────────────────────────────────

    modifier onlyVerifier() {
        if (msg.sender != verifier) revert NotVerifier();
        _;
    }

    modifier campaignExists(bytes32 campaignId) {
        if (campaigns[campaignId].advertiser == address(0)) revert CampaignNotFound();
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────────

    /**
     * @param _verifier Backend oracle address (hot wallet controlled by backend service).
     * @param _treasury Platform fee recipient.
     */
    constructor(
        address _verifier,
        address _treasury
    ) Ownable(msg.sender) {
        if (_verifier == address(0)) revert ZeroAddress();
        if (_treasury == address(0)) revert ZeroAddress();
        verifier = _verifier;
        treasury = _treasury;

        // Default tiered fees: 1-10 → 10%, 11-30 → 8%, 31+ → 6%
        feeTiers.push(FeeTier({ upperBound: 11,                    bps: 1000 })); // 10%
        feeTiers.push(FeeTier({ upperBound: 31,                    bps: 800  })); //  8%
        feeTiers.push(FeeTier({ upperBound: type(uint256).max,     bps: 600  })); //  6%
    }

    // ────────────────────────────────────────────────────────────────────────────
    //  CORE — Step 1: deposit()
    // ────────────────────────────────────────────────────────────────────────────

    /**
     * @notice PYME deposits campaign budget into escrow.
     * @dev First deposit initialises the campaign; subsequent deposits top it up.
     *      `costPerConversion` is set on creation and cannot be changed after.
     * @param campaignId       Unique campaign identifier (e.g. keccak256 of slug).
     * @param costPerConversion Total wei earmarked per verified conversion (net + fee).
     */
    function deposit(bytes32 campaignId, uint256 costPerConversion) external payable {
        if (msg.value == 0) revert ZeroDeposit();
        if (costPerConversion == 0) revert InvalidCostPerConversion();

        Campaign storage c = campaigns[campaignId];

        if (c.advertiser == address(0)) {
            // First deposit — initialise campaign
            c.advertiser = msg.sender;
            c.costPerConversion = costPerConversion;
            c.active = true;
        } else {
            if (c.advertiser != msg.sender) revert NotAdvertiser();
        }

        c.balance += msg.value;
        c.totalDeposited += msg.value;

        emit Deposited(campaignId, msg.sender, msg.value, c.costPerConversion);
    }

    // ────────────────────────────────────────────────────────────────────────────
    //  CORE — Step 2: registerConversion()
    // ────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Backend oracle records a verified conversion and earmarks funds.
     * @dev Callable only by the `verifier` address.
     *      Reserves `costPerConversion` from campaign balance, splits into
     *      `netAmount` (recipient) and `fee` (treasury), stores ConversionRecord.
     * @param campaignId   Campaign where conversion occurred.
     * @param conversionId Unique conversion ID from the backend DB (prevents replay).
     * @param recipient    Marketing provider / affiliate receiving payment.
     */
    function registerConversion(
        bytes32 campaignId,
        bytes32 conversionId,
        address payable recipient
    ) external onlyVerifier campaignExists(campaignId) {
        if (conversions[conversionId].registeredAt != 0) revert ConversionAlreadyRegistered();

        Campaign storage c = campaigns[campaignId];
        if (!c.active) revert CampaignInactive();
        if (c.balance < c.costPerConversion) revert InsufficientBudget();

        uint256 currentBps = _getFeeBps(c.conversionsCount + 1);
        uint256 fee = (c.costPerConversion * currentBps) / 10_000;
        uint256 netAmount = c.costPerConversion - fee;

        // Reserve funds from campaign balance
        c.balance -= c.costPerConversion;
        c.totalReleased += c.costPerConversion;
        c.conversionsCount++;

        // Persist conversion record (released = false until releasePayment is called)
        conversions[conversionId] = ConversionRecord({
            campaignId: campaignId,
            recipient: recipient,
            netAmount: netAmount,
            fee: fee,
            released: false,
            registeredAt: block.timestamp
        });

        emit ConversionRegistered(campaignId, conversionId, recipient, netAmount, fee);
    }

    // ────────────────────────────────────────────────────────────────────────────
    //  CORE — Step 3: releasePayment()
    // ────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Executes the on-chain ETH transfer for a registered conversion.
     * @dev Callable by anyone — trustless settlement once the conversion is
     *      recorded on-chain. Uses checks-effects-interactions pattern.
     * @param conversionId The conversion to pay out.
     */
    function releasePayment(bytes32 conversionId) external nonReentrant {
        ConversionRecord storage conv = conversions[conversionId];
        if (conv.registeredAt == 0) revert ConversionNotFound();
        if (conv.released) revert ConversionAlreadyReleased();

        // Effect: mark released before external calls
        conv.released = true;

        // Interaction: transfer net amount to recipient
        if (conv.netAmount > 0) {
            (bool sent, ) = conv.recipient.call{value: conv.netAmount}("");
            if (!sent) revert PaymentFailed();
        }

        // Interaction: transfer platform fee to treasury
        if (conv.fee > 0) {
            (bool feeSent, ) = payable(treasury).call{value: conv.fee}("");
            if (!feeSent) revert PaymentFailed();
        }

        emit PaymentReleased(conv.campaignId, conversionId, conv.recipient, conv.netAmount);
    }

    // ────────────────────────────────────────────────────────────────────────────
    //  ADVERTISER — refund()
    // ────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Advertiser withdraws remaining (unreserved) campaign balance.
     * @dev Deactivates the campaign — no new conversions can be registered.
     *      Already-registered (unreleased) conversions can still be paid out.
     * @param campaignId Campaign to refund.
     */
    function refund(bytes32 campaignId) external campaignExists(campaignId) nonReentrant {
        Campaign storage c = campaigns[campaignId];
        if (c.advertiser != msg.sender) revert NotAdvertiser();
        if (c.balance == 0) revert ZeroDeposit();

        uint256 refundAmount = c.balance;
        c.balance = 0;
        c.active = false;

        (bool sent, ) = payable(msg.sender).call{value: refundAmount}("");
        if (!sent) revert PaymentFailed();

        emit Refunded(campaignId, msg.sender, refundAmount);
    }

    // ────────────────────────────────────────────────────────────────────────────
    //  ADMIN
    // ────────────────────────────────────────────────────────────────────────────

    function setVerifier(address _verifier) external onlyOwner {
        if (_verifier == address(0)) revert ZeroAddress();
        verifier = _verifier;
        emit VerifierSet(_verifier);
    }

    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert ZeroAddress();
        treasury = _treasury;
        emit TreasurySet(_treasury);
    }

    /**
     * @notice Replace all fee tiers. Tiers must be sorted ascending by upperBound.
     * @param _tiers Array of FeeTier structs. Last tier should use type(uint256).max.
     */
    function setFeeTiers(FeeTier[] calldata _tiers) external onlyOwner {
        require(_tiers.length > 0, "Need at least one tier");
        delete feeTiers;
        for (uint256 i = 0; i < _tiers.length; i++) {
            if (_tiers[i].bps > 1000) revert FeeTooHigh();
            feeTiers.push(_tiers[i]);
        }
        emit FeeTiersUpdated(_tiers.length);
    }

    /// @notice Kept for backward compatibility — sets a single flat fee tier.
    function setPlatformFee(uint256 _bps) external onlyOwner {
        if (_bps > 1000) revert FeeTooHigh();
        delete feeTiers;
        feeTiers.push(FeeTier({ upperBound: type(uint256).max, bps: _bps }));
        emit PlatformFeeSet(_bps);
    }

    // ────────────────────────────────────────────────────────────────────────────
    //  VIEWS
    // ────────────────────────────────────────────────────────────────────────────

    function getCampaign(bytes32 campaignId) external view returns (Campaign memory) {
        return campaigns[campaignId];
    }

    function getConversion(bytes32 conversionId) external view returns (ConversionRecord memory) {
        return conversions[conversionId];
    }

    function isConversionProcessed(bytes32 conversionId) external view returns (bool) {
        return conversions[conversionId].registeredAt != 0;
    }

    /// @notice Returns the fee bps that would apply for a given conversion count.
    function getFeeBps(uint256 conversionCount) external view returns (uint256) {
        return _getFeeBps(conversionCount);
    }

    /// @notice Returns all configured fee tiers.
    function getFeeTiers() external view returns (FeeTier[] memory) {
        return feeTiers;
    }

    // ────────────────────────────────────────────────────────────────────────────
    //  INTERNAL
    // ────────────────────────────────────────────────────────────────────────────

    /// @dev Finds the fee bps for a given conversion count by iterating tiers.
    function _getFeeBps(uint256 conversionCount) internal view returns (uint256) {
        for (uint256 i = 0; i < feeTiers.length; i++) {
            if (conversionCount < feeTiers[i].upperBound) {
                return feeTiers[i].bps;
            }
        }
        // Fallback: last tier's bps (should not reach here if tiers are well-formed)
        return feeTiers[feeTiers.length - 1].bps;
    }
}
