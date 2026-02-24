FROM postgres:15-alpine

RUN apk add --no-cache bash curl \
    && LATEST=$(curl -s https://api.github.com/repos/aptible/supercronic/releases/latest | grep -o '"tag_name":"[^"]*' | cut -d'"' -f4) \
    && curl -fsSL "https://github.com/aptible/supercronic/releases/download/${LATEST}/supercronic-linux-amd64" -o /usr/local/bin/supercronic \
    && chmod +x /usr/local/bin/supercronic

COPY backup.sh /usr/local/bin/backup.sh
COPY restore.sh /usr/local/bin/restore.sh
RUN chmod +x /usr/local/bin/backup.sh /usr/local/bin/restore.sh

# Cron job: every hour at minute 0
RUN echo "0 * * * * /usr/local/bin/backup.sh" > /etc/crontab

CMD ["sh", "-c", "/usr/local/bin/backup.sh && /usr/local/bin/supercronic /etc/crontab"]
