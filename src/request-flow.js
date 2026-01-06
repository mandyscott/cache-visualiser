import React, { useState } from 'react';
import { 
  Monitor, 
  Smartphone, 
  Cloud, 
  Server, 
  Zap, 
  Database,
  ShieldCheck,
  Globe,
  Radio,
  Layers,
  Activity,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';

const ArchitectureDiagram = () => {
  const [activeFlow, setActiveFlow] = useState(null);

  const flows = [
    {
      id: 'request',
      title: '1. Manifest Request',
      description: 'Player requests the .m3u8 index. Fastly Edge checks cache; if it is a live stream, it routes to Compute.',
      color: 'blue'
    },
    {
      id: 'compute',
      title: '2. Compute Logic',
      description: 'Compute validates the request and sets the "Grip-Hold" header, handing the connection to Fanout.',
      color: 'purple'
    },
    {
      id: 'fanout',
      title: '3. Real-time Pub/Sub',
      description: 'Fanout maintains the open connection. When the origin publishes a new segment, Fanout pushes the update.',
      color: 'orange'
    },
    {
      id: 'delivery',
      title: '4. Segment Delivery',
      description: 'Player requests the 2MB .ts chunks. These are served directly from Fastly Cache for maximum speed.',
      color: 'green'
    }
  ];

  const Box = ({ children, title, icon: Icon, colorClass, highlight = false }) => (
    <div className={`p-4 rounded-xl border-2 bg-white shadow-sm flex flex-col items-center justify-center transition-all duration-300 z-20 ${colorClass} ${highlight ? 'ring-2 ring-offset-2 ring-blue-400 scale-105' : ''}`}>
      <Icon className="mb-2" size={32} />
      <span className="font-bold text-sm text-center">{title}</span>
      {children}
    </div>
  );

  // Enhanced Connection Component
  const Connection = ({ active, color, label, direction = 'right', className = "" }) => {
    const colorMap = {
      blue: 'from-blue-400 to-blue-600',
      purple: 'from-purple-400 to-purple-600',
      orange: 'from-orange-400 to-orange-600',
      green: 'from-green-400 to-green-600'
    };

    return (
      <div className={`flex flex-col items-center justify-center flex-1 px-2 relative ${className}`}>
        {label && <span className={`text-[10px] font-bold mb-1 uppercase tracking-tighter ${active ? `text-${color}-600` : 'text-slate-300'}`}>{label}</span>}
        <div className={`h-2 w-full rounded-full bg-slate-100 overflow-hidden relative border border-slate-200 transition-opacity duration-500 ${active ? 'opacity-100' : 'opacity-20'}`}>
          <div 
            className={`absolute inset-0 bg-gradient-to-r ${colorMap[color]} animate-conduit-${direction}`}
            style={{ width: '40%' }}
          ></div>
        </div>
        {direction === 'right' ? (
          <ArrowRight className={`absolute -right-2 top-[18px] ${active ? `text-${color}-600` : 'text-slate-300'}`} size={16} />
        ) : (
          <ArrowLeft className={`absolute -left-2 top-[18px] ${active ? `text-${color}-600` : 'text-slate-300'}`} size={16} />
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 p-8 font-sans overflow-hidden">
      <style>{`
        @keyframes conduit-right {
          0% { transform: translateX(-150%); }
          100% { transform: translateX(300%); }
        }
        @keyframes conduit-left {
          0% { transform: translateX(300%); }
          100% { transform: translateX(-150%); }
        }
        .animate-conduit-right {
          animation: conduit-right 1.5s infinite linear;
        }
        .animate-conduit-left {
          animation: conduit-left 1.5s infinite linear;
        }
      `}</style>

      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">HLS Streaming Architecture</h1>
          <p className="text-slate-600 font-medium">Technical Request Flow: Fastly Compute + Fanout</p>
        </div>
        <div className="bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <Activity size={12} className="text-green-500" /> Resolution
            </div>
            <div className="text-sm font-bold text-slate-800">1080p HD</div>
          </div>
          <div className="h-8 w-px bg-slate-100"></div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <Layers size={12} className="text-blue-500" /> Segment
            </div>
            <div className="text-sm font-bold text-slate-800">1-2MB Chunks</div>
          </div>
        </div>
      </div>

      <div className="flex flex-row items-center justify-between relative flex-grow gap-2 px-4">
        
        {/* Step 1: User Player */}
        <div className="flex flex-col items-center w-48">
          <Box title="Video Player" icon={Monitor} colorClass="border-blue-200 text-blue-600 shadow-blue-100/50">
            <div className="flex gap-2 mt-2">
              <Smartphone size={16} />
              <Monitor size={16} />
            </div>
            <p className="text-[10px] mt-2 text-slate-400 font-medium uppercase">End User</p>
          </Box>
        </div>

        {/* Transition 1: User <-> Edge */}
        <div className="flex flex-col gap-10 flex-1 min-w-[120px]">
          <Connection 
            label="Request" 
            active={activeFlow === 'request' || activeFlow === 'delivery'} 
            color="blue" 
            direction="right" 
          />
          <Connection 
            label="Response" 
            active={activeFlow === 'delivery' || activeFlow === 'fanout'} 
            color="green" 
            direction="left" 
          />
        </div>

        {/* Step 2: Fastly Platform */}
        <div className="w-64 relative">
          <div className="bg-slate-100/50 p-5 rounded-3xl border-2 border-dashed border-slate-200">
            <p className="text-[10px] font-black text-slate-400 mb-4 uppercase text-center tracking-widest">Fastly Edge Cloud</p>
            <div className="flex flex-col gap-6">
              <Box title="Cache (Varnish)" icon={Layers} colorClass="border-blue-500 text-blue-700 bg-blue-50">
                <p className="text-[10px] mt-1 text-blue-500 font-bold uppercase">Static Storage</p>
              </Box>
              
              <div className="flex justify-center items-center h-2">
                 <div className={`w-1 h-full rounded-full transition-colors duration-500 ${activeFlow === 'compute' ? 'bg-purple-500' : 'bg-slate-200'}`}></div>
              </div>

              <Box title="Compute" icon={ShieldCheck} colorClass="border-purple-500 text-purple-700 bg-purple-50">
                <p className="text-[10px] mt-1 text-purple-500 font-bold uppercase">Logic Layer</p>
              </Box>
            </div>
          </div>
        </div>

        {/* Transition 2: Edge <-> Logic */}
        <div className="flex flex-col gap-10 flex-1 min-w-[120px]">
          <Connection 
            label="Grip-Hold" 
            active={activeFlow === 'compute'} 
            color="purple" 
            direction="right" 
          />
          <Connection 
            label="Push Update" 
            active={activeFlow === 'fanout'} 
            color="orange" 
            direction="left" 
          />
        </div>

        {/* Step 3 & 4 column */}
        <div className="flex flex-col gap-12 w-48">
           {/* Fanout Engine */}
          <div className="flex flex-col items-center">
            <div className="relative group">
              <div className={`absolute -inset-2 bg-gradient-to-r from-orange-400 to-red-500 rounded-full blur-md transition-opacity duration-500 ${activeFlow === 'fanout' ? 'opacity-60 animate-pulse' : 'opacity-10'}`}></div>
              <div className="relative p-8 bg-white border-2 border-orange-500 rounded-full flex items-center justify-center shadow-lg">
                <Zap className={`${activeFlow === 'fanout' ? 'text-orange-500' : 'text-slate-300'}`} size={40} />
              </div>
            </div>
            <p className="mt-3 font-black text-xs text-slate-800 uppercase tracking-tighter">Fanout Hub</p>
          </div>

          <div className="flex justify-center h-6">
             <Connection 
              active={activeFlow === 'fanout'} 
              color="orange" 
              direction="left" 
              className="px-0 w-full"
            />
          </div>

          {/* Media Origin */}
          <div className="flex flex-col items-center">
            <Box title="Media Origin" icon={Server} colorClass="border-slate-200 text-slate-600">
              <Database size={16} className="mt-1" />
              <p className="text-[10px] mt-2 text-slate-400 font-bold uppercase">Storage/Origin</p>
            </Box>
            <div className="mt-3 bg-green-50 px-3 py-2 rounded-lg border border-green-200 w-full shadow-sm">
              <p className="text-[9px] text-green-700 font-black mb-1 uppercase tracking-wider text-center">Origin Status</p>
              <div className="h-1.5 w-full bg-green-100 rounded-full overflow-hidden">
                <div className={`h-full bg-green-500 transition-all duration-1000 ${activeFlow === 'fanout' ? 'w-full' : 'w-1/4'}`}></div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Logic Selection Cards */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {flows.map((flow) => (
          <div 
            key={flow.id}
            onMouseEnter={() => setActiveFlow(flow.id)}
            onMouseLeave={() => setActiveFlow(null)}
            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer group ${
              activeFlow === flow.id ? 'bg-white shadow-xl border-blue-400 -translate-y-2' : 'bg-white border-slate-100 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white transition-all duration-300 shadow-sm group-hover:rotate-6 ${
                activeFlow === flow.id ? 
                (flow.id === 'request' ? 'bg-blue-600' : 
                 flow.id === 'compute' ? 'bg-purple-600' : 
                 flow.id === 'fanout' ? 'bg-orange-600' : 'bg-green-600') : 'bg-slate-300'
              }`}>
                {flow.id[0].toUpperCase()}
              </div>
              <h3 className="text-sm font-bold text-slate-900">{flow.title}</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">{flow.description}</p>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-6 flex justify-between items-center text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">
        <div className="flex items-center gap-2">
          <Globe size={14} className="text-blue-400" />
          <span>APAC Edge Infrastructure</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2">
            <div className="w-3 h-1.5 rounded-full bg-blue-500"></div> HTTP/3 QUIC
          </span>
          <span className="flex items-center gap-2">
            <div className="w-3 h-1.5 rounded-full bg-orange-500"></div> GRIP PROTOCOL
          </span>
        </div>
      </div>
    </div>
  );
};

export default ArchitectureDiagram;