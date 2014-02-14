//requires http://demo.kaazing.com/lib/client/javascript/StompJms.js
window.KZ = {};

(function () {
    "use strict";
    KZ.WebSocketService = function (options) {

        var topicProducer, topicConsumer;
        var WEB_SOCKET_URL = "ws://tutorial.kaazing.com/jms";
        var TOPIC_NAME = "/topic/rnd5martdg";
        var connection;
        var session;
        var sending = false;
        var messageQueue = [];

        function handleException(e) {
            console.log("EXCEPTION: " + e);
        }

        function handleTopicMessage(message) {
            console.log("Message received: " + message.getText());
            options.onTick(JSON.parse(message.getText()));
        }

        function doSend(message) {
            topicProducer.send(null, message, DeliveryMode.NON_PERSISTENT, 3, 1, function () {
                sendFromQueue();
            });
            console.log("Message sent: " + message.getText());
        }

        function sendUpdate(message) {
            if (!sending) {
                sending = true;
                doSend(session.createTextMessage(JSON.stringify(message)));
            } else {
                messageQueue.push(JSON.stringify(message));
                console.log("Busy sending, pushing to queue: " + message);
            }
        }

        function sendFromQueue() {
            if (messageQueue.length > 0) {
                console.log("Sending last element from queue: " + messageQueue[messageQueue.length - 1]);
                var msg = messageQueue.splice(0, 1);
                doSend(session.createTextMessage(msg));
                sendFromQueue();
            } else {
                sending = false;
            }
        }

        function doConnect() {
            var stompConnectionFactory = new StompConnectionFactory(WEB_SOCKET_URL);
            try {
                var connectionFuture = stompConnectionFactory.createConnection(function () {
                    if (!connectionFuture.exception) {
                        try {
                            connection = connectionFuture.getValue();
                            connection.setExceptionListener(handleException);
                            console.log("Connected to " + WEB_SOCKET_URL);
                            session = connection.createSession(false, Session.AUTO_ACKNOWLEDGE);
                            var myTopic = session.createTopic(TOPIC_NAME);
                            console.log("Topic created...");
                            topicProducer = session.createProducer(myTopic);
                            console.log("Topic producer created...");
                            topicConsumer = session.createConsumer(myTopic);
                            console.log("Topic consumer created...");
                            topicConsumer.setMessageListener(handleTopicMessage);
                            connection.start(function () {
                                console.log("JMS session created");
                                doSend(session.createTextMessage("Hello world..."));
                            });
                        } catch (e) {
                            handleException(e);
                        }
                    } else {
                        handleException(connectionFuture.exception);
                    }
                });
            } catch (e) {
                handleException(e);
            }
        }

        return {
            connect: doConnect,
            publish: sendUpdate
        };
    };

}());