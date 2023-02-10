// import { ConsumeMessage } from "amqplib";
// import { AmqpClient, ClientConfig } from "./index";

// const client: AmqpClient = new AmqpClient();

// (async () => {
//   console.log("amqp subscribe test... ");
//   try {
//     process.once("SIGINT", async () => {
//       await client.close();
//     });

//     const cfg: ClientConfig = {
//       url: "amqp://localhost/test",
//       queues: [
//         {
//           queue: "bob",
//           options: {
//             durable: true,
//           },
//         },
//       ],
//     };

//     await client.config(cfg);

//     await client.subscribe(
//       "bob",
//       (message: ConsumeMessage | null) => {
//         console.log(message!.content.toString());
//       },
//       { noAck: true }
//     );

//     console.log(" [*] Waiting for messages. To exit press CTRL+C");
//   } catch (err) {
//     console.warn(err);
//   }
// })();
