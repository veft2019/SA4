using System;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using System.Text;
using System.IO;

namespace logging_service
{
class Program
    {
        static void Main()
        {
            var factory = new ConnectionFactory() { HostName = "localhost" };

            using(var connection = factory.CreateConnection())
            using(var channel = connection.CreateModel()) {
                var orderExchange = "order_exchange";
                var loggingQueue = "logging_queue";
                var createOrder = "create_order";

                channel.ExchangeDeclare(orderExchange, "direct", true);
                channel.QueueDeclare(queue: loggingQueue, true);
                channel.QueueBind(queue: loggingQueue, exchange: orderExchange, routingKey: createOrder);

                var consumer = new EventingBasicConsumer(channel);
                consumer.Received += (model, ea) => {
                    var dataStr = Encoding.UTF8.GetString(ea.Body);
                    using (StreamWriter fwrite = File.AppendText("log.txt")) {
                        fwrite.WriteLine("Log: " + dataStr);
                    }
                };

                channel.BasicConsume(queue: loggingQueue, autoAck: true, consumer: consumer);
                                    
                Console.WriteLine("Running...");
                Console.ReadLine();
                channel.Close();
                connection.Close();
            }

        }
    }
}
