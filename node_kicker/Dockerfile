FROM amazonlinux:2023.11.20260413.0
RUN yum install -y awscli
RUN curl -s -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
RUN chmod +x kubectl
COPY node_kicker.sh /
RUN chmod +x node_kicker.sh
ENTRYPOINT ["/node_kicker.sh"]