// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "./interfaces/IOracle.sol";

contract ImageGen {
    address private owner;
    address public oracleAddress;
    uint private callsCount;

    string public lastResponse;
    bool public responseReady;

    event OracleAddressUpdated(address indexed newOracleAddress);
    event NewResponseReceived(string response);

    constructor(address initialOracleAddress) {
        owner = msg.sender;
        oracleAddress = initialOracleAddress;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not owner");
        _;
    }

    modifier onlyOracle() {
        require(msg.sender == oracleAddress, "Caller is not oracle");
        _;
    }

    function setOracleAddress(address newOracleAddress) public onlyOwner {
        oracleAddress = newOracleAddress;
        emit OracleAddressUpdated(newOracleAddress);
    }

    function initializeDalleCall(string memory message) public returns (uint) {
        uint currentId = callsCount;
        callsCount = currentId + 1;

        responseReady = false;

        IOracle(oracleAddress).createFunctionCall(
            currentId,
            "image_generation",
            message
        );

        return currentId;
    }

    function onOracleFunctionResponse(
        uint /*runId*/,
        string memory response,
        string memory errorMessage
    ) public onlyOracle {
        if (keccak256(abi.encodePacked(errorMessage)) != keccak256(abi.encodePacked(""))) {
            lastResponse = errorMessage;
        } else {
            lastResponse = response;
        }
        responseReady = true;
        emit NewResponseReceived(lastResponse);
    }

    function getLastResponse() public view returns (string memory, bool) {
        return (lastResponse, responseReady);
    }
}