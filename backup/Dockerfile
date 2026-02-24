FROM postgres:15-alpine

RUN apk add --no-cache bash curl \
    && curl -fsSL "https://github.com/aptible/supercronic/releases/download/v0.2.33/supercronic-linux-amd64" -o /usr/local/bin/supercronic \
    && chmod +x /usr/local/bin/supercronic

COPY backup.sh /usr/local/bin/backup.sh
COPY restore.sh /usr/local/bin/restore.sh
RUN chmod +x /usr/local/bin/backup.sh /usr/local/bin/restore.sh

# Cron job: every hour at minute 0
RUN echo "0 * * * * /usr/local/bin/backup.sh" > /etc/crontab

CMD ["sh", "-c", "/usr/local/bin/backup.sh && /usr/local/bin/supercronic /etc/crontab"]
