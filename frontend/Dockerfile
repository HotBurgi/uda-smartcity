# Utilizza un'immagine ufficiale di Node.js come base
FROM node:20-alpine

# Imposta la directory di lavoro all'interno del container
WORKDIR /app

# Copia i file di configurazione delle dipendenze
COPY package*.json ./

# Installa le dipendenze
RUN npm install --legacy-peer-deps

# Copia il resto dell'applicazione
COPY . .

# Esponi la porta 3000 in modo da corrispondere a docker-compose.yml
EXPOSE 3000

# Avvia il server di sviluppo Vite
CMD ["npm", "run", "dev"]
