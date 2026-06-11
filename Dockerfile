FROM nginx:alpine
WORKDIR /usr/share/nginx/html
RUN rm -f index.html
COPY index.html .
COPY fittwins-form.html .
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
