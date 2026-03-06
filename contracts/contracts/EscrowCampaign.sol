// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract EscrowCampaign {
    struct Campaign {
        address advertiser;
        uint256 budget;
        uint256 deposited;
        uint256 spent;
        uint256 costPerConversion;
        bool active;
    }

    mapping(bytes32 => Campaign) public campaigns;
    address public owner;

    event BudgetDeposited(bytes32 indexed campaignId, address advertiser, uint256 amount);
    event ConversionRegistered(bytes32 indexed campaignId, uint256 amount);
    event PaymentReleased(bytes32 indexed campaignId, address recipient, uint256 amount);
    event Refunded(bytes32 indexed campaignId, address advertiser, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier campaignExists(bytes32 campaignId) {
        require(campaigns[campaignId].advertiser != address(0), "Campaign not found");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function depositBudget(bytes32 campaignId, uint256 costPerConversion) external payable {
        require(msg.value > 0, "Must deposit funds");
        require(costPerConversion > 0, "Invalid cost per conversion");

        Campaign storage c = campaigns[campaignId];

        if (c.advertiser == address(0)) {
            c.advertiser = msg.sender;
            c.costPerConversion = costPerConversion;
            c.active = true;
        } else {
            require(c.advertiser == msg.sender, "Not campaign owner");
        }

        c.budget += msg.value;
        c.deposited += msg.value;

        emit BudgetDeposited(campaignId, msg.sender, msg.value);
    }

    function registerConversion(
        bytes32 campaignId,
        address payable recipient
    ) external onlyOwner campaignExists(campaignId) {
        Campaign storage c = campaigns[campaignId];
        require(c.active, "Campaign not active");
        require(c.budget >= c.costPerConversion, "Insufficient budget");

        c.budget -= c.costPerConversion;
        c.spent += c.costPerConversion;

        emit ConversionRegistered(campaignId, c.costPerConversion);

        (bool sent, ) = recipient.call{value: c.costPerConversion}("");
        require(sent, "Payment failed");

        emit PaymentReleased(campaignId, recipient, c.costPerConversion);
    }

    function refund(bytes32 campaignId) external campaignExists(campaignId) {
        Campaign storage c = campaigns[campaignId];
        require(c.advertiser == msg.sender, "Not campaign owner");
        require(c.budget > 0, "No funds to refund");

        uint256 refundAmount = c.budget;
        c.budget = 0;
        c.active = false;

        (bool sent, ) = payable(msg.sender).call{value: refundAmount}("");
        require(sent, "Refund failed");

        emit Refunded(campaignId, msg.sender, refundAmount);
    }

    function getCampaign(bytes32 campaignId) external view returns (Campaign memory) {
        return campaigns[campaignId];
    }
}
