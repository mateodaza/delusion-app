import { useState, useEffect } from 'react';

const useTheme = () => {
  const [isCyanTheme, setIsCyanTheme] = useState(false);

  useEffect(() => {
    // Check if localStorage is available
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme !== null) {
        setIsCyanTheme(JSON.parse(savedTheme));
      }
    }
  }, []);

  useEffect(() => {
    // Update localStorage when theme changes, if available
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('theme', JSON.stringify(isCyanTheme));
    }
  }, [isCyanTheme]);

  const toggleTheme = () => {
    setIsCyanTheme((prevTheme) => !prevTheme);
  };

  return { isCyanTheme, toggleTheme };
};

export default useTheme;
