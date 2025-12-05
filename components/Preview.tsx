import React, { useEffect, useState } from 'react';
import mermaid from 'mermaid';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { ZoomIn, ZoomOut, Maximize, RotateCcw } from 'lucide-react';

interface PreviewProps {
  code: string;
  onError: (error: string) => void;
  onSuccess: () => void;
}

mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  securityLevel: 'loose',
  themeVariables: {
    fontFamily: 'Inter, sans-serif',
    primaryColor: '#e0f2fe',
    primaryBorderColor: '#0ea5e9',
    lineColor: '#334155',
    secondaryColor: '#f0f9ff',
    tertiaryColor: '#ffffff',
  }
});

export const Preview: React.FC<PreviewProps> = ({ code, onError, onSuccess }) => {
  const [svgContent, setSvgContent] = useState<string>('');
  const [lastRenderedCode, setLastRenderedCode] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    const renderDiagram = async () => {
      // Don't re-render if code hasn't changed to avoid flickering
      if (code === lastRenderedCode) return;

      try {
        if (!code.trim()) {
            setSvgContent('');
            return;
        }

        const id = `mermaid-${Date.now()}`;
        const { svg } = await mermaid.render(id, code);
        
        if (isMounted) {
          setSvgContent(svg);
          setLastRenderedCode(code);
          onSuccess();
        }
      } catch (error) {
        if (isMounted) {
          console.error("Mermaid Render Error", error);
          onError(error instanceof Error ? error.message : "Syntax Error");
        }
      }
    };

    const timeoutId = setTimeout(renderDiagram, 500); // Debounce
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [code, lastRenderedCode, onError, onSuccess]);

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden group">
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200 shadow-sm z-10 shrink-0">
        <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">Preview</span>
        <div className="text-xs text-slate-400">
          Auto-updates • Scroll to Zoom • Drag to Pan
        </div>
      </div>
      
      <div className="flex-1 w-full h-full overflow-hidden bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-opacity-10 relative">
        {svgContent ? (
          <TransformWrapper
            initialScale={1}
            minScale={0.2}
            maxScale={4}
            centerOnInit={true}
            wheel={{ step: 0.1 }}
            limitToBounds={false}
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                {/* Floating Controls */}
                <div className="absolute top-4 right-4 flex flex-col gap-1.5 z-50 bg-white/90 backdrop-blur border border-slate-200 p-1.5 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 translate-x-2 group-hover:translate-x-0">
                  <button 
                    onClick={() => zoomIn()} 
                    className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-md transition-colors" 
                    title="Zoom In"
                  >
                    <ZoomIn size={16} />
                  </button>
                  <button 
                    onClick={() => zoomOut()} 
                    className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-md transition-colors" 
                    title="Zoom Out"
                  >
                    <ZoomOut size={16} />
                  </button>
                  <div className="h-px bg-slate-200 mx-1 my-0.5"></div>
                  <button 
                    onClick={() => resetTransform()} 
                    className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-md transition-colors" 
                    title="Reset View"
                  >
                    <RotateCcw size={16} />
                  </button>
                </div>

                <TransformComponent
                  wrapperClass="w-full h-full"
                  contentClass="w-full h-full"
                  contentStyle={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}
                >
                  <div 
                    dangerouslySetInnerHTML={{ __html: svgContent }}
                    className="mermaid-output origin-center"
                    style={{ padding: '2rem' }}
                  />
                </TransformComponent>
              </>
            )}
          </TransformWrapper>
        ) : (
           <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm italic">
             Waiting for valid diagram code...
           </div>
        )}
      </div>
    </div>
  );
};
