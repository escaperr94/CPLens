import React, { useMemo } from 'react';

export const CanvasRulers: React.FC = () => {
  // Generate tick marks up to 3200px
  const { majorTicks, minorTicks } = useMemo(() => {
    const majors: number[] = [];
    const minors: number[] = [];

    for (let pos = 0; pos <= 3200; pos += 10) {
      if (pos % 50 === 0) {
        majors.push(pos);
      } else {
        minors.push(pos);
      }
    }

    return { majorTicks: majors, minorTicks: minors };
  }, []);

  return (
    <>
      {/* Top-left 20x20 junction */}
      <div
        className="w-[20px] h-[20px] bg-[#F9F9F9] border-r border-b border-[#E5E5E5] absolute top-0 left-0 z-10 select-none pointer-events-none flex items-center justify-center"
      >
        <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
      </div>

      {/* Top Ruler (Horizontal) */}
      <div
        className="h-[20px] bg-[#F9F9F9] border-b border-[#E5E5E5] absolute top-0 left-[20px] right-0 overflow-hidden z-10 select-none pointer-events-none"
      >
        <svg
          className="w-[3200px] h-full block"
          viewBox="0 0 3200 20"
          preserveAspectRatio="none"
        >
          {/* Minor ticks every 10px */}
          {minorTicks.map((x) => (
            <line
              key={`h-min-${x}`}
              x1={x}
              y1={14}
              x2={x}
              y2={20}
              stroke="#D1D5DB"
              strokeWidth={1}
            />
          ))}

          {/* Major ticks and numbers every 50px */}
          {majorTicks.map((x) => (
            <React.Fragment key={`h-maj-${x}`}>
              <line
                x1={x}
                y1={10}
                x2={x}
                y2={20}
                stroke="#9CA3AF"
                strokeWidth={1}
              />
              <text
                x={x + 2}
                y={9}
                fontSize={9}
                fontFamily="monospace"
                fill="#9CA3AF"
                textAnchor="start"
              >
                {x}
              </text>
            </React.Fragment>
          ))}
        </svg>
      </div>

      {/* Left Ruler (Vertical) */}
      <div
        className="w-[20px] bg-[#F9F9F9] border-r border-[#E5E5E5] absolute top-[20px] left-0 bottom-0 overflow-hidden z-10 select-none pointer-events-none"
      >
        <svg
          className="w-full h-[3200px] block"
          viewBox="0 0 20 3200"
          preserveAspectRatio="none"
        >
          {/* Minor ticks every 10px */}
          {minorTicks.map((y) => (
            <line
              key={`v-min-${y}`}
              x1={14}
              y1={y}
              x2={20}
              y2={y}
              stroke="#D1D5DB"
              strokeWidth={1}
            />
          ))}

          {/* Major ticks and numbers every 50px */}
          {majorTicks.map((y) => (
            <React.Fragment key={`v-maj-${y}`}>
              <line
                x1={10}
                y1={y}
                x2={20}
                y2={y}
                stroke="#9CA3AF"
                strokeWidth={1}
              />
              <text
                x={9}
                y={y}
                transform={`rotate(-90 9 ${y})`}
                fontSize={9}
                fontFamily="monospace"
                fill="#9CA3AF"
                textAnchor="middle"
              >
                {y}
              </text>
            </React.Fragment>
          ))}
        </svg>
      </div>
    </>
  );
};
