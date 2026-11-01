FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/* && pip install --no-cache-dir spotdl
WORKDIR /worker
COPY worker.py quality.py ./
CMD ["python","worker.py"]
