import React, { useState, useEffect, useRef } from 'react';
import { evaluateMathExpression, formatCurrency } from '../utils/formatters';
import { Calculator } from 'lucide-react';

interface SmartMoneyInputProps {
  id?: string;
  value: number | string | undefined | null;
  rawExpression?: string;
  onChange: (numericValue: number, rawExpr?: string) => void;
  placeholder?: string;
  className?: string;
  currencySymbol?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  showLiveSum?: boolean;
}

export const SmartMoneyInput: React.FC<SmartMoneyInputProps> = ({
  id,
  value,
  rawExpression,
  onChange,
  placeholder = '0,00',
  className = '',
  currencySymbol = '₺',
  autoFocus = false,
  disabled = false,
  showLiveSum = true,
}) => {
  // Determine initial display string: prefer rawExpression if available, otherwise format numeric value
  const getInitialText = () => {
    if (rawExpression && rawExpression.trim()) {
      return rawExpression;
    }
    if (value === 0 || value === '0') return '';
    if (value !== undefined && value !== null && value !== '') {
      return value.toString();
    }
    return '';
  };

  const [text, setText] = useState<string>(getInitialText);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external changes when not focused
  useEffect(() => {
    if (!isFocused) {
      if (rawExpression && rawExpression.trim() && rawExpression.includes('+')) {
        setText(rawExpression);
      } else if (value !== undefined && value !== null && value !== '' && Number(value) > 0) {
        setText(value.toString());
      } else if (value === 0 || value === '') {
        setText('');
      }
    }
  }, [value, rawExpression, isFocused]);

  // Evaluate current text live
  const evalResult = evaluateMathExpression(text);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    // Allow digits, commas, dots, plus (+), minus (-), spaces
    const sanitized = rawVal.replace(/[^0-9.,+\-\s]/g, '');
    setText(sanitized);

    const result = evaluateMathExpression(sanitized);
    onChange(result.total, sanitized.includes('+') ? sanitized : undefined);
  };

  const handleBlur = () => {
    setIsFocused(false);
    const result = evaluateMathExpression(text);
    if (result.isExpression) {
      // Keep expression in text if multiple items
      onChange(result.total, text);
    } else {
      if (result.total > 0) {
        // Format to clean string representation if single number
        const formatted = result.total % 1 === 0 ? result.total.toString() : result.total.toFixed(2).replace('.', ',');
        setText(formatted);
        onChange(result.total, undefined);
      } else {
        setText('');
        onChange(0, undefined);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="decimal"
          value={text}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          style={{ paddingRight: currencySymbol ? '2.25rem' : undefined }}
          className={`w-full bg-[#0d1117] border rounded-lg font-mono text-right pl-3 py-2 transition ${
            evalResult.isExpression
              ? 'border-sky-500/70 bg-sky-500/10 text-sky-300 font-bold'
              : 'border-[#30363d] focus:border-sky-500 text-gray-100'
          } ${className}`}
        />
        {currencySymbol && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold font-mono pointer-events-none select-none">
            {currencySymbol}
          </span>
        )}
      </div>

      {/* Live Sum Tooltip / Badge when multiple Z reports are summed with '+' */}
      {showLiveSum && evalResult.isExpression && (
        <div className="mt-1 flex items-center justify-between text-xs font-mono bg-sky-500/15 text-sky-300 border border-sky-500/40 px-2.5 py-1 rounded shadow-sm">
          <span className="flex items-center space-x-1.5 font-medium">
            <Calculator className="w-3.5 h-3.5 text-sky-400" />
            <span>{evalResult.count} Z Toplamı:</span>
          </span>
          <strong className="text-white font-bold">{formatCurrency(evalResult.total)}</strong>
        </div>
      )}
    </div>
  );
};
