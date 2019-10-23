const amqp = require("amqplib/callback_api");
const { Order, OrderItem } = require("./data/db");

const messageBrokerInfo = {
    exchanges: {
      order: "order_exchange"
    },
    queues: {
        orderQueue: "order_queue"
    },
    routingKeys: {
      createOrder: "create_order"
    }
  };

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
    const { order } = messageBrokerInfo.exchanges;
    const { orderQueue } = messageBrokerInfo.queues;
    const { createOrder } = messageBrokerInfo.routingKeys;
    channel.assertExchange(order, "direct", { durable: true });
    channel.assertQueue(orderQueue, { durable: true });
    channel.bindQueue(orderQueue, order, createOrder);
};

(async () => {
    const messageBrokerConnection = await createMessageBrokerConnection();
    const channel = await createChannel(messageBrokerConnection);
  
    configureMessageBroker(channel);
  
    const { orderQueue } = messageBrokerInfo.queues;

    channel.consume(orderQueue, data => {
        const dataJson = JSON.parse(data.content.toString());
        let totalPrice = 0;
    
        console.log(`[x] Received: ${JSON.stringify(dataJson)}`);
    
        dataJson.items.forEach(i => {
            total += i.unitPrice * i.quantity;
        });

        Order.create({
            customerEmail: dataJson.email,
            totalPrice: totalPrice,
            orderDate: Date.now()
        }).catch(e => console.error(e));
            
        await dataJson.items.forEach(async item => {
            await OrderItem.create({
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                rowPrice: item.unitPrice * item.quantity,
                orderId: order.id
            }).catch(e => console.error(e));  
        });   
    }, { noAck: true });
})().catch(e => console.error(e));