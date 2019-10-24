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

    console.log("Running...");

    const { order } = messageBrokerInfo.exchanges;
    const { orderQueue } = messageBrokerInfo.queues;

    channel.consume(orderQueue, data => {
        const dataJson = JSON.parse(data.content.toString());

        let total = 0;
        dataJson.items.forEach((item) => {
            total += item.quantity * item.unitPrice;
        });

        let newOrder = {
            "customerEmail": dataJson.email,
            "totalPrice": total,
            "orderDate": new Date()
        }

        Order.create(newOrder, (err, order) => {
            if(err) {
                console.log("An error occurred when trying to create a new order!");
                console.log(err);
            } else {
                dataJson.items.forEach((item) => {
                    let newItem = {
                        "description": item.description,
                        "quantity": item.quantity,
                        "unitPrice": item.unitPrice,
                        "rowPrice": item.quantity * item.unitPrice,
                        "orderId": order._id
                    }
                    OrderItem.create(newItem, (err) => {
                        if(err) {
                            console.log("An error occurred when trying to create a new item in an order!");
                            console.log(err);
                        }
                    })
                });
            }
        });
        let stringData = data.content.toString()
        channel.publish(order, stringData, Buffer.from(stringData));
    }, { noAck: true });
})().catch(e => console.error(e));