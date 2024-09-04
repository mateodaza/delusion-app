import React from 'react';

interface SentimentGaugeProps {
  metrics: Record<string, number | string>;
  getThemeClass: (greenClass: string, cyanClass: string) => string;
}

const SentimentGauge: React.FC<SentimentGaugeProps> = ({
  metrics,
  getThemeClass,
}) => {
  const calculateSentiment = () => {
    const numericMetrics = Object.values(metrics).filter(
      (value) => typeof value === 'number'
    ) as number[];
    if (numericMetrics.length === 0) return 50; // Default to neutral if no numeric metrics

    const average =
      numericMetrics.reduce((sum, value) => sum + value, 0) /
      numericMetrics.length;
    return Math.min(Math.max(average, 0), 100); // Ensure the value is between 0 and 100
  };

  const sentiment = calculateSentiment();
  const gaugeColor =
    sentiment > 66
      ? 'bg-green-500'
      : sentiment > 33
        ? 'bg-yellow-500'
        : 'bg-red-500';

  return (
    <div
      className={`mb-4 ${getThemeClass('bg-green-900', 'bg-cyan-900')} bg-opacity-30 p-4 rounded-lg`}
    >
      <h3
        className={`${getThemeClass('text-green-300', 'text-cyan-300')} text-lg font-bold mb-2`}
      >
        Sentiment Gauge
      </h3>
      <div className='w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mb-2'>
        <div
          className={`h-2.5 rounded-full ${gaugeColor}`}
          style={{ width: `${sentiment}%` }}
        ></div>
      </div>
      <div className='flex justify-between text-sm'>
        <span className='text-red-500'>Critical</span>
        <span className='text-yellow-500'>Neutral</span>
        <span className='text-green-500'>Excellent</span>
      </div>
    </div>
  );
};

export default SentimentGauge;
