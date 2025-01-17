import { useTheme } from "~/context/ThemeContext";
import { Icon } from '@iconify/react';
import moonIcon from '@iconify/icons-mdi/weather-night';
import sunIcon from '@iconify/icons-mdi/white-balance-sunny';
import rocketIcon from '@iconify/icons-mdi/rocket';
import { useEffect } from "react";

export default function TestPage() {
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    // Debug logging
    console.log("Current theme:", theme);
    console.log("HTML classes:", document.documentElement.classList.toString());
    console.log("Local storage theme:", localStorage.getItem('theme'));
  }, [theme]);

  const handleThemeToggle = () => {
    console.log("Toggle clicked, current time: ", theme);
    toggleTheme();
  }

  return (
    <div className="min-h-screen p-8 bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
      {/* Theme Toggle Button */}
      <button
        onClick={handleThemeToggle}
        className="fixed top-4 right-4 p-2 rounded-full bg-white dark:bg-slate-800 shadow-lg hover:shadow-xl transition-all"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? (
          <Icon icon={sunIcon} className="w-6 h-6 text-yellow-500" />
        ) : (
          <Icon icon={moonIcon} className="w-6 h-6 text-slate-700" />
        )}
      </button>

      {/* Main Content */}
      <div className="max-w-md mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-lg px-6 py-8 ring-1 ring-slate-900/5 shadow-xl transition-colors duration-200">
          <div>
            <span className="inline-flex items-center justify-center p-2 bg-indigo-500 rounded-md shadow-lg">
              <Icon icon={rocketIcon} className="h-6 w-6 text-white" />
            </span>
          </div>
          <h3 className="text-slate-900 dark:text-white mt-5 text-base font-medium tracking-tight">
            Writes Upside-Down
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
            The Zero Gravity Pen can be used to write in any orientation, including
            upside-down. It even works in outer space.
          </p>
        </div>

        {/* Additional Theme Test Elements */}
        <div className="mt-8 space-y-6">
          {/* Button Variants */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl space-y-4">
            <h4 className="text-slate-900 dark:text-white font-medium">Button Variants</h4>
            <div className="space-x-4">
              <button className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700">
                Primary
              </button>
              <button className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
                Secondary
              </button>
            </div>
          </div>

          {/* Text Styles */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl space-y-4">
            <h4 className="text-slate-900 dark:text-white font-medium">Text Styles</h4>
            <div className="space-y-2">
              <p className="text-gray-900 dark:text-white font-bold">Bold text</p>
              <p className="text-gray-600 dark:text-gray-300">Regular text</p>
              <p className="text-gray-400 dark:text-gray-500">Muted text</p>
              <a href="#" className="text-indigo-500 dark:text-indigo-400 hover:underline">
                Link text
              </a>
            </div>
          </div>

          {/* Card with Border */}
          <div className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl">
            <h4 className="text-slate-900 dark:text-white font-medium mb-4">Card with Border</h4>
            <p className="text-gray-600 dark:text-gray-300">
              This card demonstrates border color changes between light and dark modes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}