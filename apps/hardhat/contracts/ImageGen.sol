// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "./interfaces/IOracle.sol";

contract ImageGen {
    address private owner;
    address public oracleAddress;
    uint private callsCount;

    struct Response {
        string content;
        bool ready;
    }

    mapping(uint => Response) public responses;
    mapping(address => uint) public userLastCallId;

    event OracleAddressUpdated(address indexed newOracleAddress);
    event NewResponseReceived(uint indexed callId, string response);

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

        responses[currentId] = Response("", false);
        userLastCallId[msg.sender] = currentId;

        IOracle(oracleAddress).createFunctionCall(
            currentId,
            "image_generation",
            message
        );

        return currentId;
    }

    function onOracleFunctionResponse(
        uint runId,
        string memory response,
        string memory errorMessage
    ) public onlyOracle {
        string memory finalResponse = keccak256(abi.encodePacked(errorMessage)) == keccak256(abi.encodePacked("")) 
            ? response 
            : errorMessage;
        
        responses[runId] = Response(finalResponse, true);
        emit NewResponseReceived(runId, finalResponse);
    }

    function getLastResponse() public view returns (string memory, bool) {
        uint callId = userLastCallId[msg.sender];
        return (responses[callId].content, responses[callId].ready);
    }

    function getResponseById(uint callId) public view returns (string memory, bool) {
        return (responses[callId].content, responses[callId].ready);
    }
}