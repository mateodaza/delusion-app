import { useState, useEffect, useCallback, useMemo } from 'react';

interface Message {
  role: string;
  content: Array<{ contentType: string; value: string }>;
}

interface GameState {
  Title?: string;
  Challenge: string;
  Metrics: Record<string, number | string>;
  Options: Array<{
    Description: string;
    Outcome: string;
  }>;
  Summary: string;
}

interface Step {
  index: number;
  gameState: GameState | null;
  userMessage: string;
}

export const useGameState = (messageHistory: Message[] | undefined) => {
  const [currentStep, setCurrentStep] = useState<Step>({
    index: 0,
    gameState: null,
    userMessage: '',
  });
  const [totalSteps, setTotalSteps] = useState(0);

  const parseGameState = useCallback((message: Message): GameState | null => {
    if (message.role !== 'assistant') return null;

    try {
      const reconstructJson = (str: string): Partial<GameState> => {
        const result: Partial<GameState> = {};

        const parseProperty = (prop: keyof GameState, value: string) => {
          try {
            const parsed = JSON.parse(value);
            switch (prop) {
              case 'Title':
              case 'Challenge':
              case 'Summary':
                result[prop] =
                  typeof parsed === 'string'
                    ? parsed
                    : value.replace(/^"|"$/g, '');
                break;
              case 'Metrics':
                result[prop] = typeof parsed === 'object' ? parsed : {};
                break;
              case 'Options':
                result[prop] = Array.isArray(parsed) ? parsed : [];
                break;
            }
          } catch (e) {
            console.error(`Failed to parse ${prop}:`, e);
            // Use type-appropriate default values
            if (prop === 'Metrics') result[prop] = {};
            else if (prop === 'Options') result[prop] = [];
            else result[prop] = value.replace(/^"|"$/g, '');
          }
        };

        ['Title', 'Challenge', 'Options', 'Metrics', 'Summary'].forEach(
          (prop) => {
            const regex = new RegExp(
              `"${prop}":\\s*("(?:\\\\.|[^"\\\\])*"|\\[[^\\]]*\\]|{[^}]*})`
            );
            const match = str.match(regex);
            if (match) {
              parseProperty(prop as keyof GameState, match[1]);
            }
          }
        );

        return result;
      };

      const partialGameState = reconstructJson(message.content[0].value.trim());

      // Ensure required properties are present, use defaults if missing
      const gameState: GameState = {
        Challenge: partialGameState.Challenge || 'No challenge available',
        Metrics: partialGameState.Metrics || {},
        Options: partialGameState.Options || [],
        Summary: partialGameState.Summary || 'No summary available',
        ...(partialGameState.Title && { Title: partialGameState.Title }),
      };

      return gameState;
    } catch (error) {
      console.error('Failed to parse game state:', error);
      return null;
    }
  }, []);

  const updateCurrentStep = useCallback(
    (stepIndex: number) => {
      if (
        !messageHistory ||
        stepIndex < 0 ||
        stepIndex >= Math.floor((messageHistory.length - 1) / 2)
      )
        return;

      const userMessageIndex = stepIndex * 2 + 1;
      const assistantMessageIndex = userMessageIndex + 1;

      const userMessage = messageHistory[userMessageIndex].content[0].value;
      const gameState = parseGameState(messageHistory[assistantMessageIndex]);

      setCurrentStep({ index: stepIndex, gameState, userMessage });
    },
    [messageHistory, parseGameState]
  );

  useEffect(() => {
    if (messageHistory && messageHistory.length > 1) {
      const steps = Math.floor((messageHistory.length - 1) / 2);
      setTotalSteps(steps);
      updateCurrentStep(steps - 1); // Set to the last step
    }
  }, [messageHistory, updateCurrentStep]);

  const goToStep = useCallback(
    (step: number) => {
      const maxStep = Math.floor((messageHistory?.length ?? 1) - 1) / 2 - 1;
      const targetStep = Math.min(Math.max(0, step), maxStep);
      updateCurrentStep(targetStep);
    },
    [messageHistory, updateCurrentStep]
  );

  const goToPreviousStep = useCallback(() => {
    goToStep(currentStep.index - 1);
  }, [currentStep.index, goToStep]);

  const goToNextStep = useCallback(() => {
    goToStep(currentStep.index + 1);
  }, [currentStep.index, goToStep]);

  const isLastStep = useMemo(() => {
    if (!messageHistory) return false;
    return (
      currentStep.index === Math.floor((messageHistory.length - 1) / 2) - 1
    );
  }, [messageHistory, currentStep.index]);

  const isFirstStep = useMemo(
    () => currentStep.index === 0,
    [currentStep.index]
  );

  return {
    currentStep,
    totalSteps,
    goToPreviousStep,
    goToNextStep,
    isFirstStep,
    isLastStep,
  };
};
