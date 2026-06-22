import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, TrendingUp, TrendingDown, Wallet, Calendar, Clock, Sparkles } from 'lucide-react';

// 1. Sales vs Expenses Grouped Bar Chart
export function SalesExpensesChart({ chartData, height = 240 }) {
  const [hoveredBar, setHoveredBar] = useState(null);

  const maxVal = useMemo(() => {
    const peak = Math.max(...chartData.map(d => Math.max(d.sales, d.expenses)), 100);
    return peak * 1.1; // Add 10% breathing space
  }, [chartData]);

  // Compute 5 Y-Axis ticks
  const yTicks = useMemo(() => {
    const ticks = [];
    for (let i = 4; i >= 0; i--) {
      ticks.push((maxVal * i) / 4);
    }
    return ticks;
  }, [maxVal]);

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs relative">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 mb-6 gap-3">
        <div>
          <h3 className="font-black text-sm text-slate-900 tracking-tight">Sales vs Expenses Trajectory</h3>
          <p className="text-slate-400 text-[10px] font-mono mt-0.5">Chronologically bucketed activity values</p>
        </div>
        <div className="flex gap-4 text-[10px] font-bold">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-indigo-600 rounded" />
            <span className="text-slate-600">Gross Revenue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-amber-500 rounded" />
            <span className="text-slate-600">Total Expenses</span>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-4">
        {/* Y-Axis Labels */}
        <div className="hidden sm:flex flex-col justify-between text-[9px] font-mono font-bold text-slate-400 select-none pb-8" style={{ height: `${height}px` }}>
          {yTicks.map((val, idx) => (
            <span key={idx}>₹{val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(0)}</span>
          ))}
        </div>

        {/* Chart Container */}
        <div className="flex-1 relative flex items-end justify-between gap-3 sm:gap-4 pt-4 pb-2 px-1 border-l border-slate-100" style={{ height: `${height}px` }}>
          {/* Horizontal Grid lines */}
          <div className="absolute inset-x-0 bottom-2 top-4 flex flex-col justify-between pointer-events-none">
            <div className="w-full border-t border-slate-100/80" />
            <div className="w-full border-t border-slate-100/80" />
            <div className="w-full border-t border-slate-100/80" />
            <div className="w-full border-t border-slate-100/80" />
          </div>

          {chartData.map((d, idx) => {
            const salePct = (d.sales / maxVal) * 100;
            const expPct = (d.expenses / maxVal) * 100;

            return (
              <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end relative z-10">
                <div className="w-full flex items-end justify-center gap-1 sm:gap-2">
                  {/* Sales Bar */}
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(salePct, 3)}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    onMouseEnter={() => setHoveredBar({ index: idx, type: 'sales' })}
                    onMouseLeave={() => setHoveredBar(null)}
                    className="flex-1 max-w-[20px] sm:max-w-[24px] bg-indigo-600/85 hover:bg-indigo-600 rounded-t-md transition-all duration-200 relative cursor-pointer"
                  >
                    {hoveredBar?.index === idx && hoveredBar?.type === 'sales' && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-20 bg-slate-900 text-white font-mono text-[9px] font-black py-1 px-2 rounded shadow-md whitespace-nowrap">
                        Sales: ₹{d.sales.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                      </div>
                    )}
                  </motion.div>

                  {/* Expenses Bar */}
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(expPct, 3)}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
                    onMouseEnter={() => setHoveredBar({ index: idx, type: 'expenses' })}
                    onMouseLeave={() => setHoveredBar(null)}
                    className="flex-1 max-w-[20px] sm:max-w-[24px] bg-amber-500/85 hover:bg-amber-500 rounded-t-md transition-all duration-200 relative cursor-pointer"
                  >
                    {hoveredBar?.index === idx && hoveredBar?.type === 'expenses' && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-20 bg-slate-900 text-white font-mono text-[9px] font-black py-1 px-2 rounded shadow-md whitespace-nowrap">
                        Exp: ₹{d.expenses.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                      </div>
                    )}
                  </motion.div>
                </div>

                {/* X-Axis Label */}
                <div className="w-full text-center text-[9px] font-bold text-slate-400 mt-2 truncate font-mono select-none">
                  {d.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// 2. Cash Flow Area Trend Line Chart
export function CashFlowAreaChart({ chartData, height = 200 }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const pointsData = useMemo(() => {
    // Cumulative cash flow trends (running Net balance)
    let runningNet = 0;
    return chartData.map((d) => {
      runningNet += (d.sales - d.expenses);
      return {
        label: d.label,
        value: runningNet
      };
    });
  }, [chartData]);

  const { minVal, maxVal } = useMemo(() => {
    const vals = pointsData.map(p => p.value);
    const min = Math.min(...vals, 0);
    const max = Math.max(...vals, 100);
    const padding = (max - min) * 0.1 || 20;
    return { minVal: min - padding, maxVal: max + padding };
  }, [pointsData]);

  // Compute SVG Points coordinates
  const svgWidth = 500;
  const svgHeight = height - 40;
  const coordinates = useMemo(() => {
    if (pointsData.length === 0) return [];
    return pointsData.map((p, idx) => {
      const x = (idx / (pointsData.length - 1)) * (svgWidth - 40) + 20;
      const y = svgHeight - 20 - ((p.value - minVal) / (maxVal - minVal)) * (svgHeight - 40);
      return { x, y, label: p.label, value: p.value };
    });
  }, [pointsData, minVal, maxVal, svgHeight]);

  const linePath = useMemo(() => {
    if (coordinates.length === 0) return '';
    return coordinates.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
  }, [coordinates]);

  const areaPath = useMemo(() => {
    if (coordinates.length === 0) return '';
    const baseLineY = svgHeight - 10;
    return `${linePath} L ${coordinates[coordinates.length - 1].x} ${baseLineY} L ${coordinates[0].x} ${baseLineY} Z`;
  }, [coordinates, linePath, svgHeight]);

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs relative">
      <div className="border-b border-slate-100 pb-4 mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-black text-sm text-slate-900 tracking-tight">Cumulative Cash Flow Trend</h3>
          <p className="text-slate-400 text-[10px] font-mono mt-0.5">Running Net Balance position trajectory</p>
        </div>
        <div className="flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[9px] font-black uppercase text-emerald-800 font-mono">Net Flow Position</span>
        </div>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full overflow-visible">
          <defs>
            <linearGradient id="cashFlowGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Zero balance indicator line */}
          {minVal < 0 && maxVal > 0 && (
            <line
              x1="20"
              y1={svgHeight - 20 - ((0 - minVal) / (maxVal - minVal)) * (svgHeight - 40)}
              x2={svgWidth - 20}
              y2={svgHeight - 20 - ((0 - minVal) / (maxVal - minVal)) * (svgHeight - 40)}
              stroke="#E2E8F0"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
          )}

          {/* Fill Area */}
          {coordinates.length > 0 && (
            <path d={areaPath} fill="url(#cashFlowGrad)" />
          )}

          {/* Trend Line */}
          {coordinates.length > 0 && (
            <motion.path
              d={linePath}
              fill="none"
              stroke="#3B82F6"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, ease: 'easeInOut' }}
            />
          )}

          {/* Data Points */}
          {coordinates.map((c, idx) => (
            <g key={idx}>
              <circle
                cx={c.x}
                cy={c.y}
                r="4.5"
                fill="#3B82F6"
                stroke="#FFFFFF"
                strokeWidth="2"
                className="cursor-pointer transition-all hover:scale-125"
                onMouseEnter={() => setHoveredPoint(idx)}
                onMouseLeave={() => setHoveredPoint(null)}
              />
              {hoveredPoint === idx && (
                <foreignObject
                  x={c.x - 70}
                  y={c.y - 45}
                  width="140"
                  height="40"
                  className="pointer-events-none z-30"
                >
                  <div className="bg-slate-900 border border-slate-800 text-white font-mono text-[9px] py-1 px-1.5 rounded shadow-lg text-center leading-none flex flex-col justify-center">
                    <span className="font-bold text-slate-400 text-[8px] uppercase tracking-wide">{c.label}</span>
                    <span className="font-black mt-0.5">₹{c.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                </foreignObject>
              )}
            </g>
          ))}
        </svg>

        {/* X-Axis labels at bottom */}
        <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 font-mono px-3.5 mt-2 select-none border-t border-slate-100 pt-1.5">
          {pointsData.map((p, idx) => (
            <span key={idx} className="truncate max-w-[60px] text-center">{p.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// 3. Payment Mode Donut Chart
export function PaymentModesDonut({ paymentModeStats }) {
  const [hoveredSlice, setHoveredSlice] = useState(null);

  const radius = 32;
  const circumference = 2 * Math.PI * radius; // ~201.06

  const slices = useMemo(() => {
    const { upi, cash, cheque, total } = paymentModeStats;
    if (total === 0) {
      return [
        { label: 'NO DATA', value: 100, pct: 100, color: 'stroke-slate-100', bg: 'bg-slate-100', textColor: 'text-slate-400' }
      ];
    }

    const arr = [];
    let accumulatedPct = 0;

    // UPI
    if (upi > 0) {
      const pct = (upi / total) * 100;
      arr.push({
        id: 'upi',
        label: '📱 UPI',
        value: upi,
        pct,
        color: 'stroke-blue-500',
        bg: 'bg-blue-500',
        textColor: 'text-blue-600',
        offset: -(accumulatedPct / 100) * circumference
      });
      accumulatedPct += pct;
    }

    // CASH
    if (cash > 0) {
      const pct = (cash / total) * 100;
      arr.push({
        id: 'cash',
        label: '💵 CASH',
        value: cash,
        pct,
        color: 'stroke-emerald-500',
        bg: 'bg-emerald-500',
        textColor: 'text-emerald-600',
        offset: -(accumulatedPct / 100) * circumference
      });
      accumulatedPct += pct;
    }

    // CHEQUE
    if (cheque > 0) {
      const pct = (cheque / total) * 100;
      arr.push({
        id: 'cheque',
        label: '🏦 CHEQUE',
        value: cheque,
        pct,
        color: 'stroke-indigo-500',
        bg: 'bg-indigo-500',
        textColor: 'text-indigo-600',
        offset: -(accumulatedPct / 100) * circumference
      });
      accumulatedPct += pct;
    }

    return arr;
  }, [paymentModeStats, circumference]);

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between h-full">
      <div>
        <h3 className="font-black text-sm text-slate-900 tracking-tight">Payment Distribution</h3>
        <p className="text-slate-400 text-[10px] font-mono mt-0.5">Voucher transaction allocation metrics</p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-around gap-6 my-4">
        {/* SVG Donut */}
        <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            {/* Base Circle */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke="#F1F5F9"
              strokeWidth="11"
            />
            {/* Slices */}
            {slices.map((slice, idx) => (
              <motion.circle
                key={idx}
                cx="50"
                cy="50"
                r={radius}
                fill="transparent"
                className={`${slice.color} transition-all duration-300`}
                strokeWidth={hoveredSlice === idx ? '14' : '11'}
                strokeDasharray={`${(slice.pct * circumference) / 100} ${circumference}`}
                strokeDashoffset={slice.offset || 0}
                strokeLinecap="round"
                onMouseEnter={() => setHoveredSlice(idx)}
                onMouseLeave={() => setHoveredSlice(null)}
              />
            ))}
          </svg>

          {/* Centered Readout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {hoveredSlice !== null ? (
              <>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  {slices[hoveredSlice].id ? slices[hoveredSlice].id.toUpperCase() : 'SHARE'}
                </span>
                <span className="text-xs font-black text-slate-900 font-mono">
                  {slices[hoveredSlice].pct.toFixed(1)}%
                </span>
              </>
            ) : (
              <>
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">TOTAL</span>
                <span className="text-sm font-black text-slate-950 font-mono">
                  ₹{paymentModeStats.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Legend Grid */}
        <div className="space-y-3 flex-1">
          {slices.map((slice, idx) => (
            <div
              key={idx}
              className={`p-2.5 rounded-xl border border-slate-100 flex items-center justify-between transition-colors ${
                hoveredSlice === idx ? 'bg-slate-50 border-slate-200' : 'bg-transparent'
              }`}
              onMouseEnter={() => setHoveredSlice(idx)}
              onMouseLeave={() => setHoveredSlice(null)}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded ${slice.bg}`} />
                <span className="text-xs font-bold text-slate-650">{slice.label}</span>
              </div>
              <span className="text-[10px] font-black font-mono text-slate-905">
                {slice.pct.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 4. Profitability Semi-Circular Gauge
export function ProfitGauge({ profitMargin, grossProfit }) {
  const radius = 40;
  const circumference = Math.PI * radius; // ~125.66
  
  // Constrain margin between 0 and 100 for gauge display
  const displayMargin = Math.min(Math.max(profitMargin, 0), 100);
  const offset = circumference - (displayMargin / 100) * circumference;

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between h-full relative overflow-hidden">
      <div>
        <h3 className="font-black text-sm text-slate-900 tracking-tight">Profitability Margin</h3>
        <p className="text-slate-400 text-[10px] font-mono mt-0.5">Operating margins ratio calculation</p>
      </div>

      <div className="flex flex-col items-center justify-center my-4 relative">
        <div className="relative w-44 h-24 flex items-end justify-center overflow-hidden">
          <svg viewBox="0 0 100 50" className="w-full h-full">
            {/* Background semi-circle track */}
            <path
              d="M 10 50 A 40 40 0 0 1 90 50"
              fill="transparent"
              stroke="#F1F5F9"
              strokeWidth="10"
              strokeLinecap="round"
            />
            {/* Gauge progress arc */}
            <motion.path
              d="M 10 50 A 40 40 0 0 1 90 50"
              fill="transparent"
              stroke="url(#gaugeGrad)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
            <defs>
              <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#FBBF24" />
                <stop offset="50%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>
            </defs>
          </svg>

          {/* Readout Overlay */}
          <div className="absolute bottom-0 flex flex-col items-center text-center">
            <span className="text-2xl font-black text-slate-950 font-mono tracking-tight">
              {profitMargin.toFixed(1)}%
            </span>
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest mt-0.5 font-mono">
              Margin Ratio
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-50 pt-4 flex justify-between items-center text-xs font-bold">
        <span className="text-slate-400 font-semibold">Net Profit:</span>
        <span className={`font-black font-mono ${grossProfit >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-600 bg-rose-50'} px-2 py-0.5 rounded border border-current/10`}>
          ₹{grossProfit.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
        </span>
      </div>
    </div>
  );
}
