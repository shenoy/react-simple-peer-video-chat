import React, { useEffect, useState, useRef, isValidElement } from "react";
import "./App.css";
import io from "socket.io-client";
import Peer from "simple-peer";
import styled from "styled-components";

const Container = styled.div`
  height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
`;

const Row = styled.div`
  display: flex;
  width: 100%;
`;

const Video = styled.video`
  border: 1px solid grey;
  width: 60%;
  height: 60%;
`;

function App() {
  const [yourID, setYourID] = useState();
  const [users, setUsers] = useState({});
  const [stream, setStream] = useState();
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);

  const userVideo = useRef();
  const partnerVideo = useRef();
  const socket = useRef();
  const peerRef = useRef();
  const configuration = {
    iceServers: [
      {
        urls: "stun:numb.viagenie.ca",
        username: "sultan1640@gmail.com",
        credential: "98376683",
      },
      {
        urls: "turn:numb.viagenie.ca",
        username: "sultan1640@gmail.com",
        credential: "98376683",
      },
    ],
  };

  useEffect(() => {
    socket.current = io.connect("/");
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setStream(stream);
        if (userVideo.current) {
          userVideo.current.srcObject = stream;
        }
      });

    socket.current.on("yourID", (id) => {
      setYourID(id);
    });
    socket.current.on("allUsers", (users) => {
      setUsers(users);
      console.log(users);
    });

    socket.current.on("conn", function () {
      console.log("USERS ---> ", users);
    });

    socket.current.on("hey", (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setCallerSignal(data.signal);
    });

    socket.current.on("user left", () => {
      setReceivingCall(false);
      setCaller("");
      setCallAccepted(false);
      peerRef.current.destroy();
    });

    socket.current.on("next user", () => {
      setReceivingCall(false);
      setCaller("");
      setCallAccepted(false);
      peerRef.current.destroy();
    });
  }, []);

  function callPeer(id) {
    var peer;
    peer = new Peer({
      initiator: true,
      trickle: false,
      config: configuration,
      stream: stream,
    });

    peer.on("signal", (data) => {
      socket.current.emit("callUser", {
        userToCall: id,
        signalData: data,
        from: yourID,
      });
    });

    peer.on("stream", (stream) => {
      if (partnerVideo.current) {
        partnerVideo.current.srcObject = stream;
      }
    });

    socket.current.on("callAccepted", (signal) => {
      setCallAccepted(true);
      peer.signal(signal);
    });

    peerRef.current = peer;
  }

  function acceptCall() {
    setCallAccepted(true);
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream,
    });
    peer.on("signal", (data) => {
      socket.current.emit("acceptCall", { signal: data, to: caller });
    });

    peer.on("stream", (stream) => {
      partnerVideo.current.srcObject = stream;
    });

    peer.signal(callerSignal);

    peerRef.current = peer;
  }

  function next() {
    socket.current.emit("next", socket.id);
  }

  let UserVideo;
  if (stream) {
    UserVideo = <Video playsInline  ref={userVideo} autoPlay />;
  }

  let PartnerVideo;
  if (callAccepted) {
    PartnerVideo = <Video playsInline ref={partnerVideo} autoPlay />;
  }

  let incomingCall;
  if (receivingCall) {
    incomingCall = (
      <div>
        <button onClick={acceptCall}>Start</button>
      </div>
    );
  }

  return (
    <Container>
      <Row>
        {UserVideo}
        {PartnerVideo}
      </Row>
      <Row>
        <button onClick={() => callPeer(users[yourID].connectedTo)}>
          Connect
        </button>
       
      </Row>
      <Row>{incomingCall}</Row>
    </Container>
  );
}

export default App;
