# Use an official OpenJDK 17 JDK image as a base
FROM openjdk:17.0.2-jdk-slim

# Install dependencies (curl, bash, wget)
RUN apt-get update && apt-get install -y \
    curl \
    bash \
    wget \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Kafka client tools (version 4.0.0)
RUN wget https://dlcdn.apache.org/kafka/4.0.0/kafka_2.13-4.0.0.tgz -O kafka.tgz && \
    tar -xvzf kafka.tgz && \
    mv kafka_2.13-4.0.0 /opt/kafka && \
    rm kafka.tgz

# Set environment variables
ENV KAFKA_HOME=/opt/kafka
ENV PATH="${KAFKA_HOME}/bin:${PATH}"

# Copy the topic creation script into the container
COPY create-kafka-topic.sh /usr/local/bin/create-kafka-topic.sh
RUN chmod +x /usr/local/bin/create-kafka-topic.sh

# Copy client.properties into the container
COPY client.properties /usr/local/bin/client.properties

# Set the entrypoint to run the script
ENTRYPOINT ["/usr/local/bin/create-kafka-topic.sh"]
