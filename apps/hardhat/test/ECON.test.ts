import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

const PROMPT =
  'Welcome to ECON game. Make decisions to balance growth and sustainability.';

describe('ECON', function () {
  async function deploy() {
    const allSigners = await ethers.getSigners();
    const owner = allSigners[0];
    const AgentOracle = await ethers.getContractFactory('ChatOracle');
    const oracle = await AgentOracle.deploy();
    await oracle.updateWhitelist(owner.address, true);

    const ECON = await ethers.getContractFactory('ECON');
    const econ = await ECON.deploy(oracle.target, PROMPT);

    return { econ, oracle, owner };
  }

  describe('Initialization', function () {
    it('Should return system prompt', async () => {
      const { econ } = await loadFixture(deploy);
      const prompt = await econ.systemPrompt();
      expect(prompt).to.equal(PROMPT);
    });
  });

  describe('Game Mechanics', function () {
    it('Should start game with initial messages', async () => {
      const { econ, owner } = await loadFixture(deploy);

      await econ.startGame('City');
      const gameState = await econ.getGameState(0);

      expect(gameState.player).to.equal(owner.address);
      expect(gameState.environment).to.equal('City');
      expect(gameState.isFinished).to.be.false;
      expect(gameState.messages.length).to.equal(2);
      expect(gameState.messages[0].role).to.equal('system');
      expect(gameState.messages[0].content).to.equal(PROMPT);
      expect(gameState.messages[1].role).to.equal('user');
      expect(gameState.messages[1].content).to.include(
        'Start a new game in the City environment'
      );
    });
  });

  describe('Error Handling', function () {
    it('Cannot make decision for non-existent game', async () => {
      const { econ } = await loadFixture(deploy);
      await expect(econ.makeDecision(999, 'Test decision')).to.be.revertedWith(
        'Game does not exist'
      );
    });

    it('Cannot make decision for finished game', async () => {
      const { econ, owner } = await loadFixture(deploy);

      await econ.startGame('City');
      await econ.connect(owner).endGame(0);

      await expect(econ.makeDecision(0, 'Test decision')).to.be.revertedWith(
        'Game is finished'
      );
    });
  });
});
