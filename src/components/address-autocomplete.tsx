"use client";

import { useRef, useEffect, useState, useCallback } from "react";

interface PlacePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (place: {
    formattedAddress: string;
    placeId?: string;
  }) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
}

export function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Enter address",
  className = "",
  id,
  disabled = false,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPredictions = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setPredictions([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/places/autocomplete?q=${encodeURIComponent(query)}`
      );
      const data = await response.json();

      if (data.error && data.predictions?.length === 0) {
        setError(data.error);
        setPredictions([]);
      } else {
        setPredictions(data.predictions || []);
        setIsOpen((data.predictions || []).length > 0);
      }
    } catch (err) {
      console.error("Address autocomplete error:", err);
      setError("Failed to fetch suggestions");
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onChange(newValue);
      setHighlightedIndex(-1);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        fetchPredictions(newValue);
      }, 300);
    },
    [onChange, fetchPredictions]
  );

  const handleSelectPrediction = useCallback(
    (prediction: PlacePrediction) => {
      onChange(prediction.description);
      setIsOpen(false);
      setPredictions([]);
      setHighlightedIndex(-1);

      if (onPlaceSelect) {
        onPlaceSelect({
          formattedAddress: prediction.description,
          placeId: prediction.placeId,
        });
      }
    },
    [onChange, onPlaceSelect]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen || predictions.length === 0) {
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < predictions.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case "Enter":
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < predictions.length) {
            handleSelectPrediction(predictions[highlightedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          setHighlightedIndex(-1);
          break;
        default:
          break;
      }
    },
    [isOpen, predictions, highlightedIndex, handleSelectPrediction]
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const baseClassName =
    "w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500";
  const combinedClassName = className ? `${baseClassName} ${className}` : baseClassName;

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        id={id}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (predictions.length > 0) {
            setIsOpen(true);
          }
        }}
        placeholder={placeholder}
        className={combinedClassName}
        disabled={disabled}
        autoComplete="off"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls="address-autocomplete-listbox"
        aria-haspopup="listbox"
        aria-autocomplete="list"
      />

      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <svg
            className="animate-spin h-4 w-4 text-slate-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      )}

      {isOpen && predictions.length > 0 && (
        <div
          ref={dropdownRef}
          id="address-autocomplete-listbox"
          className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
          style={{ zIndex: 9999 }}
          role="listbox"
        >
          {predictions.map((prediction, index) => (
            <button
              key={prediction.placeId}
              type="button"
              className={`w-full text-left px-3 py-2 hover:bg-amber-50 focus:bg-amber-50 focus:outline-none cursor-pointer ${
                index === highlightedIndex ? "bg-amber-50" : ""
              } ${index !== predictions.length - 1 ? "border-b border-slate-100" : ""}`}
              onClick={() => handleSelectPrediction(prediction)}
              onMouseEnter={() => setHighlightedIndex(index)}
              role="option"
              aria-selected={index === highlightedIndex}
            >
              <div className="text-sm font-medium text-slate-900">
                {prediction.mainText}
              </div>
              {prediction.secondaryText && (
                <div className="text-xs text-slate-500">
                  {prediction.secondaryText}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {error && error !== "Places API not configured" && !isOpen && (
        <p className="text-xs text-slate-400 mt-1">
          Address suggestions temporarily unavailable
        </p>
      )}
    </div>
  );
}
