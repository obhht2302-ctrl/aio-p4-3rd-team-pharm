FROM python:3.12-slim
WORKDIR /srv/api
COPY api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY api/app ./app
ENV TEAM3_REPO=/srv/repo
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
