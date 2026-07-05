import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function CollapsibleQuestion({ text, className }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isTruncated, setIsTruncated] = useState(false);
  const textRef = useRef(null);

  useEffect(() => {
    setIsExpanded(true);
  }, [text]);

  useEffect(() => {
    if (textRef.current) {
      // Temporarily apply line-clamp to measure if it truncates
      const originalDisplay = textRef.current.style.display;
      const originalLineClamp = textRef.current.style.webkitLineClamp;
      const originalBoxOrient = textRef.current.style.webkitBoxOrient;
      const originalOverflow = textRef.current.style.overflow;

      textRef.current.style.display = '-webkit-box';
      textRef.current.style.webkitLineClamp = '5';
      textRef.current.style.webkitBoxOrient = 'vertical';
      textRef.current.style.overflow = 'hidden';

      const truncated = textRef.current.scrollHeight > textRef.current.clientHeight;
      setIsTruncated(truncated);

      textRef.current.style.display = originalDisplay;
      textRef.current.style.webkitLineClamp = originalLineClamp;
      textRef.current.style.webkitBoxOrient = originalBoxOrient;
      textRef.current.style.overflow = originalOverflow;
    }
  }, [text]);

  return (
    <div className="relative">
      <div
        ref={textRef}
        className={`${className} transition-all duration-300`}
        style={{
          display: !isExpanded ? '-webkit-box' : 'block',
          WebkitLineClamp: !isExpanded ? 5 : 'unset',
          WebkitBoxOrient: !isExpanded ? 'vertical' : 'unset',
          overflow: !isExpanded ? 'hidden' : 'visible'
        }}
      >
        {text}
      </div>
      
      {!isExpanded && isTruncated && (
        <div 
          className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
          style={{ background: 'linear-gradient(to top, var(--acsis-canvas) 10%, transparent)' }}
        />
      )}
      
      {isTruncated && (
        <div className={`flex justify-center ${!isExpanded ? 'absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2' : 'mt-4'}`}>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-muted border border-border text-foreground hover:bg-muted/80 rounded-full shadow-sm transition-colors"
          >
            {isExpanded ? (
              <>Show less <ChevronUp className="w-3.5 h-3.5" /></>
            ) : (
              <>Read more <ChevronDown className="w-3.5 h-3.5" /></>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
