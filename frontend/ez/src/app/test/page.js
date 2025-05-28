"use client"
import React, { useState, useEffect, useRef, use } from 'react';
import { Upload, Download, QrCode, Send, ArrowLeft, Eye, Copy, Check } from 'lucide-react';
import { io } from 'socket.io-client';
import { Toaster,toast } from 'sonner';
const FileSharePlatform = () => {
  const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10,
  };
  const checker = () => {
    setTimeout(() => {
      console.log(pc.current.connectionState);
      checker();
    },2000);
  }
  const [currentView, setCurrentView] = useState('home'); // 'home', 'send', 'receive'
  const [qrKey, setQrKey] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [shortId,setShortId] = useState(null);
  const [showQrText, setShowQrText] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [qrCode,setqr] = useState(null);
  const [loadMain,setlm] = useState(false);
  const socketRef = useRef(null);
  const pc = useRef(null);
  const dataChannel = useRef(null);
  const [isSocket,sets] = useState(false);
  const peerId = useRef(null);
  const inputRef = useRef(null);
  useEffect(() => {
    setlm(true);
    pc.current = new RTCPeerConnection(servers);
    //socket setup
    socketRef.current = io("http://localhost:8080");
    socketRef.current.on("id",(e) => {
      setShortId(e.shortId);
      setlm(false);
      sets(true);
      toast.success("Connected to signalling server!")
    });
    socketRef.current.on("connect_error",(e) => {
      toast.error("Error connecting to signalling server");
    });
    socketRef.current.on("disconnet",(e) => {
      toast.error("Disconnected from signalling server");
      sets(false);
    });
    socketRef.current.on("verify",async (e) => {
      console.log(e);
      if (e.done) {
        toast.loading("Connecting to Peer...");
        setlm(true);
        peerId.current = e.target;
        console.log("peer",e.target);
        const offer = await pc.current.createOffer();
        await pc.current.setLocalDescription(offer);
        socketRef.current.emit("offer",{"id":e.target,offer:pc.current.localDescription})
      }
      else {
        inputRef.current.value = '';
        toast.error("Invalid Id");
        setlm(false);
      }
    });
    socketRef.current.on('send', async (obj) => {
      await pc.current.setRemoteDescription(new RTCSessionDescription(obj.offer));
      const answer = await pc.current.createAnswer();
      await pc.current.setLocalDescription(answer);
      socketRef.current.emit("answer",{target:obj.id,answer:pc.current.localDescription});
      console.log("Emitted answer to ",obj.id);
    });
    socketRef.current.on('answer', async ({ answer }) => {
      await pc.current.setRemoteDescription(new RTCSessionDescription(answer));
      console.log("Remote description (answer) set successfully.");
    });
    socketRef.current.on('ice-candidate',async ({candidate}) => {
      try { 
        console.log(candidate);
        await pc.current.addIceCandidate(new RTCIceCandidate(candidate)); 
      }
      catch (e) {
        console.log("ice error",e.message);
      }
    });
    //rtc 
    dataChannel.current = pc.current.createDataChannel('file'); //for local
    pc.current.ondatachannel = ((e) => { //for remote 
      dataChannel.current = e.channel;
    });
    pc.current.onicecandidate = (e) => {
      if (e.candidate && peerId.current) {
        socketRef.current.emit("ice-candidate",{
          target : peerId.current,
          candidate : e.candidate
        });
      }
    }
    checker();
  },[]);
  const handleSend = (sendId) => {
    const id = sendId;
    console.log("id",id);
    socketRef.current.emit("verify",{target:id});
  }
  const generateQRCode = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setQrKey(shortId);
    // Generate QR code using QR Server API with proper encoding
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${"http://192.168.1.4:3001/test"}`;
    setQrCodeUrl(qrUrl);
    setqr(qrUrl);
    setIsLoading(false);
  };

  const handleReceive = async () => {
    setCurrentView('receive');
    generateQRCode();
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(qrKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };



  const BackButton = () => (
    <button
      onClick={() => setCurrentView('home')}
      className="absolute top-6 left-6 p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all duration-300 group"
    >
      <ArrowLeft className="w-5 h-5 text-white group-hover:scale-110 transition-transform duration-200" />
    </button>
  );

  const HomeView = () => (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background particles */}
      
      <div className="text-center z-10">
        <div className="mb-12 animate-fade-in">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-4">
            Sonic
          </h1>
          <p className="text-xl text-white/70 font-light">
            Seamless file sharing across devices
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          <button
            onClick={() => setCurrentView('send')}
            className="group relative overflow-hidden bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-md border border-blue-400/30 rounded-2xl p-8 w-72 hover:scale-105 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/25"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <Send className="w-12 h-12 text-blue-400 mx-auto mb-4 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-2xl font-semibold text-white mb-2">Send Files</h3>
            <p className="text-white/60">Share your files instantly</p>
          </button>

          <button
            onClick={handleReceive}
            className="group relative overflow-hidden bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-md border border-purple-400/30 rounded-2xl p-8 w-72 hover:scale-105 transition-all duration-500 hover:shadow-2xl hover:shadow-purple-500/25"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <Download className="w-12 h-12 text-purple-400 mx-auto mb-4 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-2xl font-semibold text-white mb-2">Receive Files</h3>
            <p className="text-white/60">Get files from others</p>
          </button>
        </div>
      </div>
    </div>
  );

  const SendView = () => {
    const [sendId,setSendId] = useState('');
    return (
    <div className="min-h-screen flex items-center justify-center relative">
      <BackButton />
      
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-12 max-w-md w-full mx-4 shadow-2xl">
        <div className="text-center mb-8">
          <Upload className="w-16 h-16 text-blue-400 mx-auto mb-4 animate-bounce" />
          <h2 className="text-3xl font-bold text-white mb-2">Send Files</h2>
          <p className="text-white/60">Enter the recipient's ID</p>
        </div>

        <div className="space-y-6">
          <div className="relative">
            <input
              type="text"
              value={sendId}
              onChange={(e) => setSendId(e.target.value)}
              placeholder="Enter recipient ID"
              className="w-full p-4 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-blue-400/50 focus:bg-white/10 transition-all duration-300"
              ref = {inputRef}
            />
          </div>
          
          <button 
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-4 rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!sendId.trim()}
            onClick={() => handleSend(sendId)}
          >
            Connect & Send
          </button>
        </div>
      </div>
    </div>
  )};

  const ReceiveView = () => (
    <div className="min-h-screen flex items-center justify-center relative">
      <BackButton />
      
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-12 max-w-md w-full mx-4 shadow-2xl">
        <div className="text-center mb-8">
          <QrCode className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-white mb-2">Receive Files</h2>
          <p className="text-white/60">Share this code with the sender</p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
            <p className="text-white/60">Generating your unique code...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div 
              className="bg-white/5 border border-white/20 rounded-xl p-8 cursor-pointer transition-all duration-300 group"
              onClick={() => setShowQrText(!showQrText)}
            >
              <div className="text-center">
                <div className="w-48 h-48 mx-auto mb-4 bg-white rounded-xl flex items-center justify-center transition-transform duration-300 p-4">
                    <img 
                      src={qrCode} 
                      alt="QR Code" 
                      className="w-full h-full object-contain rounded-lg"
                    />  
                </div>
                <p className="text-white/60 text-sm mb-2">Scan this QR code or enter the code on the other device</p>
                  <div className="mt-4 p-4 bg-black/20 rounded-lg border border-white/10 animate-fade-in">
                    <p className="text-white/80 text-sm font-mono break-all mb-3">{qrKey}</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard();
                      }}
                      className="flex items-center justify-center gap-2 w-full bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-lg transition-all duration-200"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied!' : 'Copy Code'}
                    </button>
                  </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
    <Toaster 
  position="top-right"
  duration={2000}
  toastOptions={{
    style: {
      background: 'rgba(255, 255, 255, 0.1)',
      color: 'white',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.15)',
      backdropFilter: 'blur(16px)',
      borderRadius: '16px',
      fontSize: '14px',
      fontWeight: '500',
      padding: '16px 20px',
      maxWidth: '400px',
    },
    success: { 
      style: { 
        background: 'rgba(16, 185, 129, 0.15)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        borderLeft: '4px solid #10b981',
        boxShadow: '0 8px 32px rgba(16, 185, 129, 0.2), 0 2px 8px rgba(0, 0, 0, 0.15)',
      } 
    },
    error: { 
      style: { 
        background: 'rgba(239, 68, 68, 0.15)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderLeft: '4px solid #ef4444',
        boxShadow: '0 8px 32px rgba(239, 68, 68, 0.2), 0 2px 8px rgba(0, 0, 0, 0.15)',
      } 
    },
    loading: {
      style: {
        background: 'rgba(59, 130, 246, 0.15)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderLeft: '4px solid #3b82f6',
        boxShadow: '0 8px 32px rgba(59, 130, 246, 0.2), 0 2px 8px rgba(0, 0, 0, 0.15)',
      }
    }
  }}
/>
    {!loadMain ? (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10 animate-pulse" />
      
      {currentView === 'home' && <HomeView />}
      {currentView === 'send' && <SendView />}
      {currentView === 'receive' && <ReceiveView />}

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
      `}</style>
    </div> ) : 
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden justify-center items-center flex">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10 animate-pulse" />
        <div>
            <div className="animate-spin rounded-full h-20 w-20 border-b-2 border-purple-400 mx-auto mb-4"></div>
            <p className="text-white/60 text-xl">Connecting to the server, do not reload the site...</p>
        </div>
    </div>
    }
    </>
  );
};

export default FileSharePlatform;