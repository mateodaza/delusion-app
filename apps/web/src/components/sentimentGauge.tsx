import React from 'react';

interface RealityChallengeGaugeProps {
  metrics: Record<string, number | string>;
  getThemeClass: (greenClass: string, cyanClass: string) => string;
}

const RealityChallengeGauge: React.FC<RealityChallengeGaugeProps> = ({
  metrics,
  getThemeClass,
}) => {
  const calculateOutcome = () => {
    const numericMetrics = Object.values(metrics).filter(
      (value) => typeof value === 'number'
    ) as number[];
    if (numericMetrics.length === 0) return 50; // Default to middle if no numeric metrics

    const sortedMetrics = numericMetrics.sort((a, b) => a - b);
    const middle = Math.floor(sortedMetrics.length / 2);

    let median;
    if (sortedMetrics.length % 2 === 0) {
      median = (sortedMetrics[middle - 1] + sortedMetrics[middle]) / 2;
    } else {
      median = sortedMetrics[middle];
    }

    return Math.min(Math.max(median, 0), 100); // Ensure the value is between 0 and 100
  };

  const outcome = calculateOutcome();
  const gaugeColor =
    outcome < 33
      ? 'bg-red-500'
      : outcome < 66
        ? 'bg-yellow-500'
        : 'bg-green-500';

  return (
    <div
      className={`flex items-center space-x-2 py-1 px-2 ${getThemeClass('bg-green-900', 'bg-cyan-900')} bg-opacity-30 rounded-lg`}
    >
      <span
        className={`text-xs font-medium ${getThemeClass('text-green-300', 'text-cyan-300')}`}
      >
        Outcome:
      </span>
      <div className='flex-grow bg-gray-200 rounded-full h-1.5 dark:bg-gray-700'>
        <div
          className={`h-1.5 rounded-full ${gaugeColor}`}
          style={{ width: `${outcome}%` }}
        ></div>
      </div>
      <span className={`text-xs font-medium`}>{outcome.toFixed(0)}%</span>
    </div>
  );
};

export default RealityChallengeGauge;
