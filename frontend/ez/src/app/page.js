"use client"
import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Toaster,toast } from 'sonner';
const Page = () => {
  const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10,
  };
  const socketRef = useRef(null);
  const pc = useRef(null);
  const dataChannel = useRef(null);
  const [id,setid] = useState("Error");
  const [val,setval] = useState("chat");
  const [enter,setent] = useState("enter id");
  const main = useRef(null);
  const video = useRef(null);
  const input = useRef(null);
  const reader = useRef(null);
  const file = useRef(null);
  let curr = false;
  let received = [];
  const fileChannel = useRef(null);
  useEffect(() => {
    pc.current = new RTCPeerConnection(servers);
    setval(pc.current.connectionState);
    dataChannel.current = pc.current.createDataChannel('chat');
    fileChannel.current = pc.current.createDataChannel('file');
    fileChannel.current.onopen = () => console.log("file channel open");
    fileChannel.current.onmessage = (e) => {
      try {
      const rec = JSON.parse(e.data);
      if (rec.done) {
        const bl = new Blob(received);
        const url = URL.createObjectURL(bl);
        const link = document.createElement("a");
        link.download = "fileee." + rec.ext;
        link.href = url;
        link.className = "text-2xl text-black";
        link.click();
        document.body.appendChild(link);
        console.log(url); 
        received = [];
        return;
      }
    }
    catch {
      received.push(e.data);
    }
    }
    dataChannel.current.onopen = () => console.log("Data channel is open!");
    dataChannel.current.onclose = () => console.log("Data channel is closed.");
    dataChannel.current.onmessage =(e) => setval((prev) => (prev + e.data + '\n'));
    pc.current.ondatachannel = (e) => {
      if (e.channel.label == 'chat') dataChannel.current = e.channel;
      else fileChannel.current = e.channel;
    }
    pc.current.onconnectionstatechange = () => {
  const state = pc.current.connectionState;
  setval(pc.current.connectionState);
  console.log("Connection state:", state);
  if (state === "failed" || state === "closed" || state === "disconnected") {
    toast.error("Connection lost");
    main.current = null;
  }
};
    pc.current.onicecandidate = (event) => {
      console.log(event.candidate);
      if (event.candidate && main.current) {
        socketRef.current.emit("ice-candidate", {
        target: main.current, // ID of the peer you're talking to
        candidate: event.candidate,
        });  } 
    }; 
    //navigator.mediaDevices.getUserMedia({"video":true}).then((mediaStream) => {video.current.srcObject = mediaStream}).catch((e) => {toast.error(e.message)});
    socketRef.current = io('http://localhost:8080', {
      transports: ['websocket', 'polling'], // allow both transports
    });
    socketRef.current.on("id",(obj) => {
      setid(obj.shortId);
    })
    socketRef.current.on('connect', () => {
      console.log('Connected:', socketRef.current.id);
    });

    socketRef.current.on('message', (msg) => {
      console.log('Message from server:', msg);
    });

    socketRef.current.on('connect_error', (err) => {
      console.error('Connection error:', err);
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('Disconnected:', reason);
    });

    socketRef.current.on('reconnect_attempt', (attempt) => {
      console.log('Reconnect attempt:', attempt);
    });
    socketRef.current.on('send',async (obj) => {
      main.current = obj.id;
      await pc.current.setRemoteDescription(new RTCSessionDescription(obj.offer));
      const answer = await pc.current.createAnswer();
      await pc.current.setLocalDescription(answer);
      socketRef.current.emit("answer",{target:obj.id,answer:pc.current.localDescription});
      console.log("Emitted answer to ",obj.id);
    })
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
    reader.current = new FileReader();
    reader.current.onerror = ((e) => console.log(e));
    reader.current.onload = ((e) => {
      const sendChunk = () => {
        if (fileChannel.current.bufferedAmount > 16 * 1024 * 10) {
      // Wait and retry when buffer has drained a bit
      setTimeout(sendChunk, 100); // or use requestAnimationFrame for smoother pacing
      return;
    }
      curr = true;
      fileChannel.current.send(e.target.result);
      console.log("Sending chunk ",offset/(16*1024));
      offset += 16*1024;
      if (offset < file.current.size) {
        console.log("calling again");
        slice(offset,file.current);
      }
      else {
        curr = false;
        console.log("done");
        toast.success("Done with file transfer");
        fileChannel.current.send(JSON.stringify({done:true,ext:file.current.type.slice(-3)}));
        return;
      }
    }
    sendChunk();
    })
  }, []);
  let offset = 0;
  const slice = (o,file) => {
    const slice = file.slice(o,o+16*1024);
    const arr = reader.current.readAsArrayBuffer(slice);
  }
  const handlebut = async () => {
    if (main.current) {
      file.current = input.current.files[0];
      //console.log(file.current.type.slice(-3));
      if (!curr && file.current) slice(0,file.current)
      dataChannel.current.send(global);
      return;
    }
    main.current = enter;
    const offer = await pc.current.createOffer();
    await pc.current.setLocalDescription(offer);
    socketRef.current.emit("offer",{"message":global,"id":enter,"offer":pc.current.localDescription});
    
  }
  const [global, setg] = useState("Hello");
  const handle = (e) => setg(e.target.value);
  const handle2 = (e) => {setent(e.target.value)}
  return (
    <>
    <Toaster 
        position="top-right"
        duration={800}
        toastOptions={{
          style: {
            background: 'white',
            color: 'black',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          },
          success: { style: { borderLeft: '4px solid #10b981' } },
          error: { style: { borderLeft: '4px solid #ef4444' } },
        }}
    />
    <div className='h-[100vh] w-[100vw] border-8 border-red-500 flex justify-center items-center'>
      <div className='w-[50vw] h-[50vh] max-h-* flex justify-center items-center border-8 border-black flex-col'>
        <div className='h-full border-2 border-black'>{val}</div>
        <input
          value={global}
          type='text'
          className='border-2 border-black m-4'
          onChange={handle}
        />
        <input
          value={enter}
          type='text'
          className='border-2 border-black m-4'
          onChange={handle2}
        />
        <button className='border-4 p-1 rounded-xl' onClick={handlebut}>Submit</button>
        <button className='border-4 p-1 rounded-xl' onClick={() => pc.current.close()}>End</button>
        <input type="file" ref={input}></input>
        <div>{id}</div>
      </div>
    </div>
    </>
  );
};

export default Page;
