# Usa una imagen oficial de Node.js como base. 'alpine' es una versión ligera.
FROM node:18-alpine

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# Copia los archivos de dependencias. Hacemos esto primero para aprovechar el caché de Docker.
COPY package*.json ./

# Instala las dependencias del proyecto
RUN npm install

# Copia el resto de los archivos de tu proyecto al directorio de trabajo
COPY . .

# Expone el puerto 3000, que es donde corre tu servidor Express
EXPOSE 3000

# El comando que se ejecutará cuando el contenedor inicie
CMD [ "node", "src/server.js" ]