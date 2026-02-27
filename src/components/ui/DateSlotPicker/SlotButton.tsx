/**
 * SlotButton component
 * Displays an individual time slot button with availability states
 */

import React from "react";
import { SlotButtonProps } from "./types";

export const SlotButton: React.FC<SlotButtonProps> = ({
  time,
  available,
  selected,
  onClick,
  disabled = false,
  count = 0,
}) => {
  // Format time for display (e.g., "10:00" -> "10:00 AM")
  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  // Determine button styles based on state
  const getButtonClasses = (): string => {
    const baseClasses =
      "px-4 py-2.5 rounded-lg border text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2";

    if (disabled) {
      return `${baseClasses} bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed`;
    }

    if (selected) {
      return `${baseClasses} bg-blue-600 text-white border-blue-600 shadow-sm`;
    }

    if (!available) {
      return `${baseClasses} bg-gray-50 text-gray-500 border-gray-300 cursor-not-allowed opacity-60`;
    }

    // Available slot
    return `${baseClasses} bg-white text-gray-900 border-gray-300 hover:border-blue-500 hover:bg-blue-50 cursor-pointer`;
  };

  // Determine ARIA label for accessibility
  const getAriaLabel = (): string => {
    const formattedTime = formatTime(time);
    if (!available && count > 0) {
      return `${formattedTime}, booked (${count} appointment${count > 1 ? "s" : ""})`;
    }
    if (!available) {
      return `${formattedTime}, booked`;
    }
    if (selected) {
      return `${formattedTime}, selected`;
    }
    return `${formattedTime}, available`;
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || (!available && !selected)}
      className={getButtonClasses()}
      aria-label={getAriaLabel()}
      aria-pressed={selected}
      role="radio"
      aria-checked={selected}
    >
      <div className="flex flex-col items-center">
        <span className="font-semibold">{formatTime(time)}</span>
        {count > 0 && (
          <span className="text-xs mt-0.5 opacity-75">
            {count} booked
          </span>
        )}
      </div>
    </button>
  );
};
