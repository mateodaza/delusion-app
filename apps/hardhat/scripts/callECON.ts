import { Contract } from 'ethers';
import { ethers } from 'hardhat';
import readline from 'readline';

async function main() {
  const contractABI = [
    'function startChat(string memory message) public returns (uint)',
    'function addMessage(string memory message, uint runId) public',
    'function getMessageHistory(uint chatId) public view returns (tuple(string role, tuple(string contentType, string value)[] content)[])',
    'event ChatCreated(address indexed owner, uint indexed chatId)',
  ];

  if (!process.env.ECON_CONTRACT_ADDRESS) {
    throw new Error('ECON_CONTRACT_ADDRESS env variable is not set.');
  }

  const contractAddress = process.env.ECON_CONTRACT_ADDRESS;
  const [signer] = await ethers.getSigners();

  // Create a contract instance
  const contract = new ethers.Contract(contractAddress, contractABI, signer);

  // Set up event listener for ChatCreated
  let chatIdBN: any = null;
  const chatCreatedPromise = new Promise<void>((resolve) => {
    contract.once('ChatCreated', (owner, chatId) => {
      chatIdBN = chatId;
      resolve();
    });
  });

  // Start the chat
  const initialMessage = await getUserInput(
    'Enter your initial message to start the chat: '
  );
  await contract.startChat(initialMessage);

  // Wait for the ChatCreated event
  await chatCreatedPromise;

  if (!chatIdBN) {
    throw new Error('Failed to retrieve chat ID from event');
  }

  console.log(`Chat started. Chat ID: ${chatIdBN.toString()}`);

  let lastSeenMessageIndex = 1; // Start from 1 to skip the initial system message

  while (true) {
    // Wait for the assistant's response
    console.log("Waiting for assistant's response...");
    await waitForAssistantResponse(contract, chatIdBN, lastSeenMessageIndex);

    // Update lastSeenMessageIndex
    const history = await contract.getMessageHistory(chatIdBN);
    lastSeenMessageIndex = history.length;

    // Get the next user message
    const userMessage = await getUserInput(
      "Enter your message (or type 'exit' to quit): "
    );
    if (userMessage.toLowerCase() === 'exit') {
      break;
    }

    // Send the user's message
    await contract.addMessage(userMessage, chatIdBN);
    console.log('Message sent. Waiting for response...');
  }

  console.log('Chat ended. Goodbye!');
}

async function waitForAssistantResponse(
  contract: Contract,
  chatIdBN: BigInt,
  lastSeenMessageIndex: number
) {
  while (true) {
    try {
      const history = await contract.getMessageHistory(chatIdBN);
      for (let i = lastSeenMessageIndex; i < history.length; i++) {
        const message = history[i];
        if (message.role === 'assistant') {
          console.log(`Assistant: ${message.content[0].value}`);
          return;
        }
      }
    } catch (error) {
      console.error('Error fetching message history:', error);
    }
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for 2 seconds before checking again
  }
}

async function getUserInput(prompt: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
