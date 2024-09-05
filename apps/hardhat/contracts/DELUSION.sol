// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "./interfaces/IOracle.sol";

contract DELUSION {
    string public prompt;

    struct ChatRun {
        address owner;
        IOracle.Message[] messages;
        uint messagesCount;
    }

    mapping(uint => ChatRun) public chatRuns;
    uint private chatRunsCount;

    event ChatCreated(address indexed owner, uint indexed chatId);

    address private owner;
    address public oracleAddress;

    event OracleAddressUpdated(address indexed newOracleAddress);

    IOracle.GroqRequest private config;

    // Image storage
    mapping(uint256 => mapping(uint256 => string)) public chatImageUrls; // chatId => messageIndex => imageUrl

    event ImageRequestCreated(uint256 indexed chatId, uint256 indexed messageIndex, string scenario);
    event ImageGenerated(uint256 indexed chatId, uint256 indexed messageIndex, string imageUrl);
    event ImageStored(uint256 indexed chatId, uint256 indexed messageIndex, string url);

    constructor(address initialOracleAddress, string memory initialPrompt) {
        owner = msg.sender;
        oracleAddress = initialOracleAddress;
        prompt = initialPrompt;
        chatRunsCount = 0;

        config = IOracle.GroqRequest({
            model : "mixtral-8x7b-32768",
            frequencyPenalty : 21, 
            logitBias : "", 
            maxTokens : 1000, 
            presencePenalty : 21, 
            responseFormat : "{\"type\":\"text\"}",
            seed : 0, 
            stop : "", 
            temperature : 10, 
            topP : 101, 
            user : "" 
        });
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

    function startChat(string memory message) public returns (uint) {
        ChatRun storage run = chatRuns[chatRunsCount];
        run.owner = msg.sender;

        IOracle.Message memory systemMessage = createTextMessage("system", prompt);
        run.messages.push(systemMessage);
        run.messagesCount++;

        IOracle.Message memory userMessage = createTextMessage("user", message);
        run.messages.push(userMessage);
        run.messagesCount++;

        uint currentId = chatRunsCount;
        chatRunsCount += 1;

        IOracle(oracleAddress).createGroqLlmCall(currentId, config);
        emit ChatCreated(msg.sender, currentId);

        return currentId;
    }

    function onOracleGroqLlmResponse(
        uint runId,
        IOracle.GroqResponse memory response,
        string memory errorMessage
    ) public onlyOracle {
        ChatRun storage run = chatRuns[runId];
        require(
            keccak256(abi.encodePacked(run.messages[run.messagesCount - 1].role)) == keccak256(abi.encodePacked("user")),
            "No message to respond to"
        );
        if (!compareStrings(errorMessage, "")) {
            IOracle.Message memory newMessage = createTextMessage("assistant", errorMessage);
            run.messages.push(newMessage);
            run.messagesCount++;
        } else {
            IOracle.Message memory newMessage = createTextMessage("assistant", response.content);
            run.messages.push(newMessage);
            run.messagesCount++;
        }
    }

    function addMessage(string memory message, uint runId) public {
        ChatRun storage run = chatRuns[runId];
        require(
            keccak256(abi.encodePacked(run.messages[run.messagesCount - 1].role)) == keccak256(abi.encodePacked("assistant")),
            "No response to previous message"
        );
        require(
            run.owner == msg.sender, "Only chat owner can add messages"
        );

        IOracle.Message memory newMessage = createTextMessage("user", message);
        run.messages.push(newMessage);
        run.messagesCount++;

        IOracle(oracleAddress).createGroqLlmCall(runId, config);
    }

    function getMessageHistory(uint chatId) public view returns (IOracle.Message[] memory) {
        return chatRuns[chatId].messages;
    }

    function createTextMessage(string memory role, string memory content) private pure returns (IOracle.Message memory) {
        IOracle.Message memory newMessage = IOracle.Message({
            role: role,
            content: new IOracle.Content[](1)
        });
        newMessage.content[0].contentType = "text";
        newMessage.content[0].value = content;
        return newMessage;
    }

    function compareStrings(string memory a, string memory b) private pure returns (bool) {
        return (keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b))));
    }

    function requestImage(uint256 chatId, uint256 messageIndex, string memory scenario) public {
        require(chatRuns[chatId].owner == msg.sender, "Only chat owner can request images");
        require(messageIndex < chatRuns[chatId].messagesCount, "Invalid message index");
        
        uint256 requestId = uint256(keccak256(abi.encodePacked(chatId, messageIndex)));
        
        IOracle(oracleAddress).createFunctionCall(
            requestId,
            "image_generation",
            scenario
        );

        emit ImageRequestCreated(chatId, messageIndex, scenario);
    }

    function onOracleFunctionResponse(
        uint256 requestId,
        string memory response,
        string memory errorMessage
    ) public onlyOracle {
        (uint256 chatId, uint256 messageIndex) = decodeRequestId(requestId);

        if (bytes(errorMessage).length == 0) {
            chatImageUrls[chatId][messageIndex] = response;
            emit ImageStored(chatId, messageIndex, response);
            emit ImageGenerated(chatId, messageIndex, response);
        } else {
            chatImageUrls[chatId][messageIndex] = errorMessage;
            emit ImageStored(chatId, messageIndex, errorMessage);
        }
    }

    function getAllChatImages(uint256 chatId, uint256 lastIndex) public view returns (uint256[] memory, string[] memory, uint256) {
        uint256[] memory indices = new uint256[](lastIndex + 1);
        string[] memory urls = new string[](lastIndex + 1);
        uint256 count = 0;

        for (uint256 i = 0; i <= lastIndex; i++) {
            string memory url = chatImageUrls[chatId][i];
            if (bytes(url).length > 0) {
                indices[count] = i;
                urls[count] = url;
                count++;
            }
        }

        // Resize arrays to actual count
        assembly {
            mstore(indices, count)
            mstore(urls, count)
        }

        return (indices, urls, count);
    }


    function getImageUrl(uint256 chatId, uint256 messageIndex) public view returns (string memory) {
        return chatImageUrls[chatId][messageIndex];
    }

    function decodeRequestId(uint256 requestId) private pure returns (uint256 chatId, uint256 messageIndex) {
        chatId = requestId >> 128;
        messageIndex = uint128(requestId);
    }

    function getImageCount(uint256 chatId) public view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < chatRuns[chatId].messagesCount; i++) {
            if (bytes(chatImageUrls[chatId][i]).length > 0) {
                count++;
            }
        }
        return count;
    }

    function debugImageStorage(uint256 chatId, uint256 messageIndex) public view returns (bool, string memory) {
        string memory url = chatImageUrls[chatId][messageIndex];
        return (bytes(url).length > 0, url);
    }
}