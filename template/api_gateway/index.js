const express = require('express');
const bodyParser = require('body-parser');
const PORT = 3000;
const app = express();
const amqp = require('amqplib/callback_api');

const messageBrokerInfo = {
    exchanges: {
        order: 'order_exchange'
    },
    routingKeys: {
        createOrder: 'create_order'
    }
}

const createMessageBrokerConnection = () => new Promise((resolve, reject) => {
    amqp.connect('amqp://localhost', (err, conn) => {
        if (err) { reject(err); }
        resolve(conn);
    });
});

const createChannel = connection => new Promise((resolve, reject) => {
    connection.createChannel((err, channel) => {
        if (err) { reject(err); }
        resolve(channel);
    });
});

const configureMessageBroker = channel => {
    Object.values(messageBrokerInfo.exchanges).forEach(val => {
        channel.assertExchange(val, 'direct', { durable: true });
    });
};

(async () => {
    const messageBrokerConnection = await createMessageBrokerConnection();
    const channel = await createChannel(messageBrokerConnection);

    configureMessageBroker(channel);

    const { order } = messageBrokerInfo.exchanges;
    const { createOrder } = messageBrokerInfo.routingKeys;

    app.use(bodyParser.json());

    //Setup route
    app.post("/api/orders", (req, res) => {
        const { body } = req;
        const bodyJson = JSON.stringify(body);
    
        channel.publish(order, createOrder, Buffer.from(bodyJson));
        console.log(`[x] Sent: ${bodyJson}`);
        return res.sendStatus(200);
        //It should always return 200 OK (it doesn’t care what happens)
      });

    app.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));
})().catch(e => console.error(e));
