using System;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using System.Text;
using System.IO;

namespace logging_service
{
    class Program
    {
        public static void Main() {
        var factory = new ConnectionFactory() { HostName = "localhost" };
        using (var connection = factory.CreateConnection())
        using (var channel = connection.CreateModel()) {
        
            var order = "order_exchange";
            var loggingQueue = "logging_queue";
            var createOrder = "create_order";

            channel.ExchangeDeclare(order, "direct", true);
            channel.QueueDeclare(loggingQueue, true);
            channel.QueueBind(loggingQueue, order, createOrder);

            var consumer = new EventingBasicConsumer(channel);
            consumer.Received += (model, ea) => {
                var body = ea.Body;
                var msg = Encoding.UTF8.GetString(body);

                Console.WriteLine(msg);

                using (StreamWriter writer = new StreamWriter("log.txt", true)){
                    writer.WriteLine("Log: " + msg);
                }
            };
            channel.BasicConsume(loggingQueue, true, consumer);
            Console.ReadLine();
        }
    }
    }
}
