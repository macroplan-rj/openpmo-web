# Dockerfile do OpenPMO Web (Angular + Nginx) para o pipeline da CODATA
# (componente cicd/build). A imagem é publicada em
# container-registry.codata.pb.gov.br/library/seplag/sipgr/govpb-openpmo-frontend.
#
# A configuração de runtime (assets/config/app-config.json: URL da API,
# authProvider=idsvr, devMode=false) é montada por ConfigMap via subPath a partir
# da branch `kubernetes`. O app-config.json embutido aqui é apenas fallback.
# O nginx.conf (SPA + proxy /openpmo/ para a API + /health) vem deste repositório.

# ---------- Build stage ----------
FROM node:14 AS builder

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npx ng build --configuration=production

# ---------- Run stage ----------
FROM nginx:stable-alpine

COPY --from=builder /app/dist/open-pmo-angular /usr/share/nginx/html
RUN find /usr/share/nginx/html -type f -exec chmod 644 {} \; \
    && find /usr/share/nginx/html -type d -exec chmod 755 {} \;

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
