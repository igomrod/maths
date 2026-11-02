import React from 'react';
import { OperationType } from '../types/problem';
import { Sparkles } from 'lucide-react';

interface OperationPickerProps {
  selected: OperationType;
  onSelect: (op: OperationType) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

const OPERATIONS: Array<{
  id: OperationType;
  label: string;
  symbol: string;
  bg: string;
  activeRing: string;
}> = [
  {
    id: 'addition',
    label: 'Sumar',
    symbol: '➕',
    bg: 'from-pink-400 to-rose-500',
    activeRing: 'ring-pink-300',
  },
  {
    id: 'subtraction',
    label: 'Restar',
    symbol: '➖',
    bg: 'from-sky-400 to-blue-500',
    activeRing: 'ring-sky-300',
  },
  {
    id: 'multiplication',
    label: 'Multiplicar',
    symbol: '✖️',
    bg: 'from-amber-400 to-orange-500',
    activeRing: 'ring-amber-300',
  },
  {
    id: 'division',
    label: 'Dividir',
    symbol: '➗',
    bg: 'from-emerald-400 to-teal-500',
    activeRing: 'ring-emerald-300',
  },
  {
    id: 'mixed',
    label: '¡Mezcla Mágica!',
    symbol: '🎲',
    bg: 'from-purple-500 to-indigo-600',
    activeRing: 'ring-purple-300',
  },
];

export const OperationPicker: React.FC<OperationPickerProps> = ({
  selected,
  onSelect,
  onGenerate,
  isGenerating,
}) => {
  return (
    <section
      aria-label="Selector de operaciones"
      className="rounded-3xl border-4 border-amber-200 bg-white/95 p-4 shadow-md sm:p-5"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-800 sm:text-xl">
            1. ¿Qué quieres practicar hoy?
          </h2>
          <p className="text-sm font-semibold text-slate-500">
            Elige el tipo de cuenta y crea un reto nuevo para tu cuaderno
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {OPERATIONS.map((op) => {
            const isSelected = selected === op.id;
            return (
              <button
                key={op.id}
                type="button"
                data-testid={`op-${op.id}`}
                onClick={() => onSelect(op.id)}
                className={`flex items-center gap-2 rounded-2xl px-4 py-3 font-display text-base font-bold transition-all active:scale-95 ${
                  isSelected
                    ? `bg-gradient-to-r ${op.bg} text-white shadow-md ring-4 ${op.activeRing} scale-105`
                    : 'border-2 border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="text-xl">{op.symbol}</span>
                <span>{op.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          data-testid="generate-problem-btn"
          disabled={isGenerating}
          onClick={onGenerate}
          className="flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 px-6 py-4 font-display text-lg font-bold text-white shadow-lg transition-all hover:brightness-110 active:scale-95 disabled:opacity-60"
        >
          <Sparkles className={`h-6 w-6 ${isGenerating ? 'animate-spin' : ''}`} />
          <span>{isGenerating ? 'Inventando problema...' : '¡Nuevo Problema!'}</span>
        </button>
      </div>
    </section>
  );
};
