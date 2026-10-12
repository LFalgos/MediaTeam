FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html styles.css script.js live-events.json /usr/share/nginx/html/
EXPOSE 8000
