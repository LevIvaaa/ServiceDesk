FROM postgres:15-alpine

RUN apk add --no-cache bash dcron

COPY backup.sh /usr/local/bin/backup.sh
COPY restore.sh /usr/local/bin/restore.sh
RUN chmod +x /usr/local/bin/backup.sh /usr/local/bin/restore.sh

# Cron job: every hour
RUN echo "0 * * * * /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1" > /etc/crontabs/root

CMD ["sh", "-c", "/usr/local/bin/backup.sh && crond -f -l 2"]
