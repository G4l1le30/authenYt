# Gunakan base image Node.js 20 Alpine yang ringan
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json dan package-lock.json terlebih dahulu
COPY package*.json ./

# Install SEMUA dependensi (termasuk devDependencies seperti nodemon)
RUN npm install

# Copy seluruh source code
COPY . .

# Expose port yang digunakan aplikasi
EXPOSE 5000

# Jalankan server menggunakan nodemon (diatur pada script "start" di package.json)
CMD ["npm", "start"]
