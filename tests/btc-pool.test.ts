import WebSocket from "ws";

const ws = new WebSocket("wss://ws.blockchain.info/inv");

ws.on("open", () => {
  console.log("connected");
  ws.send(JSON.stringify({ op: "unconfirmed_sub" }));
});

ws.on("message", (data) => {
  const msg = JSON.parse(data.toString());

  if (msg.op === "utx") {
    console.log("TXID:", msg.x.hash);
    console.log("Inputs:", msg.x.inputs.length);
    console.log("Outputs:", msg.x.out.length);
    console.log("----------");
  }
});

ws.on("error", (err) => {
  console.error("error:", err);
});

ws.on("close", () => {
  console.log("closed");
});
